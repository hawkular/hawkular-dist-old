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

/// <reference path="../../metricsPlugin.ts"/>

module HawkularMetrics {

  export class AppServerDatasourcesDriverDeleteDialogController {

    public static $inject = ['$scope', '$rootScope', '$modalInstance', '$q', 'HawkularOps',
      'NotificationsService', 'driver'];

    constructor(private $scope: any,
      private $rootScope: any,
      private $modalInstance: any,
      private $q: ng.IQService,
      private HawkularOps,
      private NotificationsService: INotificationsService,
      public driver) {

      /// make sure our WS socket is open
      HawkularOps.init(this.NotificationsService);

      $scope.$on('JdbcDriverRemoveSuccess', (event, data) => {
        this.$modalInstance.close(data);
      });

      $scope.$on('JdbcDriverRemoveError', (event, data) => {
        this.NotificationsService.error('The JDBC Driver ' + this.driver.name +
          ' failed to be deleted.');
      });
    }

    public deleteDriver(): void {
      this.HawkularOps.performRemoveJdbcDriverOperation(
        this.driver.path,
        this.$rootScope.userDetails.token,
        this.$rootScope.currentPersona.id);
    }

    public cancel() {
      this.$modalInstance.dismiss('cancel');
    }

  }

  _module.controller('AppServerDatasourcesDriverDeleteDialogController',
    AppServerDatasourcesDriverDeleteDialogController);

}
