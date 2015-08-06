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
    public static  $inject = ['$scope', 'HawkularAlertsManager', 'ErrorsManager', '$log', '$q',
      '$rootScope', '$routeParams', '$modalInstance'];

    // Trigger definitions are GET in the constructor. They are used as backup reference to avoid persisting
    // non-changed entities.
    private triggerDefinition: any = {};

    // Alert Definition Model, used in the view
    public adm: any = {
      heap: {},
      nheap: {},
      gcol: {}
    };

    // TODO - Get the actual data from backend
    public maxUsage: number = AppServerJvmDetailsController.MAX_HEAP;

    public saveProgress: boolean = false;

    public isSettingChange = false;

    constructor(public $scope:any,
                private HawkularAlertsManager: HawkularMetrics.IHawkularAlertsManager,
                private ErrorsManager: HawkularMetrics.IErrorsManager,
                private $log: ng.ILogService,
                private $q: ng.IQService,
                private $rootScope: any,
                private $routeParams: any,
                private $modalInstance: any) {

      this.maxUsage = AppServerJvmDetailsController.MAX_HEAP;

      // TODO - update the pfly notification service to support more and category based notifications containers.
      this.$rootScope.hkNotifications = {alerts: []};

      var triggerId: string = $routeParams.resourceId + '_jvm_pheap';

      // Heap Usage trigger definition
      this.HawkularAlertsManager.getAlertDefinition(triggerId).then( (alertDefinitionData) => {
        this.triggerDefinition['heap'] = alertDefinitionData;

        this.adm.heap['trigger'] = alertDefinitionData.trigger;

        this.adm.heap['email'] = alertDefinitionData.trigger.actions.email[0];

        this.adm.heap['dampening'] = alertDefinitionData.dampenings[0];
        this.adm.heap['responseDuration'] = this.adm.heap.dampening.evalTimeSetting;

        this.adm.heap['condition'] = alertDefinitionData.conditions[0];
        this.adm.heap['conditionGtEnabled'] = this.adm.heap.condition.thresholdHigh < this.maxUsage;
        this.adm.heap['conditionGtPercent'] = this.adm.heap.condition.thresholdHigh > 0 ?
        this.adm.heap.condition.thresholdHigh * 100 / this.maxUsage : 0;

        this.adm.heap['conditionLtEnabled'] = this.adm.heap.condition.thresholdLow > 0;
        this.adm.heap['conditionLtPercent'] = this.adm.heap.condition.thresholdLow > 0 ?
        this.adm.heap.condition.thresholdLow * 100 / this.maxUsage : 0;
      });

      // Non-Heap Usage trigger definition

      // Garbage Collection trigger definition
    }

    public enableHeapGt(): void {
      var triggerId: string = this.adm.heap.trigger.id;
      var conditionId: string = this.adm.heap.condition.conditionId;

      this.adm.heap.condition.thresholdHigh = this.adm.heap.conditionGtEnabled ?
        (this.maxUsage / this.adm.heap.conditionGtPercent) : this.maxUsage;

      this.HawkularAlertsManager.updateCondition(triggerId, conditionId, this.adm.heap.condition).then((data:any) => {
        this.triggerDefinition.heap.conditions = data;
        this.adm.heap.condition = data[0];
        this.$log.debug('this.conditionGt', this.adm.heap.condition);
      });
    }

    public enableHeapLt(): void {
      var triggerId: string = this.adm.heap.trigger.id;
      var conditionId: string = this.adm.heap.condition.conditionId;

      this.adm.heap.condition.thresholdLow = this.adm.heap.conditionLtEnabled ?
        (this.maxUsage / this.adm.heap.conditionLtPercent) : 0;

      this.HawkularAlertsManager.updateCondition(triggerId, conditionId, this.adm.heap.condition).then((data:any) => {
        this.triggerDefinition.heap.conditions = data;
        this.adm.heap.condition = data[0];
        this.$log.debug('this.conditionGt', this.adm.heap.condition);
      });
    }

    public cancel(): void {
      this.$modalInstance.dismiss('cancel');
    }

    public save(): void {
      this.$log.debug('Saving Alert Settings');

      // Clear alerts notifications on save (discard previous success/error list)
      this.$rootScope.hkNotifications.alerts = [];

      var isError = false;

      // Error notification done with callback function on error
      var errorCallback = (error: any, msg: string) => {
        this.$rootScope.hkNotifications.alerts.push({
          type: 'error',
          message: msg
        });
        isError = true;
      };

      // Field helping to disable the save button while save action is in progress.
      this.saveProgress = true;

      // Create an alert definition objects (trigger, dampening, condition) to
      var heapAlertDefinition = angular.copy(this.triggerDefinition.heap);
      heapAlertDefinition.trigger.actions.email[0] = this.adm.heap.email;
      heapAlertDefinition.dampenings[0].evalTimeSetting = this.adm.heap.responseDuration;

      heapAlertDefinition.conditions[0].thresholdHigh = this.adm.heap.conditionGtEnabled ?
        this.maxUsage * this.adm.heap.conditionGtPercent / 100 : this.maxUsage;

      heapAlertDefinition.conditions[0].thresholdLow = this.adm.heap.conditionLtEnabled ?
        this.maxUsage * this.adm.heap.conditionLtPercent / 100 : 0;

      // Actual save of the alert definition
      this.HawkularAlertsManager.saveAlertDefinition(heapAlertDefinition, errorCallback,
        this.triggerDefinition.heap).finally(()=> {

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
