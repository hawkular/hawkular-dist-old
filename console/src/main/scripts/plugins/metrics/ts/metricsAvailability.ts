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

  export interface IAvailabilitySummary {
    start: number;
    end: number;
    downtimeDuration: number;
    downtimeDurationJson: any;
    lastDowntime:number;
    uptimeRatio: number;
    downtimeCount:number;
    empty:boolean;
  }



  export class MetricsAvailabilityController {
    /// for minification only
    public static  $inject = ['$scope', '$rootScope', '$interval', '$window', '$log', 'HawkularMetric',
      'HawkularAlert', '$routeParams', '$filter', '$moment', 'HawkularAlertsManager',
      'ErrorsManager', 'NotificationsService', '$modal'];

    private availabilityDataPoints:IChartDataPoint[] = [];
    private autoRefreshPromise:ng.IPromise<number>;
    private resourceId:ResourceId;

    public uptimeRatio = 0;
    public downtimeDuration = 0;
    public downtimeDurationJson;
    public lastDowntime:Date;
    public downtimeCount = 0;
    public empty = true;
    public alertList:any;
    public startTimeStamp:TimestampInMillis;
    public endTimeStamp:TimestampInMillis;


    constructor(private $scope:any,
                private $rootScope:IHawkularRootScope,
                private $interval:ng.IIntervalService,
                private $window:any,
                private $log:ng.ILogService,
                private HawkularMetric:any,
                private HawkularAlert:any,
                private $routeParams:any,
                private $filter:ng.IFilterService,
                private $moment:any,
                private HawkularAlertsManager:IHawkularAlertsManager,
                private ErrorsManager:IErrorsManager,
                private NotificationsService:INotificationsService,
                private $modal: any) {
      $scope.vm = this;

      this.startTimeStamp = +$moment().subtract(1, 'hours');
      this.endTimeStamp = +$moment();

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

      $scope.$on('RefreshAvailabilityChart', (/*event*/) => {
        this.refreshAvailPageNow(this.getResourceId());
      });
    }

    public openAvailabilitySetup(): void {
      console.log('openAvailabilitySetup');

      var modalInstance = this.$modal.open({
        templateUrl: 'plugins/metrics/html/modals/alerts-url-availability-setup.html',
        controller: 'AlertUrlAvailabilitySetupController as mas'
      });

      var logger = this.$log;
      modalInstance.result.then(null, function () {
        logger.debug('Modal dismissed at: ' + new Date());
      });
    }

    private getAlerts(metricId:string, startTime:TimestampInMillis, endTime:TimestampInMillis):void {
      this.HawkularAlertsManager.queryConsoleAlerts(metricId, startTime, endTime,
        HawkularMetrics.AlertType.AVAILABILITY).then((alertAvailData)=> {
          _.forEach(alertAvailData.alertList, (item) => { item['alertType']='PINGAVAIL';});
          this.alertList = alertAvailData.alertList;
        }, (error) => {
          return this.ErrorsManager.errorHandler(error, 'Error fetching alerts.');
        });
    }

    public static min(a:number, b:number):number {
      return Math.min(a, b);
    }

    public refreshAvailPageNow(resourceId:ResourceId, startTime?:number):void {
      this.$scope.hkEndTimestamp = +this.$moment();
      var adjStartTimeStamp:number = +this.$moment().subtract(this.$scope.hkParams.timeOffset, 'milliseconds');
      this.endTimeStamp = this.$scope.hkEndTimestamp;
      if (resourceId) {
        this.$log.debug('Updating Availability Page');
        this.refreshSummaryAvailabilityData(resourceId, startTime ? startTime : adjStartTimeStamp, this.endTimeStamp);
        this.refreshAvailChartData(resourceId, startTime ? startTime : adjStartTimeStamp, this.endTimeStamp);
        this.getAlerts(resourceId, startTime ? startTime : adjStartTimeStamp, this.endTimeStamp);
      }
    }


    public autoRefreshAvailability(intervalInSeconds:TimestampInMillis):void {
      this.endTimeStamp = this.$scope.hkEndTimestamp;
      this.startTimeStamp = this.$scope.hkStartTimestamp;
      this.autoRefreshPromise = this.$interval(()  => {
        this.$scope.hkEndTimestamp = +this.$moment();
        this.endTimeStamp = this.$scope.hkEndTimestamp;
        this.$scope.hkStartTimestamp = +this.$moment().subtract(this.$scope.hkParams.timeOffset, 'milliseconds');
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

            if (availResponse && !_.last(availResponse).empty) {

              // FIXME: HAWKULAR-347 - this.uptimeRatio = _.last(availResponse).uptimeRatio;
              // FIXME: HAWKULAR-347 - this.downtimeDuration = Math.round(_.last(availResponse).downtimeDuration);
              this.lastDowntime = new Date(_.last(availResponse).lastDowntime);
              // FIXME: HAWKULAR-347 - this.downtimeCount = _.last(availResponse).downtimeCount;
              this.empty = _.last(availResponse).empty;
            }

          }, (error) => {
            this.NotificationsService.error('Error Loading Avail Summary Data: ' + error);
          });

      }
    }

    public getResourceId():ResourceId {
      return this.resourceId;
    }

    public refreshAvailChartData(metricId:MetricId,
                                 startTime:TimestampInMillis,
                                 endTime:TimestampInMillis):void {
      if (metricId) {
        this.HawkularMetric.AvailabilityMetricData(this.$rootScope.currentPersona.id).query({
          availabilityId: metricId,
          start: startTime,
          end: endTime,
          distinct: true
        }).$promise
          .then((response) => {

            this.availabilityDataPoints = response;

            // FIXME: HAWKULAR-347
            var downtimeDuration = 0;
            var lastUptime = +this.$moment();
            var lastDowntime = -1;
            var downtimeCount = 0;
            _.each(response.slice(0).reverse(), function (status:any/*, idx*/) {
              if (status.value === 'down') {
                lastDowntime = status.timestamp;
                downtimeDuration += (lastUptime - lastDowntime);
                downtimeCount++;
              } else {
                lastUptime = status.timestamp;
              }
            });

            this.downtimeDuration = downtimeDuration;
            this.downtimeDurationJson = this.getDowntimeDurationAsJson();
            this.uptimeRatio = 1 - downtimeDuration / (+this.$moment() - response[0].timestamp);
            this.downtimeCount = downtimeCount;
          }, (error) => {
            this.NotificationsService.error('Error Loading Avail Data: ' + error);
          });
      }
    }

    private durationUnits = {
      's': {unit: 'seconds', limit: 60000}, // seconds, up to 60 (1 minute)
      'm': {unit: 'minutes', limit: 7200000}, // minutes, up to 120 (2 hours)
      'h': {unit: 'hours',   limit: 172800000}, // hours, up to 48 (2 days)
      'd': {unit: 'days',    limit: 1209600000} // days, up to 14 (2 weeks)
    };

    private getDurationAux(duration: number, pattern: string): any {
      var result = [];
      var durations = this.$filter('duration')(duration, pattern).split(' ');
      _.each(pattern.split(' '), function (unit: any, idx) {
        result.push({value: durations[idx], unit: this.durationUnits[unit].unit});
      }, this);
      return this.$window.angular.fromJson(result);
    }

    private getDowntimeDurationAsJson(): any {
      if(this.downtimeDuration) {
        if (this.downtimeDuration < this.durationUnits.s.limit) {
          return this.getDurationAux(this.downtimeDuration, 's');
        }
        else if (this.downtimeDuration < this.durationUnits.m.limit) {
          return this.getDurationAux(this.downtimeDuration, 'm s');
        }
        else if (this.downtimeDuration < this.durationUnits.h.limit) {
          return this.getDurationAux(this.downtimeDuration, 'h m');
        }
        else /*if (downtimeDuration >= this.durationLimits.h)*/ {
          return this.getDurationAux(this.downtimeDuration, 'd h');
        }
      }
    }
  }

  _module.controller('MetricsAvailabilityController', MetricsAvailabilityController);
}
