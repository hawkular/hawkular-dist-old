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

    export interface IDefinitionsController {
        allDefinitions():void;
        newDefinition():void;
        saveDefinition():void;
        viewDefinition(id: string):void;
        deleteDefinition(id: string, name: string):void;
        closeAlertMsg(index: number):void;
        newCondition():void;
        changeConditionType():void;
        viewCondition(conditionId: string):void;
        saveCondition():void;
        deleteCondition(conditionId: string, description: string):void;
        cancelCondition():void;
        saveDampening():void;
    }

    export class DefinitionsController implements IDefinitionsController {
        public static  $inject = ['$scope', '$window', '$log', 'HawkularAlert'];

        constructor(private $scope:any,
                    private $window:any,
                    private $log:ng.ILogService,
                    private HawkularAlert:any) {

            $scope.status = 'all';
            $scope.msgs = [];
            this.allDefinitions();
            this.allActions();
        }

        allDefinitions():void {
            this.$scope.status = 'all';
            this.$scope.triggers = this.HawkularAlert.Trigger.query();
        }

        newDefinition():void {
            this.$scope.status = 'new';
            this.$scope.trigger = {
              enabled: true,
              safetyEnabled: false,
              firingMatch: 'ALL',
              safetyMatch: 'ALL'
            };
            this.$scope.dampeningFire = { triggerMode: 'FIRE',
              type: 'RELAXED_COUNT',
              evalTrueSetting: 1,
              evalTotalSetting: 1,
              evalTimeSetting: 0
            };
            this.$scope.dampeningSafety = {triggerMode: 'SAFETY',
              type: 'RELAXED_COUNT',
              evalTrueSetting: 1,
              evalTotalSetting: 1,
              evalTimeSetting: 0
            };
            this.$scope.statusDampening = {status: 'new'};
            this.allActions();
        }

        saveDefinition():void {
            this.$scope.msgs = [];
            if (this.$scope.status === 'new') {
                this.HawkularAlert.Trigger.save(this.$scope.trigger,
                    (trigger) => {
                        this.$scope.dampeningFire.triggerId = trigger.id;
                        this.$scope.dampeningSafety.triggerId = trigger.id;
                        this.HawkularAlert.Dampening.save({triggerId: this.$scope.dampeningFire.triggerId},
                          this.$scope.dampeningFire,
                            (dampening) => {
                                this.HawkularAlert.Dampening.save({triggerId: this.$scope.dampeningSafety.triggerId},
                                  this.$scope.dampeningSafety,
                                  (safety) => {
                                    this.viewDefinition(dampening.triggerId);
                                  }, (reasonSafety) => {
                                    this.addAlertMsg(reasonSafety);
                                  });
                            }, (reasonDampening) => {
                                this.addAlertMsg(reasonDampening);
                            }
                        );
                    }, (reason) => {
                        this.addAlertMsg(reason);
                    }
                );
            } if (this.$scope.status === 'edit') {
                this.HawkularAlert.Trigger.put({triggerId: this.$scope.trigger.id}, this.$scope.trigger,
                    () => {
                        this.allDefinitions();
                    }, (reason) => {
                        this.addAlertMsg(reason);
                    }
                );
            }
        }

        viewDefinition(id: string):void {
            this.$scope.status = 'edit';
            this.$scope.trigger = {};
            this.HawkularAlert.Trigger.get({triggerId: id},
                (response) => {
                    this.$scope.trigger = response;
                }, (reason) => {
                    this.addAlertMsg(reason);
                });
            this.allConditions(id);
            this.getDampenings(id);
        }

        deleteDefinition(id: string, name: string):void {
            if (this.$window.confirm('Do you want to delete ' + name + ' ?')) {
                this.$scope.msgs = [];
                this.HawkularAlert.Trigger.delete({triggerId: id},
                    () => {
                      this.allDefinitions();
                    }, (reason) => {
                        this.addAlertMsg(reason);
                    }
                );
            }
        }

        closeAlertMsg(index: number):void {
            this.$scope.msgs.splice(index, 1);
        }

        private addAlertMsg(reason: any):void {
          console.log('reason',reason);
            var newAlert = {type: 'danger', msg: ''};
            if (reason.message) {
                newAlert.msg = reason.message;
            } else {
                newAlert.msg = reason.statusText;
            }
            this.$scope.msgs.push(newAlert);
        }

        private allActions():void {
            this.$scope.actions = [];
            this.HawkularAlert.Action.query(
                (result) => {
                    this.$scope.actions = result;
                }, (reason) => {
                    this.addAlertMsg(reason);
                }
            );
        }

        private allConditions(triggerId: string):void {
            this.$scope.conditions = [];
            this.$scope.statusCondition = { status: '', conditionId: ''};
            this.HawkularAlert.Condition.query({triggerId: triggerId},
                (conditions) => {
                  this.$scope.conditions = conditions;
                  for (var i = 0; i < this.$scope.conditions.length; i++) {
                    this.$scope.conditions[i].description = this.getDescription(this.$scope.conditions[i].type,
                      this.$scope.conditions[i]);
                  }
                }, (reasonList) => {
                    this.addAlertMsg(reasonList);
                });
        }

        private getDampenings(triggerId: string): void {
          this.$scope.dampeningFire = { triggerMode: 'FIRE',
            type: 'RELAXED_COUNT',
            evalTrueSetting: 1,
            evalTotalSetting: 1,
            evalTimeSetting: 0
          };
          this.$scope.dampeningSafety = {triggerMode: 'SAFETY',
            type: 'RELAXED_COUNT',
            evalTrueSetting: 1,
            evalTotalSetting: 1,
            evalTimeSetting: 0
          };
          this.$scope.statusDampening = { status: 'view'};
          this.HawkularAlert.Dampening.query({triggerId: triggerId},
              (dampenings) => {
                for (var i = 0; i < dampenings.length; i++) {
                  if (dampenings[i].triggerMode === 'FIRE') {
                    this.$scope.dampeningFire = dampenings[i];
                  } else if (dampenings[i].triggerMode === 'SAFETY') {
                    this.$scope.dampeningSafety = dampenings[i];
                  }
                }
                /*
                  This case is just if we have a trigger definition without dampenings.
                 */
                if (dampenings.length < 2) {
                  this.initDampenings(triggerId);
                }
              }, (reason) => {
                this.addAlertMsg(reason);
              });
        }

        private initDampenings(triggerId: string): void {
          this.$scope.dampeningFire.triggerId = triggerId;
          this.$scope.dampeningSafety.triggerId = triggerId;
          this.HawkularAlert.Dampening.save({triggerId: this.$scope.dampeningFire.triggerId},
            this.$scope.dampeningFire);
          this.HawkularAlert.Dampening.save({triggerId: this.$scope.dampeningSafety.triggerId},
            this.$scope.dampeningSafety);
        }

        saveDampening(): void {
            this.HawkularAlert.Dampening.put({triggerId: this.$scope.editDampening.triggerId,
                dampeningId: this.$scope.editDampening.dampeningId},
              this.$scope.editDampening,
                () => {
                   this.$scope.statusDampening.status = 'view';
                }, (reason) => {
                    this.addAlertMsg(reason);
                });
        }

        public viewDampening(dampening: any): void {
            this.$scope.statusDampening = { status: 'edit'};
            this.$scope.editDampening = dampening;
        }

        private getDescription(type: string, condition: any):string {
            var description = "";
            var op = "";
            if (type === 'AVAILABILITY') {
                description = condition.dataId + " is " + condition.operator;
            } else if (type === 'COMPARE') {
                op = this.getOperator(condition.operator);
                description = condition.dataId + " " + op + " " +
                    "(" + condition.data2Multiplier + " * " + condition.data2Id + ")";
            } else if (type === 'STRING') {
                description = condition.dataId + " " + condition.operator + " '" +
                    condition.pattern + "' (A/a " + condition.ignoreCase + ")";
            } else if (type === 'THRESHOLD') {
                op = this.getOperator(condition.operator);
                description = condition.dataId + " " + op + " " + condition.threshold;
            } else if (type === 'RANGE') {
                var low = "[";
                var high = "]";
                if (condition.operatorLow !== 'INCLUSIVE') {
                    low = "(";
                }
                if (condition.operatorHigh !== 'INCLUSIVE') {
                    high = ")";
                }
                var inout = " in ";
                if (!condition.inRange) {
                    inout = " out ";
                }
                description = condition.dataId + inout + low + condition.thresholdLow + ", " +
                    condition.thresholdHigh + high;
            }
            return description;
        }

        private getOperator(opCode: string):string {
            var op = "";
            if (opCode === 'GT') {
                op = ">";
            } else if (opCode === 'GTE') {
                op = ">=";
            } else if (opCode === 'LT') {
                op = "<";
            } else if (opCode === 'LTE') {
                op = "<=";
            }
            return op;
        }

        newCondition():void {
            this.$scope.statusCondition = {status: 'new'};
            this.$scope.editCondition = { type: 'AVAILABILITY', triggerId: this.$scope.trigger.id };
            this.$scope.conditionTypes = ['AVAILABILITY', 'COMPARE', 'STRING', 'THRESHOLD', 'RANGE'];
            this.changeConditionType();
        }

        changeConditionType():void {
            if (this.$scope.editCondition.type === 'AVAILABILITY') {
                this.$scope.editCondition.dataId = '';
                this.$scope.editCondition.operator = 'DOWN';
            } else if (this.$scope.editCondition.type === 'COMPARE') {
                this.$scope.editCondition.dataId = '';
                this.$scope.editCondition.operator = 'LT';
                this.$scope.editCondition.data2Multiplier = 1.0;
                this.$scope.editCondition.data2Id = '';
            } else if (this.$scope.editCondition.type === 'STRING') {
                this.$scope.editCondition.dataId = '';
                this.$scope.editCondition.operator = 'EQUAL';
                this.$scope.editCondition.pattern = '';
                this.$scope.editCondition.ignoreCase = false;
            } else if (this.$scope.editCondition.type === 'THRESHOLD') {
                this.$scope.editCondition.dataId = '';
                this.$scope.editCondition.operator = 'LT';
                this.$scope.editCondition.threshold = 0.0;
            } else if (this.$scope.editCondition.type === 'RANGE') {
                this.$scope.editCondition.dataId = '';
                this.$scope.editCondition.operatorLow = 'INCLUSIVE';
                this.$scope.editCondition.operatorHigh = 'INCLUSIVE';
                this.$scope.editCondition.thresholdLow = 0.0;
                this.$scope.editCondition.thresholdHigh = 0.0;
                this.$scope.editCondition.inRange = true;
            }
        }

        viewCondition(condition: any):void {
            this.$scope.statusCondition = {status: 'edit', conditionId: condition.conditionId, type: condition.type};
            this.$scope.editCondition = condition;
        }

        saveCondition():void {
            if (this.$scope.statusCondition.status === 'new') {
                this.HawkularAlert.Condition.save({triggerId: this.$scope.editCondition.triggerId},
                  this.$scope.editCondition,
                    () => {
                        this.$scope.statusCondition = {status: ''};
                        this.viewDefinition(this.$scope.trigger.id);
                    }, (reason) => {
                        this.addAlertMsg(reason);
                    });
            } else {
                /*
                  "description" is a helper field on the javascript object
                 */
                delete this.$scope.editCondition.description;
                this.HawkularAlert.Condition.put({triggerId: this.$scope.editCondition.triggerId,
                  conditionId: this.$scope.editCondition.conditionId}, this.$scope.editCondition,
                    () => {
                      this.$scope.statusCondition = {status: ''};
                      this.viewDefinition(this.$scope.trigger.id);
                    }, (reason) => {
                        this.addAlertMsg(reason);
                    }
                );

            }
        }

        deleteCondition(conditionId: string, description: string):void {
            if (this.$window.confirm('Do you want to delete ' + description + ' ?')) {
                this.$scope.msgs = [];
                this.HawkularAlert.Condition.delete({triggerId: this.$scope.trigger.id, conditionId: conditionId},
                    () => {
                        this.$scope.statusCondition = {status: ''};
                        this.viewDefinition(this.$scope.trigger.id);
                    }, (reasonDelete) => {
                        this.addAlertMsg(reasonDelete);
                    }
                );

            }
        }

        cancelCondition():void {
            this.$scope.statusCondition = {status: ''};
        }

    }

    _module.controller('HawkularAlerts.DefinitionsController', DefinitionsController);
}
