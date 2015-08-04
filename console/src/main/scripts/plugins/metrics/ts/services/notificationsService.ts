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

module HawkularMetrics {

  export interface INotificationsService {
    info(message: string): void;
    success(message: string): void;
    warning(message: string): void;
    error(message: string): void;
  }

  export class NotificationsService implements INotificationsService {

    public static $inject = ['$log', 'toastr'];

    constructor(private $log: ng.ILogService,
                private toastr: any) {
    }

    private toastrPop(message, type): void {
      this.$log.debug(message);
      this.toastr[type](message);
    }

    public info(message: string): void {
      this.toastrPop(message, 'info');
    }

    public success(message: string): void {
      this.toastrPop(message, 'success');
    }

    public warning(message: string): void {
      this.toastrPop(message, 'warning');
    }

    public error(message: string): void {
      this.toastrPop(message, 'error');
    }
  }

  _module.service('NotificationsService', NotificationsService);
}
