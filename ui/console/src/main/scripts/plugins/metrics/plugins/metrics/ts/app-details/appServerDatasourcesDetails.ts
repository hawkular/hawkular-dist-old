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
/// <reference path="../alertsManager.ts"/>
/// <reference path="../errorManager.ts"/>

module HawkularMetrics {

  export class AppServerDatasourcesDetailsController {

    /// for minification only
    public static  $inject = ['$scope','$rootScope','$routeParams','$interval','$q','HawkularInventory','HawkularMetric'];

    private resourceList;
    private expandedList;
    public alertList;

    constructor(private $scope: any,
                private $rootScope: any,
                private $routeParams: any,
                private $interval: ng.IIntervalService,
                private $q: ng.IQService,
                private HawkularInventory: any,
                private HawkularMetric: any,
                public startTimeStamp:TimestampInMillis,
                public endTimeStamp:TimestampInMillis) {
      $scope.vm = this;

      this.startTimeStamp = +moment().subtract(($routeParams.timeOffset || 3600000), 'milliseconds');
      this.endTimeStamp = +moment();

      if ($rootScope.currentPersona) {
        this.getDatasources(this.$rootScope.currentPersona.id);
      } else {
        // currentPersona hasn't been injected to the rootScope yet, wait for it..
        $rootScope.$watch('currentPersona', (currentPersona) => currentPersona && this.getDatasources(currentPersona.id));
      }

      this.autoRefresh(20);
    }

    private autoRefreshPromise: ng.IPromise<number>;

    cancelAutoRefresh(): void {
      this.$interval.cancel(this.autoRefreshPromise);
      toastr.info('Canceling Auto Refresh');
    }

    autoRefresh(intervalInSeconds: number): void {
      this.autoRefreshPromise = this.$interval(() => {
        this.getDatasources();
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(this.autoRefreshPromise);
      });
    }

    getDatasources(currentTenantId?: TenantId): any {
      this.alertList = []; // FIXME: when we have alerts for app server
      this.endTimeStamp = this.$routeParams.endTime || +moment();
      this.startTimeStamp = this.endTimeStamp - (this.$routeParams.timeOffset || 3600000);

      var tenantId:TenantId = currentTenantId || this.$rootScope.currentPersona.id;
      this.HawkularInventory.ResourceOfType.query({resourceTypeId: 'Datasource'}, (aResourceList, getResponseHeaders) => {
        var promises = [];
        var tmpResourceList = [];
        angular.forEach(aResourceList, function(res, idx) {
          tmpResourceList.push(res);
          promises.push(this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
            gaugeId: 'MI~R~' + res.id + '~MT~Datasource Pool Metrics~Available Count',
            distinct: true}, (data) => {
              res.availableCount = data[0];
            }).$promise);
          promises.push(this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
            gaugeId: 'MI~R~' + res.id + '~MT~Datasource Pool Metrics~In Use Count',
            distinct: true}, (data) => {
              res.inUseCount = data[0];
            }).$promise);
        }, this);
        this.$q.all(promises).then((result) => {
          this.resourceList = tmpResourceList;
          this.resourceList.$resolved = true;
        });
      },
      () => { // error
        if (!this.resourceList) {
          this.resourceList = [];
          this.resourceList.$resolved = true;
          this['lastUpdateTimestamp'] = new Date();
        }
      });
    }

  }

  _module.controller('HawkularMetrics.AppServerDatasourcesDetailsController', AppServerDatasourcesDetailsController);
}
