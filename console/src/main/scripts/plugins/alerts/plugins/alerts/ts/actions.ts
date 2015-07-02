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

/// <reference path="alertsPlugin.ts"/>
module HawkularAlerts {

    export interface IActionsController {
        allActions(): void;
        newAction(): void;
        viewAction(actionId: string):void;
        saveAction():void;
        deleteAction(actionId: string):void;
        closeAlertMsg(index: number):void;
        changePlugin():void;
    }

    export class ActionsController implements IActionsController {
        public static  $inject = ['$scope', '$window', '$interval', '$log', 'HawkularAlert'];

        constructor(private $scope:any,
                    private $window:any,
                    private $interval:ng.IIntervalService,
                    private $log:ng.ILogService,
                    private HawkularAlert:any) {

            $scope.status = 'all';
            $scope.msgs = [];
            $scope.actions = [];
            $scope.actionsPlugins = [];
            this.allActions();
        }

        public allActions(): void {
            this.$scope.status = 'all';
            this.$scope.actions = [];
            this.HawkularAlert.Action.query(
                (actions) => {
                    for (var i = 0; i < actions.length; i++) {
                        this.HawkularAlert.Action.get({actionId: actions[i]},
                            (action) => {
                                this.$scope.actions.push(action);
                            }, (reasonAction) => {
                                this.addAlertMsg(reasonAction);
                            });
                    }
                }, (reason) => {
                    this.addAlertMsg(reason);
                });
        }

        public newAction():void {
            this.$scope.status = 'new';
            this.$scope.action = {};
            this.$scope.actionPlugins = [];
            this.$scope.pluginProperties = [];
            this.HawkularAlert.ActionPlugin.query(
                (actionPlugins) => {
                    for (var i = 0; i < actionPlugins.length; i++) {
                        if (i === 0) {
                            this.$scope.action.actionPlugin = actionPlugins[0];
                            this.HawkularAlert.ActionPlugin.get({actionPlugin: actionPlugins[0]},
                              (properties) => {
                                this.$scope.pluginProperties = properties;
                              });
                        }
                        this.$scope.actionPlugins.push(actionPlugins[i]);
                    }
                }
            );
        }

        public changePlugin():void {
          this.HawkularAlert.ActionPlugin.get({actionPlugin: this.$scope.action.actionPlugin.trim()},
            (properties) => {
              this.$scope.pluginProperties = properties;
            });
        }

        public viewAction(actionId: string): void {
            this.$scope.status = 'edit';
            this.$scope.action = {};
            this.$scope.actionPlugins = [];
            this.HawkularAlert.Action.get({actionId: actionId},
                (action) => {
                    this.$scope.action = action;
                }, (reason) => {
                    this.addAlertMsg(reason);
                });
            this.HawkularAlert.ActionPlugin.query(
                (actionPlugins) => {
                    for (var i = 0; i < actionPlugins.length; i++) {
                        this.$scope.actionPlugins.push(actionPlugins[i]);
                    }
                }
            );

        }

        public saveAction():void {
            if (this.$scope.status === 'new') {
                this.HawkularAlert.Action.save(this.$scope.action,
                    () => {
                        this.allActions();
                    }, (reason) => {
                        this.addAlertMsg(reason);
                    });
            } else {
                this.HawkularAlert.Action.put({actionId: this.$scope.action.actionId}, this.$scope.action,
                    () => {
                        this.allActions();
                    }, (reason) => {
                        this.addAlertMsg(reason);
                    });
            }
        }

        public deleteAction(actionId: string): void {
          if (this.$window.confirm('Do you want to delete ' + actionId + ' ?')) {
            this.HawkularAlert.Action.delete({actionId: actionId},
              () => {
                this.allActions();
              },
              (reason) => {
                this.addAlertMsg(reason);
              });
          }
        }

        private addAlertMsg(reason: any):void {
            var newAlert = {type: 'danger', msg: ''};
            if (reason.data.errorMsg) {
                newAlert.msg = reason.data.errorMsg;
            } else {
                newAlert.msg = reason.statusText;
            }
            this.$scope.msgs.push(newAlert);
        }

        public closeAlertMsg(index: number):void {
            this.$scope.msgs.splice(index, 1);
        }

    }

    _module.controller('HawkularAlerts.ActionsController', ActionsController);
}
