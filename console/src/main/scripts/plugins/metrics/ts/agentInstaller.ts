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

/// <reference path='metricsPlugin.ts'/>
/// <reference path='services/notificationsService.ts'/>

module HawkularMetrics {

  export class AgentInstallerController {

    private httpUriPart = 'http://';
    private hawkularServerUrl: string;
    private wildflyHome: string;
    private serverName: string;

    private username: string;
    private password: string;

    private codeSnippetShown: boolean;
    private snippetToCopy: string = 'java -jar hawkular-wildfly-agent-installer.jar';

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
        return true;
    }

    public copySuccess(): void {
      console.log('copied to clipboard');

    }

    public copyFail(err): void {
      console.error('copy error', err);
    }

    public download(): void {
      let newPath = '/hawkular/wildfly-agent/installer?';

      if (this.wildflyHome) {
        newPath += '&target-location=' + encodeURIComponent(this.wildflyHome);
      }
      if (this.hawkularServerUrl) {
        newPath += '&hawkular-server-url=' + encodeURIComponent(this.hawkularServerUrl);
      }
      if (this.serverName) {
        newPath += '&managed-server-name=' + encodeURIComponent(this.serverName);
      }
      if (this.username) {
        newPath += '&username=' + encodeURIComponent(this.username);
      }
      if (this.password) {
        newPath += '&password=' + encodeURIComponent(this.password);
      }
      this.$log.info('downloading agent installer..');
      window.location.href = newPath;
      this.codeSnippetShown = true;
    }

  }
  _module.controller('AgentInstallerController', AgentInstallerController);

}
