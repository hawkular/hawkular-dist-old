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
/// <reference path="../services/alertsManager.ts"/>
/// <reference path="../services/errorsManager.ts"/>

module HawkularMetrics {

  export class AppServerTransactionsDetailsController {

    public startTimeStamp:TimestampInMillis;
    public endTimeStamp:TimestampInMillis;

    public alertList: any[] = [];

    public inflightTx: any = 0;
    public abortedTx: any = 0;
    public timedOutTx: any = 0;
    public totalTx: any = 0;

    public chartTxCommittedData: IChartDataPoint[];
    public chartTxTimedOutData: IChartDataPoint[];
    public chartTxAbortedData: IChartDataPoint[];
    public chartTxData: IMultiDataPoint[] = [];

    public chartTxInflightData: IContextChartDataPoint[];

    // will contain in the format: 'metric name' : true | false
    public skipChartData = {};

    private feedId:FeedId;
    private resourceId:ResourceId;

    private TX_PFX = 'Transactions Metrics~Number of ';

    public TOTAL_TX = { metricName: this.TX_PFX + 'Transactions', key: 'Transactions' };
    public INFLIGHT_TX = { metricName: this.TX_PFX + 'In-Flight Transactions', key: 'In-Flight', color: '#d5d026' };
    public COMMITTED_TX = { metricName: this.TX_PFX + 'Committed Transactions', key: 'Committed', color: '#1884c7' };
    public ABORTED_TX = { metricName: this.TX_PFX + 'Aborted Transactions', key: 'Aborted', color: '#515252' };
    public TIMEDOUT_TX = { metricName: this.TX_PFX + 'Timed Out Transactions', key: 'Timed Out', color: '#95489c' };
    public HEURISTIC_TX = { metricName: this.TX_PFX + 'Heuristics', key: 'Heuristics', color: '#49a547' };
    public APP_ROLLBACK = { metricName: this.TX_PFX + 'Application Rollbacks', key: 'Application Rollbacks',
      color: '#f57f20' };
    public RES_ROLLBACK = { metricName: this.TX_PFX + 'Resource Rollbacks', key: 'Resource Rollbacks',
      color: '#e12226' };

    constructor(private $scope:any,
                private $rootScope:IHawkularRootScope,
                private $interval:ng.IIntervalService,
                private $routeParams:any,
                private $log:ng.ILogService,
                private HawkularNav:any,
                private HawkularAlertRouterManager:IHawkularAlertRouterManager,
                private MetricsService:IMetricsService,
                private $q:ng.IQService) {
      $scope.vm = this;

      this.feedId = this.$routeParams.feedId;
      this.resourceId = this.$routeParams.resourceId + '~/subsystem=transactions';

      this.startTimeStamp = +moment().subtract(($routeParams.timeOffset || 3600000), 'milliseconds');
      this.endTimeStamp = +moment();
      this.chartTxCommittedData = [];
      this.chartTxTimedOutData = [];
      this.chartTxAbortedData = [];
      this.chartTxInflightData = [];

      if ($rootScope.currentPersona) {
        this.refresh();
      } else {
        // currentPersona hasn't been injected to the rootScope yet, wait for it..
        $rootScope.$watch('currentPersona', currentPersona => currentPersona && this.refresh());
      }

      // handle drag ranges on charts to change the time range
      this.$scope.$on(EventNames.CHART_TIMERANGE_CHANGED, (event, data:Date[]) => {
        this.changeTimeRange(data);
      });

      // handle drag ranges on charts to change the time range
      this.$scope.$on('ContextChartTimeRangeChanged', (event, data:Date[]) => {
        this.$log.debug('Received ContextChartTimeRangeChanged event' + data);
        this.changeTimeRange(data);
      });


      this.HawkularAlertRouterManager.registerForAlerts(
        this.$routeParams.feedId + '/' + this.$routeParams.resourceId,
        'jvm',
        _.bind(this.filterAlerts, this)
      );
      this.autoRefresh(20);
    }

