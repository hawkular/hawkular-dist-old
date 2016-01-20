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

/// <reference path="../../metricsPlugin.ts"/>
/// <reference path="../../../includes.ts"/>
module HawkularMetrics {
  export class DatasourceDetailController {
    private static MILIS_IN_SECONDS = 1000;
    private autoRefreshPromise:ng.IPromise<number>;
    public datasource:any;
    public datasourceId:any;
    public skipChartData = {};

    public startTimeStamp:TimestampInMillis;
    public endTimeStamp:TimestampInMillis;

    private feedId:FeedId;
    public chartAvailData:any;
    public resolvedAvailData:any;
    public chartRespData:any;
    public resolvedRespData:any;
    public alertList:any;
    constructor(private $q:ng.IQService,
                private $rootScope:IHawkularRootScope,
                private MetricsService:IMetricsService,
                private HawkularNav:any,
                private $routeParams:any,
                private HawkularAlertRouterManager:IHawkularAlertRouterManager,
                private HawkularInventory:any,
                private $interval:ng.IIntervalService) {
      this.feedId = this.$routeParams.feedId;
      this.datasourceId = this.$routeParams.datasourceId;

      this.$rootScope.$on('ChartTimeRangeChanged', (event, data:Date[]) => {
        this.startTimeStamp = data[0].getTime();
        this.endTimeStamp = data[1].getTime();
        this.HawkularNav.setTimestampStartEnd(this.startTimeStamp, this.endTimeStamp);
        this.refresh();
      });

      this.$rootScope.$on('$destroy', () => {
        this.destroy();
      });

      this.initDateTimes();

      if ($rootScope.currentPersona) {
        this.getDatasource().then((data) => {
            this.datasource = data;
            this.registerAlerts();
            this.refresh();
            this.autoRefresh(20);
          });
      } else {
        /// currentPersona hasn't been injected to the rootScope yet, wait for it..
        $rootScope.$watch('currentPersona', (currentPersona) => currentPersona &&
        this.getDatasource().then((data) => {
            this.datasource = data;
            this.registerAlerts();
            this.refresh();
            this.autoRefresh(20);
          }));
      }

    }

    private getDatasource():ng.IPromise<any> {
      const resourceId = this.$routeParams.resourceId + '~~';

      return this.HawkularInventory.ResourceUnderFeed.get({
        feedId: this.$routeParams.feedId,
        resourcePath: resourceId + '/' + this.datasourceId.replace(/\$/g, '%2F'),
      }).$promise;
    }

    private initDateTimes() {
      if (this.$routeParams.endTime && this.$routeParams.endTime !== '0') {
        this.endTimeStamp = this.$routeParams.endTime;
      } else {
        this.endTimeStamp = +moment();
      }

      if (this.$routeParams.timeOffset && this.$routeParams.timeOffset !== '0') {
        this.startTimeStamp = this.endTimeStamp - this.$routeParams.timeOffset;
      } else {
        this.startTimeStamp = this.endTimeStamp - 3600000;
      }
    }

    public getDatasourceChartData():void {
      if (this.datasource) {
        this.$q.all(this.getAvailableChartPromises()).then((response)=> {
          this.chartAvailData = response || [];
          this.resolvedAvailData = true;
        });

        this.$q.all(this.getResponseChartPromises()).then((response)=> {
          this.chartRespData = response || [];
          this.resolvedRespData = true;
        });
      }
    }

    /**
     * Method for creating chart data from raw IChartDataPoint data.
     * @returns {ng.IPromise<IMultipleChartData>[]} formatted Data for multi-line available chart.
     */
    public getAvailableChartPromises():ng.IPromise<IMultipleChartData>[] {
      let availPromises:ng.IPromise<IMultipleChartData>[] = [];
      if (!this.skipChartData[this.datasource.id + '_Available Count']) {
        availPromises.push(this.getAvailablePromise()
          .then((data) => {
            return {
              key: 'Available Count',
              color: AppServerDatasourcesDetailsController.AVAILABLE_COLOR,
              values: MetricsService.formatBucketedChartOutput(data)
            };
          })
        );
      }
      if (!this.skipChartData[this.datasource.id + '_In Use Count']) {
        availPromises.push(this.getInUsePromise()
          .then((data) => {
            return {
              key: 'In Use',
              color: AppServerDatasourcesDetailsController.IN_USE_COLOR,
              values: MetricsService.formatBucketedChartOutput(data)
            };
          })
        );
      }
      if (!this.skipChartData[this.datasource.id + '_Timed Out']) {
        availPromises.push(this.getTimedOutPromise()
          .then((data) => {
            return {
              key: 'Timed Out',
              color: AppServerDatasourcesDetailsController.TIMED_OUT_COLOR,
              values: MetricsService.formatBucketedChartOutput(data)
            };
          })
        );
      }
      return availPromises;
    }

