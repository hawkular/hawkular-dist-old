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

/// <reference path="inventoryPlugin.ts"/>
module Inventory {

  export var InventoryController = _module.controller("Inventory.InventoryController", ['$scope', '$rootScope', 'HawkularInventory', 'HawkularMetric' ,($scope, $rootScope, hkInventory, hkMetric) => {
      // hard coded for now
      var envId = 'test';

      $scope.queryResources = function() {
        this.resources = hkInventory.ResourceOfType.query({resourceTypeId: 'URL'}, function(data) {
            angular.forEach(data, function(value) {
                value.metrics = hkInventory.ResourceMetric.query({environmentId: envId, resourceId: value.id});
            });
        });
      };

      $scope.queryMetrics = function() {
        if(this.resourceId && envId) {
            this.metrics = hkInventory.ResourceMetric.query({environmentId: envId, resourceId: this.resourceId});
        }
      };

      $scope.showMetric = function(tenantId, resourceId, metricId) {
        var _tenantId = tenantId || this.tenantId;
        var _resourceId = resourceId || this.resourceId;
        var _metricId = metricId || this.metricId;
        if(_tenantId && _resourceId && _metricId) {
          hkMetric.NumericMetricData.get({tenantId: _tenantId, numericId: _metricId, buckets: 60}, function (data) {
            $rootScope.metricData = data;
          });
        }
      };

      $scope.closeChart = function() {
        delete $rootScope.metricData;
      };

  }]);

}
