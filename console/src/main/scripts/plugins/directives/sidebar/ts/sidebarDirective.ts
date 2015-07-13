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

/// <reference path='sidebarPlugin.ts'/>
module Sidebar {

  var log:Logging.Logger = Logger.get('Sidebar');

  export class SidebarDirective {

    public restrict = 'E';
    public transclude = true;
    public replace = false;

    public templateUrl = templatePath;
  }

  /*
  export var SidebarController = _module.controller('Sidebar.SidebarController',
    ['$scope', '$rootScope', '$location', ($scope, $rootScope, $location) => {

      $scope.isSinglePage = function() {
        return $location.path().indexOf('/metrics') !== 0;
      };

      $scope.getClass = function (path) {
        return $location.path().indexOf(path) === 0 ? 'active' : '';
      };
    }]);
  */

  export var SidebarController = _module.controller('Sidebar.SidebarController',
      ['$scope', '$rootScope', '$location', 'HawkularNav', 'HawkularInventory', ($scope, $rootScope, $location,
                                                                                 HawkularNav, HawkularInventory) => {

    $scope.isSinglePage = function() {
      return $location.path().indexOf('/metrics') !== 0;
    };

    $scope.isAppServerPage = function() {
      return $location.path().indexOf('/hawkular-ui/app/') === 0;
    };

    $scope.getClass = function(path) {
      return $location.path().indexOf(path) === 0 ? 'active' : '';
    };

    $scope.rangeNames = {
      '3600000': 'Last Hour',
      '43200000': 'Last 12 Hours',
      '86400000': 'Last Day',
      '604800000': 'Last Week',
      '2592000000': 'Last Month',
      '31536000000': 'Last Year'
    };

    $scope.getFormattedDate = function() {
      var diff = $scope.hkParams.timeOffset;

      // FIXME: Use moment ?
      $scope.offsetName = $scope.rangeNames[$scope.hkParams.timeOffset] || 'Custom';

      // TODO: Use this for custom
      // var momStart = moment($scope.hkStartTimestamp);
      // var momEnd = moment($scope.hkEndTimestamp);

      var momStart = moment().subtract($scope.hkParams.timeOffset, 'milliseconds');
      var momEnd = moment();

      if (diff < 24 * 60 * 60 * 1000) {
        return momStart.format('D MMM YYYY') + ' ' + momStart.format('HH:mm') + ' - ' +
            (momStart.day() !== momEnd.day() ? momEnd.format('D MMM YYYY ')  : '') + momEnd.format('HH:mm');
      } else {
        return momStart.format('D MMM YYYY') + ' - ' + momEnd.format('D MMM YYYY');
      }
    };

    $scope.setRange = function(range) {
      HawkularNav.setTimestamp(moment.duration(range).valueOf());
    };

    $scope.getUrlFromId = function(id) {
      if(!$scope.resource) {
        $scope.resource = HawkularInventory.Resource.get({environmentId: globalEnvironmentId, resourceId: id},
            function(data) {
          $scope.resourceName = data.properties.url;
          });
      }
      return $scope.resource;
    };

    // FIXME: Mock data.. remove when we have real app servers
    $scope.getAppServerFromId = function(id) {
      $scope.resourceName = id;
    };

    }]);
}
