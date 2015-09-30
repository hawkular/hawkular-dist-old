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

/// <reference path='../../includes.ts'/>

module HawkularAccounts {
  export let pluginName = 'hawkular-accounts';
  export let log:Logging.Logger = Logger.get(pluginName);
  export let templatePath = 'plugins/accounts/html';
  export let _module = angular.module(HawkularAccounts.pluginName, ['ui.bootstrap']);
  export type PersonaId = string;

  export interface IPersona {
    id:  PersonaId;
    name: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface IOrganization extends IPersona {
  }

  export interface INotificationsService {
    info(message: string): void;
    success(message: string): void;
    warning(message: string): void;
    error(message: string): void;
  }
}
