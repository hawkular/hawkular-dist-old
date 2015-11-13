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

/// <reference path='metricsPlugin.ts'/>
/// <reference path='services/notificationsService.ts'/>

module HawkularMetrics {

  export class AgentInstallerController {

    private httpUriPart = 'http://';
    private hawkularServerUrl: string;
    private wildflyHome: string;
    private moduleZip: string;

    private username: string;
    private password: string;

    constructor(private $location:ng.ILocationService,
                private $scope:any,
                private $rootScope:any,
                private $log:ng.ILogService,
                private $modal:any,
                private NotificationsService:INotificationsService) {
      $scope.aic = this;
      this.hawkularServerUrl = this.httpUriPart;
    }

    public requiredFieldsFilled(hawkularServerUrl: string, wildflyHome: string): boolean {
      return this.hawkularServerUrl !== undefined
        && ((this.hawkularServerUrl.slice(0, 7) === 'http://' && this.hawkularServerUrl.length > 7)
            || (this.hawkularServerUrl.slice(0, 8) === 'https://' && this.hawkularServerUrl.length > 8))
        && this.wildflyHome !== undefined && this.wildflyHome.length > 2;
    }

    public download(): void {
      var newPath = '/hawkular/wildfly-agent/download?installer=true&wildfly-home='
        + encodeURIComponent(this.wildflyHome) + '&hawkular-server-url=' + encodeURIComponent(this.hawkularServerUrl);
      if (this.moduleZip) {
        newPath += '&module-zip=' + encodeURIComponent(this.moduleZip);
      }
      if (this.username) {
        newPath += '&username=' + encodeURIComponent(this.username);
      }
      if (this.password) {
        newPath += '&password=' + encodeURIComponent(this.password);
      }
      this.$log.info('downloading agent installer..');
      window.location.href = newPath;
    }

  }
  _module.controller('AgentInstallerController', AgentInstallerController);

}
