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

/// <reference path="metricsPlugin.ts"/>
/// <reference path="services/alertsManager.ts"/>
/// <reference path="services/errorsManager.ts"/>

module HawkularMetrics {

  export class AppServerDetailsController {
    /// for minification only
    public static $inject = ['$rootScope', '$scope', '$route', '$routeParams', '$q', '$timeout', 'HawkularOps',
      'NotificationsService', 'HawkularInventory', 'HawkularAlertsManager', '$log', '$location', 'HawkularAlert'];

    public static LT = 'LT'; /// blue
    public static GT = 'GT'; /// blue
    public resourcePath: string;
    public jdrGenerating: boolean;
    public hasGeneratedSuccessfully: boolean;
    public hasGeneratedError: boolean;

    private defaultEmail: string;
    private defaultAction: any;
    private feedId: FeedId;
    private resourceId: ResourceId;

    /* tslint:disable:variable-name */

    constructor(private $rootScope: any,
                private $scope: any,
                private $route: any,
                private $routeParams: any,
                private $q: ng.IQService,
                private $timeout: ng.ITimeoutService,
                private HawkularOps: any,
                private NotificationsService: INotificationsService,
                private HawkularInventory: any,
                private HawkularAlertsManager: any,
                private $log: ng.ILogService,
                private $location: ng.ILocationService,
                private HawkularAlert: any,
                public availableTabs: any,
                public activeTab: any) {
      $scope.tabs = this;
      HawkularOps.init(this.NotificationsService);

      this.defaultEmail = this.$rootScope.userDetails.email || 'myemail@company.com';
      this.createDefaultActions();
      this.feedId = this.$routeParams.feedId;
      this.resourceId = this.$routeParams.feedId + '/' + this.$routeParams.resourceId;
      $scope.$on('$routeUpdate', (action, newRoute) => {
        if (newRoute.params.action && newRoute.params.action === 'export-jdr') {
          $scope.tabs.requestExportJDR();
          $location.search('action', null);
        }
      });

      $scope.$on('SwitchedPersona', () => $location.path('/hawkular-ui/app/app-list'));

      HawkularInventory.ResourceUnderFeed.get({
        feedId: this.$routeParams.feedId,
        resourcePath: this.$routeParams.resourceId + '~~'
      }, (resource: IResourcePath) => {
        this.resourcePath = resource.path;
        this.$rootScope.resourcePath = this.resourcePath;

      });

      if (!$rootScope.hasOwnProperty('isExperimentalWatch')) {
        let experimentalTabs = [''];
        $rootScope.isExperimentalWatch = $rootScope.$watch('isExperimental', (isExperimental) => {
          this.$timeout(() => {
            _.forEach(this.availableTabs, (tab: any) => {
              if (experimentalTabs.indexOf(tab.id) !== -1) {
                tab.enabled = isExperimental;
              }
            });
          });
        });
      }

      this.availableTabs = [
        {
          id: 'overview', name: 'Overview', enabled: true,
          src: 'plugins/metrics/html/app-details/detail-overview.html',
          controller: HawkularMetrics.AppServerOverviewDetailsController
        },
        {
          id: 'jvm', name: 'JVM', enabled: true,
          src: 'plugins/metrics/html/app-details/detail-jvm.html',
          controller: HawkularMetrics.AppServerJvmDetailsController
        },
        {
          id: 'platform', name: 'Platform', enabled: true,
          src: 'plugins/metrics/html/app-details/detail-platform.html',
          controller: HawkularMetrics.AppServerPlatformDetailsController
        },
        {
          id: 'deployments', name: 'Deployments', enabled: true,
          src: 'plugins/metrics/html/app-details/detail-deployments.html',
          controller: HawkularMetrics.AppServerDeploymentsDetailsController
        },
        {
          id: 'jms', name: 'JMS', enabled: false,
          src: 'plugins/metrics/html/app-details/detail-jms.html',
          controller: HawkularMetrics.AppServerJmsDetailsController
        },
        {
          id: 'transactions', name: 'Transactions', enabled: true,
          src: 'plugins/metrics/html/app-details/detail-transactions.html',
          controller: HawkularMetrics.AppServerTransactionsDetailsController
        },
        {
          id: 'web', name: 'Web', enabled: true,
          src: 'plugins/metrics/html/app-details/detail-web.html',
          controller: HawkularMetrics.AppServerWebDetailsController
        },
        {
          id: 'datasources', name: 'Datasources', enabled: true,
          src: 'plugins/metrics/html/app-details/detail-datasources.html',
          controller: HawkularMetrics.AppServerDatasourcesDetailsController
        }
      ];

      this.activeTab = $routeParams.tabId || 'overview';
      if (!$rootScope.hasOwnProperty('exportJdrSuccess')) {
        $rootScope.exportJdrSuccess = $rootScope.$on('ExportJDRSuccess', (event, data) => {
          if (data && data.hasOwnProperty('jdrResponse') && data.hasOwnProperty('fileName')) {
            const resourceId = data['jdrResponse'].resourcePath.split(';').last().replace(/~/g, '');
            const action =
              `<a href="${data.url}" download="${data.fileName}">Download JDR for server ${resourceId}</a>`;
            this.NotificationsService.removeFromMessagesByKeyValue('resourcePath', data['jdrResponse'].resourcePath);
            this.NotificationsService.pushActionMessage(
              action,
              `Generated JDR for server ${resourceId}`
            );
          }
          this.$log.info('JDR generated!');
          this.jdrGenerating = false;
          this.hasGeneratedSuccessfully = true;
          this.hasGeneratedError = false;
        });
      }

      if (!$rootScope.hasOwnProperty('exportJdrError')) {
        $rootScope.exportJdrError = $rootScope.$on('ExportJDRError', (event, data) => {
          if (data && data.hasOwnProperty('jdrResponse')) {
            const resourceId = data['jdrResponse'].resourcePath.split(';').last().replace(/~/g, '');
            this.NotificationsService.removeFromMessagesByKeyValue('resourcePath', data['jdrResponse'].resourcePath);
            this.NotificationsService.error(`JDR generation for server ${resourceId} failed.`);
          }
          this.$log.info('JDR generation failed!');
          this.jdrGenerating = false;
          this.hasGeneratedSuccessfully = false;
          this.hasGeneratedError = true;
        });
      }
    }

    private createDefaultActions(): void {
      //TODO: There are no properties set up! After moving to alerts 0.9.x enable properties
      this.defaultAction = new AlertActionsBuilder()
        .withActionId('email-to-admin')
        .withActionPlugin('email')
        .build();
    }

    public updateTab(newTabId: string) {
      this.$route.updateParams({tabId: newTabId});
    }

    public requestExportJDR() {
      this.jdrGenerating = true;
      this.NotificationsService.pushLoadingMessage(
        `Generating JDR for server ${this.$routeParams.resourceId}`,
        this.resourcePath
      );
      this.HawkularOps.performExportJDROperation(
        this.resourcePath,
        this.$rootScope.userDetails.token,
        this.$rootScope.currentPersona.id
      );
    }
  }

  _module.controller('AppServerDetailsController', AppServerDetailsController);

}
