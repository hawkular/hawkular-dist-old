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

/// <reference path="../../metricsPlugin.ts"/>
/// <reference path="../../../includes.ts"/>

module HawkularMetrics {

  export class LabelEditorController {
    public currentLabel: any;
    constructor(public index: any,
                public labels: any,
                public $modalInstance:any) {
      this.currentLabel = this.labels[index];
    }
    public confirmDelete() {
      this.labels.splice(this.index, 1);
      this.$modalInstance.close(this.labels);
    }

    public cancel() {
      this.$modalInstance.dismiss('cancel');
    }
  }

  export class ServerDetailController {
    public serverInfo = {};
    private feedId: FeedId;
    private resourceId: ResourceId;
    public labels = [];
    public newLabel:any = {};
    public isOpen = false;

    constructor(private $routeParams:any,
                private HawkularInventory: any,
                private $modal:any) {
      this.feedId = this.$routeParams.feedId;
      this.resourceId = this.$routeParams.resourceId + '~~';
    }

    public confirmNewLabel() {
      let properties = this.initProperties();
      let newLabel = new ServerLabel(this.newLabel.key, this.newLabel.value);
      properties['labels'].push(newLabel);

      this.publishProperties(properties);
      this.closeDropDown();
    }

    public removeLabel(index, $event) {
      $event.stopPropagation();
      let modalInstance = this.$modal.open({
        templateUrl: 'plugins/metrics/html/directives/overview/remove-label.html',
        controller: 'LabelEditorController as lvm',
        resolve: {
          index: () => index,
          labels: () => this.serverInfo['properties']['labels'].slice()
        }
      });
      modalInstance.result.then((newLabels) => {
        this.serverInfo['properties']['labels'] = newLabels;
        this.publishProperties(this.serverInfo['properties']);
      });
    }

    public publishProperties(properties) {
      if (this.HawkularInventory.hasOwnProperty('ResourceUnderFeed') &&
        this.HawkularInventory.ResourceUnderFeed.hasOwnProperty('updateProperties')) {
        this.HawkularInventory['ResourceUnderFeed']['updateProperties']({
            feedId: this.feedId,
            resourcePath: this.resourceId
          },
          {properties}, (result) => {
            this.serverInfo['properties'] = properties;
          });
      }
    }

    private initProperties() {
      let properties = {};
      if (this.hasProperties()) {
        properties = this.serverInfo['properties'];
      }

      if (!properties.hasOwnProperty('labels')) {
        properties['labels'] = [];
      }

      return properties;
    }

    private hasProperties() {
      return this.serverInfo.hasOwnProperty('properties');
    }

    public closeDropDown() {
      this.clearLabel();
      this.isOpen = false;
    }

    private clearLabel() {
      this.newLabel = {};
    }
  }

  let serverDetailLink = ($scope:any, element:ng.IAugmentedJQuery, attrs:ng.IAttributes) => {
    $scope.$watch('serverInfo', (newServerInfo) => {
      $scope.vm.serverInfo = newServerInfo;
    });
  };

  export class HkServerDetails {
    public link = serverDetailLink;
    public controller = ServerDetailController;
    public controllerAs = 'vm';
    public replace = 'true';
    public scope = {
      serverInfo: '='
    };
    public templateUrl = 'plugins/metrics/html/directives/overview/server-details.html';

    public static Factory() {
      let directive = () => {
        return new HkServerDetails();
      };

      directive['$inject'] = [];
      return directive;
    }
  }

  export class HkDetailLabelEditor {
    public link = ($scope:any, element:ng.IAugmentedJQuery, attrs:ng.IAttributes) => {
      $scope.oldLabel = _.clone($scope.label, true);

      $scope.closeDropDown = () => {
        $scope.label = _.clone($scope.oldLabel, true);
        $scope.isOpen = false;
        $scope.close();
      };

      $scope.confirmDropDown = () => {
        $scope.oldLabel = _.clone($scope.label, true);
        $scope.confirm();
        $scope.isOpen = false;
      };
    };
    public replace = 'true';
    public transclude = true;
    public scope = {
      label: '=',
      confirm: '&',
      close: '&'
    };
    public templateUrl = 'plugins/metrics/html/directives/overview/label-editor.html';
    public static Factory() {
      let directive = () => {
        return new HkDetailLabelEditor();
      };

      directive['$inject'] = [];
      return directive;
    }
  }

  _module.controller('ServerDetailController', ServerDetailController);
  _module.controller('LabelEditorController', LabelEditorController);

  _module.directive('hkDetailLabelEditor', [HawkularMetrics.HkDetailLabelEditor.Factory()]);
  _module.directive('hkServerDetails', [HawkularMetrics.HkServerDetails.Factory()]);
}
