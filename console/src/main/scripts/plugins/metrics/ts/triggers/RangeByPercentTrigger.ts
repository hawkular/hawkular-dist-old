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

  export class RangeByPercentTriggerSetupController extends TriggerSetupController {

    public ceiling:number;

    loadTrigger(triggerId:string):Array<ng.IPromise<any>> {
      function floor2Dec(doubleValue) {
        return Math.floor(doubleValue * 100) / 100;
      }

      let triggerPromise = this.HawkularAlertsManager.getTrigger(triggerId).then(
        (triggerData) => {

          this.fullTrigger = triggerData;

          let startTimeStamp = +moment().subtract((this.$routeParams.timeOffset || 3600000), 'milliseconds');
          let endTimeStamp = +moment();
          let percentOfMetricId = triggerData.trigger.context.triggerTypeProperty1;

          return this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id, percentOfMetricId,
            startTimeStamp, endTimeStamp, 1);

        }).then((dataPoints) => {

          if (dataPoints.length > 0) {
            this.ceiling = dataPoints[0].max;
          }
          if (this.ceiling <= 0) {
            this.ceiling = 1024; // this should maybe be an error situation because a valid number is unknown.
          }

          let triggerData = this.fullTrigger;
          this.adm.trigger = {};
          this.adm.trigger['name'] = triggerData.trigger.name;
          this.adm.trigger['email'] = triggerData.trigger.actions.email[0];
          this.adm.trigger['evalTimeSetting'] = triggerData.dampenings[0].evalTimeSetting;
          this.adm.trigger['conditionGtEnabled'] = triggerData.conditions[0].thresholdHigh < this.ceiling;
          this.adm.trigger['conditionGtPercent'] = triggerData.conditions[0].thresholdHigh > 0 ?
            floor2Dec(triggerData.conditions[0].thresholdHigh * 100 / this.ceiling) : 0;
          this.adm.trigger['conditionLtEnabled'] = triggerData.conditions[0].thresholdLow > 0;
          this.adm.trigger['conditionLtPercent'] = triggerData.conditions[0].thresholdLow > 0 ?
            floor2Dec(triggerData.conditions[0].thresholdLow * 100 / this.ceiling) : 0;
        });

      return [triggerPromise];
    }

    saveTrigger(errorCallback):Array<ng.IPromise<any>> {

      let updatedFullTrigger = angular.copy(this.fullTrigger);
      updatedFullTrigger.trigger.enabled = this.adm.trigger.conditionEnabled;

      if (this.adm.trigger.conditionEnabled) {
        updatedFullTrigger.actions.email[0] = this.adm.trigger.email;
        updatedFullTrigger.dampenings[0].evalTimeSetting = this.adm.trigger.evalTimeSetting;
        updatedFullTrigger.conditions[0].thresholdHigh = this.adm.trigger.conditionGtEnabled ?
        this.ceiling * this.adm.trigger.conditionGtPercent / 100 : this.ceiling;
        updatedFullTrigger.conditions[0].thresholdLow = this.adm.trigger.conditionLtEnabled ?
        this.ceiling * this.adm.trigger.conditionLtPercent / 100 : 0;
      }

      let triggerSavePromise = this.HawkularAlertsManager.updateTrigger(updatedFullTrigger, errorCallback,
        this.fullTrigger);

      return [triggerSavePromise];
    }
  }

  _module.controller('RangeByPercentTriggerSetupController', RangeByPercentTriggerSetupController);
}
