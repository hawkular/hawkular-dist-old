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
/// <reference path="services/errorsManager.ts"/>

module HawkularMetrics {
  export interface IAlertDefinitionCondition {
    triggerId: string;
    type: string;
    dataId: any;
    operator: string;
    context: any;
    data2Multiplier?: number;
    data2Id?: string;
    period?: string;
    threshold?: number;
  }

  export interface IAlertDefinitionDampening {
    triggerId: string;
    evalTimeSetting: number;
    triggerMode: string;
    type: string;
  }

  export interface IAlertDefinition {
    trigger: IAlertTrigger;
    dampenings: IAlertDefinitionDampening[];
    conditions: IAlertDefinitionCondition[];
  }

  export class AlertDefinitionConditionBuilder {
    private _triggerId: string;
    private _type: string;
    private _dataId: string;
    private _operator: string;
    private _context: any;
    private _data2Id: string;
    private _data2Multiplier: number;
    private _threshold: number;

    constructor(type?: string) {
      this._type = type;
    }

    public withTriggerId(value: string) {
      this._triggerId = value;
      return this;
    }

    public withType(value: string) {
      this._type = value;
      return this;
    }

    public withDataId(value: string) {
      this._dataId = value;
      return this;
    }

    public withOperator(value: string) {
      this._operator = value;
      return this;
    }

    public withContext(value: any) {
      this._context = value;
      return this;
    }

    public withData2Id(value: string) {
      this._data2Id = value;
      return this;
    }

    public withData2Multiplier(value: number) {
      this._data2Multiplier = value;
      return this;
    }

    public withThreshold(value: number) {
      this._threshold = value;
      return this;
    }

    public build(): IAlertDefinitionCondition {
      return new AlertDefinitionCondition(
        this._triggerId,
        this._dataId,
        this._data2Id,
        this._operator,
        this._context,
        this._data2Multiplier,
        this._threshold,
        this._type
      );
    }
  }

  export class AlertDefinitionDampeningBuilder {
    private _triggerId: string;
    private _evalTimeSetting: number;
    private _triggerMode: string;
    private _type: string;

    public withTriggerId(value: string) {
      this._triggerId = value;
      return this;
    }

    public withEvalTimeSetting(value: number) {
      this._evalTimeSetting = value;
      return this;
    }

    public withTriggerMode(value: string) {
      this._triggerMode = value;
      return this;
    }

    public withType(value: string) {
      this._type = value;
      return this;
    }

    public build(): AlertDefinitionDampening {
      return new AlertDefinitionDampening(this._triggerId, this._triggerMode, this._type, this._evalTimeSetting);
    }
  }

  export class AlertDefinitionCondition implements IAlertDefinitionCondition {
    public static DEFAULT_COMPARE_TYPE = 'COMPARE';
    public static DEFAULT_TRESHOLD_TYPE = 'THRESHOLD';

    constructor(public triggerId: string,
      public dataId: string,
      public data2Id: string,
      public operator: string,
      public context: any,
      public data2Multiplier: number,
      public threshold: number,
      public type: string) {
    }
  }

  export class AlertDefinitionTriggerBuilder {
    private _name: string;
    private _id: string;
    private _description: string;
    private _autoDisable: boolean;
    private _autoEnable: boolean;
    private _autoResolve: boolean;
    private _actions: any;
    private _tags: any;
    private _firingMatch: string;
    private _context: HawkularMetrics.ITriggerContext;

    public withName(value: string) {
      this._name = value;
      return this;
    }

    public withId(value: string) {
      this._id = value;
      return this;
    }

    public withDescription(value: string) {
      this._description = value;
      return this;
    }

    public withAutoDisable(value: boolean) {
      this._autoDisable = value;
      return this;
    }

    public withAutoEnable(value: boolean) {
      this._autoEnable = value;
      return this;
    }

    public withAutoResolve(value: boolean) {
      this._autoResolve = value;
      return this;
    }

    public withActions(value: any) {
      this._actions = value;
      return this;
    }

    public withTags(value: any) {
      this._tags = value;
      return this;
    }

    public withFiringMatch(value: string) {
      this._firingMatch = value;
      return this;
    }

    public withContext(value: HawkularMetrics.ITriggerContext) {
      this._context = value;
      return this;
    }

