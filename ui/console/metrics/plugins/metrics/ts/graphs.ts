/// <reference path="metricsPlugin.ts"/>
module HawkularMetrics {

  export var MetricsController = _module.controller("HawkularMetrics.MetricsController", ['$scope', ($scope) => {
    $scope.target = "World!";
  }]);

}
