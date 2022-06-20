import { PlatformAccessory } from 'homebridge';

import {Thermostat, AldesAPI, Product} from './aldesApi';
import { AldesHomebridgePlatform } from './platform';
export class ThermostatAccessory {
  log: any;
  config: any;
  api: any;
  Service: any;
  Characteristic: any;
  name: any;
  service: any;
  thermostat: Thermostat;
  aldesAPI: AldesAPI;

  constructor(
      private readonly platform: AldesHomebridgePlatform,
      private readonly accessory: PlatformAccessory,
      thermostat: Thermostat,
  ) {
    this.log = platform.log;
    this.config = platform.config;
    this.api = platform.api;
    this.aldesAPI = platform.aldesAPI;
    this.thermostat = thermostat;
    this.Service = this.api.hap.Service;
    this.Characteristic = this.api.hap.Characteristic;

    // set accessory information
        this.accessory.getService(this.platform.Service.AccessoryInformation)!
          .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Aldes')
          .setCharacteristic(this.platform.Characteristic.Model, this.aldesAPI.getProducts()[0].reference)
          .setCharacteristic(this.platform.Characteristic.SerialNumber, thermostat.ThermostatId)
          .setCharacteristic(this.platform.Characteristic.Name, 'Thermostat '+this.thermostat.Name);


        // create a new Thermostat service
        // this.service = this.accessory.getService(this.platform.Service.Thermostat);
        this.service = this.accessory.getService('Thermostat' + thermostat.Name) ||
        this.accessory.addService(this.platform.Service.Thermostat, 'Thermostat' + thermostat.Name);
        this.service.getCharacteristic(this.platform.api.hap.Characteristic.TargetTemperature).setProps({ minValue: 16, maxValue: 26, minStep: 0.5 });
        //this.service.getCharacteristic(this.platform.api.hap.Characteristic.CurrentHeatingCoolingState).setProps({ validValues: [1, 2] });

        // create handlers for required characteristics
        this.service.getCharacteristic(this.Characteristic.CurrentHeatingCoolingState)
          .onGet(this.handleCurrentHeatingCoolingStateGet.bind(this));

        this.service.getCharacteristic(this.Characteristic.TargetHeatingCoolingState)
          .onGet(this.handleTargetHeatingCoolingStateGet.bind(this))
          .onSet(this.handleTargetHeatingCoolingStateSet.bind(this));

        this.service.getCharacteristic(this.Characteristic.CurrentTemperature)
          .onGet(this.handleCurrentTemperatureGet.bind(this));

        this.service.getCharacteristic(this.Characteristic.TargetTemperature)
          .onGet(this.handleTargetTemperatureGet.bind(this))
          .onSet(this.handleTargetTemperatureSet.bind(this));

        this.service.getCharacteristic(this.Characteristic.TemperatureDisplayUnits)
          .onGet(this.handleTemperatureDisplayUnitsGet.bind(this))
          .onSet(this.handleTemperatureDisplayUnitsSet.bind(this));


        this.aldesAPI.getEvent().addListener("productChange", (products)=>{
          this.handleRefreshThermostat(products);
        });
        this.aldesAPI.getEvent().addListener("modeChange", () => {
          this.service.updateCharacteristic(this.Characteristic.CurrentHeatingCoolingState, this.handleCurrentHeatingCoolingStateGet());
        });
       /* this.aldesAPI.subscribeProductEvent((products)=>{
          this.handleRefreshThermostat(products);
        });
        this.aldesAPI.subscribeModeEvent(()=>{
          this.handleRefreshMode();
        });*/

       /* setInterval(() => {
          this.service.updateCharacteristic(this.Characteristic.CurrentHeatingCoolingState, this.handleCurrentHeatingCoolingStateGet());
          this.service.updateCharacteristic(this.Characteristic.CurrentTemperature, this.handleCurrentTemperatureGet());
        }, 60000);*/

  }
  handleRefreshThermostat(products: Product[]){
    this.platform.log.debug("Refresh triggered")
    for (const thermostat of products[0].indicator.thermostats){
      if(thermostat.ThermostatId == this.thermostat.ThermostatId){
        if(thermostat.CurrentTemperature != this.thermostat.CurrentTemperature){
          this.thermostat.CurrentTemperature = thermostat.CurrentTemperature ;
          this.service.updateCharacteristic(this.Characteristic.CurrentTemperature, this.handleCurrentTemperatureGet());
        }
        if(thermostat.TemperatureSet != this.thermostat.TemperatureSet){
          this.thermostat.TemperatureSet = thermostat.TemperatureSet;
          this.service.updateCharacteristic(this.Characteristic.TargetTemperature, this.handleCurrentTemperatureGet());
        }
      }
    }
  }
  /**
     * Handle requests to get the current value of the "Current Heating Cooling State" characteristic
     */
  handleCurrentHeatingCoolingStateGet() {
    this.log.debug('Triggered GET CurrentHeatingCoolingState');

    // set this to a valid value for CurrentHeatingCoolingState
    switch (this.aldesAPI.getProducts()[0].indicator.current_air_mode) {
      case 'A':
        return this.Characteristic.CurrentHeatingCoolingState.OFF;
      case 'B' || 'C' || 'D' || 'E':
        return this.Characteristic.CurrentHeatingCoolingState.HEAT;
      case 'F' || 'G' || 'H' || 'I':
        return this.Characteristic.CurrentHeatingCoolingState.COOL;
      default:
        return this.Characteristic.CurrentHeatingCoolingState.OFF;
    }
  }

