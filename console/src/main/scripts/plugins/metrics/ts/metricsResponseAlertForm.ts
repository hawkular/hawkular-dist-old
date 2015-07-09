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

module HawkularMetrics {

  export interface IQuickAlertController {
    toggleQuickAlert():void;
    saveQuickAlert():void;
  }

  export class QuickAlertController implements IQuickAlertController {
    public static  $inject = ['$scope', 'HawkularAlert', '$log', '$q'];

    constructor(private $scope:any,
                private HawkularAlert:any,
                private $log: ng.ILogService,
                private $q: ng.IQService) {
      this.$scope.showQuickAlert = false;
      this.$scope.quickTrigger = {
        operator: 'LT',
        threshold: 0
      };

      this.$scope.$watch('hkParams.resourceId', (resourceId) => {
        /// made a selection from url switcher
        if (resourceId) {
          this.metricId = resourceId;
        }
      });

      this.allActions();
    }

    private metricId;

    toggleQuickAlert():void {
      this.$scope.showQuickAlert = !this.$scope.showQuickAlert;
    }

    private PROMISE_BREAK: string = 'magicValue1234';

    private allActions():void {
      this.$scope.actions = [];
      this.HawkularAlert.Action.query(
        (result) => {
          this.$scope.actions = result;
        }, (error) => {
          this.errorToastr(error, 'Error loading Alerts Notifiers:');
        }
      );
    }

    private errorToastr(error: any, errorMsg: string):void {
      var errorMsgComplete: string;

      if (error.data && error.data.errorMsg) {
        errorMsgComplete = error.data.errorMsg;
      } else {
        errorMsgComplete = errorMsg + ' ' + error;
      }

      this.$log.error(errorMsgComplete);
      toastr.error(errorMsgComplete);
    }

    private errorHandler(error: any, msg: string) {
      if (error !== this.PROMISE_BREAK) {
        this.errorToastr(error, msg);
      }
      return this.$q.reject(this.PROMISE_BREAK);
    }

    saveQuickAlert():void {
      //if (globalMetricId !== '.status.duration' && globalMetricId !== '.status.code') {
      if (this.metricId !== '.status.duration' && this.metricId !== '.status.code') {
        var newTrigger:any = {};
        newTrigger.name = this.metricId + 'ResponseTime' + '-' + this.$scope.quickTrigger.operator + '-' +
            this.$scope.quickTrigger.threshold;
        newTrigger.description = 'Created on ' + new Date();
        newTrigger.firingMatch = 'ALL';
        newTrigger.safetyMatch = 'ALL';
        newTrigger.enabled = true;
        newTrigger.safetyEnabled = false;
        newTrigger.actions = this.$scope.quickTrigger.actions;

        var newDampening:any = {
          triggerId: '',
          type: 'RELAXED_COUNT',
          evalTrueSetting: 1,
          evalTotalSetting: 1,
          evalTimeSetting: 0
        };

        this.HawkularAlert.Trigger.save(newTrigger).$promise.then(
          // Success Trigger save
          (trigger) => {
            this.$log.debug('Success Trigger save');
            newDampening.triggerId = trigger.id;

            return this.HawkularAlert.Dampening.save({triggerId: newDampening.triggerId},
              newDampening).$promise;
          },
          // Error Trigger save
          (error) => {
            return this.errorHandler(error, 'Error saving Trigger');
          }
        ).then(
          // Success Dampening save
          (dampening) => {
            this.$log.debug('Success Dampening save', dampening);
            var newThresholdCondition = {
              triggerId: dampening.triggerId,
              type: 'THRESHOLD',
              dataId: this.metricId,
              operator: this.$scope.quickTrigger.operator,
              threshold: this.$scope.quickTrigger.threshold
            };

            return this.HawkularAlert.Condition.save({triggerId: newThresholdCondition.triggerId},
              newThresholdCondition).$promise;
          },
          // Error Dampening save
          (errorDampening) => {
            return this.errorHandler(errorDampening, 'Error saving Trigger');
          }
        ).then(
          // Success ThresholdCondition save
          () => {
            this.$log.debug('Success ThresholdCondition save');
            this.$log.debug('Alert Created!');
            toastr.success('Alert Created!');

            this.toggleQuickAlert();

            return this.HawkularAlert.Alert.reload().$promise;
          },
          // Error ThresholdCondition save
          (errorCondition) => {
            return this.errorHandler(errorCondition, 'Error saving Trigger Condition');
          }
        ).then(
          // Success Reload
          angular.noop,
          // Error Reload
          (errorReload) => {
            return this.errorHandler(errorReload, 'Error reloading Alerts');
          }
        ).catch(
          (error) => {
            this.errorHandler(error, 'Error:');
          }
        );
      } else {
        this.$log.debug('No metric selected');
        toastr.warning('No metric selected');
      }
    }
  }

  _module.controller('QuickAlertController', QuickAlertController);
}

