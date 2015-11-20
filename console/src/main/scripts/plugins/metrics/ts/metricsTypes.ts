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
/// <reference path="services/errorsManager.ts"/>


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
  export type EmailType = string;
  export type PersonaId = string;
  export type Persona = IPersona;

/// Value types
  export type TimestampInMillis = number;
  export type IntervalInSeconds = number;
  export type AuthenticationToken = string;


/// Interface Definitions
  export interface IPersona {
    id:  PersonaId;
    name: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface IUserDetails {
    email:string;
    emailVerified: boolean;
    enabled:boolean;
    firstName:string;
    id:string;
    lastName:string;
    token:string;
    totp: boolean;
    username:string;
  }

  export enum PersistenceState {PERSISTING, SUCCESS, ERROR}
  ;

  export interface IhkParams {
    timeOffset:number;
    resourceId: ResourceId;
  }

  export interface IHawkularRootScope extends ng.IRootScopeService {

    currentPersona:IPersona;
    userDetails:IUserDetails;
    PersistenceState:PersistenceState; // workaround, so that this enum can be accessed from the templates
    hkStartTimestamp:TimestampInMillis;
    hkEndTimestamp:TimestampInMillis;
    hkParams:IhkParams;
    resourcePath:ResourcePath;
    isExperimental:boolean;
    prevLocation:string; // not guaranteed to be set, use as needed.
  }

  export interface IRefreshable {
    startTimeStamp:TimestampInMillis;
    endTimeStamp:TimestampInMillis;
    refresh():void;
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
  export  interface IAlertContext {
    alertType: string;
    resourceName: string;
    resourcePath: ResourcePath;
    resourceType: string;
  }

  export interface IAlertAction {
    //@todo: not needed yet
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
    actions: any;
    autoDisable: boolean;
    autoEnable: boolean;
    autoResolve: boolean;
    autoResolveAlerts: boolean;
    autoResolveMatch: string; /// @todo: change to enum
    context: ITriggerContext;
    description: string;
    enabled: boolean;
    firingMatch: string; /// @todo: change to enum
    group: boolean;
    id:  TriggerId;
    name: string;
    orphan: boolean;
    severity: string; /// @todo: change to enum
    tags: any;
    tenantId: TenantId;
    triggerId: TriggerId;
    ///@todo: ignoring actions for now

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
    resolvedBy: string;
    resolvedNotes: string;
    resolvedTime: TimestampInMillis;
    severity: string; /// @todo: change to enum
    status: string;  /// @todo: change to enum
    tenantId: TenantId;
    triggerId: TriggerId;

    context:IAlertContext;
    trigger: IAlertTrigger;
    // @todo: fillin Dampening and EvalSets

    // UI may augment this by adding a 'selected' property for list results
    // so we can use the original data structure as-is
    selected?: boolean;

    // UI stores an 'alertType' to benefit display
    alertType:string;
  }

}
