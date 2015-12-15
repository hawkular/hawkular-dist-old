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

/// <reference path='metricsPlugin.ts'/>
/// <reference path='services/notificationsService.ts'/>

module HawkularMetrics {

  export class ExplorerController implements IRefreshable {
    public static $inject = ['$location', '$scope', '$rootScope', '$interval', '$log', '$routeParams',
          '$modal', '$window', 'HawkularInventory', 'HawkularMetric', 'MetricsService',
          'ErrorsManager', '$q'];


    public feeds = ['Test','Data'];
    private title:string = 'Hello Explorer';
    public pleaseWait = true;
    public resourceButtonEnabled = false;
    private selectedFeed;
    private resources = [];
    private selectedResource;
    private metrics = [];
    private charts = [];
    private chartData = [];
    private selectedMetric;
    private buttonActive = false;
    public startTimeStamp:TimestampInMillis;
    public endTimeStamp:TimestampInMillis;



    constructor(private $location:ng.ILocationService,
                private $scope:any,
                private $rootScope:any,
                private $interval:ng.IIntervalService,
                private $log:ng.ILogService,
                private $routeParams:any,
                private $modal:any,
                private $window:any,
                private HawkularInventory: any,
                private HawkularMetric: any,
                private MetricsService:IMetricsService,
                private ErrorsManager:IErrorsManager,
                private $q:ng.IQService) {
      $scope.exc = this;

      this.startTimeStamp = +moment().subtract(($routeParams.timeOffset || 3600000), 'milliseconds');
      this.endTimeStamp = +moment();

      this.autoRefresh(20);
      this.getFeeds();
    }


    private autoRefreshPromise:ng.IPromise<number>;


    private autoRefresh(intervalInSeconds:number):void {
      this.autoRefreshPromise = this.$interval(() => {
        this.refresh();
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(this.autoRefreshPromise);
      });
    }

    private getFeeds():any {

      this.pleaseWait = true;

      this.HawkularInventory.Feed.query({},
          (aFeedList) => {
            this.feeds = aFeedList;
            this.pleaseWait = false;
            if (!aFeedList.length) {
              // there are no feeds, no app servers
              this.feeds = ['Hello', 'World','Eat','More','Bacon'];
            }
          });
    }

    public selectFeed(feed:string):void {

      this.selectedMetric = '';
      this.selectedResource = '';
      this.selectedFeed = feed;
      this.buttonActive = false;
      this.getResources(feed);
    }

    private getResources(feed) {
      this.pleaseWait=true;
      this.HawkularInventory.ResourceUnderFeed.query({
          feedId: feed.id
        },
        (resourceList) => {
          this.resources = resourceList;
          this.pleaseWait = false;
          // TODO fetch recursive childen too
        }
      );
    };

    public selectResource(resource:string):void {

      this.selectedResource = resource;
      this.selectedMetric = '';
      this.buttonActive = false;
      this.getMetrics(resource);
    }

    private getMetrics(resource) {
      this.pleaseWait = true;
      this.HawkularInventory['ResourceUnderFeed']['getMetrics']({
          feedId: this.selectedFeed.id,
          resourcePath: resource.id

        },
        (metricList) => {
          this.metrics = metricList;
          this.pleaseWait = false;
        }
      );
    };

    public selectMetric(metric) {

      this.selectedMetric = metric;
      this.buttonActive = true;


     // this.showChart(); // TODO activate only after button press
    }

    public showChart() {
      this.$log.log('showChart');
      this.$log.log(this.selectedMetric);

      // Only add if not empty and not yet in the array.
      if (this.selectedMetric != null && this.selectedMetric !== '' &&
           this.charts.indexOf(this.selectedMetric) === -1) {
        this.charts.push(this.selectedMetric);
        this.refresh();
      }
    }

    public removeChart(chart) {
      this.$log.log('Remove ' + chart);
      let index = this.charts.indexOf(chart,0);
      if (index > -1) {
        this.charts.splice(index,1);
        let id = chart.id;
        index = this.chartData.indexOf(id,0);
        if (index > -1) {
          this.chartData.splice(index,1);
        }

        this.refresh();

      }
    }

    public refresh() {
      if (this.charts ==null) {
        return;
      }

      _.forEach(this.charts, (res:any) => {
          let theId = res.id;
          //if (res.type.type === 'GAUGE') {
            this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
              gaugeId: theId,
              start: this.startTimeStamp,
              end: this.endTimeStamp,
              buckets: 60
            }, (data) => {
//              this.$log.log('Got data: ' + data);

              if (data.length) {
                this.chartData[theId] = data;
              }
            }, this);

          //} else if (res.type.type == "COUNTER") {
        //
        //} else {
        //  this.$log.log("Unknown type " + res.type.type);
        //}
      });
    }


  }

  //_module.config(['ngClipProvider', (ngClipProvider) => {
  //  ngClipProvider.setConfig({
  //    zIndex: 50
  //  });
  //}]);

  _module.controller('ExplorerController', ExplorerController);

}
