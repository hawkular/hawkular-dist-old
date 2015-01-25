/// <reference path="../libs/hawtio-utilities/defs.d.ts"/>

/// <reference path="../../includes.ts"/>
var HawkularAlerts;
(function (HawkularAlerts) {
    HawkularAlerts.pluginName = "hawtio-assembly";
    HawkularAlerts.log = Logger.get(HawkularAlerts.pluginName);
    HawkularAlerts.templatePath = "plugins/alerts/html";
})(HawkularAlerts || (HawkularAlerts = {}));

/// <reference path="../../includes.ts"/>
/// <reference path="alertsGlobals.ts"/>
var HawkularAlerts;
(function (HawkularAlerts) {
    HawkularAlerts._module = angular.module(HawkularAlerts.pluginName, []);
    var tab = undefined;
    HawkularAlerts._module.config(['$locationProvider', '$routeProvider', 'HawtioNavBuilderProvider', function ($locationProvider, $routeProvider, builder) {
        tab = builder.create().id(HawkularAlerts.pluginName).title(function () { return "Alerts"; }).href(function () { return "/alerts"; }).subPath("Alerts", "alerts", builder.join(HawkularAlerts.templatePath, 'alerts.html')).build();
        builder.configureRouting($routeProvider, tab);
        $locationProvider.html5Mode(true);
    }]);
    HawkularAlerts._module.run(['HawtioNav', function (HawtioNav) {
        HawtioNav.add(tab);
        //log.debug("loaded");
    }]);
    hawtioPluginLoader.addModule(HawkularAlerts.pluginName);
})(HawkularAlerts || (HawkularAlerts = {}));

/// <reference path="alertsPlugin.ts"/>
var HawkularAlerts;
(function (HawkularAlerts) {
    HawkularAlerts.AlertsController = HawkularAlerts._module.controller("HawkularAlerts.AlertsController", ['$scope', function ($scope) {
        $scope.alerts = [
            { name: "Out of Memory Alert", priority: 2 },
            { name: "Out of Disk Space", priority: 1 },
            { name: "CPU High", priority: 3 }
        ];
    }]);
})(HawkularAlerts || (HawkularAlerts = {}));

angular.module("hawkular-alerts-templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("plugins/alerts/html/alerts.html","<div class=\"row\">\n  <div class=\"col-md-12\" ng-controller=\"HawkularAlerts.AlertsController\">\n    <h1>Alerts</h1>\n      <ul class=\"list-group\" ng-repeat=\"alert in alerts | orderBy:priority:true\">\n          <li class=\"list-group-item\">{{alert.name}}</li>\n      </ul>\n\n  </div>\n</div>\n");}]); hawtioPluginLoader.addModule("hawkular-alerts-templates");