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
/// <reference path="../../../includes.ts"/>

module HawkularMetrics {
  export class StatusOverviewController {

    public initPie(data) {
      data.chartConfig = {
        type: 'donut',
        donut: {
          label: {
            show: false
          },
          width: 10
        },
        size: {
          height: 75
        },
        legend: {
          show: false
        },
        color: {
          pattern: ['#0088CE','#D1D1D1']
        },
        tooltip: {},
        data: {
          type: 'donut',
          columns: [
            ['Used', data.inUseCount.value / (data.inUseCount.value + data.availableCount.value) * 100 || 0],
            ['Available', 100]
          ],
          groups: [
            ['used', 'available']
          ],
          order: null
        }
      };
    }

    public filterByState(data, state) {
      return data.filter((item) => {
        return item['state'] === state;
      });
    }
  }

  let statusOverviewLink = ($scope:any, element:ng.IAugmentedJQuery, attrs:ng.IAttributes) => {
    $scope.$watch('datasourceInfo', (newDatasourceInfo) => {
      if (newDatasourceInfo) {
        angular.forEach(newDatasourceInfo, (item) => {
          $scope.vm.initPie(item);
        });
      }
    });
  };

  export class HkOverviewSparkLineChart {
    public replace = 'true';
    public scope = {
      title: '@',
      usageGraph: '=',
      usage: '='
    };
    public templateUrl = 'plugins/metrics/html/directives/overview/spark-line-chart.html';
    public static Factory() {
      let directive = () => {
        return new HkOverviewSparkLineChart();
      };

      directive['$inject'] = [];
      return directive;
    }
  }

  export class HkOverviewDonutChart {
    public replace = 'true';
    public scope = {
      graphTitle: '@',
      graphId: '@',
      chartConfig: '=',
      usage: '='
    };
    public templateUrl = 'plugins/metrics/html/directives/overview/donut-chart.html';
    public static Factory() {
      let directive = () => {
        return new HkOverviewDonutChart();
      };

      directive['$inject'] = [];
      return directive;
    }
  }

  export class HkStatusOverview {
    public link:any;
    public controller = StatusOverviewController;
    public controllerAs = 'vm';
    public replace = 'true';
    public scope = {
      datasourceInfo: '=',
      overviewInfo: '=',
      alertInfo: '=',
      startTimeStamp: '=',
      endTimeStamp: '='
    };
    public templateUrl = 'plugins/metrics/html/directives/overview/status-overview.html';
    constructor() {
      this.link = statusOverviewLink;
    }

    public static Factory() {
      let directive = () => {
        return new HkStatusOverview();
      };

      directive['$inject'] = [];
      return directive;
    }
  }

  _module.controller('StatusOverviewController', StatusOverviewController);
  _module.directive('hkOverviewSparkLineChart', [HawkularMetrics.HkOverviewSparkLineChart.Factory()]);
  _module.directive('hkOverviewDonutChart', [HawkularMetrics.HkOverviewDonutChart.Factory()]);
  _module.directive('hkStatusOverview', [HawkularMetrics.HkStatusOverview.Factory()]);
}