    /**
     * Method for creating chart data from raw IChartDataPoint data.
     * @returns {ng.IPromise<IMultipleChartData>[]} formatted Data for multi-line response chart.
     */
    public getResponseChartPromises():ng.IPromise<IMultipleChartData>[] {
      let responsePromises:ng.IPromise<IMultipleChartData>[] = [];
      if (!this.skipChartData[this.datasource.id + '_Average Get Time']) {
        responsePromises.push(this.getAvgGetTimePromise()
          .then((data) => {
            return {
              key: 'Wait Time (Avg.)',
              color: AppServerDatasourcesDetailsController.WAIT_COLOR,
              values: MetricsService.formatBucketedChartOutput(data)
            };
          })
        );
      }
      if (!this.skipChartData[this.datasource.id + '_Average Creation Time']) {
        responsePromises.push(this.getAvgCreateTimePromise()
          .then((data) => {
            return {
              key: 'Creation Time (Avg.)',
              color: AppServerDatasourcesDetailsController.CREATION_COLOR,
              values: MetricsService.formatBucketedChartOutput(data)
            };
          })
        );
      }
      return responsePromises;
    }

    /**
     * Method for constructing promise with data for chart of Available count in Datasource pool.
     * @returns {ng.IPromise<IChartDataPoint[]>} constructed promise with data point for available chart.
     */
    public getAvailablePromise():ng.IPromise<IChartDataPoint[]> {
      return this.MetricsService.retrieveGaugeMetrics(
        this.$rootScope.currentPersona.id,
        MetricsService.getMetricId('M', this.feedId, this.datasource.id, 'Datasource Pool Metrics~Available Count'),
        this.startTimeStamp,
        this.endTimeStamp,
        60);
    }

    /**
     * Method for constructing promise with data for chart of Use Count in Datasource pool.
     * @returns {ng.IPromise<IChartDataPoint[]>} constructed promise with data point for available chart.
     */
    public getInUsePromise():ng.IPromise<IChartDataPoint[]> {
      return this.MetricsService.retrieveGaugeMetrics(
        this.$rootScope.currentPersona.id,
        MetricsService.getMetricId('M', this.feedId, this.datasource.id, 'Datasource Pool Metrics~In Use Count'),
        this.startTimeStamp,
        this.endTimeStamp,
        60);
    }

    /**
     * Method for constructing promise with data for chart of Timed Out in Datasource pool.
     * @returns {ng.IPromise<IChartDataPoint[]>} constructed promise with data point for available chart
     */
    public getTimedOutPromise():ng.IPromise<IChartDataPoint[]> {
      return this.MetricsService.retrieveGaugeMetrics(
        this.$rootScope.currentPersona.id,
        MetricsService.getMetricId('M', this.feedId, this.datasource.id, 'Datasource Pool Metrics~Timed Out'),
        this.startTimeStamp,
        this.endTimeStamp,
        60);
    }

    /**
     * Method for constructing promise with data for chart of Average Get Time in Datasource pool.
     * @returns {ng.IPromise<IChartDataPoint[]>} constructed promise with data point for response chart.
     */
    public getAvgGetTimePromise():ng.IPromise<IChartDataPoint[]> {
      return this.MetricsService.retrieveGaugeMetrics(
        this.$rootScope.currentPersona.id,
        MetricsService.getMetricId('M',
          this.feedId,
          this.datasource.id,
          'Datasource Pool Metrics~Average Get Time'),
        this.startTimeStamp,
        this.endTimeStamp,
        60);
    }

    /**
     * Method for constructing promise with data for chart of Average Creation Time in Datasource pool.
     * @returns {ng.IPromise<IChartDataPoint[]>} constructed promise with data point for response chart.
     */
    public getAvgCreateTimePromise():ng.IPromise<IChartDataPoint[]> {
      return this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id,
        MetricsService.getMetricId('M',
          this.feedId,
          this.datasource.id,
          'Datasource Pool Metrics~Average Creation Time'),
        this.startTimeStamp,
        this.endTimeStamp,
        60);
    }

    public encodeResourceId(resourceId:ResourceId):string {
      return Utility.encodeResourceId(resourceId);
    }

    public toggleChartData(name):void {
      this.skipChartData[name] = !this.skipChartData[name];
      this.getDatasourceChartData();
    }

    private autoRefresh(intervalInSeconds:number):void {
      this.autoRefreshPromise = this.$interval(() => {
        this.refresh();
      }, intervalInSeconds * DatasourceDetailController.MILIS_IN_SECONDS);
    }

    public refresh() {
      this.initDateTimes();
      this.getDatasourceChartData();
      this.getAlerts();
    }

    public getAlerts() {
      this.HawkularAlertRouterManager.getAlertsForResourceId(
        this.feedId + '/' + this.datasource.id,
        this.startTimeStamp,
        this.endTimeStamp
      ).then((data) => {
        this.alertList = data;
      });
    }

    public registerAlerts() {
      this.HawkularAlertRouterManager.registerForAlerts(
        this.feedId + '/' + this.datasource.id,
        'datasource',
        _.bind(AppServerDatasourcesDetailsController.filterAlerts, this, _, this.datasource)
      );
    }

    private changeTimeRange(data:Date[]):void {
      this.startTimeStamp = data[0].getTime();
      this.endTimeStamp = data[1].getTime();
      this.HawkularNav.setTimestampStartEnd(this.startTimeStamp, this.endTimeStamp);
      this.refresh();
    }

    public destroy() {
      this.$interval.cancel(this.autoRefreshPromise);
    }
  }

  _module.controller('DatasourceDetailController', DatasourceDetailController);
}
