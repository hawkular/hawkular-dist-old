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
/// <reference path="alertsManager.ts"/>
/// <reference path="errorManager.ts"/>

module HawkularMetrics {

  export class AppServerDetailsController {
    /// for minification only
    public static  $inject = ['$scope','$route','$routeParams'];

    constructor(private $scope: any,
                private $route: any,
                private $routeParams: any,
                public availableTabs: any,
                public activeTab: any) {
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
        {id: 'web', name: 'Web', enabled: false,
          src:'plugins/metrics/html/app-details/detail-web.html',
          controller: HawkularMetrics.AppServerWebDetailsController},
        {id: 'datasources', name: 'Datasources', enabled: true,
          src:'plugins/metrics/html/app-details/detail-datasources.html',
          controller: HawkularMetrics.AppServerDatasourcesDetailsController}
      ];

      this.activeTab = $routeParams.tabId || 'jvm';
    }

    updateTab(newTabId: string) {
      this.$route.updateParams({tabId: newTabId});
    }

  }

  _module.controller('HawkularMetrics.AppServerDetailsController', AppServerDetailsController);

}
