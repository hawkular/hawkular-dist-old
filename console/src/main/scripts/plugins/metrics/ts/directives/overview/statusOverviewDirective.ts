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
  export class StatusOverviewController {
    constructor(private $filter: ng.IFilterService) {}

    public parseDayFromTimestamp(timestamp): string {
      const parsedDate = moment(timestamp).startOf('day');
      const today = moment().startOf('day');
      if (today.diff(parsedDate) === 0) {
        return 'Today';
      } else if (today.add(-1, 'days').startOf('day').diff(parsedDate) === 0) {
        return 'Yesterday';
      } else {
        return moment(timestamp).format('D MMM YYYY');
      }
    }

    public initPie(data) {
      const used = Math.round(data.inUseCount.value / (data.inUseCount.value + data.availableCount.value) * 100 || 0);
      data.chartConfig = {
        type: 'donut',
        donut: {
          label: {
            show: false
          },
          title: used + '%',
          width: 10
        },
        size: {
          height: 85
        },
        legend: {
          show: false
        },
        color: {
          pattern: ['#0088CE', '#D1D1D1']
        },
        data: {
          type: 'donut',
          columns: [
            ['Used', used],
            ['Available', 100 - used]
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

  let statusOverviewLink = ($scope: any, element: ng.IAugmentedJQuery, attrs: ng.IAttributes) => {
    $scope.$watch('datasourceInfo', (newDatasourceInfo) => {
      if (newDatasourceInfo) {
        angular.forEach(newDatasourceInfo, (item) => {
          $scope.vm.initPie(item);
        });
      }
    });
  };

  export class HkOverviewDonutChart {
    public replace = 'true';
    public link: any = ($scope: any, element: ng.IAugmentedJQuery, attrs: ng.IAttributes) => {
      $scope.$on(EventNames.DONUT_CHART_RENDERED, function() {
        if ($scope.chartConfig && $scope.chartConfig.bindto) {
          const donutChart = d3.select($scope.chartConfig.bindto);
          const donutChartTitle = donutChart.select('text.c3-chart-arcs-title');
          donutChartTitle.text('');
          _.forEach($scope.chartConfig.multiLineTitle, (item) => {
            donutChartTitle
              .append('tspan')
              .text(item['text'])
              .classed(item['classed'], true)
              .attr('dy', item['dy'])
              .attr('x', 0);
          });
        }
      });
    };
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

  export class HkStatusOverviewItem {
    public replace = 'true';
    public transclude = true;
    public scope = {
      metricTitle: '@',
      metricCount: '=',
      metricInfo: '@'
    };
    public templateUrl = 'plugins/metrics/html/directives/overview/status-overview-item.html';
    public static Factory() {
      let directive = () => {
        return new HkStatusOverviewItem();
      };

      directive['$inject'] = [];
      return directive;
    }
  }

  export class HkStatusOverview {
    public link: any;
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
  _module.directive('hkOverviewDonutChart', [HawkularMetrics.HkOverviewDonutChart.Factory()]);
  _module.directive('hkStatusOverview', [HawkularMetrics.HkStatusOverview.Factory()]);
  _module.directive('hkStatusOverviewItem', [HawkularMetrics.HkStatusOverviewItem.Factory()]);
}
