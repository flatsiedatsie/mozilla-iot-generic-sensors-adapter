// -*- mode: js; js-indent-level:2;  -*-
// SPDX-License-Identifier: MPL-2.0
/**
 * generic-sensors-adapter.js - Generic sensors adapter.
 *
 * Copyright 2018-present Samsung Electronics Co., Ltd. and other contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

const GenericSensors = require('generic-sensors-lite');

const {
  Adapter,
  Device,
  Property,
} = require('gateway-addon');

function on() {
  return {
    name: 'on',
    type: 'boolean',
    value: false,
  };
}

function level() {
  return {
    name: 'level',
    readOnly: 'true',
    type: 'number',
    value: 0,
  };
}

function color() {
  return {
    name: 'color',
    readOnly: 'true',
    type: 'string',
    value: '#000000',
  };
}


const ambientLightSensor = {
  type: 'multiLevelSensor',
  sensorType: 'ambientLightSensor',
  name: 'Ambient Light Sensor',
  properties: [
    level(),
    on(),
  ],
};

const colorSensor = {
  type: 'colorControl',
  sensorType: 'colorSensor',
  name: 'Color Sensor',
  properties: [
    color(),
    on(),
  ],
};

const temperatureSensor = {
  type: 'multiLevelSensor',
  sensorType: 'temperatureSensor',
  name: 'Temperature Sensor',
  properties: [
    level(),
    on(),
  ],
};

const GENERICSENSORS_THINGS = [
  ambientLightSensor,
  colorSensor,
  temperatureSensor,
];


class GenericSensorsProperty extends Property {
  constructor(device, name, propertyDescr) {
    super(device, name, propertyDescr);
    const self = this;
    this.setCachedValue(propertyDescr.value);
    if (name !== 'on') {
      const sensor = this.getSensor();
      if (sensor) {
        sensor.onreading = function() {
          self.update();
        };
      }
    }
    this.update();
  }

  getSensor() {
    let sensor = null;
    if (this.device.sensorType === 'temperatureSensor') {
      sensor = this.device.sensors.temperature;
    } else if (this.device.sensorType === 'ambientLightSensor') {
      sensor = this.device.sensors.ambientLight;
    } else if (this.device.sensorType === 'colorSensor') {
      sensor = this.device.sensors.color;
    }
    return sensor;
  }

  setValue(value) {
    return new Promise((resolve, reject) => {
      if (this.name === 'on') {
        if (value) {
          this.getSensor().start();
        } else {
          this.getSensor().stop();
        }
      }
      super.setValue(value).then((updatedValue) => {
        resolve(updatedValue);
        this.device.notifyPropertyChanged(this);
      }).catch((err) => {
        reject(err);
      });
    });
  }

  update() {
    if (this.name !== 'on') {
      if (this.device.sensorType == 'temperatureSensor') {
        this.setCachedValue(this.device.sensors.temperature.celsius);
      } else if (this.device.sensorType == 'ambientLightSensor') {
        this.setCachedValue(this.device.sensors.ambientLight.illuminance);
      } else if (this.device.sensorType == 'colorSensor') {
        this.setCachedValue(this.device.sensors.color.color);
      }
    }
    this.device.notifyPropertyChanged(this);
  }
}

class GenericSensorsDevice extends Device {
  constructor(adapter, id, config) {
    id = `generic-sensors-${id}`;
    super(adapter, id);

    this.type = config.type;
    this.name = config.name;
    this.sensorType = config.sensorType;
    this.sensorController = config.sensorController || 'simulator';

    this.sensors = {};
    if (config.sensorType === 'temperatureSensor') {
      this.sensorController = config.sensorController || 'bmp085';
      this.sensors.temperature =
        new GenericSensors.Temperature({controller: this.sensorController});
    } else if (config.sensorType === 'ambientLightSensor') {
      this.sensorController = config.sensorController || 'bh1750';
      this.sensors.ambientLight =
        new GenericSensors.AmbientLight({controller: this.sensorController});
    } else if (config.sensorType === 'colorSensor') {
      this.sensorController = config.sensorController || 'tcs34725';
      this.sensors.color =
        new GenericSensors.Color({controller: this.sensorController});
    }

    for (const prop of config.properties) {
      this.properties.set(
        prop.name,
        new GenericSensorsProperty(this, prop.name, prop));
    }

    this.adapter.handleDeviceAdded(this);
  }
}

class GenericSensorsAdapter extends Adapter {
  constructor(addonManager, manifest) {
    super(addonManager, manifest.name, manifest.name);
    addonManager.addAdapter(this);

    let devices;
    if (manifest.moziot.config.hasOwnProperty('generic-sensors') &&
        manifest.moziot.config['generic-sensors'].length > 0) {
      devices = manifest.moziot.config['generic-sensors'];
    } else {
      devices = GENERICSENSORS_THINGS;
    }
    for (let i = 0; i < devices.length; i++) {
      new GenericSensorsDevice(this, i, devices[i]);
    }
  }
}

function loadGenericSensorsAdapter(addonManager, manifest, _errorCallback) {
  try {
    new GenericSensorsAdapter(addonManager, manifest);
  } catch (err) {
    _errorCallback(err);
  }
}

module.exports = loadGenericSensorsAdapter;
