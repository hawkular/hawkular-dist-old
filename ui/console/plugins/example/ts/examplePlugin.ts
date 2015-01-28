/// <reference path="../../includes.ts"/>
/// <reference path="exampleGlobals.ts"/>
module Example {

  export var _module = angular.module(Example.pluginName, []);

  var tab = undefined;

  _module.config(['$locationProvider', '$routeProvider', 'HawtioNavBuilderProvider', ($locationProvider, $routeProvider:ng.route.IRouteProvider, builder:HawtioMainNav.BuilderFactory) => {
    tab = builder.create()
      .id(Example.pluginName)
      .title(() => "Example")
      .href(() => "/example")
      .subPath("Page 1", "page1", builder.join(Example.templatePath, 'page1.html'))
      .build();
    builder.configureRouting($routeProvider, tab);
    $locationProvider.html5Mode(true);
  }]);

  _module.run(['HawtioNav', (HawtioNav:HawtioMainNav.Registry) => {
    HawtioNav.add(tab);
    log.debug("loaded");
  }]);


  hawtioPluginLoader.addModule(Example.pluginName);
}