    private autoRefreshPromise: ng.IPromise<number>;

    private autoRefresh(intervalInSeconds: number):void {
      this.autoRefreshPromise = this.$interval(() => {
        this.refresh();
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(this.autoRefreshPromise);
      });
    }

    public refresh(): void {
      this.endTimeStamp = this.$routeParams.endTime || +moment();
      this.startTimeStamp = this.endTimeStamp - (this.$routeParams.timeOffset || 3600000);

      this.getTxData();
      this.getAlerts();
    }

    private changeTimeRange(data:Date[]):void {
      this.startTimeStamp = data[0].getTime();
      this.endTimeStamp = data[1].getTime();
      this.HawkularNav.setTimestampStartEnd(this.startTimeStamp, this.endTimeStamp);
      this.refresh();
    }

    public filterAlerts(alertData: IHawkularAlertQueryResult) {
      let alertList = alertData.alertList;
      _.remove(alertList, (item:IAlert) => {
        switch (item.context.alertType) {
          case 'TX' : // FIXME: use correct types
            item.alertType = item.context.alertType;
            return false;
          default :
            return true;
        }
      });
      this.alertList = alertList;
    }

    private getAlerts(): void {
      this.HawkularAlertRouterManager.getAlertsForCurrentResource(
        this.startTimeStamp,
        this.endTimeStamp
      );
    }

    private getTxData(): void {
      this.getTxChartData();
      this.getTxStatsData();
    }

    private getTxChartData(): void {
      this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id,
        MetricsService.getMetricId('M', this.feedId, this.resourceId, this.INFLIGHT_TX.metricName),
        this.startTimeStamp, this.endTimeStamp, 60).then((data) => {
          if (data.length) {
            this.chartTxInflightData = data;
          }
        });

      let tmpChartTxData = [];
      let txPromises = [];

