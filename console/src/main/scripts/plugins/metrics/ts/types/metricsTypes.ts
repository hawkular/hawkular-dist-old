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

/// <reference path="../metricsPlugin.ts"/>
/// <reference path="../../../includes.ts"/>
/// <reference path="../services/errorsManager.ts"/>

module HawkularMetrics {

  /// Typescript 1.4 introduces type aliases:
  /// http://blogs.msdn.com/b/typescript/archive/2015/01/16/announcing-typescript-1-4.aspx
  /// Some Type aliases to make things more type safe than just string or number. Implies how it is being used and is
  /// especially useful for refactoring.

  /// ID types
  export type TenantId = string;
  export type FeedId = string;
  export type Environment = string;
  export type ResourceId = string;
  export type ResourcePath = string;
  export type ResourceType = string;
  export type PathId = string;
  export type MetricId = string;
  export type TriggerId = string;
  export type TriggerIds = string;
  export type ConditionId = string;
  export type DampeningId = string;
  export type AlertId = string;
  export type ActionPlugin = string;
  export type ActionId = string;
  export type PersonaId = string;
  export type Persona = IPersona;

  /// Value types
  export type TimestampInMillis = number;
  export type IntervalInSeconds = number;
  export type AuthenticationToken = string;
  export type IColor = string;

  /// Interface Definitions
  export interface IPersona {
    id: PersonaId;
    name: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface IUserDetails {
    email: string;
    emailVerified: boolean;
    enabled: boolean;
    firstName: string;
    id: string;
    lastName: string;
    token: string;
    totp: boolean;
    username: string;
  }

  export enum PersistenceState { PERSISTING, SUCCESS, ERROR }

  export interface IhkParams {
    timeOffset: number;
    resourceId: ResourceId;
  }

  export interface IMultipleChartData {
    key: String;
    color: String;
    values: IChartDataPoint[];
  }

  export interface IHawkularRootScope extends ng.IRootScopeService {

    currentPersona: IPersona;
    userDetails: IUserDetails;
    PersistenceState: PersistenceState; // workaround, so that this enum can be accessed from the templates
    hkStartTimestamp: TimestampInMillis;
    hkEndTimestamp: TimestampInMillis;
    hkParams: IhkParams;
    resourcePath: ResourcePath;
    isExperimental: boolean;
    prevLocation: string; // not guaranteed to be set, use as needed.
    lastUpdateTimestamp: Date; // when was last tab data updated
  }

  export interface IRefreshable {
    startTimeStamp: TimestampInMillis;
    endTimeStamp: TimestampInMillis;
    refresh(): void;
  }

  export interface IResourceProperties {
    name: string;
  }

  export interface IOperations {
    name: string;
    operationName: string;
  }

  export interface IResourceTypeProperties {
    name: string;
    operations: IOperations[];
  }

  export interface IResourceType {
    id: ResourceType;
    path: ResourcePath;
    feedId: FeedId;
    environmentId: Environment;
    tenantId: TenantId;
    properties: IResourceTypeProperties;
  }

  export interface IResource {
    id: ResourceId;
    path: ResourcePath;
    feedId: FeedId;
    environmentId: Environment;
    state: string;
    tenantId: TenantId;
    updateTimestamp: TimestampInMillis;
    properties: IResourceProperties;
    type: IResourceType;

    // for console use
    alertList: IAlert[];
    availableCount: number;
    inUseCount: number;
    selected: boolean;
  }

  export interface IAvailResource {
    timestamp: TimestampInMillis;
    value: string;
  }

  // Alerts
  export interface IAlertContext {
    alertType: string;
    resourceName: string;
    resourcePath: ResourcePath;
    resourceType: string;
  }

  export interface IActionDefinition {
    actionPlugin: ActionPlugin;
    actionId: ActionId;
    properties: any;
  }

  export interface ITriggerAction {
    actionPlugin: ActionPlugin;
    actionId: ActionId;
  }

  export interface ITriggerContext {
    alertType: string;
    resourceName: string;
    resourcePath: string;
    resourceType: string;
    triggerType: string;
    triggerTypeProperty1: string;
    triggerTypeProperty2: string;
  }

  export interface IAlertTrigger {
    actions: ITriggerAction[];
    autoDisable: boolean;
    autoEnable: boolean;
    autoResolve: boolean;
    autoResolveAlerts: boolean;
    autoResolveMatch: string; /// @todo: change to enum
    context: ITriggerContext;
    description: string;
    enabled: boolean;
    firingMatch: string; /// @todo: change to enum
    type: string; /// @toto: change to enum
    id: TriggerId;
    name: string;
    severity: string; /// @todo: change to enum
    tags: any;
    tenantId: TenantId;
    triggerId: TriggerId;

    // UI may augment this by adding a 'selected' property for list results
    // so we can use the original data structure as-is
    selected?: boolean;
  }

  export interface IAlert {
    id: string;
    ackBy: string;
    ackNotes: string;
    ackTime: TimestampInMillis;
    ctime: TimestampInMillis;
    dataId: MetricId;
    resolvedBy: string;
    resolvedNotes: string;
    resolvedTime: TimestampInMillis;
    severity: string; /// @todo: change to enum
    status: string;  /// @todo: change to enum
    tenantId: TenantId;
    triggerId: TriggerId;

    context: IAlertContext;
    trigger: IAlertTrigger;
    // @todo: fillin Dampening and EvalSets

    // UI may augment this by adding a 'selected' property for list results
    // so we can use the original data structure as-is
    selected?: boolean;

    // UI stores an 'alertType' to benefit display
    alertType: string;

    // UI calculates start, end time and duration
    start?: TimestampInMillis;
    end?: TimestampInMillis;
    durationTime?: number;
  }

  export class ServerStatus {

    constructor(public value: string, public state: string, public icon: string) {
    }

    public static SERVER_UP = new ServerStatus('Up', 'up', 'fa-arrow-up');
    public static SERVER_DOWN = new ServerStatus('Down', 'down', 'fa-arrow-down');
    public static SERVER_UNKNOW = new ServerStatus('Unknown', 'unknown', 'fa-chain-broken');
    public static SERVER_STARTING = new ServerStatus('Starting', 'starting', 'fa-spinner');
    public static SERVER_RESTART_REQUIRED = new ServerStatus('Restart Required', 'restart required', 'fa-repeat');

    public toString = () => {
      return this.value;
    };
  }

  export class DatasourceStatus {
    constructor(public value: string, public isUp: boolean) {
    }

    public static DATA_SOURCE_UP = new DatasourceStatus('Up', true);
    public static DATA_SOURCE_DOWN = new DatasourceStatus('Down', false);
    public static DATA_SOURCE_UNKNOW = new DatasourceStatus('Unknown', null);

    public toString = () => {
      return this.value;
    };
  }

  export class ServerType {
    constructor(public value: string, public type: string) {
    }

    public static SERVER_EAP = new ServerType('EAP', 'eap');
    public static SERVER_WILDFLY = new ServerType('WildFly', 'wildfly');

    public toString = () => {
      return this.value;
    };
  }

  export class MessageType {
    constructor(public value: string, public cssClass: string) {
    }

    public static SUCCESS = new MessageType('success', 'toast-success');
    public static WARNING = new MessageType('warning', 'toast-warning');
    public static ERROR = new MessageType('error', 'toast-danger');
    public static INFO = new MessageType('info', 'toast-info');
    public static ACTION = new MessageType('action', 'toast-success');
    public static LOADING = new MessageType('loading', 'toast-info');

    public toString = () => {
      return this.value;
    };
  }
}
