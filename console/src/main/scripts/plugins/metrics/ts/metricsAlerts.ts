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
/// <reference path="alertsManager.ts"/>
/// <reference path="errorManager.ts"/>

module HawkularMetrics {

  export class MetricsAlertController {
    public static  $inject = ['$scope', 'HawkularAlert', 'HawkularAlertsManager', 'HawkularErrorManager', '$log', '$q',
      '$rootScope', '$routeParams', '$modal', '$interval', 'HkHeaderParser'];

    private metricId: string;
    public alertList: any  = [];
    public openSetup: any;
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

      this.$log.debug('querying data');
      this.$log.debug('$routeParams', $routeParams);
      this.openSetup = () => {
        var modalInstance = $modal.open({
          templateUrl: 'plugins/metrics/html/alerts-setup.html',
          controller: 'MetricsAlertSetupController as mas'
        });

        modalInstance.result.then(function (selectedItem) {
          $scope.selected = selectedItem;
        }, function () {
          $log.info('Modal dismissed at: ' + new Date());
        });
      };

      this.metricId = $routeParams.resourceId;

      this.alertsTimeOffset = $routeParams.timeOffset || 3600000;
      // If the end time is not specified in URL use current time as end time
      this.alertsTimeEnd = $routeParams.endTime ? $routeParams.endTime : (new Date()).getTime();
      this.alertsTimeStart = this.alertsTimeEnd - this.alertsTimeOffset;
      this.getAlerts();
      this.autoRefresh(20);
    }

    public getAlerts():void {
      this.alertsTimeEnd = this.$routeParams.endTime ? this.$routeParams.endTime : (new Date()).getTime();
      this.alertsTimeStart = this.alertsTimeEnd - this.alertsTimeOffset;

      this.HawkularAlertsManager.queryConsoleAlerts(this.metricId, this.alertsTimeStart, this.alertsTimeEnd, undefined,
          this.resCurPage, this.resPerPage).then((queriedAlerts)=> {
        this.headerLinks = this.HkHeaderParser.parse(queriedAlerts.headers);
        this.alertList = queriedAlerts.alertList;
        this.alertList.$resolved = true; // FIXME
      }, (error) => { return this.HawkularErrorManager.errorHandler(error, 'Error fetching alerts.'); });
    }

    setPage(page:number):void {
      this.resCurPage = page;
      this.getAlerts();
    }

