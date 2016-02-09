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

module HawkularMetrics {

  export class MessageCenterController {
    private static MESSAGES_PER_PAGE = 5;
    public storedMessages;
    public visibleMessages;
    public seenMessages;
    constructor(private NotificationsService: INotificationsService) {
      this.storedMessages = this.NotificationsService.storedMessages;
      this.visibleMessages = MessageCenterController.MESSAGES_PER_PAGE;
      this.seenMessages = 0;
    }

    public moreMessages($event): void {
      $event.preventDefault();
      this.visibleMessages += MessageCenterController.MESSAGES_PER_PAGE;
    }

    public removeMessage(index): void {
      this.NotificationsService.storedMessages.splice(index, 1);
    }

    public msgCenterClicked(): void {
      this.seenMessages = this.storedMessages.length;
    }
  }

  export class HkMessageCenterDirective {
    public replace = 'true';
    public controller = MessageCenterController;
    public controllerAs: string = 'vm';
    public scope = {
    };
    public templateUrl = 'plugins/metrics/html/directives/message-center.html';
    public bindToController = {
    };
    public static Factory() {
      let directive = () => {
        return new HkMessageCenterDirective();
      };

      directive['$inject'] = [];

      return directive;
    }
  }

  _module.directive('hkMessageCenter', [HkMessageCenterDirective.Factory()]);
  _module.controller('MessageCenterController', MessageCenterController);
}
