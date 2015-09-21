///
/// Copyright 2015 Red Hat, Inc. and/or its affiliates
/// and other contributors as indicated by the @author tags.
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///    http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///

/// <reference path="../metricsPlugin.ts"/>
/// <reference path="../../includes.ts"/>

// from https://github.com/erykpiast/angular-duration-format

module HawkularMetrics {

  _module.filter('duration', () => {

    let DURATION_FORMATS_SPLIT = /((?:[^ydhms']+)|(?:'(?:[^']|'')*')|(?:y+|d+|h+|m+|s+))(.*)/;
    let DURATION_FORMATS = {
      'y': { // years
        // "longer" years are not supported
        value: 365 * 24 * 60 * 60 * 1000
      },
      'yy': {
        value: 'y',
        pad: 2
      },
      'd': { // days
        value: 24 * 60 * 60 * 1000
      },
      'dd': {
        value: 'd',
        pad: 2
      },
      'h': { // hours
        value: 60 * 60 * 1000
      },
      'hh': { // padded hours
        value: 'h',
        pad: 2
      },
      'm': { // minutes
        value: 60 * 1000
      },
      'mm': { // padded minutes
        value: 'm',
        pad: 2
      },
      's': { // seconds
        value: 1000
      },
      'ss': { // padded seconds
        value: 's',
        pad: 2
      },
      'sss': { // milliseconds
        value: 1
      },
      'ssss': { // padded milliseconds
        value: 'sss',
        pad: 4
      }
    };


    function _parseFormat(string) {
      // @inspiration AngularJS date filter
      let parts = [];
      let format = string;

      while (format) {
        let match = DURATION_FORMATS_SPLIT.exec(format);

        if (match) {
          parts = parts.concat(match.slice(1));

          format = parts.pop();
        } else {
          parts.push(format);

          format = null;
        }
      }

      return parts;
    }


    function _formatDuration(timestamp, format) {
      let text = '';
      let values = {};

      format.filter((format) => { // filter only value parts of format
        return DURATION_FORMATS.hasOwnProperty(format);
      }).map((format) => { // get formats with values only
        let config = DURATION_FORMATS[format];
        if (config.hasOwnProperty('pad')) {
          return config.value;
        } else {
          return format;
        }
      }).filter((format, index, arr)=> { // remove duplicates
        return (arr.indexOf(format) === index);
      }).map((format) => { // get format configurations with values
        return angular.extend({
          name: format
        }, DURATION_FORMATS[format]);
      }).sort((a, b) => { // sort formats descending by value
        return b.value - a.value;
      }).forEach((format) => { // create values for format parts
        let value = values[format.name] = Math.floor(timestamp / format.value);

        timestamp = timestamp - (value * format.value);
      });

      format.forEach((part) => {
        let format = DURATION_FORMATS[part];

        if (format) {
          let value = values[format.value];

          text += (format.hasOwnProperty('pad') ?
            _padNumber(value, Math.max(format.pad, value.toString().length)) : values[part]);
        } else {
          text += part.replace(/(^'|'$)/g, '').replace(/''/g, '\'');
        }
      });

      return text;
    }


    function _padNumber(number, len) {
      return ((new Array(len + 1)).join('0') + number).slice(-len);
    }


    return function (value, format) {
      if (typeof value !== 'number') {
        return value;
      }

      let timestamp = parseInt(value.valueOf(), 10);

      if (isNaN(timestamp)) {
        return value;
      } else {
        return _formatDuration(
          timestamp,
          _parseFormat(format)
        );
      }
    };
  });
}
