import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { AldesAPI, Product, Thermostat } from './aldesApi';
import { ModeAccessorySwitch } from './ModeAccessorySwitch';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { ThermostatAccessory } from './ThermostatAccessory';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class AldesHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];
  public thermostats: ThermostatAccessory[] = [];

  public aldesAPI!: AldesAPI;
  public product!: Product;

  public modes = [{
    name: 'Off',
    mode: 'A',
  },
  {
    name: 'Heat Comfort',
    mode: 'B',
  },
  {
    name: 'Heat Eco',
    mode: 'C',
  },
  {
    name: 'Heat Prog A',
    mode: 'D',
  },
  {
    name: 'Heat Prog B',
    mode: 'E',
  },
  {
    name: 'Cool Comfort',
    mode: 'F',
  },
  {
    name: 'Cool Boost',
    mode: 'G',
  },
  {
    name: 'Cool Prog C',
    mode: 'H',
  },
  {
    name: 'Cool Prog D',
    mode: 'I',
  }];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.aldesAPI = new AldesAPI(log, config);
      this.aldesAPI.authenticate().then((d)=>{
        this.discoverDevices();
        this.refreshProduct();
      });
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  refreshProduct(){
    setInterval(() => {
      this.log.info('Refresh Aldes product state');
      this.aldesAPI.fetchProducts().then((products)=>{
        for (const thermostat of products[0].indicator.thermostats){
          for (const accessories of this.thermostats){
            if (accessories.getThermostat().ThermostatId == thermostat.ThermostatId){
              accessories.setThermostat(thermostat);
            }
          }
        }
      });
    }, 15000);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices() {

    this.aldesAPI.fetchProducts().then((products)=>{
      this.product = products[0];
      this.log.debug(JSON.stringify(this.aldesAPI.getProducts()));

      // Register all thermostats
      // Register input source for the mode selector
      const uuid = this.api.hap.uuid.generate('Aldes-Mode-group');

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        // the accessory already exists
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
        for(const mode of this.modes){
          new ModeAccessorySwitch(this, existingAccessory, mode);
        }

      }else{
        // the accessory does not yet exist, so we need to create it
        this.log.info('Adding new mode selector:', 'Aldes-Mode-group');

        // create a new accessory
        const accessory = new this.api.platformAccessory('Aldes-Mode-group', uuid);

        for(const mode of this.modes){
          new ModeAccessorySwitch(this, accessory, mode);
        }
        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }




      // Register all thermostats
      for (const thermostat of this.product.indicator.thermostats){
        // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address
        const uuid = this.api.hap.uuid.generate(thermostat.ThermostatId.toString());

        // see if an accessory with the same uuid has already been registered and restored from
        // the cached devices we stored in the `configureAccessory` method above
        const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

        if (existingAccessory) {
        // the accessory already exists
          this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

          // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
          // existingAccessory.context.device = device;
          // this.api.updatePlatformAccessories([existingAccessory]);

          // create the accessory handler for the restored accessory
          // this is imported from `platformAccessory.ts`
          const thermo = new ThermostatAccessory(this, existingAccessory, thermostat);
          this.thermostats.push(thermo);
        // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
        // remove platform accessories when no longer present
        // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
        // this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
        } else {
        // the accessory does not yet exist, so we need to create it
          this.log.info('Adding new thermostat:', thermostat.Name);

          // create a new accessory
          const accessory = new this.api.platformAccessory(thermostat.Name, uuid);

          // store a copy of the device object in the `accessory.context`
          // the `context` property can be used to store any data about the accessory you may need
          accessory.context.device = thermostat;

          // create the accessory handler for the newly create accessory
          // this is imported from `platformAccessory.ts`
          const thermo = new ThermostatAccessory(this, accessory, thermostat);
          this.thermostats.push(thermo);
          // link the accessory to your platform
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        }
      }
    });
  }
}
