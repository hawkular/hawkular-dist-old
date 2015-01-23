/// <reference path="../../includes.ts"/>
/// <reference path="alertsGlobals.ts"/>
module HawkularAlerts {

  export var _module = angular.module(HawkularAlerts.pluginName, []);

  var tab:any = undefined;

  _module.config(['$locationProvider', '$routeProvider', 'HawtioNavBuilderProvider', ($locationProvider, $routeProvider:ng.route.IRouteProvider, builder:HawtioMainNav.BuilderFactory) => {
    tab = builder.create()
      .id(HawkularAlerts.pluginName)
      .title(() => "Alerts")
      .href(() => "/alerts")
      .subPath("Alerts", "alerts", builder.join(HawkularAlerts.templatePath, 'alerts.html'))
      .build();
    builder.configureRouting($routeProvider, tab);
    $locationProvider.html5Mode(true);
  }]);

  _module.run(['HawtioNav', (HawtioNav:HawtioMainNav.Registry) => {
    HawtioNav.add(tab);
    //log.debug("loaded");
  }]);


  hawtioPluginLoader.addModule(HawkularAlerts.pluginName);
}
