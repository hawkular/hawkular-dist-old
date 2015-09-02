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

  export type DeploymentStatusType = number;

  export interface IDeploymentData {
    resourcePath: string;
    filePath: string;
    runtimeFileName: string;
    binaryFile: any,
    enableDuringDeployment: boolean;
    uploading: boolean;
    editDeploymentFiles: boolean;
    deploymentStatus: DeploymentStatusType;
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
      '$modalInstance', 'NotificationsService', '$routeParams', 'HawkularInventory',
      'HawkularAddDeploymentOps'];

    public DEPLOYMENT_NOT_STARTED = 0;
    public DEPLOYMENT_ERROR = -1;
    public DEPLOYMENT_SUCCESS = 1;


    private _resourcePath:IResourcePath;


    public deploymentData:IDeploymentData =
    {
      resourcePath: '',
      runtimeFileName: '',
      filePath: '',
      binaryFile: undefined,
      enableDuringDeployment: false,
      uploading: false,
      editDeploymentFiles: false,
      /// Not sure why it wont let me use the const DEPLOYMENT_NOT_STARTED here :/
      deploymentStatus: 0
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
                private HawkularInventory:any,
                private HawkularAddDeploymentOps:any) {


      /// make sure our WS socket is open
      HawkularAddDeploymentOps.init(this.NotificationsService);

      HawkularInventory.FeedResource.get({
        environmentId: globalEnvironmentId,
        tenantId: this.$rootScope.currentPersona.id,
        feedId: this.$routeParams.resourceId.split('~')[0],
        resourceId: this.$routeParams.resourceId + '~~'
      }, (resource:IResourcePath) => {
        this._resourcePath = resource;
        this.deploymentData.resourcePath = resource.path;
      });

    }

    private cleanFilePath(filePath:string) :string {
      return filePath.substr(12, filePath.length -1);
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
      this.HawkularAddDeploymentOps.performOperation(this.deploymentData.resourcePath,
        this.deploymentData.runtimeFileName, this.deploymentData.binaryFile);

      /// @TODO check status

      /// @TODO here is a 2 sec time to simiulate work
      //this.$timeout(() => {
      //  this.$log.debug('Done uploading in step 2');
      //  this.deploymentData.uploading = false;
      //}, 2000);

    }

    public finishedDeployWizard():void {
      this.$modalInstance.close('ok');
    }


  }

  _module.controller('AppServerDeploymentsAddDialogController', AppServerDeploymentsAddDialogController);

}