    public build(): AlertDefinitionTrigger {
      return new AlertDefinitionTrigger(
        this._id,
        this._name,
        this._description,
        this._tags,
        this._context,
        this._actions,
        this._firingMatch,
        this._autoDisable,
        this._autoEnable,
        this._autoResolve
      );
    }
  }

  export class AlertDefinitionContextBuilder {
    private _alertType: string;
    private _resourceType: string;
    private _resourcePath: string;
    private _triggerType: string;
    private _resourceName: string;
    private _triggerTypeProperty1: string;
    private _triggerTypeProperty2: string;

    constructor(triggerType?: string) {
      this._triggerType = triggerType;
    }

    public withAlertType(value: string) {
      this._alertType = value;
      return this;
    }

    public withResourceType(value: string) {
      this._resourceType = value;
      return this;
    }

    public withResourcePath(value: string) {
      this._resourcePath = value;
      return this;
    }

    public withTriggerType(value: string) {
      this._triggerType = value;
      return this;
    }

    public withResourceName(value: string) {
      this._resourceName = value;
      return this;
    }

    public withTriggerTypeProperty1(value: string) {
      this._triggerTypeProperty1 = value;
      return this;
    }

    public withTriggerTypeProperty2(value: string) {
      this._triggerTypeProperty2 = value;
      return this;
    }

    public build(): HawkularMetrics.ITriggerContext {
      return new AlertDefinitionContext(
        this._alertType,
        this._resourcePath,
        this._triggerType,
        this._resourceName,
        this._triggerTypeProperty1,
        this._triggerTypeProperty2,
        this._resourceType
      );
    }
  }

  export class AlertDefinitionDampening implements IAlertDefinitionDampening {

    public static DEFAULT_TIME_EVAL = 7 * 60000;
    public static DEFAULT_TYPE = 'STRICT_TIME';
    public static DEFAULT_TRIGGER_MODE = 'FIRING';

    constructor(public triggerId: string,
      public triggerMode?: string,
      public type?: string,
      public evalTimeSetting?: number) {
      this.triggerMode = triggerMode || AlertDefinitionDampening.DEFAULT_TRIGGER_MODE;
      this.type = type || AlertDefinitionDampening.DEFAULT_TYPE;
      this.evalTimeSetting = evalTimeSetting || AlertDefinitionDampening.DEFAULT_TIME_EVAL;
    }
  }

  export class AlertDefinitionTrigger implements IAlertTrigger {
    public autoResolveAlerts: boolean;
    public autoResolveMatch: string;
    public enabled: boolean;
    public group: boolean;
    public orphan: boolean;
    public severity: string;
    public tenantId: HawkularMetrics.TenantId;
    public triggerId: HawkularMetrics.TriggerId;

    public static DEFAULT_FIRING_MATCH = 'ANY';

    constructor(public id: string,
      public name: string,
      public description: string,
      public tags: any,
      public context: HawkularMetrics.ITriggerContext,
      public actions: any,
      public firingMatch?: string,
      public autoDisable?: boolean,
      public autoEnable?: boolean,
      public autoResolve?: boolean) {

      this.autoDisable = (typeof autoDisable !== 'undefined') ? autoDisable : true;
      this.autoEnable = (typeof autoEnable !== 'undefined') ? autoEnable : true;
      this.autoResolve = (typeof autoResolve !== 'undefined') ? autoResolve : false;
      this.firingMatch = firingMatch || AlertDefinitionTrigger.DEFAULT_FIRING_MATCH;
    }
  }

  export class AlertDefinitionContext implements ITriggerContext {

    public static RANGE_PERCENT_TRIGGER_TYPE = 'RangeByPercent';
    public static TRESHOLD_TRIGGER_TYPE = 'Threshold';

    constructor(public alertType: string,
      public resourcePath: string,
      public triggerType: string,
      public resourceName: string,
      public triggerTypeProperty1: string,
      public triggerTypeProperty2: string,
      public resourceType: string) {
    }
  }

  export class AlertDefinition implements IAlertDefinition {
    constructor(public trigger: HawkularMetrics.IAlertTrigger,
      public dampenings: HawkularMetrics.IAlertDefinitionDampening[],
      public conditions: HawkularMetrics.IAlertDefinitionCondition[]) {
    }
  }

}
