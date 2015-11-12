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
      'MetricsService', '$routeParams', '$filter', '$moment', 'HawkularAlertsManager',
      'ErrorsManager', '$q', 'NotificationsService'];

    private availabilityDataPoints:IChartDataPoint[] = [];
    private autoRefreshPromise:ng.IPromise<number>;

    public resourceId:ResourceId;
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
                private MetricsService:any,
                private $routeParams:any,
                private $filter:ng.IFilterService,
                private $moment:any,
                private HawkularAlertsManager:IHawkularAlertsManager,
                private ErrorsManager:IErrorsManager,
                private $q:ng.IQService,
                private NotificationsService:INotificationsService) {
      $scope.vm = this;

      this.startTimeStamp = +$moment().subtract(1, 'hours');
      this.endTimeStamp = +$moment();

      this.resourceId = $scope.hkParams.resourceId;

      let waitForResourceId = () => $scope.$watch('hkParams.resourceId', (resourceId:ResourceId) => {
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

      $scope.$on(EventNames.REFRESH_AVAIL_CHART, (/*event*/) => {
        this.refreshAvailPageNow(this.getResourceId());
      });
    }

    private getAlerts(resourceId:string, startTime:TimestampInMillis, endTime:TimestampInMillis):void {
      let alertsArray:IAlert[];
      let promise = this.HawkularAlertsManager.queryAlerts({
        statuses: 'OPEN',
        tags: 'resourceId|' + resourceId, startTime: startTime, endTime: endTime
      }).then((data)=> {
        _.remove(data.alertList, (item) => {
          switch (item.context.alertType) {
            case 'PINGAVAIL' :
              item['alertType'] = item.context.alertType;
              return false;
            default :
              return true; // ignore non-response-time alert
          }
        });
        alertsArray = data.alertList;
      }, (error) => {
        return this.ErrorsManager.errorHandler(error, 'Error fetching url RT alerts.');
      });

      this.$q.all([promise]).finally(()=> {
        this.alertList = alertsArray;
      });
    }

    public static min(a:number, b:number):number {
      return Math.min(a, b);
    }

    public refreshAvailPageNow(resourceId:ResourceId, startTime?:number):void {
      this.$scope.hkEndTimestamp = +this.$moment();
      let adjStartTimeStamp:number = +this.$moment().subtract(this.$scope.hkParams.timeOffset, 'milliseconds');
      this.endTimeStamp = this.$scope.hkEndTimestamp;
      if (resourceId) {
        this.$log.debug('Updating Availability Page');
        this.refreshSummaryAvailabilityData(resourceId, startTime ? startTime : adjStartTimeStamp, this.endTimeStamp);
        this.refreshAvailChartData(resourceId, startTime ? startTime : adjStartTimeStamp, this.endTimeStamp);
        this.getAlerts(resourceId, startTime ? startTime : adjStartTimeStamp, this.endTimeStamp);
      }
    }


    private  autoRefreshAvailability(intervalInSeconds:TimestampInMillis):void {
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
        this.MetricsService.retrieveAvailabilityMetrics(this.$rootScope.currentPersona.id,
          metricId, startTime, endTime, 1).
          then((availResponse:IAvailabilitySummary[]) => {

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
          .then((response: any[]) => {

            this.availabilityDataPoints = response;

            // FIXME: HAWKULAR-347
            let downtimeDuration = 0;
            let lastUptime = +this.$moment();
            let lastDowntime = -1;
            let downtimeCount = 0;
            _.each(response.slice(0).reverse(), function (status:any) {
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
            // FIXME: HAWKULAR-347 - Uptime ratio on metrics side is being calculated base on whole date range, even
            //                       if there's no data for most of it. so it's inaccurate/incorrect. Only taking the
            //                       value if it's 0.
            this.uptimeRatio = (response.length === 1 && _.last(response).value === 'down') ? 0 :
              (1 - downtimeDuration / (+this.$moment() - response[0].timestamp));
            this.downtimeCount = downtimeCount;
          }, (error) => {
            this.NotificationsService.error('Error Loading Avail Data: ' + error);
          });
      }
    }

    private static durationUnits = {
      's': {unit: 'seconds', limit: 60000}, // seconds, up to 60 (1 minute)
      'm': {unit: 'minutes', limit: 7200000}, // minutes, up to 120 (2 hours)
      'h': {unit: 'hours',   limit: 172800000}, // hours, up to 48 (2 days)
      'd': {unit: 'days',    limit: 1209600000} // days, up to 14 (2 weeks)
    };

    private getDurationAux(duration: number, pattern: string): any {
      let result = [];
      let durations = this.$filter('duration')(duration, pattern).split(' ');
      _.each(pattern.split(' '), (unit: any, idx) => {
        result.push({value: durations[idx], unit: MetricsAvailabilityController.durationUnits[unit].unit});
      }, this);
      return angular.fromJson(<any>result);
    }

    private getDowntimeDurationAsJson(): any {
      if(this.downtimeDuration) {
        if (this.downtimeDuration < MetricsAvailabilityController.durationUnits.s.limit) {
          return this.getDurationAux(this.downtimeDuration, 's');
        }
        else if (this.downtimeDuration < MetricsAvailabilityController.durationUnits.m.limit) {
          return this.getDurationAux(this.downtimeDuration, 'm s');
        }
        else if (this.downtimeDuration < MetricsAvailabilityController.durationUnits.h.limit) {
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
