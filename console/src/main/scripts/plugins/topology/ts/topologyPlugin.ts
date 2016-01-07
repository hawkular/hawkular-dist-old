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

/// <reference path='../../includes.ts'/>
/// <reference path='topologyGlobals.ts'/>

module HawkularTopology {

  _module.config(
    ($routeProvider, HawtioNavBuilderProvider:HawtioMainNav.BuilderFactory) => {

      $routeProvider
      .when(
        '/hawkular-ui/topology/view',
        { templateUrl: HawtioNavBuilderProvider.join(HawkularTopology.templatePath, 'index.html') }
        );
    });

  export class TopologyController {
    private data: any;
    private requestPending: boolean;
    private index = 0;
    private kinds: any;
    private autoRefreshPromise: ng.IPromise<any>;

    constructor(private $rootScope:any,
      private $scope: any,
      private $interval: ng.IIntervalService,
      private $q: any,
      private HawkularInventory:any) {


      var datasets = [];

      function sink(dataset) {
        datasets.push(dataset);
      }

      this.kinds = {
        Server: '',
        DataSource: '',
        Database: '#vertex-Database',
        App: ''
      };

      // fetch the data from the inventory
      this.getData();
      this.autoRefresh(20);
    }

    public testClick() {
      this.index += 1;
      this.data.items[this.index] = {
        kind: 'DataSource'
      };
      this.$rootScope.$digest();
    }

    private autoRefresh(intervalInSeconds: number): void {
      this.autoRefreshPromise = this.$interval(() => {
        this.getData();
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(this.autoRefreshPromise);
      });
    }

    private getResourcesForResType(feedId: string, resourceType: string) {
      return this.HawkularInventory.ResourceOfTypeUnderFeed.query({ environmentId: globalEnvironmentId,
        feedId: feedId,
        resourceTypeId: resourceType }).$promise;
    }

    public getDataForOneFeed(feedId: string): ng.IPromise<any> {
      let promises = [];
      promises.push(this.getResourcesForResType(feedId, 'WildFly Server'));
      promises.push(this.getResourcesForResType(feedId, 'Datasource'));
      promises.push(this.getResourcesForResType(feedId, 'Deployment'));

      return this.$q.all(promises);
    }

    public getServerMetadata(feedId: string, serverId: string, metadata: any) {
      this.HawkularInventory.ResourceUnderFeed.getData({ environmentId: globalEnvironmentId,
        feedId: feedId,
        resourcePath: serverId }, (data) => {
          metadata.metadata.ip = data.value['Bound Address'];
          metadata.metadata.hostname = data.value.Hostname;
          metadata.metadata.version = data.value.Version;
        });
    }

    public getData(): any {
      this.requestPending = true;
      let typeToKind = {
        'WildFly Server': 'Server',
        'Datasource': 'DataSource',
        'Deployment': 'App'
      };
      let extractServerId = (id: string): string => id.substring(0, id.indexOf('/')) + '~';
      let extractFeedId = (path: string): string => {
        var feedChunk = path.split('/').filter((chunk) => chunk.startsWith('f;'));
        return feedChunk.length === 1 && feedChunk[0] ? feedChunk[0].slice(2) : 'localhost';
      };

      this.HawkularInventory.Feed.query({environmentId:globalEnvironmentId}, (aFeedList) => {
        if (!aFeedList.length) {
          this.requestPending = false;
          return;
        }
        let promises = [];
        angular.forEach(aFeedList, (feed) => {
          promises.push(this.getDataForOneFeed(feed.id));
        });
        this.$q.all(promises).then((aResourceList) => {
          let newRelations = [];
          let newData = {
            items: {},
            relations: {}
          };
          let flatResources = _.flatten(aResourceList, true);
          if (!flatResources.length) {
            this.requestPending = false;
            return;
          }
          angular.forEach(flatResources, (res) => {
              let feedId =  extractFeedId(res.path);
              let newItem = {
              kind: typeToKind[res.type.id],
              id: res.id,
              metadata: {
                name: res.name,
                feedId: feedId
              }
            };
            if (newItem.kind !== 'Server') {
              newRelations.push({
                source: extractServerId(res.id),
                target: res.id
              });
            } else {
                this.getServerMetadata(feedId, res.id, newItem);
              }
              newData.items[res.id] = newItem;
            });
          newData.relations = newRelations;
          this.data = newData;
          this.requestPending = false;
        });
      });
    }
  }

  _module.controller('HawkularTopology.TopologyController', TopologyController);

  // so the same scroll doesn't trigger multiple times
  angular.module('infinite-scroll').value('THROTTLE_MILLISECONDS', 250);

  hawtioPluginLoader.addModule(HawkularTopology.pluginName);
}
