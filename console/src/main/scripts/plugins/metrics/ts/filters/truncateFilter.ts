///
/// Copyright 2015-2016 Red Hat, Inc. and/or its affiliates
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


module HawkularMetrics {

  // {{ "some text" | truncate : <length> : <words> : <left|right|middle> | <separator> }}

  _module.filter('truncate', () => {
    return (input, length, keepWords, where, separator) => {

      let DEFAULT_LENGTH = 15;
      let SEPARATOR = separator || '...';
      let SEP_LENGTH = SEPARATOR.length;

      length = length || DEFAULT_LENGTH;

      if (!input || input.length < (SEP_LENGTH + 2) || input.length <= length || length <= 1) {
        return input;
      }

      let right = where === 'right';
      let middle = where === 'middle';
      let left = !where || (!right && !middle);

      let start = left ? length - SEP_LENGTH : (right ? 0 : (Math.round((length - SEP_LENGTH) / 2)));
      if (keepWords && !right) {
        start = input.lastIndexOf(' ', start);
      }
      let end = right ? -length + SEP_LENGTH : (left ? input.length : 0-(length - SEP_LENGTH - start));
      if (keepWords && !left) {
        end = input.indexOf(' ', input.length - Math.abs(end) - 1) + 1;
      }

      let leftText = input.slice(0, start);
      let rightText = end ? input.slice(end) : '';

      return leftText + SEPARATOR + rightText;
    };
  });

}
