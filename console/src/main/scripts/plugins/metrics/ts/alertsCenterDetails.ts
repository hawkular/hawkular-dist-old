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
/// <reference path="services/alertsManager.ts"/>
/// <reference path="services/errorsManager.ts"/>

module HawkularMetrics {

  export class AlertsCenterDetailsController {

    public static $inject = ['$scope', 'HawkularAlertsManager', 'ErrorsManager',
      '$log', '$q', '$rootScope', '$routeParams', '$location', 'MetricsService', 'NotificationsService'];

    private _alertId: AlertId;
    public feedId: FeedId;
    public detailAlert: IAlert;
    public description: string;
    public comments: string;
    public status: string;
    public statuses;

    public endTimeStamp: TimestampInMillis;
    public startTimeStamp: TimestampInMillis;

    public alertsTimeStart: TimestampInMillis;
    public alertsTimeEnd: TimestampInMillis;
    public alertsTimeOffset: TimestampInMillis;
    public isWorking: boolean = false;

    public actionsHistory;

    constructor(private $scope: any,
      private HawkularAlertsManager: IHawkularAlertsManager,
      private ErrorsManager: IErrorsManager,
      private $log: ng.ILogService,
      private $q: ng.IQService,
      private $rootScope: IHawkularRootScope,
      private $routeParams: any,
      private $location: ng.ILocationService,
      private MetricsService: IMetricsService,
      private NotificationsService: INotificationsService) {
      $scope.acd = this;
      this._alertId = $routeParams.alertId;

      $scope.$on('SwitchedPersona', () => $location.path('/hawkular-ui/alerts-center/'));

      this.alertsTimeOffset = $routeParams.timeOffset || $rootScope.hkParams.timeOffset || DEF_TIME_OFFSET;
      // If the end time is not specified in URL use current time as end time
      this.alertsTimeEnd = $routeParams.endTime ? $routeParams.endTime : Date.now();
      this.alertsTimeStart = this.alertsTimeEnd - this.alertsTimeOffset;
      this.actionsHistory = [];
      this.statuses = [];
      this.getAlert(this._alertId);
      this.getActions(this._alertId);
    }

    public getAlert(alertId: AlertId) {
      return this.HawkularAlertsManager.queryAlerts({ alertIds: alertId }).then((alerts) => {
        let alert = alerts.alertList[0];
        this.detailAlert = alert;
        this.description = alert.trigger.description;
        let resourcePath = alert.context.resourcePath;
        this.feedId = resourcePath.indexOf('/f;') === -1 ? '' :
          resourcePath.substring(resourcePath.lastIndexOf('/f;') + 3, resourcePath.indexOf('/r;'));
        this.status = alert.status;
        if (this.status === 'OPEN') {
          this.statuses = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'];
        } else {
          this.statuses = ['ACKNOWLEDGED', 'RESOLVED'];
        }
        if (alert.status === 'OPEN' || alert.status === 'ACKNOWLEDGED') {
          this.comments = alert.ackNotes;
        } else {
          this.comments = alert.resolvedNotes;
        }
        this.getSparklineData(alert);
      });
    }

    public getActions(alertId: AlertId) {
      return this.HawkularAlertsManager.queryActionsHistory({ alertIds: alertId, sort: 'ctime', thin: false })
        .then((queriedActions) => {
          console.dir(queriedActions);
          this.actionsHistory = queriedActions.actionsList;
        });
    }

    public cancel(): void {
      //let timeOffset = this.alertsTimeOffset;
      //let endTime = this.alertsTimeEnd;
      //this.$location.url(`/hawkular-ui/alerts-center/${timeOffset}/${endTime}`);
      this.$location.url(`/hawkular-ui/alerts-center/`);
    }

    public save(): void {
      if (this.status === this.detailAlert.status) {
        if (this.comments && this.comments.length > 0) {
          this.notes();
        }
      } else {
        if (this.status === 'ACKNOWLEDGED') {
          this.acknowledge();
        } else {
          this.resolve();
        }
      }
    }

    public notes(): void {
      this.isWorking = true;

      let newComment = {
        alertId: this._alertId,
        user: this.$rootScope.currentPersona.name,
        text: this.comments
      };

      this.HawkularAlertsManager.addNote(newComment).then(() => {
        this.isWorking = false;
        this.getAlert(this._alertId);
        this.getActions(this._alertId);
      });
    }

    public resolve(): void {
      this.$log.log('ResolveDetail: ' + this._alertId);
      this.isWorking = true;

      let resolvedAlerts = {
        alertIds: this._alertId,
        resolvedBy: this.$rootScope.currentPersona.name,
        resolvedNotes: this.comments
      };

      if (!resolvedAlerts.resolvedNotes || resolvedAlerts.resolvedNotes.length === 0) {
        resolvedAlerts.resolvedNotes = 'Manually resolved';
      }

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
        ackNotes: this.comments
      };

      if (!ackAlerts.ackNotes || ackAlerts.ackNotes.length === 0) {
        ackAlerts.ackNotes = 'Manually acknowledged ';
      }

      this.HawkularAlertsManager.ackAlerts(ackAlerts).then(() => {
        this.isWorking = false;
        this.getAlert(this._alertId);
        this.getActions(this._alertId);
      });
    }

    public getSparklineData(alert: IAlert) {
      // show 30 mins before and after the alert (this helps always having 1h of data too)
      let offset = 30 * 60 * 1000;
      // Works for Accum GC.. possibly others ?
      let metricsMethod = !!alert.dataId.match(new RegExp('accumulated', 'i')) ?
        'retrieveCounterRateMetrics' : 'retrieveGaugeMetrics';
      this.MetricsService[metricsMethod](this.$rootScope.userDetails.id,
        alert.dataId,
        alert.start - offset, alert.end + offset, 60).then((resource) => {
          this['alertChartData'] = resource;
        });
    }

  }

  _module.controller('AlertsCenterDetailsController', AlertsCenterDetailsController);
}
