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

/// <reference path='../../includes.ts'/>

module HawkularMetrics {

  /// some config vars
  export const pluginName = 'hawkular-metrics';
  export const templatePath = 'plugins/metrics/html';

  /// These are plugin globals used across several screens (think session vars from server side programming)

  export const globalEnvironmentId = 'test';

  export const DEF_TIME_OFFSET = 12 * 60 * 60 * 1000;

  //@todo: this will go away once Metrics gives us the staring metric collection period
  export const globalContextChartTimePeriod = 'week';

  export const globalNumberOfContextChartDataPoints = 480;

}
