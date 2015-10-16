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

/// <reference path='subtabPlugin.ts'/>
module Subtab {

  export class SubtabDirective {

    public restrict = 'E';
    public transclude = true;
    public replace = false;

    public templateUrl = templatePath;
  }

  //@todo: Change to controller class and controllerAs style
  export let SubtabController = _module.controller('Subtab.SubtabController',
    ['$scope', '$rootScope', '$location', 'HawkularNav', 'HawkularInventory', ($scope, $rootScope, $location,
                                                                               HawkularNav, HawkularInventory) => {

      $scope.isAlertsPage = () => {
        return $location.path().indexOf('/hawkular-ui/alerts-center') === 0;
      };

      $scope.isUrlPage = () => {
        return $location.path().indexOf('/hawkular-ui/url/') !== 0;
      };

      $scope.isAppServerPage = () => {
        return $location.path().indexOf('/hawkular-ui/app/') === 0;
      };

      $scope.getClass = (path) => {
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

      $scope.getFormattedDate = (): string => {
        let diff = $scope.hkParams.timeOffset;
        const DATE_FORMAT = 'D MMM YYYY';
        const HOUR_FORMAT = 'HH:mm';

        // FIXME: Use moment ?
        $scope.offsetName = $scope.rangeNames[$scope.hkParams.timeOffset] || 'Custom';

        // TODO: Use this for custom
        // let momStart = moment($scope.hkStartTimestamp);
        // let momEnd = moment($scope.hkEndTimestamp);

        let momStart = moment().subtract($scope.hkParams.timeOffset, 'milliseconds');
        let momEnd = moment();

        if (diff < 24 * 60 * 60 * 1000) {
          return momStart.format(DATE_FORMAT) + ' ' + momStart.format(HOUR_FORMAT) + ' - ' +
            (momStart.day() !== momEnd.day() ? momEnd.format(DATE_FORMAT) : '') + momEnd.format(HOUR_FORMAT);
        } else {
          return momStart.format(DATE_FORMAT) + ' - ' + momEnd.format(DATE_FORMAT);
        }
      };

      $scope.setRange = (range) => {
        HawkularNav.setTimestamp(moment.duration(range).valueOf());
      };

      $scope.getUrlFromId = (id) => {
        if (!$scope.resource) {
          $scope.resource = HawkularInventory.Resource.get({environmentId: globalEnvironmentId, resourcePath: id},
            (data) => {
              $scope.resourceName = data.properties.url;
            });
        }
        return $scope.resource;
      };

      // FIXME: Mock data.. remove when we have real app servers
      $scope.getAppServerFromId = (id) => {
        $scope.resourceName = id;
      };

    }]);
}
