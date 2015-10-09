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

/// <reference path='../../includes.ts'/>

module HawkularTopology {

  /// some config vars
  export var pluginName = 'hawkular-topology';

  export var log:Logging.Logger = Logger.get(pluginName);

  export var templatePath = 'plugins/topology/html';

  export var _module = angular.module(HawkularTopology.pluginName, ['ngResource', 'ui.select', 'hawkular.charts',
    'hawkular.services', 'ui.bootstrap', 'topbar', 'patternfly.select', 'angular-momentjs', 'angular-md5', 'toastr',
    'infinite-scroll','mgo-angular-wizard']);


  /// These are plugin globals used across several screens (think session vars from server side programming)

  export var globalEnvironmentId = 'test';

}
