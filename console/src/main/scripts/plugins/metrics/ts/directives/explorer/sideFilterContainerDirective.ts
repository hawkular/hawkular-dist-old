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

  export class SideFilterController {
    public selectedFeed: any;
    public selectedResource: any;
    public feedsConfig: any;
    public resourceConfig: any;
    public childrenTree: any[] = [];
    /*@ngInject*/
    constructor(private HawkularInventory: any) {
      this.feedsConfig = {
        title: 'Feed'
      };

      this.resourceConfig = {
        title: 'Resource'
      };
      this.getFeeds();
    }

    private getFeeds() {
      this.HawkularInventory.Feed.query({
      }).$promise.then( (feedList) => {
        this.feedsConfig.values = feedList;
      });
    }

    public feedSelected(feed) {
      this.selectedResource = null;
      this.HawkularInventory.ResourceUnderFeed.query({
        feedId: feed.id
      }).$promise.then((resourceList) => {
        this.resourceConfig.values = resourceList;
        this.selectedFeed = feed;
      });
    }

    public resourceSelected(resource) {
      this.onLoadMetrics(resource);
      this.fetchResourceChildren(resource, this.selectedFeed);
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
            curr.text = SideFilterController.stripSpecialCharsFromLabel(path[0]);
            curr.nodes = SideFilterController.fillChildrenNodes(value);
          } else {
            path.shift();
            this.insertAtPath(curr, path, value);
          }
          return curr;
        }, _.cloneDeep(this.selectedResource));

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
        child.text = SideFilterController.stripSpecialCharsFromLabel(child.id);
      });
      return children;
    }

    public insertAtPath(parent: any, path: any, item: any) {
      if (path.length === 0) {
        parent.nodes = SideFilterController.fillChildrenNodes(item);
        return parent;
      } else {
        const currId = path[0];
        path.shift();
        return this.insertAtPath(
          _.find(parent.nodes, {text: SideFilterController.stripSpecialCharsFromLabel(currId)}),
          path, item);
      }
    }

    private onLoadMetrics(resource) {
      resource.resourcePath = resource.path.substr(
        resource.path.indexOf(this.selectedFeed.id) + this.selectedFeed.id.length
      );
      this.selectedResource = resource;
      if (this.hasOwnProperty('loadMetrics') && typeof this['loadMetrics'] === 'function') {
        this['loadMetrics']({resource: this.selectedResource});
      }
    }
  }

  class HkSideFilterContainerDirective {
    public templateUrl = 'plugins/metrics/html/directives/explorer/side-filter-container.html';
    public replace = 'true';
    public bindings = {
      selectedResource: '=',
      selectedFeed: '=',
      loadMetrics: '&'
    };
    /*@ngInject*/
    public controller = SideFilterController;
  }

  export class HkRadioFilterDirective {
    public replace = 'true';
    public scope = {
      filterClicked: '&',
      config: '='
    };
    public templateUrl = 'plugins/metrics/html/directives/explorer/radio-filter.html';

    public static Factory() {
      let directive = () => {
        return new HkRadioFilterDirective();
      };

      directive['$inject'] = [];

      return directive;
    }
  }

  _module.component('hkSideFilterContainer', new HkSideFilterContainerDirective);
  _module.directive('hkRadioFilter', [HkRadioFilterDirective.Factory()]);

}
