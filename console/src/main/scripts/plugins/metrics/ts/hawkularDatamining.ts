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

/// <reference path="metricsPlugin.ts"/>
/// <reference path="../../includes.ts"/>

module HawkularMetrics {

  _module.provider('HawkularDatamining', new function() {
    this.setProtocol = function(protocol) {
      this.protocol = protocol;
      return this;
    };

    this.setHost = function(host) {
      this.host = host;
      return this;
    };

    this.setPort = function(port) {
      this.port = 8080;
      return this;
    };

    /* ngInject */
    this.$get = function($http: any, $location: any, $resource, $rootScope): any {

      this.setProtocol(this.protocol || $location.protocol() || 'http');
      this.setHost(this.host || $location.host() || 'localhost');
      this.setPort(this.port ||  $location.port() || '8080');

      let prefix = this.protocol + '://' + this.host + ':' + this.port;
      let predictionUrlPart = '/hawkular/datamining';
      let inventoryUrlPart = '/hawkular/inventory';
      let url = prefix + predictionUrlPart;
      let urlInventory = prefix + inventoryUrlPart;
      let factory: any = {};

      factory.Forecaster = function(tenantId) {
        return $resource(url + '/metrics/:metricId/forecaster/forecast', null, {
          forecast: {
            method: 'GET',
            isArray: true,
            params: {ahead: '1'},
            headers: {'Hawkular-Tenant': tenantId}
          }
        });
      };

      factory.PredictiveRelationship = function() {
        return $resource(urlInventory + '/tenants/relationships/', null, {
          getAll: {
            method: 'GET',
            isArray: true,
            params: {named: '__inPrediction'},
          },
          enablePrediction: {
            method: 'POST',
          },
        });
      };

      factory.PredictiveRelationship.disablePrediction = function(relationship) {
        return $http({
          method: 'DELETE',
          url: inventoryUrlPart + '/tenants/relationships/',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + $rootScope.userDetails.token
          },
          data: relationship
        });
      };

      factory.formatPredictedData = function(data, transformBytes): IChartDataPoint[] {
        function transformData(val: number): number {
          if (transformBytes) {
            return val / 1024 / 1024;
          } else {
            return val;
          }
        }

        //  The schema is different for bucketed output
        return _.map(data, (point: IChartDataPoint) => {

          return {
            timestamp: point.timestamp,
            date: new Date(point.timestamp),
            value: transformData(point.value),
            avg: transformData(point.value),
            min: transformData(point.min),
            max: transformData(point.max),
            percentile95th: 0,
            median: 0,
            empty: false,
            percentiles: []
          };
        });
      };

      return factory;
    };
  });
}
