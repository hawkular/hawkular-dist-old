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
    public static  $inject = ['$scope', 'HawkularAlertsManager', 'ErrorsManager','NotificationsService',
      '$log', '$q', '$rootScope', '$routeParams', '$modal', '$interval', 'HkHeaderParser'];

    private resourceId:string;
    public alertList:any = [];
    public defaultEmail:string;

    public isResolvingAll:boolean = false;

    public alertsTimeStart:TimestampInMillis;
    public alertsTimeEnd:TimestampInMillis;
    public alertsTimeOffset:TimestampInMillis;

    public resCurPage:number = 0;
    public resPerPage:number = 5;
    public headerLinks:any;

    constructor(private $scope:any,
                private HawkularAlertsManager:IHawkularAlertsManager,
                private ErrorsManager:IErrorsManager,
                private NotificationsService:INotificationsService,
                private $log:ng.ILogService,
                private $q:ng.IQService,
                private $rootScope:IHawkularRootScope,
                private $routeParams:any,
                private $modal:any,
                private $interval:ng.IIntervalService,
                private HkHeaderParser:any) {

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
    //  // Check if trigger exists on alerts setup modal open. If not, create the trigger before opening the modal
    //
    //  let defaultEmail = this.$rootScope.userDetails.email || 'myemail@company.com';
    //
    //  let defaultEmailPromise = this.HawkularAlertsManager.addEmailAction(defaultEmail);
    //
    //  let heapTriggerPromise = this.HawkularAlertsManager.existTrigger(this.resourceId + '_jvm_pheap').then(() => {
    //    // Jvm trigger exists, nothing to do
    //    this.$log.debug('Jvm trigger exists, nothing to do');
    //  }, () => {
    //    // Jvm trigger doesn't exist, need to create one
    //    let low = AppServerJvmDetailsController.MAX_HEAP * 0.2;
    //    let high = AppServerJvmDetailsController.MAX_HEAP * 0.8;
    //
    //    let triggerId:string = this.resourceId + '_jvm_pheap';
    //    let resourceId:string = triggerId.slice(0, -10);
    //    let dataId:string = 'MI~R~[' + resourceId + '~~]~MT~WildFly Memory Metrics~Heap Used';
    //    let heapMaxId:string = 'MI~R~[' + resourceId + '~~]~MT~WildFly Memory Metrics~Heap Max';
    //
    //    let fullTrigger = {
    //      trigger: {
    //        name: 'JVM Heap Used',
    //        id: triggerId,
    //        description: 'JVM Heap Used for ' + resourceId,
    //        autoDisable: true, // Disable trigger after firing, to not have repeated alerts of same issue
    //        autoEnable: true, // Enable trigger once an alert is resolved
    //        autoResolve: false, // Don't change into AUTORESOLVE mode as we don't have AUTORESOLVE conditions
    //        severity: 'MEDIUM',
    //        actions: {email: [this.defaultEmail]},
    //        firingMatch: 'ANY',
    //        context: {
    //          description: 'JVM Heap Used for ' + resourceId, // Workaround for sorting
    //          resourceType: 'App Server',
    //          resourceName: resourceId,
    //          resourcePath: this.$rootScope.resourcePath,
    //          triggerType: 'RangeByPercent',
    //          triggerTypeProperty1: heapMaxId,
    //          triggerTypeProperty2: 'Heap Max'
    //        }
    //      },
    //      dampenings: [
    //        {
    //          triggerId: triggerId,
    //          evalTimeSetting: 7 * 60000,
    //          triggerMode: 'FIRING',
    //          type: 'STRICT_TIME'
    //        }
    //      ],
    //      conditions: [
    //        {
    //          triggerId: triggerId,
    //          type: 'COMPARE',
    //          dataId: dataId,
    //          data2Id: heapMaxId,
    //          operator: 'GT',
    //          data2Multiplier: 0.80, // 80%
    //          context: {
    //            description: 'Heap Used',
    //            unit: 'B'
    //          }
    //        },
    //        {
    //          triggerId: triggerId,
    //          type: 'COMPARE',
    //          dataId: dataId,
    //          data2Id: heapMaxId,
    //          operator: 'LT',
    //          data2Multiplier: 0.20, // 20%
    //          context: {
    //            description: 'Heap Used',
    //            unit: 'B'
    //          }
    //        }
    //      ]
    //    };
    //
    //    return this.HawkularAlertsManager.createTrigger(fullTrigger, () => {
    //      this.$log.error('Error on Trigger creation for ' + triggerId);
    //    });
    //  });
    //
    //  let nonHeapTriggerPromise = this.HawkularAlertsManager.existTrigger(this.resourceId + '_jvm_nheap').then(() => {
    //    // Jvm trigger exists, nothing to do
    //    this.$log.debug('Jvm trigger exists, nothing to do');
    //  }, () => {
    //    // Jvm trigger doesn't exist, need to create one
    //    let low = AppServerJvmDetailsController.MAX_HEAP * 0.2;
    //    let high = AppServerJvmDetailsController.MAX_HEAP * 0.8;
    //
    //    let triggerId:string = this.resourceId + '_jvm_nheap';
    //    let resourceId:string = triggerId.slice(0, -10);
    //    let dataId:string = 'MI~R~[' + resourceId + '~~]~MT~WildFly Memory Metrics~NonHeap Used';
    //    let heapMaxId:string = 'MI~R~[' + resourceId + '~~]~MT~WildFly Memory Metrics~Heap Max';
    //
    //    let fullTrigger = {
    //      trigger: {
    //        name: 'JVM Non Heap Used',
    //        id: triggerId,
    //        description: 'JVM Non Heap Used for ' + resourceId,
    //        autoDisable: true, // Disable trigger after firing, to not have repeated alerts of same issue
    //        autoEnable: true, // Enable trigger once an alert is resolved
    //        autoResolve: false, // Don't change into AUTORESOLVE mode as we don't have AUTORESOLVE conditions
    //        severity: 'HIGH',
    //        actions: {email: [this.defaultEmail]},
    //        firingMatch: 'ANY',
    //        context: {
    //          description: 'JVM Non Heap Used for ' + resourceId, // Workaround for sorting
    //          resourceType: 'App Server',
    //          resourceName: resourceId,
    //          resourcePath: this.$rootScope.resourcePath,
    //          triggerType: 'RangeByPercent',
    //          triggerTypeProperty1: heapMaxId,
    //          triggerTypeProperty2: 'Heap Max'
    //        }
    //      },
    //      dampenings: [
    //        {
    //          triggerId: triggerId,
    //          evalTimeSetting: 7 * 60000,
    //          triggerMode: 'FIRING',
    //          type: 'STRICT_TIME'
    //        }
    //      ],
    //      conditions: [
    //        {
    //          triggerId: triggerId,
    //          type: 'COMPARE',
    //          dataId: dataId,
    //          data2Id: heapMaxId,
    //          operator: 'GT',
    //          data2Multiplier: 0.80,  // 80%
    //          context: {
    //            description: 'Non Heap Used',
    //            unit: 'B'
    //          }
    //        },
    //        {
    //          triggerId: triggerId,
    //          type: 'COMPARE',
    //          dataId: dataId,
    //          data2Id: heapMaxId,
    //          operator: 'LT',
    //          data2Multiplier: 0.20, // 20%
    //          context: {
    //            description: 'Non Heap Used',
    //            unit: 'B'
    //          }
    //        }
    //      ]
    //    };
    //
    //    return this.HawkularAlertsManager.createTrigger(fullTrigger, () => {
    //      this.$log.error('Error on Trigger creation for ' + triggerId);
    //    });
    //  });
    //
    //  let garbageTriggerPromise = this.HawkularAlertsManager.existTrigger(this.resourceId + '_jvm_garba').then(() => {
    //    // Jvm trigger exists, nothing to do
    //    this.$log.debug('Jvm trigger exists, nothing to do');
    //  }, () => {
    //    // Jvm trigger doesn't exist, need to create one
    //    let triggerId:string = this.resourceId + '_jvm_garba';
    //    let resourceId:string = triggerId.slice(0, -10);
    //    let dataId:string = 'MI~R~[' + resourceId + '~~]~MT~WildFly Memory Metrics~Accumulated GC Duration';
    //
    //    let fullTrigger = {
    //      trigger: {
    //        name: 'Accumulated GC Duration',
    //        id: triggerId,
    //        description: 'Accumulated GC Duration for ' + resourceId,
    //        autoDisable: true, // Disable trigger after firing, to not have repeated alerts of same issue
    //        autoEnable: true, // Enable trigger once an alert is resolved
    //        autoResolve: false, // Don't change into AUTORESOLVE mode as we don't have AUTORESOLVE conditions
    //        severity: 'HIGH',
    //        actions: {email: [this.defaultEmail]},
    //        context: {
    //          description: 'Accumulated GC Duration for ' + resourceId, // Workaround for sorting
    //          resourceType: 'App Server',
    //          resourceName: resourceId,
    //          resourcePath: this.$rootScope.resourcePath,
    //          triggerType: 'Threshold'
    //        }
    //      },
    //      dampenings: [
    //        {
    //          triggerId: triggerId,
    //          evalTimeSetting: 7 * 60000,
    //          triggerMode: 'FIRING',
    //          type: 'STRICT_TIME'
    //        }
    //      ],
    //      conditions: [
    //        {
    //          triggerId: triggerId,
    //          type: 'THRESHOLD',
    //          dataId: dataId,
    //          threshold: 200,
    //          operator: 'GT',
    //          context: {
    //            description: 'GC Duration',
    //            unit: 'ms'
    //          }
    //        }
    //      ]
    //    };
    //
    //    return this.HawkularAlertsManager.createTrigger(fullTrigger, () => {
    //      this.$log.error('Error on Trigger creation for ' + triggerId);
    //    });
    //  });
    //
    //  let log = this.$log;
    //
    //  this.$q.all([defaultEmailPromise, heapTriggerPromise, nonHeapTriggerPromise,
    //               garbageTriggerPromise]).then(() => {
    //    let modalInstance = this.$modal.open({
    //      templateUrl: 'plugins/metrics/html/modals/alerts-jvm-setup.html',
    //      controller: 'JvmAlertSetupController as jas',
    //      resolve: {
    //        resourceId: () => {
    //          return this.resourceId;
    //        }
    //      }
    //    });
    //
    //    modalInstance.result.then(angular.noop, () => {
    //      log.info('Jvm Alert Setup modal dismissed at: ' + new Date());
    //    });
    //  }, () => {
    //    this.$log.error('Missing and unable to create new JVM Alert triggers.');
    //  });
    //
    }

    private autoRefresh(intervalInSeconds:number):void {
      let autoRefreshPromise = this.$interval(()  => {
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

    public resolveAll():void {
      this.isResolvingAll = true;
      let alertIdList = '';
      for (let i = 0; i < this.alertList.length; i++) {
        alertIdList = alertIdList + this.alertList[i].id + ',';
      }
      alertIdList = alertIdList.slice(0, -1);

      let resolvedAlerts = {
        alertIds: alertIdList,
        resolvedBy: this.$rootScope.currentPersona.name,
        resolvedNotes: 'Manually resolved'
      };

      this.HawkularAlertsManager.resolveAlerts(resolvedAlerts).then(() => {
        this.alertList.length = 0;
        this.isResolvingAll = false;
      });
    }
  }

  _module.controller('JvmAlertController', JvmAlertController);


  export class JvmAlertSetupController extends AlertSetupController {

    // TODO - Get the actual data from backend
    public maxUsage:number = AppServerJvmDetailsController.MAX_HEAP;

    loadTriggers():Array<ng.IPromise<any>> {
      function floor2Dec(doubleValue) {
        return Math.floor(doubleValue * 100) / 100;
      }

      let heapTriggerId:string = this.$routeParams.resourceId + '_jvm_pheap';

      let heapTriggerPromise = this.HawkularAlertsManager.getTrigger(heapTriggerId).then(
        (triggerData) => {
          this.triggerDefinition['heap'] = triggerData;

          //let triggerData = this.fullTrigger;
          this.adm.heap = {};
          // updateable
          this.adm.heap['description'] = triggerData.trigger.description;
          this.adm.heap['enabled'] = triggerData.trigger.enabled;
          this.adm.heap['name'] = triggerData.trigger.name;
          this.adm.heap['severity'] = triggerData.trigger.severity;

          this.adm.heap['email'] = triggerData.trigger.actions.email[0];
          this.adm.heap['evalTimeSetting'] = triggerData.dampenings[0].evalTimeSetting;

          if (triggerData.conditions[0].operator === 'GT') {
            this.adm.heap['conditionGtPercent'] = triggerData.conditions[0].data2Multiplier * 100;
            this.adm.heap['conditionLtPercent'] = triggerData.conditions[1].data2Multiplier * 100;
          } else {
            this.adm.heap['conditionGtPercent'] = triggerData.conditions[1].data2Multiplier * 100;
            this.adm.heap['conditionLtPercent'] = triggerData.conditions[0].data2multiplier * 100;
          }

          // presentation
          this.adm.heap['context'] = triggerData.trigger.context;
          this.adm.heap['conditionContext'] = triggerData.conditions[0].context;
        });

      // Non-Heap Usage trigger definition
      let nheapTriggerId:string = this.$routeParams.resourceId + '_jvm_nheap';

      let nheapTriggerPromise = this.HawkularAlertsManager.getTrigger(nheapTriggerId).then(
        (triggerData) => {
          this.triggerDefinition['heap'] = triggerData;

          //let triggerData = this.fullTrigger;
          this.adm.nheap = {};
          // updateable
          this.adm.nheap['description'] = triggerData.trigger.description;
          this.adm.nheap['enabled'] = triggerData.trigger.enabled;
          this.adm.nheap['name'] = triggerData.trigger.name;
          this.adm.nheap['severity'] = triggerData.trigger.severity;

          this.adm.nheap['email'] = triggerData.trigger.actions.email[0];
          this.adm.nheap['evalTimeSetting'] = triggerData.dampenings[0].evalTimeSetting;

          if (triggerData.conditions[0].operator === 'GT') {
            this.adm.nheap['conditionGtPercent'] = triggerData.conditions[0].data2Multiplier * 100;
            this.adm.nheap['conditionLtPercent'] = triggerData.conditions[1].data2Multiplier * 100;
          } else {
            this.adm.nheap['conditionGtPercent'] = triggerData.conditions[1].data2Multiplier * 100;
            this.adm.nheap['conditionLtPercent'] = triggerData.conditions[0].data2multiplier * 100;
          }

          // presentation
          this.adm.nheap['context'] = triggerData.trigger.context;
          this.adm.nheap['conditionContext'] = triggerData.conditions[0].context;
        });

      // Garbage Collection trigger definition
      let garbaTriggerId:string = this.$routeParams.resourceId + '_jvm_garba';

      let garbaTriggerPromise = this.HawkularAlertsManager.getTrigger(garbaTriggerId).then(
        (triggerData) => {
          this.triggerDefinition['garba'] = triggerData;

          this.adm.garba = {};
          this.adm.garba['email'] = triggerData.trigger.actions.email[0];
          this.adm.garba['responseDuration'] = triggerData.dampenings[0].evalTimeSetting;
          this.adm.garba['conditionEnabled'] = triggerData.trigger.enabled;
          this.adm.garba['conditionThreshold'] = triggerData.conditions[0].threshold;
        });

      return [heapTriggerPromise, nheapTriggerPromise, garbaTriggerPromise];
    }

    saveTriggers(errorCallback):Array<ng.IPromise<any>> {

      // Heap
      let heapTrigger = angular.copy(this.triggerDefinition.heap);
      heapTrigger.trigger.actions.email[0] = this.adm.heap.email;
      heapTrigger.dampenings[0].evalTimeSetting = this.adm.heap.responseDuration;
      heapTrigger.conditions[0].thresholdHigh = this.adm.heap.conditionGtEnabled ?
      this.maxUsage * this.adm.heap.conditionGtPercent / 100 : this.maxUsage;
      heapTrigger.conditions[0].thresholdLow = this.adm.heap.conditionLtEnabled ?
      this.maxUsage * this.adm.heap.conditionLtPercent / 100 : 0;

      let heapSavePromise = this.HawkularAlertsManager.updateTrigger(heapTrigger, errorCallback,
        this.triggerDefinition.heap);

      // Non Heap
      let nheapTrigger = angular.copy(this.triggerDefinition.nheap);
      nheapTrigger.trigger.actions.email[0] = this.adm.nheap.email;
      nheapTrigger.dampenings[0].evalTimeSetting = this.adm.nheap.responseDuration;
      nheapTrigger.conditions[0].thresholdHigh = this.adm.nheap.conditionGtEnabled ?
      this.maxUsage * this.adm.nheap.conditionGtPercent / 100 : this.maxUsage;
      nheapTrigger.conditions[0].thresholdLow = this.adm.nheap.conditionLtEnabled ?
      this.maxUsage * this.adm.nheap.conditionLtPercent / 100 : 0;

      let nheapSavePromise = this.HawkularAlertsManager.updateTrigger(nheapTrigger, errorCallback,
        this.triggerDefinition.nheap);

      // Garbage Collection
      let garbaTrigger = angular.copy(this.triggerDefinition.garba);
      garbaTrigger.trigger.enabled = this.adm.garba.conditionEnabled;

      if (this.adm.garba.conditionEnabled) {
        garbaTrigger.trigger.actions.email[0] = this.adm.garba.email;
        garbaTrigger.dampenings[0].evalTimeSetting = this.adm.garba.responseDuration;
        garbaTrigger.conditions[0].threshold = this.adm.garba.conditionEnabled ?
          this.adm.garba.conditionThreshold : 0;
      }

      let garbaSavePromise = this.HawkularAlertsManager.updateTrigger(garbaTrigger, errorCallback,
        this.triggerDefinition.garba);

      return [heapSavePromise, nheapSavePromise, garbaSavePromise];
    }
  }

  _module.controller('JvmAlertSetupController', JvmAlertSetupController);
}
