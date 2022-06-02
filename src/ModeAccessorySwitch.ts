import { PlatformAccessory } from 'homebridge';

import { AldesAPI, Mode } from './aldesApi';
import { AldesHomebridgePlatform } from './platform';

export class ModeAccessorySwitch {
  log: any;
  config: any;
  api: any;
  Service: any;
  Characteristic: any;
  name: any;
  service: any;
  aldesAPI: AldesAPI;

  constructor(
    private readonly platform: AldesHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly mode: Mode,
  ) {
    this.log = platform.log;
    this.config = platform.config;
    this.api = platform.api;
    this.aldesAPI = platform.aldesAPI;
    this.Service = this.api.hap.Service;
    this.Characteristic = this.api.hap.Characteristic;
    // extract name from config
    this.name = this.platform.config.name;

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Aldes')
      .setCharacteristic(this.platform.Characteristic.Model, this.aldesAPI.getProducts()[0].reference)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.aldesAPI.getProducts()[0].serial_number)
      .setCharacteristic(this.platform.Characteristic.Name, mode.name);


    // create a new Thermostat service
    // this.service = this.accessory.getService(this.platform.Service.Thermostat);
    this.service = this.accessory.getService(mode.name) ||
      this.accessory.addService(this.platform.Service.Outlet, mode.name, mode.name);
    // create handlers for required characteristics
    this.service.getCharacteristic(this.Characteristic.On)
      .onGet(this.handleOnGet.bind(this))
      .onSet(this.handleOnSet.bind(this));

    this.aldesAPI.getEvent().addListener("modeChange", () => {
      this.service.updateCharacteristic(this.Characteristic.On, this.handleOnGet());
    });
    /*this.aldesAPI.subscribeModeEvent(()=>{
      this.handleRefreshMode();
    });*/

    /*setInterval(() => {
      this.service.updateCharacteristic(this.Characteristic.On, this.handleOnGet());
    }, 60000);*/
  }

  /**
 * Handle requests to get the current value of the "On" characteristic
 */
  handleOnGet() {
    this.log.info('Triggered GET On : '+this.aldesAPI.getProducts()[0].indicator.current_air_mode+ ' vs '+ this.mode.mode);
    return this.aldesAPI.getProducts()[0].indicator.current_air_mode == this.mode.mode;
  }

  /**
   * Handle requests to set the "On" characteristic
   */
  handleOnSet(value) {
    this.log.debug('Triggered SET On:' + value);
    if (value) {
      this.aldesAPI.updateMode(this.mode.mode);
    } else {
      this.aldesAPI.updateMode('A');
    }
  }
}