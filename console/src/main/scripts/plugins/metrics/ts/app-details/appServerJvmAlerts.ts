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
/// <reference path="../alertsManager.ts"/>
/// <reference path="../errorManager.ts"/>

module HawkularMetrics {

  export class JvmAlertController {
    public static  $inject = ['$scope', 'HawkularAlert', 'HawkularAlertsManager', 'HawkularErrorManager', '$log', '$q',
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
                private HawkularErrorManager: HawkularMetrics.IHawkularErrorManager,
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
        return this.HawkularAlertsManager.createJvmHeapTrigger(this.resourceId + '_jvm_pheap',
          this.resourceId + '_jvm_pheap', true, 'THRESHOLD', this.defaultEmail);
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
      this.alertsTimeEnd = this.$routeParams.endTime ? this.$routeParams.endTime : (new Date()).getTime();
      this.alertsTimeStart = this.alertsTimeEnd - this.alertsTimeOffset;

      this.HawkularAlertsManager.queryConsoleAlerts(this.resourceId, this.alertsTimeStart, this.alertsTimeEnd,
        undefined, this.resCurPage, this.resPerPage).then((queriedAlerts)=> {
        this.headerLinks = this.HkHeaderParser.parse(queriedAlerts.headers);
        this.alertList = queriedAlerts.alertList;
        this.alertList.$resolved = true; // FIXME
      }, (error) => { return this.HawkularErrorManager.errorHandler(error, 'Error fetching alerts.'); });
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
    public static  $inject = ['$scope', 'HawkularAlert', 'HawkularAlertsManager', 'HawkularErrorManager', '$log', '$q',
      '$rootScope', '$routeParams', '$modalInstance', 'HawkularMetric'];

    private resourceId: string;
    private trigger: any;
    private dampening: any;
    private conditionGt: any;
    private conditionLt: any;
    public responseDuration: number;

    private conditionGtEnabled: boolean;
    private conditionLtEnabled: boolean;

    // TODO - Get the actual data from backend
    public maxUsage: number = 500;

    public saveProgress: boolean = false;
    public duration: number;
    public responseUnit: number = 1;
    public downtimeUnit: number = 1;
    public durationEnabled = false;

    public isSettingChange = false;

    public timeUnits = [
      {value: 1, label: 'milliseconds'},
      {value: 1000, label: 'seconds'},
      {value: 60000, label: 'minutes'},
      {value: 3600000, label: 'hours'}
    ];

    public timeUnitsDict = {
      '1': 'milliseconds',
      '1000': 'seconds',
      '60000': 'minutes',
      '3600000': 'hours'
    };

    constructor(public $scope:any,
                private HawkularAlert:any,
                private HawkularAlertsManager: HawkularMetrics.IHawkularAlertsManager,
                private HawkularErrorManager: HawkularMetrics.IHawkularErrorManager,
                private $log: ng.ILogService,
                private $q: ng.IQService,
                private $rootScope: any,
                private $routeParams: any,
                private $modalInstance: any,
                private HawkularMetric: any) {

      this.$log.debug('querying data');
      this.$log.debug('$routeParams', $routeParams.resourceId);

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
        this.durationEnabled = this.dampening.evalTimeSetting !== 0;

        this.responseUnit = this.getTimeUnit(this.dampening.evalTimeSetting);
        this.responseDuration = this.dampening.evalTimeSetting / this.responseUnit;

        this.$log.debug('HawkularAlert.Dampening.query', data);
        return HawkularAlert.Condition.query({triggerId: triggerId}).$promise;
      }).then((data)=> {
        this.conditionGt = _.filter(data, {operator: 'GT'})[0];
        this.conditionGtEnabled = !!this.conditionGt;
        this.conditionLt = _.filter(data, {operator: 'LT'})[0];
        this.conditionLtEnabled = !!this.conditionLt;

        this.$log.debug('HawkularAlert.Condition.query', this.conditionLt, this.conditionGt);
      });
    }

