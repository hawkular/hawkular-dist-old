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

/// <reference path="metricsPlugin.ts"/>
/// <reference path="../../includes.ts"/>
/// <reference path="services/alertsManager.ts"/>
/// <reference path="services/errorsManager.ts"/>

module HawkularMetrics {

  export class AlertsCenterDetailsController {

    public static  $inject = ['$scope', 'HawkularAlertsManager', 'HawkularAlert', 'ErrorsManager',
      '$log', '$q', '$rootScope', '$routeParams', '$location', 'MetricsService', 'NotificationsService'];

    private _alertId:AlertId;
    public feedId:FeedId;
    public detailAlert:IAlert;
    public description:string;

    public endTimeStamp:TimestampInMillis;
    public startTimeStamp:TimestampInMillis;
    public bucketedDataPoints;
    public chartData;

    public alertsTimeStart:TimestampInMillis;
    public alertsTimeEnd:TimestampInMillis;
    public alertsTimeOffset:TimestampInMillis;
    public isWorking: boolean = false;

    public actionsHistory;

    constructor(private $scope:any,
                private HawkularAlertsManager:IHawkularAlertsManager,
                private HawkularAlert:any,
                private ErrorsManager:IErrorsManager,
                private $log:ng.ILogService,
                private $q:ng.IQService,
                private $rootScope:IHawkularRootScope,
                private $routeParams:any,
                private $location:ng.ILocaleService,
                private MetricsService:IMetricsService,
                private NotificationsService:INotificationsService) {
      $scope.acd = this;
      this._alertId = $routeParams.alertId;

      this.alertsTimeOffset = $routeParams.timeOffset || 3600000;
      // If the end time is not specified in URL use current time as end time
      this.alertsTimeEnd = $routeParams.endTime ? $routeParams.endTime : Date.now();
      this.alertsTimeStart = this.alertsTimeEnd - this.alertsTimeOffset;
      this.actionsHistory = [];
      this.getAlert(this._alertId);
      this.getActions(this._alertId);

    }

    public getAlert(alertId:AlertId) {
      return this.HawkularAlert.Alert.get({alertId: alertId}, (alertResponse) => {
        this.detailAlert = alertResponse;
        let descriptionsParts = alertResponse.trigger.description.split('~');
        this.description = descriptionsParts[0];
        this.feedId = descriptionsParts[1];

      });
    }

    public getActions(alertId:AlertId) {
      return this.HawkularAlertsManager.queryActionsHistory(alertId).then((queriedActions) => {
        console.dir(queriedActions);
        this.actionsHistory = queriedActions.actionsList;
      });
    }

    public resolve():void {
      this.$log.log('ResolveDetail: ' + this._alertId);
      this.isWorking = true;

      let resolvedAlerts = {
        alertIds: this._alertId,
        resolvedBy: this.$rootScope.currentPersona.name,
        resolvedNotes: 'Manually resolved'
      };

      this.HawkularAlertsManager.resolveAlerts(resolvedAlerts).then(() => {
        this.isWorking = false;
        this.getAlert(this._alertId);
        this.getActions(this._alertId);
      });
    }


    public acknowledge() {
      this.$log.log('Ack Alert Detail: ' + this._alertId);
      this.isWorking = true;

      let ackAlerts = {
        alertIds: this._alertId,
        ackBy: this.$rootScope.currentPersona.name,
        ackNotes: 'Manually acknowledged'
      };

      this.HawkularAlertsManager.ackAlerts(ackAlerts).then(() => {
        this.isWorking = false;
        this.getAlert(this._alertId);
        this.getActions(this._alertId);
      });
    }



    public refreshHistoricalChartDataForTimestamp(resourceId:ResourceId,
                                                  startTime?:TimestampInMillis,
                                                  endTime?:TimestampInMillis):void {
      /// calling refreshChartData without params use the model values
      if (!endTime) {
        endTime = this.endTimeStamp;
      }
      if (!startTime) {
        startTime = this.startTimeStamp;
      }

      if (resourceId) {

        this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id, resourceId,
          startTime, endTime, 120)
          .then((response) => {

            // we want to isolate the response from the data we are feeding to the chart
            this.bucketedDataPoints = MetricsService.formatBucketedChartOutput(response);

            if (this.bucketedDataPoints.length) {
              // this is basically the DTO for the chart
              this.chartData = {
                id: resourceId,
                startTimeStamp: startTime,
                endTimeStamp: endTime,
                dataPoints: this.bucketedDataPoints
              };

            } else {
              this.$log.warn('No Data found for id: ' + resourceId);
            }

          }, (error) => {
            this.NotificationsService.error('Error Loading Chart Data: ' + error);
          });
      }
    }


  }

  _module.controller('AlertsCenterDetailsController', AlertsCenterDetailsController);
}

