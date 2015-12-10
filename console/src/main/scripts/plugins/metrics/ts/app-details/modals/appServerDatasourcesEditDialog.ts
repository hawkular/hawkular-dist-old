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

  export class AppServerDatasourcesEditDialogController {

    static $inject = ['$scope', '$rootScope', '$modalInstance', '$q', '$routeParams', 'HawkularOps',
      'NotificationsService', 'HawkularInventory', 'datasource'];

    public tmpDSProperties: any[];

    constructor(private $scope:any,
                private $rootScope:any,
                private $modalInstance:any,
                private $q:ng.IQService,
                private $routeParams:any,
                private HawkularOps,
                private NotificationsService:INotificationsService,
                private HawkularInventory:any,
                public datasource) {

      /// make sure our WS socket is open
      HawkularOps.init(this.NotificationsService);

      let dsPath = datasource.path;
      let feedId = dsPath.substring(dsPath.lastIndexOf('/f;')+3, dsPath.indexOf('/r;'));
      let resourcePath = datasource.path.split('/r;').splice(1).join('/');

      this.HawkularInventory.ResourceUnderFeed.getData({
        feedId: feedId,
        resourcePath: resourcePath}, (resource) => {
          this.datasource.datasourceName = this.datasource.name;
          this.datasource.connectionUrl = resource.value['Connection URL'];
          this.datasource.driverClass = resource.value['Driver Class'];
          this.datasource.driverName = resource.value['Driver Name'];
          this.datasource.datasourceClass = resource.value['Datasource Class'];
          this.datasource.xaDatasourceClass = resource.value['XA Datasource Class'];
          this.datasource.xaDatasource = !!this.datasource.xaDatasourceClass;
          this.tmpDSProperties = [];
          if (resource.value['Datasource Properties']) {
            var dsProps = JSON.parse(resource.value['Datasource Properties']);
            _.forEach(dsProps, function(propValue, propName) {
              this.tmpDSProperties.push({name: propName, value: propValue});
            }, this);
          }
          this.datasource.enabled = resource.value['Enabled'];
          this.datasource.jndiName = resource.value['JNDI Name'];
          this.datasource.conn = {
            username: resource.value['Username'],
            password: resource.value['Password'],
            securityDomain: resource.value['Security Domain']
          };
      });

      $scope.$on('DatasourceUpdateSuccess', (event, data) => {
        this.$modalInstance.close(data);
        this.NotificationsService.success('The Datasource ' + this.datasource.name + ' was updated.');
      });

      $scope.$on('DatasourceUpdateError', (event, data) => {
        this.NotificationsService.error('The Datasource ' + this.datasource.name + ' failed to be updated.');
      });
    }

    public removeDSProperty(idx): void {
      this.tmpDSProperties.splice(idx, 1);
    }

    public addDSProperty(): void {
      this.tmpDSProperties.push({name:'', value:''});
    }

    public updateDatasource(): void {
      this.datasource.datasourceProperties = {};
      _.forEach(this.tmpDSProperties, function(prop: IDatasourceProperty) {
        this.datasource.datasourceProperties[prop.name] = prop.value;
      }, this);
      this.HawkularOps.performUpdateDatasourceOperation(
        this.datasource.path,
        this.$rootScope.userDetails.token,
        this.$rootScope.currentPersona.id,
        this.datasource.datasourceName,
        this.datasource.jndiName,
        this.datasource.driverName,
        this.datasource.driverClass,
        this.datasource.connectionUrl,
        this.datasource.xaDatasourceClass,
        this.datasource.datasourceProperties || {},
        this.datasource.conn.username,
        this.datasource.conn.password,
        this.datasource.conn.securityDomain);
    }

    public cancel() {
      this.$modalInstance.dismiss('cancel');
    }

  }

  _module.controller('AppServerDatasourcesEditDialogController', AppServerDatasourcesEditDialogController);

}
