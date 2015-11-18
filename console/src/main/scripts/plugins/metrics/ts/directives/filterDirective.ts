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
/// <reference path="../../../includes.ts"/>

module HawkularMetrics {

  class FilterController {
    public filterConfig: any;

    /**
     * Watch for changes of resourceList and filteredResourceList of $scope.
     * If resourceList is changed, call filter function.
     * If filteredResourceList is changed, recalculate number of results from filters.
     * @param $scope this variable holds resourceList and filteredResourceList objects.
     */
    private watchResourceList($scope) {
      let _self = this;
      $scope.$watch(angular.bind(this, function () {
        return $scope.resourceList;
      }), function (newResourceList) {
        if (newResourceList !== undefined) {
          $scope.filterBy({filters:_self.filterConfig.appliedFilters});
        }
      });
      $scope.$watch(angular.bind(this, function () {
        return $scope.filteredResourceList;
      }), function (newResourceList) {
        if (newResourceList !== undefined) {
          _self.filterConfig.resultsCount = newResourceList.length;
        }
      });
    }

    /**
     * Method for initializing of filters on table.
     * @param activeFilters:any[] array of filter config objects.
     * @param $scope this hold information about current resourceList and filteredResourceList.
     */
    private initFilters(activeFilters:any[], $scope) {
      let _self = this;
      _self.filterConfig = {
        resultsCount: 0,
        appliedFilters: [],
        fields: activeFilters,
        onFilterChange: function(filters) {
          $scope.filterBy({filters: filters});
        }
      };
    }
  }

  let filterLink = ($scope:any, element:ng.IAugmentedJQuery, attrs:ng.IAttributes) => {
    $scope.vm.initFilters($scope.activeFilters, $scope);
    $scope.vm.watchResourceList($scope);
  };

  export class HkTableFilters {
    public controller:any;
    public controllerAs:string = 'vm';
    public link:any;
    public templateUrl = 'plugins/metrics/html/directives/table-filters.html';
    public scope = {
      resourceList: '=',
      filteredResourceList: '=',
      activeFilters: '=',
      filterBy: '&'
    };
    public replace = 'true';
    constructor() {
      this.controller = FilterController;
      this.link = filterLink;
    }
    public static Factory() {
      let directive = () => {
        return new HkTableFilters();
      };

      directive['$inject'] = [];

      return directive;
    }
  }

  _module.directive('tableFilters', [HawkularMetrics.HkTableFilters.Factory()]);
}
