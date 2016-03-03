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
  export class ResourceTreeController {
    public childrenTree: any;
    public onLoadMetrics: (args: {resource: any}) => void;
    public selectedFeed: any;
    public selectedResource: any;

    /*@ngInject*/
    constructor (private HawkularInventory: any, $scope: ng.IScope) {
      $scope.$watch(() => this.selectedResource, () => {
        if (this.selectedFeed && this.selectedResource) {
          if (ResourceTreeController.isParentNode(this.selectedResource)) {
            this.fetchResourceChildren(this.selectedResource, this.selectedFeed);
          }
        }
      });
    }

    private static isParentNode(resource: any) {
      return !resource.hasOwnProperty('nodeId') || resource.nodeId === 0;
    }

    private fetchResourceChildren(resource, feed) {
      this.HawkularInventory.ResourceRecursiveChildrenUnderFeed.get({
        feedId: feed.id,
        resourcePath: resource.id.replace(/\//g, '%2F')
      }).$promise.then((children) => {
        let preffix = feed.id + InventoryExplorerController.pathDelimiter;
        let grouppedChildren = _.groupBy(children, (item: any) => item.path.substring(
          item.path.lastIndexOf(preffix) + preffix.length,
          item.path.lastIndexOf(InventoryExplorerController.pathDelimiter))
        );
        let orderedChildren = {};
        Object.keys(grouppedChildren).sort().forEach((key) => {
          orderedChildren[key] = grouppedChildren[key];
        });
        let childrenAsTree = _.reduce(orderedChildren, (curr: any, value: any, key: string) => {
          const path = key.split(InventoryExplorerController.pathDelimiter);
          if (path.length === 1) {
            curr.text = ResourceTreeController.stripSpecialCharsFromLabel(path[0]);
            curr.nodes = ResourceTreeController.fillChildrenNodes(value);
          } else {
            path.shift();
            this.insertAtPath(curr, path, value);
          }
          return curr;
        }, _.cloneDeep(resource));

        if (children.length !== 0) {
          this.childrenTree = [childrenAsTree];
        } else {
          this.childrenTree.length = 0;
        }
      });
    }

    private static stripSpecialCharsFromLabel(childId): string {
      let label = childId.substring(childId.lastIndexOf('/') + 1, childId.length);
      label = (label.lastIndexOf('%2F') !== -1)
        ? label.substring(label.lastIndexOf('%2F') + '%2F'.length, label.length)
        : label;
      return label;
    }

    private static fillChildrenNodes(children): any[] {
      _.each(children, (child: any) => {
        child.text = ResourceTreeController.stripSpecialCharsFromLabel(child.id);
      });
      return children;
    }

    public insertAtPath(parent: any, path: any, item: any) {
      if (path.length === 0) {
        parent.nodes = ResourceTreeController.fillChildrenNodes(item);
        return parent;
      } else {
        const currId = path[0];
        path.shift();
        return this.insertAtPath(
          _.find(parent.nodes, {text: ResourceTreeController.stripSpecialCharsFromLabel(currId)}),
          path, item);
      }
    }

  }

  class HkResourceTreeComponent {
    public templateUrl = 'plugins/metrics/html/directives/explorer/resource-tree.html';
    public replace = 'true';
    public bindings = {
      onLoadMetrics: '&',
      selectedFeed: '=',
      selectedResource: '='
    };
    /*@ngInject*/
    public controller =  ResourceTreeController;
  }

  _module.component('hkResourceTree', new HkResourceTreeComponent);
}
