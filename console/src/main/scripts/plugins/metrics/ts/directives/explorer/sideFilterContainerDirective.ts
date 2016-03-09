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
    public isExpandedBody: boolean = false;
    public selectedFeed: any;
    public selectedResource: any;
    public feedsConfig: any;
    public resourceConfig: any;
    public selectedMetric: any;
    public buttonActive: boolean;
    public metrics: any[] = [];
    public childrenTree: any[] = [];
    public onResourceSelected: ng.IDeferred<any>;
    public onActivateMetric: () => void;

    /*@ngInject*/
    constructor(private HawkularInventory: any, private $q: ng.IQService) {
      this.onResourceSelected = this.$q.defer();
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
      this.selectedResource = undefined;
      this.HawkularInventory.ResourceUnderFeed.query({
        feedId: feed.id
      }).$promise.then((resourceList) => {
        this.resourceConfig.values = resourceList;
        this.selectedFeed = feed;
      });
    }

    public resourceSelected(resource) {
      this.onLoadMetrics(resource);
    }

    private onLoadMetrics(resource) {
      this.selectedResource = resource;
      resource.resourcePath = resource.path.substr(
        resource.path.indexOf(this.selectedFeed.id) + this.selectedFeed.id.length
      );
      this.getMetrics(resource);
    }

    public getMetrics(resource) {
      this.selectedMetric = null;
      this.buttonActive = false;
      this.HawkularInventory['MetricOfResourceUnderFeed']['get']({
          feedId: this.selectedFeed.id,
          resourcePath: resource.resourcePath.replace(/\/r;/g, '/').slice(1)
        },
        (metricList) => {
          this.metrics = metricList;
        }
      );
    }

    public selectMetric(metric) {
      this.selectedMetric = metric;
      this.buttonActive = true;
    }

  }

  class HkSideFilterContainerDirective {
    public templateUrl = 'plugins/metrics/html/directives/explorer/side-filter-container.html';
    public replace = 'true';
    public bindings = {
      selectedResource: '=',
      selectedFeed: '=',
      selectedMetric: '=',
      onActivateMetric: '&'
    };
    /*@ngInject*/
    public controller = SideFilterController;
    public controllerAs = 'sfCtrl';
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
