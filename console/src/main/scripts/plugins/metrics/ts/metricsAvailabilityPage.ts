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

/// <reference path='metricsTypes.ts'/>
/// <reference path='metricsPlugin.ts'/>
/// <reference path='../../includes.ts'/>

module HawkularMetrics {


//
  declare var window: any;


  export interface IAvailabilitySummary {
    start: number;
    end: number;
    downtimeDuration: number;
    lastDowntime:number;
    uptimeRatio: number;
    downtimeCount:number;
    empty:boolean;
  }

  export class MetricsAvailabilityController {
    /// for minification only
    public static  $inject = ['$scope', '$rootScope', '$interval', '$log', 'HawkularMetric', 'HawkularAlert',
      '$routeParams', 'HawkularAlertsManager', 'HawkularErrorManager', 'AlertService'];

    private availabilityDataPoints:IChartDataPoint[] = [];
    private autoRefreshPromise:ng.IPromise<number>;
    private resourceId:ResourceId;

    public uptimeRatio = 0;
    public downtimeDuration = 0;
    public lastDowntime:Date;
    public downtimeCount = 0;
    public empty = true;
    public math;

    constructor(private $scope:any,
                private $rootScope:any,
                private $interval:ng.IIntervalService,
                private $log:ng.ILogService,
                private HawkularMetric:any,
                private HawkularAlert:any,
                private $routeParams:any,
                private HawkularAlertsManager: IHawkularAlertsManager,
                private HawkularErrorManager: IHawkularErrorManager,
                private AlertService: IAlertService,
                public alertList:any,
                public startTimeStamp:TimestampInMillis,
                public endTimeStamp:TimestampInMillis) {
      $scope.vm = this;
      this.math = window.Math;

      this.startTimeStamp = +moment().subtract(1, 'hours');
      this.endTimeStamp = +moment();

      this.resourceId = $scope.hkParams.resourceId;

      var waitForResourceId = () => $scope.$watch('hkParams.resourceId', (resourceId:ResourceId) => {
        /// made a selection from url switcher
        if (resourceId) {
          this.resourceId = resourceId;
          this.refreshAvailPageNow(this.getResourceId());
        }
      });

      if ($rootScope.currentPersona) {
        waitForResourceId();
      } else {
        $rootScope.$watch('currentPersona', (currentPersona) => {
          if (currentPersona) {
            waitForResourceId();
          }
        });
      }
      this.autoRefreshAvailability(20);

      $scope.$on('RefreshAvailabilityChart', (event) => {
        this.refreshAvailPageNow(this.getResourceId());
      });
    }

    private getAlerts(metricId: string, startTime:TimestampInMillis, endTime:TimestampInMillis):void {
      this.HawkularAlertsManager.queryConsoleAlerts(metricId, startTime, endTime,
          HawkularMetrics.AlertType.AVAILABILITY).then((data)=> {
            this.alertList = data.alertList;
          }, (error) => { return this.HawkularErrorManager.errorHandler(error, 'Error fetching alerts.'); });
    }


    public refreshAvailPageNow(resourceId:ResourceId, startTime?:number):void {
      this.$scope.hkEndTimestamp = +moment();
      var adjStartTimeStamp:number = +moment().subtract(this.$scope.hkParams.timeOffset, 'milliseconds');
      this.endTimeStamp = this.$scope.hkEndTimestamp;
      if (resourceId) {
        console.log('*** Updating Availability Page');
        this.refreshSummaryAvailabilityData(resourceId, startTime ? startTime : adjStartTimeStamp, this.endTimeStamp);
        this.refreshAvailChartData(resourceId, startTime ? startTime : adjStartTimeStamp, this.endTimeStamp);
        this.getAlerts(resourceId, startTime ? startTime : adjStartTimeStamp, this.endTimeStamp);
      }
    }



    public autoRefreshAvailability(intervalInSeconds:TimestampInMillis):void {
      this.endTimeStamp = this.$scope.hkEndTimestamp;
      this.startTimeStamp = this.$scope.hkStartTimestamp;
      this.autoRefreshPromise = this.$interval(()  => {
        console.info('Autorefresh Availabilty for: ' + this.getResourceId());
        this.$scope.hkEndTimestamp = +moment();
        this.endTimeStamp = this.$scope.hkEndTimestamp;
        this.$scope.hkStartTimestamp = +moment().subtract(this.$scope.hkParams.timeOffset, 'milliseconds');
        this.startTimeStamp = this.$scope.hkStartTimestamp;
        this.refreshAvailPageNow(this.getResourceId());
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(this.autoRefreshPromise);
      });
    }



    public refreshSummaryAvailabilityData(metricId:MetricId,
                                          startTime:TimestampInMillis,
                                          endTime:TimestampInMillis):void {

      if (metricId) {
        this.HawkularMetric.AvailabilityMetricData(this.$rootScope.currentPersona.id).query({
          availabilityId: metricId,
          start: startTime,
          end: endTime,
          buckets: 1
        }).$promise
          .then((availResponse:IAvailabilitySummary[]) => {
            console.info('Avail Summary:');
            console.dir(availResponse);

            if (availResponse && !_.last(availResponse).empty) {

              // FIXME: HAWKULAR-347 - this.uptimeRatio = _.last(availResponse).uptimeRatio;
              // FIXME: HAWKULAR-347 - this.downtimeDuration = Math.round(_.last(availResponse).downtimeDuration);
              this.lastDowntime = new Date(_.last(availResponse).lastDowntime);
              // FIXME: HAWKULAR-347 - this.downtimeCount = _.last(availResponse).downtimeCount;
              this.empty = _.last(availResponse).empty;
            }

          }, (error) => {
            this.AlertService.error('Error Loading Avail Summary Data: ' + error);
          });

      }
    }

    public getResourceId():ResourceId {
      return this.resourceId;
    }

    public refreshAvailChartData(metricId:MetricId, startTime:TimestampInMillis, endTime:TimestampInMillis):void {
      if (metricId) {
        this.HawkularMetric.AvailabilityMetricData(this.$rootScope.currentPersona.id).query({
          availabilityId: metricId,
          start: startTime,
          end: endTime,
          distinct: true
        }).$promise
          .then((response) => {

            console.log('Availability Data: ');
            console.dir(response);
            this.availabilityDataPoints = response;

            // FIXME: HAWKULAR-347
            var downtimeDuration = 0;
            var lastUptime = +moment();
            var lastDowntime = -1;
            var downtimeCount = 0;
            _.each(response.slice(0).reverse(), function(status, idx) {
              if (status['value'] === 'down') {
                lastDowntime = status['timestamp'];
                downtimeDuration += (lastUptime - lastDowntime);
                downtimeCount++;
              } else {
                lastUptime = status['timestamp'];
              }
            });

            this.downtimeDuration = downtimeDuration;
            this.uptimeRatio = 1 - downtimeDuration / (+moment() - response[0]['timestamp']);
            this.downtimeCount = downtimeCount;
          }, (error) => {
              this.AlertService.error('Error Loading Avail Data: ' + error);
          });
      }
    }



    public alertResolve(alert: any, index: number): void {
      for (var i = 0; i< this.alertList.length; i++) {
        if (this.alertList[i].$$hashKey === alert.$$hashKey) {
          this.HawkularAlert.Alert.resolve({alertIds: alert.alertId}, {}).$promise.then( () => {
            this.alertList.splice(i, 1);
          });
          break;
        }
      }
    }

  }

  _module.controller('MetricsAvailabilityController', MetricsAvailabilityController);
}
