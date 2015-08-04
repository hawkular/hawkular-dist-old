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
/// <reference path="../../includes.ts"/>
/// <reference path="../services/alertsManager.ts"/>
/// <reference path="../services/errorsManager.ts"/>

module HawkularMetrics {

  export class JvmAlertController {
    public static  $inject = ['$scope', 'HawkularAlert', 'HawkularAlertsManager', 'ErrorsManager', '$log', '$q',
      '$rootScope', '$routeParams', '$modal', '$interval', 'HkHeaderParser'];

    private resourceId: string;
    public alertList: any  = [];
    public defaultEmail: string;

    public isResolvingAll: boolean = false;

    public alertsTimeStart: TimestampInMillis;
    public alertsTimeEnd: TimestampInMillis;
    public alertsTimeOffset: TimestampInMillis;

    public resCurPage: number = 0;
    public resPerPage: number = 5;
    public headerLinks: any;

    constructor(private $scope:any,
                private HawkularAlert:any,
                private HawkularAlertsManager: HawkularMetrics.IHawkularAlertsManager,
                private ErrorsManager: HawkularMetrics.IErrorsManager,
                private $log: ng.ILogService,
                private $q: ng.IQService,
                private $rootScope: any,
                private $routeParams: any,
                private $modal: any,
                private $interval: ng.IIntervalService,
                private HkHeaderParser: any) {

      this.resourceId = $routeParams.resourceId;
      this.alertsTimeOffset = $routeParams.timeOffset || 3600000;
      // If the end time is not specified in URL use current time as end time
      this.alertsTimeEnd = $routeParams.endTime ? $routeParams.endTime : (new Date()).getTime();
      this.alertsTimeStart = this.alertsTimeEnd - this.alertsTimeOffset;

      this.defaultEmail = this.$rootScope.userDetails.email || 'myemail@company.com';

      this.getAlerts();
      this.autoRefresh(20);
    }

    public openSetup():void {
      // Check if trigger exists on alerts setup modal open. If not, create the trigger before opening the modal

      var heapTriggerPromise = this.HawkularAlertsManager.getTrigger(this.resourceId + '_jvm_pheap').then(() => {
        // Jvm trigger exists, nothing to do
          this.$log.debug('Jvm trigger exists, nothing to do');
      }, () => {
        // Jvm trigger doesn't exist, need to create one
        var low = AppServerJvmDetailsController.MAX_HEAP * 0.2;
        var high = AppServerJvmDetailsController.MAX_HEAP * 0.8;
        return this.HawkularAlertsManager.createJvmHeapTrigger(this.resourceId + '_jvm_pheap',
          this.resourceId + '_jvm_pheap', true, 'RANGE', this.defaultEmail, low, high);
      });
/*
      var nonHeapTriggerPromise = this.HawkularAlertsManager.getTrigger(this.resourceId + '_jvm_nheap').then(() => {
        // Jvm trigger exists, nothing to do
        this.$log.debug('Jvm trigger exists, nothing to do');
      }, () => {
        // Jvm trigger doesn't exist, need to create one
        this.HawkularAlertsManager.createJvmNonHeapTrigger(this.resourceId + '_jvm_nheap', 'blabla', true,
          'THRESHOLD', this.defaultEmail);
      });

      var garbageTriggerPromise = this.HawkularAlertsManager.getTrigger(this.resourceId + '_jvm_garba').then(() => {
        // Jvm trigger exists, nothing to do
        this.$log.debug('Jvm trigger exists, nothing to do');
      }, () => {
        // Jvm trigger doesn't exist, need to create one
        this.HawkularAlertsManager.createJvmGarbageTrigger(this.resourceId + '_jvm_garba', 'blabla', true,
          'THRESHOLD', this.defaultEmail);
      });


      this.$q.all([heapTriggerPromise, nonHeapTriggerPromise, garbageTriggerPromise]).then( () => {
*/
      var log = this.$log;

      this.$q.all([heapTriggerPromise]).then( () => {
        var modalInstance = this.$modal.open({
          templateUrl: 'plugins/metrics/html/app-details/alerts-setup-jvm.html',
          controller: 'JvmAlertSetupController as jas'
        });

        modalInstance.result.then(angular.noop, function () {
          log.debug('Jvm Alert Setup modal dismissed at: ' + new Date());
        });
      }, () => {
        this.$log.error('Missing and unable to create new JVM Alert triggers.');
      });

    }

