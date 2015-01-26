/// <reference path="../libs/hawtio-utilities/defs.d.ts"/>

/// <reference path="../../includes.ts"/>
var HawkularMetrics;
(function (HawkularMetrics) {
    HawkularMetrics.pluginName = "hawtio-assembly";
    HawkularMetrics.log = Logger.get(HawkularMetrics.pluginName);
    HawkularMetrics.templatePath = "plugins/metrics/html";
})(HawkularMetrics || (HawkularMetrics = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="metricsGlobals.ts"/>
var HawkularMetrics;
(function (HawkularMetrics) {
    HawkularMetrics._module = angular.module(HawkularMetrics.pluginName, []);
    var tab = undefined;
    HawkularMetrics._module.config(['$locationProvider', '$routeProvider', 'HawtioNavBuilderProvider', function ($locationProvider, $routeProvider, navBuilder) {
        tab = navBuilder.create().id(HawkularMetrics.pluginName).title(function () { return "Metrics"; }).href(function () { return "/metrics"; }).subPath("Graphs", "graphs", navBuilder.join(HawkularMetrics.templatePath, 'graphs.html')).build();
        navBuilder.configureRouting($routeProvider, tab);
        $locationProvider.html5Mode(true);
    }]);
    HawkularMetrics._module.run(['HawtioNav', function (HawtioNav) {
        HawtioNav.add(tab);
        HawkularMetrics.log.debug("loaded");
    }]);
    hawtioPluginLoader.addModule(HawkularMetrics.pluginName);
})(HawkularMetrics || (HawkularMetrics = {}));

/// <reference path="metricsPlugin.ts"/>
var HawkularMetrics;
(function (HawkularMetrics) {
    HawkularMetrics.MetricsController = HawkularMetrics._module.controller("HawkularMetrics.MetricsController", ['$scope', function ($scope) {
        $scope.searchId = "";
    }]);
})(HawkularMetrics || (HawkularMetrics = {}));

angular.module("hawkular-metrics-templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("plugins/metrics/html/graphs.html","<div class=\"row\" ng-controller=\"HawkularMetrics.MetricsController\">\n    <div class=\"col-md-12\">\n        <h1>Hawkular Metrics Graphs</h1>\n    </div>\n    <div class=\"col-md-8\" ng-controller=\"HawkularMetrics.MetricsController\">\n        <form class=\"form-horizontal\" name=\"chartForm\" role=\"form\" novalidate>\n\n            <div class=\"form-group\">\n                <label class=\"col-sm-2 control-label\">ID</label>\n\n                <div class=\"col-sm-5\">\n                    <input type=\"text\" class=\"form-control\" name=\"searchId\" ng-model=\"searchId\"\n                           placeholder=\"Enter Id...\" required ng-minlength=\"1\">\n                        <span class=\"error-message\"\n                              ng-show=\"chartForm.searchId.$dirty && chartForm.searchId.$error.required\"> * Required.</span>\n                    <span class=\"help-block\">Example: 100, apache3.cpu1  </span>\n                </div>\n            </div>\n        </form>\n\n    </div>\n\n</div>\n");}]); hawtioPluginLoader.addModule("hawkular-metrics-templates");