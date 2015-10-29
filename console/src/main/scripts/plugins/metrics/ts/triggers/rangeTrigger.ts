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

  export class RangeTriggerSetupController extends TriggerSetupController {

    public static MAX_DISABLED = 2010101010;
    public static MIN_DISABLED = -1010101010;

    loadTrigger(triggerId:string):Array<ng.IPromise<any>> {

      let triggerPromise = this.HawkularAlertsManager.getTrigger(triggerId).then(
        (triggerData) => {

          this.fullTrigger = triggerData;

          this.adm.trigger = {};
          this.adm.trigger['name'] = triggerData.trigger.name;
          this.adm.trigger['email'] = triggerData.trigger.actions.email[0];
          this.adm.trigger['evalTimeSetting'] = triggerData.dampenings[0].evalTimeSetting;

          this.adm.trigger['maxEnabled'] =
            triggerData.conditions[0].thresholdHigh !== RangeTriggerSetupController.MAX_DISABLED;
          this.adm.trigger['maxThreshold'] = triggerData.conditions[0].thresholdHigh;
          this.adm.trigger['minEnabled'] =
            triggerData.conditions[0].thresholdLow !== RangeTriggerSetupController.MIN_DISABLED;
          this.adm.trigger['minThreshold'] = triggerData.conditions[0].thresholdLow;
        });

      return [triggerPromise];
    }

    saveTrigger(errorCallback):Array<ng.IPromise<any>> {

      let updatedFullTrigger = angular.copy(this.fullTrigger);
      updatedFullTrigger.trigger.enabled = this.adm.trigger.conditionEnabled;

      if (this.adm.trigger.conditionEnabled) {
        updatedFullTrigger.actions.email[0] = this.adm.trigger.email;
        updatedFullTrigger.dampenings[0].evalTimeSetting = this.adm.trigger.evalTimeSetting;
        updatedFullTrigger.conditions[0].thresholdHigh = this.adm.trigger.maxEnabled ?
          this.adm.trigger.maxThreshold : RangeTriggerSetupController.MAX_DISABLED;
        updatedFullTrigger.conditions[0].thresholdLow = this.adm.trigger.minEnabled ?
          this.adm.trigger.minThreshold : RangeTriggerSetupController.MIN_DISABLED;
      }

      let triggerSavePromise = this.HawkularAlertsManager.updateTrigger(updatedFullTrigger, errorCallback,
        this.fullTrigger);

      return [triggerSavePromise];
    }
  }

  _module.controller('RangeTriggerSetupController', RangeTriggerSetupController);
}