    private autoRefresh(intervalInSeconds:number):void {
      var autoRefreshPromise = this.$interval(()  => {
        this.getAlerts();
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(autoRefreshPromise);
      });
    }

    public getAlerts():void {
      /* FIXME: This is done in appServerJvmDetails
      this.alertsTimeEnd = this.$routeParams.endTime ? this.$routeParams.endTime : (new Date()).getTime();
      this.alertsTimeStart = this.alertsTimeEnd - this.alertsTimeOffset;

      this.HawkularAlertsManager.queryConsoleAlerts(this.resourceId, this.alertsTimeStart, this.alertsTimeEnd,
        undefined, this.resCurPage, this.resPerPage).then((queriedAlerts)=> {
        this.headerLinks = this.HkHeaderParser.parse(queriedAlerts.headers);
        this.alertList = queriedAlerts.alertList;
        this.alertList.$resolved = true; // FIXME
      }, (error) => { return this.ErrorsManager.errorHandler(error, 'Error fetching alerts.'); });
      */
    }

    public setPage(page:number):void {
      this.resCurPage = page;
      this.getAlerts();
    }

    public resolveAll(): void {
      this.isResolvingAll = true;
      var alertIdList = '';
      for (var i = 0; i < this.alertList.length; i++) {
        alertIdList = alertIdList + this.alertList[i].id + ',';
      }
      alertIdList = alertIdList.slice(0, - 1);

      this.HawkularAlert.Alert.resolve({alertIds: alertIdList}, {}).$promise.then( () => {
        this.alertList.length = 0;
        this.isResolvingAll = false;
      });
    }
  }

  _module.controller('JvmAlertController', JvmAlertController);

  export class JvmAlertSetupController {
    public static  $inject = ['$scope', 'HawkularAlert', 'HawkularAlertsManager', 'ErrorsManager', '$log', '$q',
      '$rootScope', '$routeParams', '$modalInstance', 'HawkularMetric'];

    private resourceId: string;
    private trigger: any;
    private dampening: any;
    private conditionGt: any;
    public responseDuration: number;

    private conditionGtEnabled: boolean;
    private conditionLtEnabled: boolean;

    public conditionGtPercent: number;
    public conditionLtPercent: number;

    // TODO - Get the actual data from backend
    public maxUsage: number = AppServerJvmDetailsController.MAX_HEAP;

    public saveProgress: boolean = false;

    public isSettingChange = false;

    constructor(public $scope:any,
                private HawkularAlert:any,
                private HawkularAlertsManager: HawkularMetrics.IHawkularAlertsManager,
                private ErrorsManager: HawkularMetrics.IErrorsManager,
                private $log: ng.ILogService,
                private $q: ng.IQService,
                private $rootScope: any,
                private $routeParams: any,
                private $modalInstance: any,
                private HawkularMetric: any) {

      this.$log.debug('querying data');
      this.$log.debug('$routeParams', $routeParams.resourceId);

      this.maxUsage = AppServerJvmDetailsController.MAX_HEAP;

      // TODO - update the pfly notification service to support more and category based notifications containers.
      this.$rootScope.hkNotifications = {alerts: []};
      this.resourceId = $routeParams.resourceId;
      this.$log.debug('this.resourceId', this.resourceId);

      var triggerId: string = this.resourceId + '_jvm_pheap';
/*
      this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
        gaugeId: 'MI~R~[' + this.$routeParams.resourceId + '~/]~MT~WildFly Memory Metrics~Heap Max',
        buckets: 1}, (resource) => {
        this.maxUsage = resource[0];
      }, this);
*/
      this.HawkularAlertsManager.getTrigger(triggerId).then((data) => {
        this.$log.debug('getTrigger', data);
        this.trigger = data;
        return HawkularAlert.Dampening.query({triggerId: triggerId}).$promise;
      }).then((data) => {
        this.dampening = data[0];
        this.responseDuration = this.dampening.evalTimeSetting;

        this.$log.debug('HawkularAlert.Dampening.query', data);
        return HawkularAlert.Condition.query({triggerId: triggerId}).$promise;
      }).then((data)=> {
        this.conditionGt = data[0];
        this.conditionGtEnabled = this.conditionGt.thresholdHigh < this.maxUsage;
        this.conditionGtPercent = this.conditionGt.thresholdHigh > 0 ?
          this.conditionGt.thresholdHigh * 100 / this.maxUsage : 0;

        this.conditionLtEnabled = this.conditionGt.thresholdLow > 0;
        this.conditionLtPercent = this.conditionGt.thresholdLow > 0 ?
          this.conditionGt.thresholdLow * 100 / this.maxUsage : 0;

        this.$log.debug('HawkularAlert.Condition.query', this.conditionGt);
      });
    }

