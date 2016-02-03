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

module HawkularMetrics {

  export interface INotificationMessage {
    message: string;
    timestamp: TimestampInMillis;
    name: string;
    type: MessageType;
    resourcePath?: string;
  }

  export interface INotificationsService {
    storedMessages: INotificationMessage[];
    info(message: string): void;
    success(message: string): void;
    warning(message: string): void;
    error(message: string): void;
    alertSettingsSaved(): void;
    pushLoadingMessage(message: string, resourcePath: string): void;
    pushActionMessage(action: string, message: string): void;
    removeFromMessagesByKeyValue(key: string, value: string): void;
  }

  export class NotificationMessage implements INotificationMessage {
    constructor(public message: string,
                public name: string,
                public type: MessageType,
                public resourcePath?: string,
                public timestamp?: TimestampInMillis) {
      this.timestamp = timestamp || new Date().getTime();
    }
  }

  export class NotificationsService implements INotificationsService {
    public storedMessages: INotificationMessage[] = [];

    constructor(private $log: ng.ILogService,
                private toastr: any,
                private $sce: any) {
    }

    private toastrPop(message, type): void {
      this.storedMessages.unshift(new NotificationMessage(message, type, MessageType[type.toUpperCase()]));
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

    public pushLoadingMessage(message: string, resourcePath: string): void {
      const type = 'loading';
      this.storedMessages.unshift(
        new NotificationMessage(message, type, MessageType[type.toUpperCase()], resourcePath)
      );
      this.toastr['info'](message);
    }

    public pushActionMessage(action, message: string): void {
      const htmlAction = this.$sce.trustAsHtml(action);
      const type = 'action';
      this.storedMessages.unshift(new NotificationMessage(htmlAction, type, MessageType[type.toUpperCase()]));
      this.toastr['success'](message);
    }

    public removeFromMessagesByKeyValue(key: string, value: string): void {
      const findObject = {};
      findObject[key] = value;
      const removeIndex = _.findLastIndex(this.storedMessages, findObject);
      if (removeIndex !== -1) {
        this.storedMessages.splice(removeIndex, 1);
      }
    }

    public alertSettingsSaved(): void {
      const message = 'Alert settings successfully saved';
      const type = 'success';
      this.storedMessages.unshift(new NotificationMessage(message, type, MessageType[type.toUpperCase()]));
      this.toastr[type](message,'',
        {
          timeOut: 5000, closeButton: true,
          showEasing: 'easeOutBounce', hideEasing: 'easeInBack', closeEasing: 'easeInBack'
        }
      );
    }
  }

  _module.service('NotificationsService', NotificationsService);
}
