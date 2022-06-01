import { PlatformAccessory } from 'homebridge';

import {Thermostat, AldesAPI, Product} from './aldesApi'
import { AldesHomebridgePlatform } from './platform';
export class ExampleInputSourceAccessory {
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
      private readonly accessory: PlatformAccessory
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
         .setCharacteristic(this.platform.Characteristic.Name, this.aldesAPI.getProducts()[0].reference)
 
 
         // create a new Thermostat service
        // this.service = this.accessory.getService(this.platform.Service.Thermostat);
         this.service = this.accessory.getService(this.aldesAPI.getProducts()[0].serial_number) ||
         this.accessory.addService(this.platform.Service.InputSource, this.aldesAPI.getProducts()[0].serial_number);
         //this.service.getCharacteristic(this.platform.api.hap.Characteristic.CurrentHeatingCoolingState).setProps({ validValues: [1, 2] });
  
        this.service.getCharacteristic(this.Characteristic.InputSourceType)
          .onGet(this.handleInputSourceTypeGet.bind(this));
  
        this.service.getCharacteristic(this.Characteristic.IsConfigured)
          .onGet(this.handleIsConfiguredGet.bind(this))
          .onSet(this.handleIsConfiguredSet.bind(this));
  
        this.service.getCharacteristic(this.Characteristic.CurrentVisibilityState)
          .onGet(this.handleCurrentVisibilityStateGet.bind(this));
  
    }
  
    /**
     * Handle requests to set the "Configured Name" characteristic
     */
    handleConfiguredNameSet(value) {
      this.log.debug('Triggered SET ConfiguredName:' + value);
    }
  
    /**
     * Handle requests to get the current value of the "Input Source Type" characteristic
     */
    handleInputSourceTypeGet() {
      this.log.debug('Triggered GET InputSourceType');
  
      // set this to a valid value for InputSourceType
      const currentValue = this.Characteristic.InputSourceType.OTHER;
  
      return currentValue;
    }
  
  
    /**
     * Handle requests to get the current value of the "Is Configured" characteristic
     */
    handleIsConfiguredGet() {
      this.log.debug('Triggered GET IsConfigured');
  
      // set this to a valid value for IsConfigured
      const currentValue = this.Characteristic.IsConfigured.CONFIGURED;
  
      return currentValue;
    }
  
    /**
     * Handle requests to set the "Is Configured" characteristic
     */
    handleIsConfiguredSet(value) {
      this.log.debug('Triggered SET IsConfigured:'+ value);
    }
  
    /**
     * Handle requests to get the current value of the "Name" characteristic
     
    handleNameGet() {
      this.log.debug('Triggered GET Name');
  
      // set this to a valid value for Name
      const currentValue = 1;
  
      return currentValue;
    }
  */
  
    /**
     * Handle requests to get the current value of the "Current Visibility State" characteristic
     */
    handleCurrentVisibilityStateGet() {
      this.log.debug('Triggered GET CurrentVisibilityState');
  
      // set this to a valid value for CurrentVisibilityState
      const currentValue = this.Characteristic.CurrentVisibilityState.SHOWN;
  
      return currentValue;
    }
  
  
  }