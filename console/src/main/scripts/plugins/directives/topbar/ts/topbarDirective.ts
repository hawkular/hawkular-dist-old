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

/// <reference path='topbarPlugin.ts'/>
module Topbar {

  var log:Logging.Logger = Logger.get('Topbar');

  export class TopbarDirective {

    public restrict = 'E';
    public transclude = false;
    public replace = false;

    public templateUrl = templatePath;
  }

  export var TopbarController = _module.controller('Topbar.TopbarController',
    ['$scope', '$rootScope', '$location', '$route', '$routeParams', 'HawkularNav', 'HawkularInventory',
      ($scope, $rootScope, $location, $route, $routeParams, HawkularNav, HawkularInventory) => {

      $scope.getClass = function(path) {
          return $location.path().indexOf(path) === 0 ? 'active' : '';
      };

    }]);
}