    public enableGt(): void {
      this.$log.debug('enableGt');

      var triggerId: string = this.trigger.id;
      var resourceId: string = triggerId.slice(0,-10);
      var dataId: string = 'MI~R~[' + resourceId + '~/]~MT~WildFly Memory Metrics~Heap Used';

      if (this.conditionGtEnabled) {
        this.HawkularAlertsManager.createCondition(triggerId, {
          type: 'THRESHOLD',
          triggerId: triggerId,
          threshold: 80,
          dataId: dataId,
          operator: 'GT'
        }).then( (data:any) => {
          this.conditionGt = _.filter(data, {operator: 'GT'})[0];
          this.$log.debug('this.conditionGt', this.conditionGt);
        });
      } else {
        this.$log.debug('Going to delete', this.conditionGt.conditionId);
        this.HawkularAlertsManager.deleteCondition(triggerId, this.conditionGt.conditionId).then(()=> {
          this.conditionGt = undefined;
        });
      }
    }

    public enableLt(): void {
      this.$log.debug('enableLt');

      var triggerId: string = this.trigger.id;
      var resourceId: string = triggerId.slice(0,-10);
      var dataId: string = 'MI~R~[' + resourceId + '~/]~MT~WildFly Memory Metrics~Heap Used';

      if (this.conditionLtEnabled) {
        this.HawkularAlertsManager.createCondition(triggerId, {
          type: 'THRESHOLD',
          triggerId: triggerId,
          threshold: 20,
          dataId: dataId,
          operator: 'LT'
        }).then( (data:any) => {
          this.conditionLt = _.filter(data, {operator: 'LT'})[0];
          this.$log.debug('this.conditionLt', this.conditionLt);
        });
      } else {
        this.$log.debug('Going to delete', this.conditionLt.conditionId);
        this.HawkularAlertsManager.deleteCondition(triggerId, this.conditionLt.conditionId).then(()=> {
          this.conditionLt = undefined;
        });
      }
    }

    // Get the most meaningful time unit (so that time value is not a very long fraction).
    private getTimeUnit(timeValue: number): number {
      var timeUnit = 1;

      for (var i = 0; i < this.timeUnits.length; i++) {
        var unit = this.timeUnits[i].value;
        if (timeValue % unit === 0 && unit > timeUnit) {
          timeUnit = unit;
        }
      }

      return timeUnit;
    }

    public changeTimeUnits():void {
      this.duration = this.dampening / this.responseUnit;

      this.alertSettingTouch();
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
        return this.HawkularErrorManager.errorHandler(error, 'Error saving email action.', errorCallback);
      }).then(()=> {
        var dampening = angular.copy(this.dampening);

        if (!this.durationEnabled) {
          this.dampening.evalTimeSetting = 0;
        }

        return this.HawkularAlertsManager.updateDampening(this.trigger.id,this.dampening.dampeningId,
          dampening);
      }, (error)=> {
        return this.HawkularErrorManager.errorHandler(error, 'Error updating trigger', errorCallback);
      }).then(()=> {
        return this.HawkularAlertsManager.updateCondition(this.trigger.id, this.conditionGt.conditionId,
          this.conditionGt);
      }, (error)=> {
        return this.HawkularErrorManager.errorHandler(error, 'Error updating dampening.', errorCallback);
      }).then(() => {
        return this.HawkularAlertsManager.updateCondition(this.trigger.id, this.conditionLt.conditionId,
          this.conditionLt);
      }, (error) => {
        return this.HawkularErrorManager.errorHandler(error, 'Error updating conditionGt condition.', errorCallback);
      }).then(angular.noop, (error)=> {
        isError = true;
        return this.HawkularErrorManager.errorHandler(error, 'Error updating conditionLt condition.', errorCallback);
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
      this.dampening.evalTimeSetting = this.responseDuration * this.responseUnit;
    }

  }

  _module.controller('JvmAlertSetupController', JvmAlertSetupController);
}

