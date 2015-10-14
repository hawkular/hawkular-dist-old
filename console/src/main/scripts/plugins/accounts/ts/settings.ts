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

/// <reference path='accountsPlugin.ts'/>

module HawkularAccounts {
  export class UserSettingsController {
    public static $inject = ['$log',
      '$rootScope',
      'HawkularAccount',
      'NotificationsService'
    ];

    // backend data related to this controller
    public settings:IUserSettings;

    // state control, for easier UI consumption
    public loading:boolean;

    constructor(private $log:ng.ILogService,
                private $rootScope:any,
                private HawkularAccount:any,
                private NotificationsService:INotificationsService) {

      this.loadData();
    }
    public loadData():void {
      this.loading = true;
      this.loadSettings();
    }

    public loadSettings():void {
      this.settings = this.HawkularAccount.Settings.get({},
        (settings:IUserSettings) => {
          this.loading = false;
        },
        (error:IErrorPayload) => {
          this.NotificationsService.warning('User settings could not be loaded.');
          this.$log.warn(`Error while loading the organization: ${error.data.message}`);
          this.loading = false;
        }
      );
    }

    public save():void {
      this.settings.$update({}, (settings:IUserSettings) => {
        this.NotificationsService.success('User settings successfully updated.');
      }, (error:IErrorPayload) => {
        this.NotificationsService.error('User settings could not be updated.');
      });
    }

    public isOrganization():boolean {
      return this.$rootScope.currentPersona.id !== this.$rootScope.userDetails.id;
    }
  }

  _module.controller('HawkularAccounts.UserSettingsController', UserSettingsController);
}