    private autoRefresh(intervalInSeconds:number):void {
      var autoRefreshPromise = this.$interval(()  => {
        this.getAlerts();
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(autoRefreshPromise);
      });
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

  _module.controller('MetricsAlertController', MetricsAlertController);

  export class MetricsAlertSetupController {
    public static  $inject = ['$scope', 'HawkularAlert', 'HawkularAlertsManager', 'HawkularErrorManager', '$log', '$q',
      '$rootScope', '$routeParams', '$modalInstance'];

    private metricId: string;
    private trigger_thres: any;
    private trigger_thres_damp: any;
    private trigger_thres_cond: any;
    private trigger_avail: any;
    private trigger_avail_damp: any;
    private alertSetupBackup: any = {};

    public saveProgress: boolean = false;
    public responseDuration: number;
    public downtimeDuration: number;
    public responseUnit: number = 1;
    public downtimeUnit: number = 1;
    public thresDampDurationEnabled = false;

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
                private $modalInstance: any) {

      this.$log.debug('querying data');
      this.$log.debug('$routeParams',$routeParams.resourceId);

      // TODO - update the pfly notification service to support more and category based notifications containers.
      this.$rootScope.hkNotifications = {alerts: []};

      // Get the data about Threshold Trigger
      HawkularAlertsManager.getTrigger($routeParams.resourceId + '_trigger_thres').then((data)=> {
        this.trigger_thres = data;
        this.alertSetupBackup.trigger_thres = angular.copy(this.trigger_thres);
        this.$log.debug('this.trigger_thres', this.trigger_thres);
        return HawkularAlert.Dampening.query({triggerId: $routeParams.resourceId + '_trigger_thres'}).$promise;
      }, (error)=> {
        return this.HawkularErrorManager.errorHandler(error, 'Error fetching threshold trigger.');
      }).then((data)=> {

        // Make sure, the AUTORESOLVE entity is the 2nd one
        this.trigger_thres_damp = [];
        this.trigger_thres_damp[0] = data[data[1].triggerMode === 'AUTORESOLVE' ? 0 : 1];
        this.trigger_thres_damp[1] = data[data[1].triggerMode === 'AUTORESOLVE' ? 1 : 0];

        this.alertSetupBackup.trigger_thres_damp = angular.copy(this.trigger_thres_damp);

        this.responseUnit = this.getTimeUnit(this.trigger_thres_damp[0].evalTimeSetting);
        this.responseDuration = this.trigger_thres_damp[0].evalTimeSetting / this.responseUnit;
        this.alertSetupBackup.responseDuration = angular.copy(this.responseDuration);

        this.thresDampDurationEnabled = this.trigger_thres_damp[0].evalTimeSetting !== 0;
        this.alertSetupBackup.thresDampDurationEnabled = angular.copy(this.thresDampDurationEnabled);
        this.$log.debug('this.trigger_thres_damp', this.trigger_thres_damp);
        return HawkularAlert.Condition.query({triggerId: $routeParams.resourceId + '_trigger_thres'}).$promise;
      }, (error)=> {
        return this.HawkularErrorManager.errorHandler(error, 'Error fetching threshold trigger dampening.');
      }).then((data)=> {

        // Make sure, the AUTORESOLVE condition is the 2nd one
        this.trigger_thres_cond = [];
        this.trigger_thres_cond[0] = data[data[1].triggerMode === 'AUTORESOLVE' ? 0 : 1];
        this.trigger_thres_cond[1] = data[data[1].triggerMode === 'AUTORESOLVE' ? 1 : 0];

        this.alertSetupBackup.trigger_thres_cond = angular.copy(this.trigger_thres_cond);
        this.$log.debug('this.trigger_thres_cond', this.trigger_thres_cond);
      }, (error)=> {
        return this.HawkularErrorManager.errorHandler(error, 'Error fetching threshold trigger condition.');
      });

      // Get the data about Availability Trigger
      HawkularAlertsManager.getTrigger($routeParams.resourceId + '_trigger_avail').then((data)=> {
        this.trigger_avail = data;
        this.alertSetupBackup.trigger_avail = angular.copy(this.trigger_avail);
        this.$log.debug('this.trigger_avail', this.trigger_avail);
        return HawkularAlert.Dampening.query({triggerId: $routeParams.resourceId + '_trigger_avail'}).$promise;
      }, (error)=> {
        return this.HawkularErrorManager.errorHandler(error, 'Error fetching availability trigger.');
      }).then((data)=> {
        this.trigger_avail_damp = [];
        this.trigger_avail_damp[0] = data[data[1].triggerMode === 'AUTORESOLVE' ? 0 : 1];
        this.trigger_avail_damp[1] = data[data[1].triggerMode === 'AUTORESOLVE' ? 1 : 0];

        this.alertSetupBackup.trigger_avail_damp = angular.copy(this.trigger_avail_damp);

        this.downtimeUnit = this.getTimeUnit(data[0].evalTimeSetting);
        this.downtimeDuration = data[0].evalTimeSetting / this.downtimeUnit;
        this.alertSetupBackup.downtimeDuration = angular.copy(this.downtimeDuration);

        this.$log.debug('this.trigger_avail_damp', this.trigger_avail_damp);
      }, (error)=> {
        return this.HawkularErrorManager.errorHandler(error, 'Error fetching availability trigger dampening.');
      });

      this.metricId = $routeParams.resourceId;
      this.$log.debug('this.metricId', this.metricId);
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

    public changeResponseTimeUnits():void {
      this.responseDuration = this.trigger_thres_damp[0].evalTimeSetting / this.responseUnit;
    }

    public changeDowntimeTimeUnits():void {
      this.downtimeDuration = this.trigger_avail_damp[0].evalTimeSetting / this.downtimeUnit;
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
      this.HawkularAlertsManager.addEmailAction(this.trigger_thres.actions.email[0]).then(()=> {
        if(!angular.equals(this.alertSetupBackup.trigger_thres, this.trigger_thres)) {
          return this.HawkularAlertsManager.updateTrigger(this.trigger_thres.id, this.trigger_thres);
        }
      }, (error)=> {
        return this.HawkularErrorManager.errorHandler(error, 'Error saving email action.', errorCallback);
      }).then(() => {
        this.trigger_avail.actions = this.trigger_thres.actions;
        if(!angular.equals(this.alertSetupBackup.trigger_avail, this.trigger_avail)) {
          return this.HawkularAlertsManager.updateTrigger(this.trigger_avail.id, this.trigger_avail);
        }
      }, (error)=> {
        return this.HawkularErrorManager.errorHandler(error, 'Error updating threshold trigger.', errorCallback);
      }).then(()=> {
        if (!this.thresDampDurationEnabled) {
          this.trigger_thres_damp[0].evalTimeSetting = 0;
        }

        if(!angular.equals(this.alertSetupBackup.trigger_thres_damp[0], this.trigger_thres_damp[0])) {
          return this.HawkularAlertsManager.updateDampening(this.trigger_thres.id,
              this.trigger_thres_damp[0].dampeningId, this.trigger_thres_damp[0]);
        }
      }, (error)=> {
        return this.HawkularErrorManager.errorHandler(error, 'Error updating availability trigger.', errorCallback);
      }).then(()=> {
        if(!angular.equals(this.alertSetupBackup.trigger_avail_damp[0], this.trigger_avail_damp[0])) {
          this.HawkularAlertsManager.updateDampening(this.trigger_avail.id, this.trigger_avail_damp[0].dampeningId,
              this.trigger_avail_damp[0]);
        }
      }, (error)=> {
        return this.HawkularErrorManager.errorHandler(error, 'Error updating threshold trigger dampening.',
            errorCallback);
      }).then(()=> {
        if(!angular.equals(this.alertSetupBackup.trigger_thres_cond[0], this.trigger_thres_cond[0])) {
          return this.HawkularAlertsManager.updateCondition(this.trigger_thres.id,
              this.trigger_thres_cond[0].conditionId, this.trigger_thres_cond[0]).then(()=> {
            // Update the threshold on AUTORESOLVE condition
            var autoResolveCondition = angular.copy(this.trigger_thres_cond[1]);
            autoResolveCondition.threshold = this.trigger_thres_cond[0].threshold;
            return this.HawkularAlertsManager.updateCondition(this.trigger_thres.id, autoResolveCondition.conditionId,
                autoResolveCondition);
          });
        }
      }, (error)=> {
        return this.HawkularErrorManager.errorHandler(error, 'Error updating availability dampening.', errorCallback);
      }).then(angular.noop, (error)=> {
        isError = true;
        return this.HawkularErrorManager.errorHandler(error, 'Error updating availability condition.', errorCallback);
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
      this.trigger_thres_damp[0].evalTimeSetting = this.responseDuration * this.responseUnit;
      this.trigger_avail_damp[0].evalTimeSetting = this.downtimeDuration * this.downtimeUnit;

      if (!angular.equals(!!this.alertSetupBackup.thresDampDurationEnabled,!!this.thresDampDurationEnabled) ||
        !angular.equals(this.alertSetupBackup.responseDuration, this.responseDuration) ||
        !angular.equals(this.alertSetupBackup.trigger_thres, this.trigger_thres) ||
        !angular.equals(this.alertSetupBackup.trigger_avail, this.trigger_avail) ||
        !angular.equals(this.alertSetupBackup.trigger_thres_damp[0], this.trigger_thres_damp[0]) ||
        !angular.equals(this.alertSetupBackup.trigger_avail_damp[0], this.trigger_avail_damp[0]) ||
        !angular.equals(this.alertSetupBackup.trigger_thres_cond[0], this.trigger_thres_cond[0])) {
        this.isSettingChange = true;
      } else {
        this.isSettingChange = false;
      }
    }
  }

  _module.controller('MetricsAlertSetupController', MetricsAlertSetupController);

  // TODO - update the pfly notification service to support other methods of notification container dismissal.
  export interface IHkClearNotifications extends ng.IScope {
    hkClearNotifications: Array<any>;
  }

  export class HkClearNotifications {
    public link: (scope: IHkClearNotifications, element: ng.IAugmentedJQuery, attrs: ng.IAttributes) => void;
    public scope = {
      hkClearNotifications: '='
    };

    constructor() {
      this.link = (scope: IHkClearNotifications, element: ng.IAugmentedJQuery, attrs: ng.IAttributes) => {
        angular.element('html').on('click', () => {
          if (scope.hkClearNotifications &&
              scope.hkClearNotifications.length &&
              scope.hkClearNotifications.length > 0 ) {
            scope.$apply(()=> {
              scope.hkClearNotifications = [];
            });
          }
        });
      };
    }

    public static Factory() {
      var directive = () => {
        return new HkClearNotifications();
      };

      directive['$inject'] = [];

      return directive;
    }
  }

  _module.directive('hkClearNotifications', HkClearNotifications.Factory());
}