  /**
     * Handle requests to get the current value of the "Target Heating Cooling State" characteristic
     */
  handleTargetHeatingCoolingStateGet() {
    this.log.debug('Triggered GET TargetHeatingCoolingState');
    switch (this.aldesAPI.getProducts()[0].indicator.current_air_mode) {
      case 'A':
        return this.Characteristic.CurrentHeatingCoolingState.OFF;
      case 'B' || 'C' || 'D' || 'E':
        return this.Characteristic.CurrentHeatingCoolingState.HEAT;
      case 'F' || 'G' || 'H' || 'I':
        return this.Characteristic.CurrentHeatingCoolingState.COOL;
      default:
        return this.Characteristic.CurrentHeatingCoolingState.OFF;
    }
  }

  /**
     * Handle requests to set the "Target Heating Cooling State" characteristic
     */
  handleTargetHeatingCoolingStateSet(value) {
    this.log.debug('Triggered SET TargetHeatingCoolingState:'+ value);
    switch (value) {
      case this.Characteristic.CurrentHeatingCoolingState.OFF:
        this.aldesAPI.updateMode('A');
        break;
      case this.Characteristic.CurrentHeatingCoolingState.HEAT:
        this.aldesAPI.updateMode(this.platform.config.defaultHeatMode);
        break;
      case this.Characteristic.CurrentHeatingCoolingState.COOL:
        this.aldesAPI.updateMode(this.platform.config.defaultColdMode);
        break;
      default:
        this.aldesAPI.updateMode('A');
        break;
    }
  }

  /**
     * Handle requests to get the current value of the "Current Temperature" characteristic
     */
  handleCurrentTemperatureGet() {
    this.log.debug('Triggered GET CurrentTemperature');
    return this.thermostat.CurrentTemperature;
  }


  /**
     * Handle requests to get the current value of the "Target Temperature" characteristic
     */
  handleTargetTemperatureGet() {
    return this.thermostat.TemperatureSet;
  }

  /**
     * Handle requests to set the "Target Temperature" characteristic
     */
  handleTargetTemperatureSet(value) {
    this.log.debug('Triggered SET TargetTemperature:'+ value);
    this.thermostat.TemperatureSet = value;
    this.aldesAPI.updateThermostats(this.thermostat);
  }

  /**
     * Handle requests to get the current value of the "Temperature Display Units" characteristic
     */
  handleTemperatureDisplayUnitsGet() {
    this.log.debug('Triggered GET TemperatureDisplayUnits');

    // set this to a valid value for TemperatureDisplayUnits
    const currentValue = this.Characteristic.TemperatureDisplayUnits.CELSIUS;

    return currentValue;
  }

  /**
     * Handle requests to set the "Temperature Display Units" characteristic
     */
  handleTemperatureDisplayUnitsSet(value) {
    this.log.debug('Triggered SET TemperatureDisplayUnits:'+ value);
  }

  setThermostat(thermostat: Thermostat){
    this.thermostat = thermostat;
  }

  getThermostat(): Thermostat{
    return this.thermostat;
  }
}