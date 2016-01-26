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
  export interface ICommonTask {
    icon:string;
    title:string;
    text:string;
    direction:string;
    action:string;
  }

  export class CommonTask implements ICommonTask {
    public action:string;
    public icon:string;
    public title:string;
    public text:string;
    public direction:string;

    constructor(icon:string, title:string, text:string, direction:string, action:string) {
      this.icon = icon;
      this.title = title;
      this.text = text;
      this.direction = direction;
      this.action = action;
    }
  }

  export class CommonTasksController {
    public tasksList:ICommonTask[] = [];
    public resourceId:string = '';
    public selectedTime:any;
    constructor(private $route:any, private $routeParams:any) {
      this.selectedTime = $routeParams.timeOffset || 3600000;
      this.resourceId = $routeParams.resourceId;
      this.initTasks();
    }

    public goToPage(url:string, action: string) {
      if (url !== '') {
        this.$route.updateParams({tabId: url, action: action});
      }
    }

    private initTasks() {
      this.tasksList.push(new CommonTask(
        'fa-plus-circle',
        'Add a Deployment',
        'Add and deploy an application.',
        'deployments',
        'add-new')
      );
      this.tasksList.push(new CommonTask(
        'fa-plus-circle',
        'Add a Datasource',
        'Add and JDBC Datasource and Driver.',
        'datasources',
        'add-new')
      );
      this.tasksList.push(new CommonTask(
        'fa-download',
        'Export a JBoss Diagnostics Report',
        'Create a report document that can be shared with others.',
        'overview',
        'export-jdr')
      );
    }
  }

  export class HkCommonTasks {
    public link:(scope:any, element:ng.IAugmentedJQuery, attrs:ng.IAttributes) => void;
    public controller:any = CommonTasksController;
    public controllerAs:string = 'vm';
    public replace = 'true';
    public scope = {
    };
    public templateUrl = 'plugins/metrics/html/directives/overview/common-tasks.html';

    public static Factory() {
      let directive = () => {
        return new HkCommonTasks();
      };

      directive['$inject'] = [];

      return directive;
    }
  }
  _module.directive('hkCommonTasks', [HawkularMetrics.HkCommonTasks.Factory()]);
  _module.controller('CommonTasksController', CommonTasksController);
}
