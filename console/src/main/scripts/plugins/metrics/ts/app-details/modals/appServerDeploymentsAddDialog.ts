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


  export interface IDeploymentData {
    resourcePath: string;
    filePath: string;
    runtimeFileName: string;
    binaryFile: any;
    dontEnableDuringDeployment: boolean;
    uploading: boolean;
    hasDeploymentError:boolean;
    hasDeployedSuccessfully:boolean;
    editDeploymentFiles: boolean;
  }

  export interface IResourcePath {
    id:ResourceId;
    tenantId:TenantId;
    path: PathId;
    environmentId:Environment;
    feedId:FeedId;
  }

  export class AppServerDeploymentsAddDialogController {
    /// this is for minification purposes
    public static $inject = ['$rootScope', '$scope', '$q', '$timeout', '$log', 'HawkularOps',
      '$modalInstance', 'NotificationsService', '$routeParams', 'HawkularInventory'];


    public deploymentData:IDeploymentData =
    {
      resourcePath: '',
      runtimeFileName: '',
      filePath: '',
      binaryFile: undefined,
      dontEnableDuringDeployment: false,
      uploading: false,
      hasDeploymentError: false,
      hasDeployedSuccessfully: false,
      editDeploymentFiles: false
    };

    public editableDeploymentData:IDeploymentData;
    public originalDeploymentData:IDeploymentData;

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
        this.deploymentData.resourcePath = resource.path;
      });

      $scope.$on('DeploymentAddSuccess', (event, data) => {
        this.$log.info('Deployment Add Succeeded!');
        this.deploymentData.uploading = false;
        this.deploymentData.hasDeployedSuccessfully = true;
        this.deploymentData.hasDeploymentError = false;

      });
      $scope.$on('DeploymentAddError', (event, data) => {
        this.$log.warn('Deployment Add Failed!');
        this.$log.warn(data);
        this.deploymentData.uploading = false;
        this.deploymentData.hasDeploymentError = true;
        this.deploymentData.hasDeployedSuccessfully = false;
      });

    }

    private cleanFilePath(filePath:string):string {
      return filePath.substr(12, filePath.length - 1);
    }

    public onClose():void {
      this.$modalInstance.close('ok');
    }

    public exitStep1():void {
      this.$log.log('Exit Step 1 for resourceId: ' + this.$routeParams.resourceId);
      this.deploymentData.editDeploymentFiles = false;
      this.deploymentData.filePath = this.cleanFilePath(this.deploymentData.filePath);
      this.deploymentData.runtimeFileName = this.deploymentData.filePath;
    }

    public exitStep2():void {
      this.deploymentData.uploading = true;
      this.$log.log('Deploying file: ' + this.deploymentData.runtimeFileName);
      this.HawkularOps.performAddDeployOperation(this.deploymentData.resourcePath,
        this.deploymentData.runtimeFileName,
        this.deploymentData.binaryFile,
        this.$rootScope.userDetails.token,
        this.$rootScope.currentPersona.id,
        !this.deploymentData.dontEnableDuringDeployment);

    }

    public editVerifyFile():void {
      this.deploymentData.editDeploymentFiles = true;
      this.editableDeploymentData = angular.copy(this.deploymentData);
      this.originalDeploymentData = angular.copy(this.deploymentData);
    }

    public saveVerifyFile():void {
      this.deploymentData = angular.copy(this.editableDeploymentData);
      this.deploymentData.editDeploymentFiles = false;
    }

    public resetVerifyFile():void {
      this.editableDeploymentData = angular.copy(this.originalDeploymentData);
    }

    public finishDeployWizard():void {
      this.$log.log('Finished deploy add wizard');
      this.$modalInstance.close('ok');
    }

  }

  _module.controller('AppServerDeploymentsAddDialogController', AppServerDeploymentsAddDialogController);

}
