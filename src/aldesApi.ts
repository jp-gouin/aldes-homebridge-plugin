import { Logger, PlatformAccessory, PlatformConfig } from 'homebridge';
import { EventEmitter } from 'events'
import fetch from 'node-fetch';
import { URLSearchParams } from 'url';

export type Mode = {
  name: string;
  mode: string;
};

type Token = {
  scope: string;
  token_type: string;
  access_token: string;
  expires_in: number;
  refresh_token: string;
};
export type Indicator = {
  date: string;
  type: string;
  value: number;

};
export type Thermostat = {
  ThermostatId: number;
	Name: string;
	Type: string;
	Order: number;
	IconId: number;
	Number: number;
	TemperatureSet: number;
	CurrentTemperature: number;
};
export type Product = {
  slaves: Array<object>;
  masters: Array<object>;
  indicators: Array<Indicator>;
  indicator: {
    fmist: number;
    fmast: number;
    cmast: number;
    cmist: number;
    date_debut_vac: string;
		date_fin_vac: string;
		hors_gel: boolean;
		qte_eau_chaude: number;
		tmp_principal: number;
		current_air_mode: string;
		current_water_mode: string;
    thermostats: Array<Thermostat>;
    settings: {
      dateTime: string;
      people: number;
      currency: number;
      antilegio: number;
      kwh_creuse: number;
      kwh_pleine: number;
    };
    indicatorType: string;
  };
  thermostats: object;
  week_planning: object;
  week_planning1: object;
  week_planning2: object;
  week_planning3: object;
  week_planning4: object;
  modem: string;
  reference: string;
  serial_number: string;
  type: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  usureFiltre: string;
  dateLastFilterUpdate: string;
  hasFilter: boolean;
  gpsLatitude: number;
  gpsLongitude: number;
  outdoorAirQualityAvg: string;
  isConnected: boolean;
  needUpdate: {
    message: string;
    storeAndroid: string;
    storeApple: string;
  };
};

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class AldesAPI {
  public products: Array<Product> = [];
  private _token!: Token;
  public aldesEvent = new EventEmitter();
  public get token(): Token {
    return this._token;
  }

  public set token(value: Token) {
    this._token = value;
  }

  public getProducts(){
    return this.products;
  }
  public getEvent(): EventEmitter {
    return this.aldesEvent;
  }
  public subscribeProductEvent(callback){
    this.aldesEvent.addListener('productChange', callback())
  }
  public subscribeModeEvent(callback){
    this.aldesEvent.addListener('modeChange', callback());
  }
  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);
  }

  async authenticate(){
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('username', this.config.username);
    params.append('password', this.config.password);
    const response = await fetch('https://aldesiotsuite-aldeswebapi.azurewebsites.net/oauth2/token/', {
      method: 'POST',
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      this.log.error(`Error! status: ${response.status}`);
    }

    // 👇️ const result: GetUsersResponse
    const result = (await response.json()) as Token;
    this.token = result;
    this.log.debug('result is: ', JSON.stringify(result, null, 4));
  }

  async fetchProducts(): Promise<Array<Product>> {
    const response = await fetch('https://aldesiotsuite-aldeswebapi.azurewebsites.net/aldesoc/v5/users/me/products', {
      method: 'GET',
      headers: {
        'Authorization': this._token.token_type+' '+this._token.access_token,
      },
    });
    if (response.status == 401){
      return this.authenticate().then((data) => {
        return this.getProducts();
      });
    } else if (!response.ok) {
      this.log.error(`Error! status: ${response.status}`);
      return this.getProducts();
    }else{
      // 👇️ const result: GetUsersResponse
      const result = (await response.json()) as Array<Product>;
      if(this.products.length == 0 ){
        this.products = result;
      }
      if(result[0].indicator.current_air_mode != this.products[0].indicator.current_air_mode){
        this.products = result;
        this.aldesEvent.emit("modeChange");
      }
      this.products = result;
      this.aldesEvent.emit("productChange", this.products)
      return this.products;
    }
  }

  async updateThermostats(thermostat: Thermostat){
    /*
      curl -X PATCH -d "[{\"ThermostatId\": \"18992\",\"TemperatureSet\": 25}]" -H "Content-Type: application/json"  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjFuYXRVb0RVT3FSbkcxd2dzYnhEYyJ9.eyJpc3MiOiJodHRwczovL2FsZGVzLmV1LmF1dGgwLmNvbS8iLCJzdWIiOiJhdXRoMHwwNTFkOTI3My05YjJjLTQ0ZGYtYThjNS03MmU5NzZiNGE0ZDIiLCJhdWQiOiJodHRwczovL2FsZGVzaW90c3VpdGUtYWxkZXN3ZWJhcGkuYXp1cmV3ZWJzaXRlcy5uZXQiLCJpYXQiOjE2NTM0ODYwMDMsImV4cCI6MTY1NjA3ODAwMywiYXpwIjoiUkhhOUw5NEhmTTZ4bG1XUzM3Z2tzZzJ4ODY0dlpGckQiLCJzY29wZSI6Im9mZmxpbmVfYWNjZXNzIiwiZ3R5IjoicGFzc3dvcmQifQ.W_PnhkO57ilobEVmrnM2bHk7DM3zM7xlNajoLChiM6__w-VJUa1H9XduWXYy0xJO_-siS8Gsre4rP09o4NYvsiNggzmwieb41naS3i8lzvn2-mYPzovDbrVJ0LyCzgaHa3GNHoDVvUs11coROgKK9rZ-eTZO2rBRqv4R5R9oGnWddEnfTQwtaHhDryQhQEyWMW9aMK9iEfcIahj9gYthdiGkG-9z_MmD2lvOT1Q-mpLG2V4voeE1er4vwxAA_2WRdPfO3l5cQbCqIutpPuyGAp2HE2Otpr690WqdKVOJ1nSti5frV4DXOMZbTcw9rgcL3EbzANsIrP9B3qzTjrw7IQ"
       https://aldesiotsuite-aldeswebapi.azurewebsites.net/aldesoc/v5/users/me/products/34EAE7964DD6/updateThermostats
    */
    this.log.info('PATCH request : '+'https://aldesiotsuite-aldeswebapi.azurewebsites.net/aldesoc/v5/users/me/products/'+this.products[0].modem+'/updateThermostats');
    this.log.info('PATCH request : '+ JSON.stringify(thermostat));
    const response = await fetch('https://aldesiotsuite-aldeswebapi.azurewebsites.net/aldesoc/v5/users/me/products/'+this.products[0].modem+'/updateThermostats', {
      method: 'PATCH',
      body: JSON.stringify([thermostat]),
      headers: {
        'Authorization': this._token.token_type+' '+this._token.access_token,
        'Content-Type': 'application/json',
      },
    });

    if (response.status == 401){
      return this.authenticate().then((data) => {
        return this.updateThermostats(thermostat);
      });
    } else if (!response.ok) {
      this.log.error(`Error! status: ${response.status}`);
    }else{
      // 👇️ const result: GetUsersResponse
      this.log.debug('result is: ', JSON.stringify(await response.json(), null, 4));
    }
  }

  async updateMode(mode: string){
    const response = await fetch('https://aldesiotsuite-aldeswebapi.azurewebsites.net/aldesoc/v5/users/me/products/'+this.products[0].modem+'/commands', {
      method: 'POST',
      body: JSON.stringify({
        method: 'changeMode',
        params: [mode],
      }),
      headers: {
        'Authorization': this._token.token_type+' '+this._token.access_token,
        'Content-Type': 'application/json',
      },
    });

    if (response.status == 401){
      return this.authenticate().then((data) => {
        return this.updateMode(mode);
      });
    } else if (!response.ok) {
      this.log.error(`Error! status: ${response.status}`);
    }else{
      // 👇️ const result: GetUsersResponse
      this.log.debug('result is: ', JSON.stringify(await response.json(), null, 4));
    }
  }
}
