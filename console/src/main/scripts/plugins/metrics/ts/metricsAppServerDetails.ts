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

/// <reference path="metricsPlugin.ts"/>
/// <reference path="services/alertsManager.ts"/>
/// <reference path="services/errorsManager.ts"/>

module HawkularMetrics {

  export class AppServerDetailsController {
    /// for minification only
    public static  $inject = ['$rootScope', '$scope','$route','$routeParams', 'HawkularOps',
      'NotificationsService', 'HawkularInventory', '$log'];

    public resourcePath:string;
    public jdrGenerating:boolean;
    public hasGeneratedSuccessfully:boolean;
    public hasGeneratedError:boolean;

    constructor(private $rootScope:any,
                private $scope: any,
                private $route: any,
                private $routeParams: any,
                private HawkularOps:any,
                private NotificationsService:INotificationsService,
                private HawkularInventory:any,
                private $log:ng.ILogService,
                public availableTabs: any,
                public activeTab: any) {

      HawkularOps.init(this.NotificationsService);

      HawkularInventory.ResourceUnderFeed.get({
        environmentId: globalEnvironmentId,
        feedId: this.$routeParams.resourceId.split('~')[0],
        resourcePath: this.$routeParams.resourceId + '~~'
      }, (resource:IResourcePath) => {
        this.resourcePath = resource.path;
      });

      $scope.tabs = this;

      this.availableTabs = [
        {id: 'jvm', name: 'JVM', enabled: true,
          src:'plugins/metrics/html/app-details/detail-jvm.html',
          controller: HawkularMetrics.AppServerJvmDetailsController},
        {id: 'deployments', name: 'Deployments', enabled: true,
          src:'plugins/metrics/html/app-details/detail-deployments.html',
          controller: HawkularMetrics.AppServerDeploymentsDetailsController},
        {id: 'jms', name: 'JMS', enabled: false,
          src:'plugins/metrics/html/app-details/detail-jms.html',
          controller: HawkularMetrics.AppServerJmsDetailsController},
        {id: 'transactions', name: 'Transactions', enabled: false,
          src:'plugins/metrics/html/app-details/detail-transactions.html',
          controller: HawkularMetrics.AppServerTransactionsDetailsController},
        {id: 'web', name: 'Web', enabled: true,
          src:'plugins/metrics/html/app-details/detail-web.html',
          controller: HawkularMetrics.AppServerWebDetailsController},
        {id: 'datasources', name: 'Datasources', enabled: true,
          src:'plugins/metrics/html/app-details/detail-datasources.html',
          controller: HawkularMetrics.AppServerDatasourcesDetailsController}
      ];

      this.activeTab = $routeParams.tabId || 'jvm';

      $scope.$on('ExportJDRSuccess', (event, data) => {
        this.$log.info('JDR generated!');
        this.jdrGenerating = false;
        this.hasGeneratedSuccessfully = true;
        this.hasGeneratedError = false;
      });

      $scope.$on('ExportJDRError', (event, data) => {
        this.$log.info('JDR generation failed!');
        this.jdrGenerating = false;
        this.hasGeneratedSuccessfully = false;
        this.hasGeneratedError = true;
      });

    }

    public updateTab(newTabId: string) {
      this.$route.updateParams({tabId: newTabId});
    }

    public requestExportJDR() {
      this.jdrGenerating = true;
      this.HawkularOps.performExportJDROperation(
        this.resourcePath,
        this.$rootScope.userDetails.token,
        this.$rootScope.currentPersona.id
      );
    }

  }

  _module.controller('AppServerDetailsController', AppServerDetailsController);

}
