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

/// <reference path='accountsPlugin.ts'/>

module HawkularAccounts {

  export class InvitationController {
    public static $inject = ['$log', '$routeParams', 'HawkularAccount', 'NotificationsService'];
    public invitation:IInvitation;
    public loading:boolean;
    public success:boolean;
    public error: IErrorPayload;

    constructor(private $log:ng.ILogService,
                private $routeParams:any,
                private HawkularAccount:any,
                private NotificationsService:INotificationsService) {

      this.loading = true;
      this.success = false;
      HawkularAccount.OrganizationInvitation.update({token: $routeParams.token},
        (response:IInvitation) => {
          this.invitation = response;
          this.$log.debug('Invitation object available:');
          this.$log.debug(this.invitation);
          this.success = true;
          this.loading = false;
        },
        (error:IErrorPayload) => {
          this.error = error;
          this.success = false;
          this.loading = false;
          this.$log.debug(`Error while trying to process the invitation: ${error.data.message}`);
        }
      );
    }
  }

  _module.controller('HawkularAccounts.InvitationController', InvitationController);
}

