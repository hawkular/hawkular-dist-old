/// <reference path="../../includes.ts"/>
/// <reference path="metricsGlobals.ts"/>
module HawkularMetrics {

  export var _module = angular.module(HawkularMetrics.pluginName, []);

  var tab:any = undefined;

  _module.config(['$locationProvider', '$routeProvider', 'HawtioNavBuilderProvider', ($locationProvider, $routeProvider:ng.route.IRouteProvider, navBuilder:HawtioMainNav.BuilderFactory) => {
    tab = navBuilder.create()
      .id(HawkularMetrics.pluginName)
      .title(() => "Metrics")
      .href(() => "/metrics")
      .subPath("Graphs", "graphs", navBuilder.join(HawkularMetrics.templatePath, 'graphs.html'))
      .build();
    navBuilder.configureRouting($routeProvider, tab);
    $locationProvider.html5Mode(true);
  }]);

  _module.run(['HawtioNav', (HawtioNav:HawtioMainNav.Registry) => {
    HawtioNav.add(tab);
    log.debug("loaded");
  }]);


  hawtioPluginLoader.addModule(HawkularMetrics.pluginName);
}
