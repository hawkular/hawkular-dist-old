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
    public static  $inject = ['$scope','$rootScope','$routeParams','$interval','$q','HawkularInventory',
      'HawkularMetric'];

    public static AVAILABLE_COLOR = '#1884c7'; /// blue
    public static IN_USE_COLOR = '#49a547'; /// green
    public static TIMED_OUT_COLOR = '#515252'; /// dark gray
    public static WAIT_COLOR = '#d5d026'; /// yellow
    public static CREATION_COLOR = '#95489c'; /// purple

    private resourceList;
    private expandedList;
    public alertList;
    public chartAvailData;
    public chartRespData;

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
      this.chartAvailData = {};
      this.chartRespData = {};

      if ($rootScope.currentPersona) {
        this.getDatasources(this.$rootScope.currentPersona.id);
      } else {
        // currentPersona hasn't been injected to the rootScope yet, wait for it..
        $rootScope.$watch('currentPersona', (currentPersona) => currentPersona &&
        this.getDatasources(currentPersona.id));
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
      this.HawkularInventory.ResourceOfType.query({resourceTypeId: 'Datasource'},
          (aResourceList, getResponseHeaders) => {
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
          this.getDatasourceChartData();
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

    getDatasourceChartData(currentTenantId?: TenantId): any {
      this.endTimeStamp = this.$routeParams.endTime || +moment();
      this.startTimeStamp = this.endTimeStamp - (this.$routeParams.timeOffset || 3600000);

      var tenantId:TenantId = currentTenantId || this.$rootScope.currentPersona.id;
      angular.forEach(this.resourceList, function(res, idx) {
        this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
          gaugeId: 'MI~R~' + res.id + '~MT~Datasource Pool Metrics~Available Count',
          start: this.startTimeStamp,
          end: this.endTimeStamp, buckets:60}, (data) => {
            this.chartAvailData[res.id] = this.chartAvailData[res.id] || [];
            this.chartAvailData[res.id][0] = { key: 'Available Count',
              color: AppServerDatasourcesDetailsController.AVAILABLE_COLOR,
              values: this.formatBucketedChartOutput(data) };
          }, this);
        this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
          gaugeId: 'MI~R~' + res.id + '~MT~Datasource Pool Metrics~In Use Count',
          start: this.startTimeStamp,
          end: this.endTimeStamp, buckets:60}, (data) => {
            this.chartAvailData[res.id] = this.chartAvailData[res.id] || [];
            this.chartAvailData[res.id][1] = { key: 'In Use',
              color: AppServerDatasourcesDetailsController.IN_USE_COLOR,
              values: this.formatBucketedChartOutput(data) };
          }, this);
        this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
          gaugeId: 'MI~R~' + res.id + '~MT~Datasource Pool Metrics~Timed Out',
          start: this.startTimeStamp,
          end: this.endTimeStamp, buckets:60}, (data) => {
            this.chartAvailData[res.id] = this.chartAvailData[res.id] || [];
            this.chartAvailData[res.id][2] = { key: 'Timed Out',
              color: AppServerDatasourcesDetailsController.TIMED_OUT_COLOR,
              values: this.formatBucketedChartOutput(data) };
          }, this);

        this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
          gaugeId: 'MI~R~' + res.id + '~MT~Datasource Pool Metrics~Average Get Time',
          start: this.startTimeStamp,
          end: this.endTimeStamp, buckets:60}, (data) => {
            this.chartRespData[res.id] = this.chartRespData[res.id] || [];
            this.chartRespData[res.id][0] = { key: 'Wait Time (Avg.)',
              color: AppServerDatasourcesDetailsController.WAIT_COLOR,
              values: this.formatBucketedChartOutput(data) };
          }, this);
        this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
          gaugeId: 'MI~R~' + res.id + '~MT~Datasource Pool Metrics~Average Creation Time',
          start: this.startTimeStamp,
          end: this.endTimeStamp, buckets:60}, (data) => {
            this.chartRespData[res.id] = this.chartRespData[res.id] || [];
            this.chartRespData[res.id][1] = { key: 'Creation Time (Avg.)',
              color: AppServerDatasourcesDetailsController.CREATION_COLOR,
              values: this.formatBucketedChartOutput(data) };
          }, this);
        }, this);

    }

    private formatBucketedChartOutput(response):IChartDataPoint[] {
      //  The schema is different for bucketed output
      return _.map(response, (point:IChartDataPoint) => {
        return {
          timestamp: point.start,
          date: new Date(point.start),
          value: !angular.isNumber(point.value) ? 0 : point.value,
          avg: (point.empty) ? 0 : point.avg,
          min: !angular.isNumber(point.min) ? 0 : point.min,
          max: !angular.isNumber(point.max) ? 0 : point.max,
          percentile95th: !angular.isNumber(point.percentile95th) ? 0 : point.percentile95th,
          median: !angular.isNumber(point.median) ? 0 : point.median,
          empty: point.empty
        };
      });
    }



  }

  _module.controller('HawkularMetrics.AppServerDatasourcesDetailsController', AppServerDatasourcesDetailsController);
}
