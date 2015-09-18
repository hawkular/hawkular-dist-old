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

  export interface IDriverData {
    resourcePath: string;
    filePath: string;
    driverName: string;
    moduleName: string;
    driverClass: string;
    driverMajorVersion: number;
    driverMinorVersion: number;

    binaryFile: any;

    uploading: boolean;
    hasDeploymentError:boolean;
    hasDeployedSuccessfully:boolean;
  }

  export class AppServerDatasourcesDriverAddDialogController {
    /// this is for minification purposes
    public static $inject = ['$rootScope', '$scope', '$q', '$timeout', '$log', 'HawkularOps',
      '$modalInstance', 'NotificationsService', '$routeParams', 'HawkularInventory'];

    public driverData:IDriverData =
    {
      resourcePath: '',
      filePath: '',
      driverName: '',
      moduleName: '',
      driverClass: '',
      driverMajorVersion: undefined,
      driverMinorVersion: undefined,

      binaryFile: undefined,

      uploading: false,
      hasDeploymentError: false,
      hasDeployedSuccessfully: false
    };

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
        this.driverData.resourcePath = resource.path;
      });

      $scope.$on('JDBCDriverAddSuccess', (event, data) => {
        //this.$log.info('Deployment Add Succeeded!');
        this.driverData.uploading = false;
        this.driverData.hasDeployedSuccessfully = true;
        this.driverData.hasDeploymentError = false;

      });
      $scope.$on('JDBCDriverAddError', (event, data) => {
        //this.$log.warn('Deployment Add Failed!');
        //this.$log.warn(data);
        this.driverData.uploading = false;
        this.driverData.hasDeploymentError = true;
        this.driverData.hasDeployedSuccessfully = false;
      });

    }

    private cleanFilePath(filePath:string):string {
      return filePath.replace('C:\\fakepath\\','');
    }

    public onClose():void {
      this.$modalInstance.close('ok');
    }

    public exitStepFileSelect():void {
      this.driverData.filePath = this.cleanFilePath(this.driverData.filePath);
    }

    public exitStepDefineParameters():void {
      this.driverData.uploading = false;
      this.driverData.hasDeploymentError = false;
      this.driverData.hasDeployedSuccessfully = false;
    }

    public addDriver():void {
      this.driverData.uploading = true;
      this.HawkularOps.performAddJDBCDriverOperation(this.driverData.resourcePath,
        this.driverData.filePath,
        this.driverData.driverName,
        this.driverData.moduleName,
        this.driverData.driverClass,
        this.driverData.driverMajorVersion,
        this.driverData.driverMinorVersion,
        this.driverData.binaryFile,
        this.$rootScope.userDetails.token,
        this.$rootScope.currentPersona.id);
    }

    public finishedAddDriverWizard():void {
      //this.$log.log('Finished add jdbc driver wizard');
      this.$modalInstance.close('ok');
    }

  }

  _module.controller('AppServerDatasourcesDriverAddDialogController', AppServerDatasourcesDriverAddDialogController);

}
