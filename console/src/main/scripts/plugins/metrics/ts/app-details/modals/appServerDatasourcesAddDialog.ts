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

/// <reference path="../../metricsPlugin.ts"/>

module HawkularMetrics {

  export interface IDatasourceData {
    resourcePath: string;
    xaDatasource: boolean;
    datasourceName: string;
    jndiName: string;
    driverName: string;
    driverClass: string;
    connectionUrl: string;
    xaDatasourceClass: string;
    datasourceProperties: any;
    conn: IDatasourceConnection;

    uploading: boolean;
    hasOperationFailed:boolean;
    hasOperationSucceeded:boolean;
  }

  export interface IDatasourceProperty {
    name: string;
    value: string;
  }

  export interface IDatasourceConnection {
    username: string;
    password: string;
    securityDomain: string;
  }

  export class AppServerDatasourcesAddDialogController {
    /// this is for minification purposes
    public static $inject = ['$rootScope', '$scope', '$q', '$timeout', '$log', 'HawkularOps',
      '$modalInstance', 'NotificationsService', '$routeParams', 'HawkularInventory'];

    public dsData: IDatasourceData;

    public tmpDSProperties: IDatasourceProperty[] = [];

    public driversList: any;

    public dsNameChanged: boolean = false;
    public jndiNameChanged: boolean = false;

    constructor(private $rootScope:IHawkularRootScope,
                private $scope:ng.IScope,
                private $q:ng.IQService,
                private $timeout:ng.ITimeoutService,
                private $log:ng.ILogService,
                private HawkularOps:any,
                private $modalInstance:any,
                private NotificationsService:INotificationsService,
                private $routeParams:any,
                private HawkularInventory:any) {


      /// make sure our WS socket is open
      HawkularOps.init(this.NotificationsService);

      HawkularInventory.ResourceUnderFeed.get({
        environmentId: globalEnvironmentId,
        feedId: this.$routeParams.resourceId.split('~')[0],
        resourcePath: this.$routeParams.resourceId + '~~'
      }, (resource:IResourcePath) => {
        this.dsData.resourcePath = resource.path;
      });

      $scope.$on('DatasourceAddSuccess', (event, data) => {
        this.dsData.uploading = false;
        this.dsData.hasOperationSucceeded = true;
        this.dsData.hasOperationFailed = false;

      });
      $scope.$on('DatasourceAddError', (event, data) => {
        this.dsData.uploading = false;
        this.dsData.hasOperationFailed = true;
        this.dsData.hasOperationSucceeded = false;
      });

    }

    public onClose():void {
      this.$modalInstance.close('ok');
    }

    public onDSNameChange(): void {
      this.dsNameChanged = true;
      if (!this.jndiNameChanged) {
        this.dsData.jndiName = 'java:/' + this.dsData.datasourceName;
      }
    }

    public onJNDINameChange(): void {
      this.jndiNameChanged = true;
      if (!this.dsNameChanged) {
        this.dsData.datasourceName = this.dsData.jndiName.replace('java:/','').replace('java:jboss/','');
      }
    }

    public exitStepDatasourceAttributes():void {
      this.HawkularInventory.ResourceOfTypeUnderFeed.query({
        environmentId: globalEnvironmentId, feedId: this.$routeParams.resourceId.split('~')[0],
        resourceTypeId: 'JDBC Driver'}, (aResourceList, getResponseHeaders) => {
          this.driversList = aResourceList;
          _.forEach(this.driversList, function(item: any) {
            item.name = item.id.split('jdbc-driver=')[1];
          }, this);
      });
    }

    public removeDSProperty(idx): void {
      this.tmpDSProperties.splice(idx, 1);
    }

    public addDSProperty(): void {
      this.tmpDSProperties.push({name:'', value:''});
    }

    public exitStepXAProperties():void {
      this.dsData.datasourceProperties = {};
      _.forEach(this.tmpDSProperties, function(prop: IDatasourceProperty) {
        this.dsData.datasourceProperties[prop.name] = prop.value;
      }, this);
    }

    public backStepReview():void {
      this.dsData.uploading = false;
      this.dsData.hasOperationFailed = false;
      this.dsData.hasOperationSucceeded = false;
    }

    public addDatasource():void {
      console.log('adding DS', this.dsData);
      this.dsData.uploading = true;
      this.HawkularOps.performAddDatasourceOperation(this.dsData.resourcePath,
        this.$rootScope.userDetails.token,
        this.$rootScope.currentPersona.id,
        this.dsData.xaDatasource,
        this.dsData.datasourceName,
        this.dsData.jndiName,
        this.dsData.driverName,
        this.dsData.driverClass,
        this.dsData.connectionUrl,
        this.dsData.xaDatasourceClass,
        this.dsData.datasourceProperties || {URL: 'jdbc:h2:mem:test'},
        this.dsData.conn.username,
        this.dsData.conn.password,
        this.dsData.conn.securityDomain
        );
    }

    public finishedAddDatasourceWizard():void {
      //this.$log.log('Finished add Datasource wizard');
      this.$modalInstance.close('ok');
    }

  }

  _module.controller('AppServerDatasourcesAddDialogController', AppServerDatasourcesAddDialogController);

}