    public enableGt(): void {
      this.$log.debug('enableGt');

      var triggerId: string = this.trigger.id;
      var conditionId: string = this.conditionGt.conditionId;

      this.conditionGt.thresholdHigh = this.conditionGtEnabled ? (this.maxUsage / this.conditionGtPercent) :
        this.maxUsage;

      this.HawkularAlertsManager.updateCondition(triggerId, conditionId, this.conditionGt).then((data:any) => {
        this.conditionGt = data[0];
        this.$log.debug('this.conditionGt', this.conditionGt);
      });
    }

    public enableLt(): void {
      this.$log.debug('enableLt');

      var triggerId: string = this.trigger.id;
      var conditionId: string = this.conditionGt.conditionId;

      this.conditionGt.thresholdLow = this.conditionLtEnabled ? (this.maxUsage / this.conditionLtPercent) : 0;

      this.HawkularAlertsManager.updateCondition(triggerId, conditionId, this.conditionGt).then((data:any) => {
        this.conditionGt = data[0];
        this.$log.debug('this.conditionGt', this.conditionGt);
      });
    }

    public cancel(): void {
      this.$modalInstance.dismiss('cancel');
    }

    public save(): void {
      this.$log.debug('Saving Alert Settings');

      // Clear alerts notifications on save (discard previous success/error list)
      this.$rootScope.hkNotifications.alerts = [];

      // Error notification done with callback function on error
      var errorCallback = (error: any, msg: string) => {
        this.$rootScope.hkNotifications.alerts.push({
          type: 'error',
          message: msg
        });
      };

      this.saveProgress = true;
      var isError = false;
      // Check if email action exists
      this.HawkularAlertsManager.addEmailAction(this.trigger.actions.email[0]).then(()=> {
          return this.HawkularAlertsManager.updateTrigger(this.trigger.id, this.trigger);
      }, (error)=> {
        return this.ErrorsManager.errorHandler(error, 'Error saving email action.', errorCallback);
      }).then(()=> {
        this.dampening.evalTimeSetting = this.responseDuration;

        return this.HawkularAlertsManager.updateDampening(this.trigger.id,this.dampening.dampeningId, this.dampening);
      }, (error)=> {
        return this.ErrorsManager.errorHandler(error, 'Error updating trigger', errorCallback);
      }).then(()=> {
        this.conditionGt.thresholdHigh = this.conditionGtEnabled ? this.maxUsage * this.conditionGtPercent / 100 :
          this.maxUsage;
        this.conditionGt.thresholdLow = this.conditionLtEnabled ? this.maxUsage * this.conditionLtPercent / 100 : 0;
        return this.HawkularAlertsManager.updateCondition(this.trigger.id, this.conditionGt.conditionId,
          this.conditionGt);
      }, (error)=> {
        return this.ErrorsManager.errorHandler(error, 'Error updating dampening.', errorCallback);
      }).then(angular.noop, (error)=> {
        isError = true;
        return this.ErrorsManager.errorHandler(error, 'Error updating conditionGt condition.', errorCallback);
      }).finally(()=> {
        this.saveProgress = false;

        if(!isError)  {
          // notify success
          this.$rootScope.hkNotifications.alerts.push({
            type: 'success',
            message: 'Changes saved successfully.'
          });
        }

        this.cancel();
      });
    }

    public alertSettingTouch(): void {
      this.$log.debug('alertSettingTouch');
    }

  }

  _module.controller('JvmAlertSetupController', JvmAlertSetupController);
}