      if(!this.skipChartData[this.COMMITTED_TX.key]) {
        let txCommittedPromise = this.MetricsService.retrieveCounterRateMetrics(this.$rootScope.currentPersona.id,
          MetricsService.getMetricId('M', this.feedId, this.resourceId, this.COMMITTED_TX.metricName),
          this.startTimeStamp, this.endTimeStamp, 60);
        txPromises.push(txCommittedPromise);
        txCommittedPromise.then((data) => {
          tmpChartTxData.push({
            key: this.COMMITTED_TX.key,
            color: this.COMMITTED_TX.color,
            values: MetricsService.formatBucketedChartOutput(data)
          });
        });
      }
      if(!this.skipChartData[this.ABORTED_TX.key]) {
        let txAbortedPromise = this.MetricsService.retrieveCounterRateMetrics(this.$rootScope.currentPersona.id,
          MetricsService.getMetricId('M', this.feedId, this.resourceId, this.ABORTED_TX.metricName),
          this.startTimeStamp, this.endTimeStamp, 60);
        txPromises.push(txAbortedPromise);
        txAbortedPromise.then((data) => {
          tmpChartTxData.push({
            key: this.ABORTED_TX.key,
            color: this.ABORTED_TX.color,
            values: MetricsService.formatBucketedChartOutput(data)
          });
        });
      }
      if(!this.skipChartData[this.APP_ROLLBACK.key]) {
        let appRollbackPromise = this.MetricsService.retrieveCounterRateMetrics(this.$rootScope.currentPersona.id,
          MetricsService.getMetricId('M', this.feedId, this.resourceId, this.APP_ROLLBACK.metricName),
          this.startTimeStamp, this.endTimeStamp, 60);
        txPromises.push(appRollbackPromise);
        appRollbackPromise.then((data) => {
          tmpChartTxData.push({
            key: this.APP_ROLLBACK.key,
            color: this.APP_ROLLBACK.color,
            values: MetricsService.formatBucketedChartOutput(data)
          });
        });
      }
      if(!this.skipChartData[this.RES_ROLLBACK.key]) {
        let resRollbackPromise = this.MetricsService.retrieveCounterRateMetrics(this.$rootScope.currentPersona.id,
          MetricsService.getMetricId('M', this.feedId, this.resourceId, this.RES_ROLLBACK.metricName),
          this.startTimeStamp, this.endTimeStamp, 60);
        txPromises.push(resRollbackPromise);
        resRollbackPromise.then((data) => {
          tmpChartTxData.push({
            key: this.RES_ROLLBACK.key,
            color: this.RES_ROLLBACK.color,
            values: MetricsService.formatBucketedChartOutput(data)
          });
        });
      }
      if(!this.skipChartData[this.TIMEDOUT_TX.key]) {
        let txTimedoutPromise = this.MetricsService.retrieveCounterRateMetrics(this.$rootScope.currentPersona.id,
          MetricsService.getMetricId('M', this.feedId, this.resourceId, this.TIMEDOUT_TX.metricName),
          this.startTimeStamp, this.endTimeStamp, 60);
        txPromises.push(txTimedoutPromise);
        txTimedoutPromise.then((data) => {
          tmpChartTxData.push({
            key: this.TIMEDOUT_TX.key,
            color: this.TIMEDOUT_TX.color,
            values: MetricsService.formatBucketedChartOutput(data)
          });
        });
      }
      if(!this.skipChartData[this.HEURISTIC_TX.key]) {
        let txHeuristicPromise = this.MetricsService.retrieveCounterRateMetrics(this.$rootScope.currentPersona.id,
          MetricsService.getMetricId('M', this.feedId, this.resourceId, this.HEURISTIC_TX.metricName),
          this.startTimeStamp, this.endTimeStamp, 60);
        txPromises.push(txHeuristicPromise);
        txHeuristicPromise.then((data) => {
          tmpChartTxData.push({
            key: this.HEURISTIC_TX.key,
            color: this.HEURISTIC_TX.color,
            values: MetricsService.formatBucketedChartOutput(data)
          });
        });
      }
      this.$q.all(txPromises).finally(()=> {
        this.chartTxData = tmpChartTxData;
      });
    }

    private getTxStatsData(): void {
      this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id,
        MetricsService.getMetricId('M', this.feedId, this.resourceId, this.INFLIGHT_TX.metricName),
        this.startTimeStamp, this.endTimeStamp, 1).then((resource) => {
          if (resource.length) {
            this.inflightTx = resource[0];
          }
        });
      this.MetricsService.retrieveCounterMetrics(this.$rootScope.currentPersona.id,
        MetricsService.getMetricId('M', this.feedId, this.resourceId, this.ABORTED_TX.metricName),
        this.startTimeStamp, this.endTimeStamp, 1).then((resource) => {
          if (resource.length) {
            this.abortedTx = resource[0].max - resource[0].min;
          }
        });
      this.MetricsService.retrieveCounterMetrics(this.$rootScope.currentPersona.id,
        MetricsService.getMetricId('M', this.feedId, this.resourceId, this.TIMEDOUT_TX.metricName),
        this.startTimeStamp, this.endTimeStamp, 1).then((resource) => {
          if (resource.length) {
            this.timedOutTx = resource[0].max - resource[0].min;
          }
        });
      this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id,
        MetricsService.getMetricId('M', this.feedId, this.resourceId, this.TOTAL_TX.metricName),
        this.startTimeStamp, this.endTimeStamp, 1).then((resource) => {
          if (resource.length) {
            this.totalTx = resource[0].max - resource[0].min;
          }
        });

    }

    public toggleChartData(name):void {
      this.skipChartData[name] = !this.skipChartData[name];
      this.getTxChartData();
    }

  }

  _module.controller('AppServerTransactionsDetailsController', AppServerTransactionsDetailsController);
}
