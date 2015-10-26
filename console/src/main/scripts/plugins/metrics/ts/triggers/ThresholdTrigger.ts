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

  export class ThresholdTriggerSetupController extends TriggerSetupController {

    loadTrigger(triggerId:string):Array<ng.IPromise<any>> {

      let triggerPromise = this.HawkularAlertsManager.getTrigger(triggerId).then(
        (triggerData) => {

          this.fullTrigger = triggerData;

          this.adm.trigger = {};
          this.adm.trigger['name'] = triggerData.trigger.name;
          this.adm.trigger['email'] = triggerData.trigger.actions.email[0];
          this.adm.trigger['evalTimeSetting'] = triggerData.dampenings[0].evalTimeSetting;
          this.adm.trigger['conditionEnabled'] = triggerData.trigger.enabled;
          this.adm.trigger['conditionThreshold'] = triggerData.conditions[0].threshold;
        });

      return [triggerPromise];
    }

    saveTrigger(errorCallback):Array<ng.IPromise<any>> {

      let updatedFullTrigger = angular.copy(this.fullTrigger);
      updatedFullTrigger.trigger.enabled = this.adm.trigger.conditionEnabled;

      if (this.adm.trigger.conditionEnabled) {
        updatedFullTrigger.trigger.actions.email[0] = this.adm.trigger.email;
        updatedFullTrigger.dampenings[0].evalTimeSetting = this.adm.trigger.evalTimeSetting;
        updatedFullTrigger.conditions[0].threshold = this.adm.trigger.conditionEnabled ?
          this.adm.trigger.conditionThreshold : 0;
      }

      let triggerSavePromise = this.HawkularAlertsManager.updateTrigger(updatedFullTrigger, errorCallback,
        this.fullTrigger);

      return [triggerSavePromise];
    }
  }

  _module.controller('ThresholdTriggerSetupController', ThresholdTriggerSetupController);
}
