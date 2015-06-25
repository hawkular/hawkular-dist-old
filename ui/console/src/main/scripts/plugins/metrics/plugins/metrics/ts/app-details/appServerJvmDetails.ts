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

  export class AppServerJvmDetailsController {
    /// this is for minification purposes
    public static $inject = ['$location', '$scope', '$rootScope', '$interval', '$log', '$filter', '$routeParams', '$modal', 'HawkularInventory', 'HawkularMetric', 'HawkularAlert', 'HawkularAlertsManager', 'HawkularErrorManager', '$q', 'md5'];

    private resourceList;
    private metricsList;
    public alertList;

    constructor(private $location: ng.ILocationService,
      private $scope: any,
      private $rootScope: any,
      private $interval: ng.IIntervalService,
      private $log: ng.ILogService,
      private $filter: ng.IFilterService,
      private $routeParams: any,
      private $modal: any,
      private HawkularInventory: any,
      private HawkularMetric: any,
      private HawkularAlert: any,
      private HawkularAlertsManager: HawkularMetrics.IHawkularAlertsManager,
      private HawkularErrorManager: HawkularMetrics.IHawkularErrorManager,
      private $q: ng.IQService,
      private md5: any,
      public startTimeStamp:TimestampInMillis,
      public endTimeStamp:TimestampInMillis,
      public resourceUrl: string) {
        $scope.vm = this;

        this.startTimeStamp = +moment().subtract(($routeParams.timeOffset || 3600000), 'milliseconds');
        this.endTimeStamp = +moment();

        if ($rootScope.currentPersona) {
          this.getJvmData(this.$rootScope.currentPersona.id);
        } else {
          // currentPersona hasn't been injected to the rootScope yet, wait for it..
          $rootScope.$watch('currentPersona', (currentPersona) => currentPersona && this.getJvmData(currentPersona.id));
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
        this.getJvmData();
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(this.autoRefreshPromise);
      });
    }

    getJvmData(currentTenantId?: TenantId): any {
      this.alertList = []; // FIXME: when we have alerts for app server
      this.endTimeStamp = this.$routeParams.endTime || +moment();
      this.startTimeStamp = this.endTimeStamp - (this.$routeParams.timeOffset || 3600000);

      var tenantId:TenantId = currentTenantId || this.$rootScope.currentPersona.id;
      this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
        gaugeId: 'MI~R~[' + this.$routeParams.resourceId + '~/]~MT~WildFly Memory Metrics~Heap Used',
        start: this.startTimeStamp,
        end: this.endTimeStamp,
        buckets: 1}, (resource) => {
          this['heapUsage'] = resource[0];
        }, this);
    }

  }

  _module.controller('HawkularMetrics.AppServerJvmDetailsController', AppServerJvmDetailsController);

}
