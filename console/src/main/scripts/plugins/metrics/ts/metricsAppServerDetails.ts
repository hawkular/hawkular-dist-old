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

/// <reference path="metricsPlugin.ts"/>
/// <reference path="services/alertsManager.ts"/>
/// <reference path="services/errorsManager.ts"/>

module HawkularMetrics {

  export class AppServerDetailsController {
    /// for minification only
    public static  $inject = ['$rootScope', '$scope', '$route', '$routeParams', '$q', 'HawkularOps',
      'NotificationsService', 'HawkularInventory', 'HawkularAlertsManager', '$log'];

    public resourcePath:string;
    public jdrGenerating:boolean;
    public hasGeneratedSuccessfully:boolean;
    public hasGeneratedError:boolean;

    constructor(private $rootScope:any,
                private $scope:any,
                private $route:any,
                private $routeParams:any,
                private $q:ng.IQService,
                private HawkularOps:any,
                private NotificationsService:INotificationsService,
                private HawkularInventory:any,
                private HawkularAlertsManager:any,
                private $log:ng.ILogService,
                public availableTabs:any,
                public activeTab:any) {

      HawkularOps.init(this.NotificationsService);

      HawkularInventory.ResourceUnderFeed.get({
        environmentId: globalEnvironmentId,
        feedId: this.$routeParams.resourceId.split('~')[0],
        resourcePath: this.$routeParams.resourceId + '~~'
      }, (resource:IResourcePath) => {
        this.resourcePath = resource.path;
        this.$rootScope.resourcePath = this.resourcePath;
      });

      $scope.tabs = this;

      this.availableTabs = [
        {
          id: 'jvm', name: 'JVM', enabled: true,
          src: 'plugins/metrics/html/app-details/detail-jvm.html',
          controller: HawkularMetrics.AppServerJvmDetailsController
        },
        {
          id: 'platform', name: 'Platform', enabled: this.$rootScope.isExperimental === true,
          src: 'plugins/metrics/html/app-details/detail-platform.html',
          controller: HawkularMetrics.AppServerPlatformDetailsController
        },
        {
          id: 'deployments', name: 'Deployments', enabled: true,
          src: 'plugins/metrics/html/app-details/detail-deployments.html',
          controller: HawkularMetrics.AppServerDeploymentsDetailsController
        },
        {
          id: 'jms', name: 'JMS', enabled: false,
          src: 'plugins/metrics/html/app-details/detail-jms.html',
          controller: HawkularMetrics.AppServerJmsDetailsController
        },
        {
          id: 'transactions', name: 'Transactions', enabled: false,
          src: 'plugins/metrics/html/app-details/detail-transactions.html',
          controller: HawkularMetrics.AppServerTransactionsDetailsController
        },
        {
          id: 'web', name: 'Web', enabled: true,
          src: 'plugins/metrics/html/app-details/detail-web.html',
          controller: HawkularMetrics.AppServerWebDetailsController
        },
        {
          id: 'datasources', name: 'Datasources', enabled: true,
          src: 'plugins/metrics/html/app-details/detail-datasources.html',
          controller: HawkularMetrics.AppServerDatasourcesDetailsController
        }
      ];

      this.activeTab = $routeParams.tabId || 'jvm';

      $scope.$on('ExportJDRSuccess', (event, data) => {
        this.$log.info('JDR generated!');
        this.jdrGenerating = false;
        this.hasGeneratedSuccessfully = true;
        this.hasGeneratedError = false;
      });

      $scope.$on('ExportJDRError', (event, data) => {
        this.$log.info('JDR generation failed!');
        this.jdrGenerating = false;
        this.hasGeneratedSuccessfully = false;
        this.hasGeneratedError = true;
      });

      // Optimally built-in triggers should be created outside of the UI, server-side. There is no good reason
      // a user should have to open the UI and navigate to a resource just to start alerting on that resource. It
      // should start automatically when the resource is discovered/created/imported. But, until that approach is
      // in place we'll do it here.  This is still an improvement from before, when the user had to actually
      // click on the 'Alert Settings' link for the resource.
      this.loadTriggers();
    }

    public updateTab(newTabId:string) {
      this.$route.updateParams({tabId: newTabId});
    }

    public requestExportJDR() {
      this.jdrGenerating = true;
      this.HawkularOps.performExportJDROperation(
        this.resourcePath,
        this.$rootScope.userDetails.token,
        this.$rootScope.currentPersona.id
      );
    }

    private loadTriggers():void {
      // Check if triggers exist on controller creation. If not, create the triggers before continuing.

      let defaultEmail = this.$rootScope.userDetails.email || 'myemail@company.com';

      let defaultEmailPromise = this.HawkularAlertsManager.addEmailAction(defaultEmail);

      let resourceId:string = this.$routeParams.resourceId;

      // JVM TRIGGERS

      let heapTriggerPromise = this.HawkularAlertsManager.existTrigger(resourceId + '_jvm_pheap').then(() => {
        this.$log.debug('Heap Used trigger exists, nothing to do');
      }, () => {
        // Jvm trigger doesn't exist, need to create one
        let low = AppServerJvmDetailsController.MAX_HEAP * 0.2;
        let high = AppServerJvmDetailsController.MAX_HEAP * 0.8;

        let triggerId:string = resourceId + '_jvm_pheap';
        let dataId:string = 'MI~R~[' + resourceId + '~~]~MT~WildFly Memory Metrics~Heap Used';
        let heapMaxId:string = 'MI~R~[' + resourceId + '~~]~MT~WildFly Memory Metrics~Heap Max';

        let fullTrigger = {
          trigger: {
            name: 'JVM Heap Used',
            id: triggerId,
            description: 'JVM Heap Used for ' + resourceId,
            autoDisable: true, // Disable trigger after firing, to not have repeated alerts of same issue
            autoEnable: true, // Enable trigger once an alert is resolved
            autoResolve: false, // Don't change into AUTORESOLVE mode as we don't have AUTORESOLVE conditions
            severity: 'MEDIUM',
            actions: {email: [defaultEmail]},
            firingMatch: 'ANY',
            tags: {
              resourceId: resourceId
            },
            context: {
              alertType: 'PHEAP',
              resourceType: 'App Server',
              resourceName: resourceId,
              resourcePath: this.$rootScope.resourcePath,
              triggerType: 'RangeByPercent',
              triggerTypeProperty1: heapMaxId,
              triggerTypeProperty2: 'Heap Max'
            }
          },
          dampenings: [
            {
              triggerId: triggerId,
              evalTimeSetting: 7 * 60000,
              triggerMode: 'FIRING',
              type: 'STRICT_TIME'
            }
          ],
          conditions: [
            {
              triggerId: triggerId,
              type: 'COMPARE',
              dataId: dataId,
              data2Id: heapMaxId,
              operator: 'GT',
              data2Multiplier: 0.80, // 80%
              context: {
                description: 'Heap Used',
                unit: 'B'
              }
            },
            {
              triggerId: triggerId,
              type: 'COMPARE',
              dataId: dataId,
              data2Id: heapMaxId,
              operator: 'LT',
              data2Multiplier: 0.20, // 20%
              context: {
                description: 'Heap Used',
                unit: 'B'
              }
            }
          ]
        };

        return this.HawkularAlertsManager.createTrigger(fullTrigger, () => {
          this.$log.error('Error on Trigger creation for ' + triggerId);
        });
      });

      let nonHeapTriggerPromise = this.HawkularAlertsManager.existTrigger(resourceId + '_jvm_nheap').then(() => {
        this.$log.debug('Non Heap Used trigger exists, nothing to do');
      }, () => {
        // Jvm trigger doesn't exist, need to create one
        let low = AppServerJvmDetailsController.MAX_HEAP * 0.2;
        let high = AppServerJvmDetailsController.MAX_HEAP * 0.8;

        let triggerId:string = resourceId + '_jvm_nheap';
        let dataId:string = 'MI~R~[' + resourceId + '~~]~MT~WildFly Memory Metrics~NonHeap Used';
        let heapMaxId:string = 'MI~R~[' + resourceId + '~~]~MT~WildFly Memory Metrics~Heap Max';

        let fullTrigger = {
          trigger: {
            name: 'JVM Non Heap Used',
            id: triggerId,
            description: 'JVM Non Heap Used for ' + resourceId,
            autoDisable: true, // Disable trigger after firing, to not have repeated alerts of same issue
            autoEnable: true, // Enable trigger once an alert is resolved
            autoResolve: false, // Don't change into AUTORESOLVE mode as we don't have AUTORESOLVE conditions
            severity: 'HIGH',
            actions: {email: [defaultEmail]},
            firingMatch: 'ANY',
            tags: {
              resourceId: resourceId
            },
            context: {
              alertType: 'NHEAP',
              resourceType: 'App Server',
              resourceName: resourceId,
              resourcePath: this.$rootScope.resourcePath,
              triggerType: 'RangeByPercent',
              triggerTypeProperty1: heapMaxId,
              triggerTypeProperty2: 'Heap Max'
            }
          },
          dampenings: [
            {
              triggerId: triggerId,
              evalTimeSetting: 7 * 60000,
              triggerMode: 'FIRING',
              type: 'STRICT_TIME'
            }
          ],
          conditions: [
            {
              triggerId: triggerId,
              type: 'COMPARE',
              dataId: dataId,
              data2Id: heapMaxId,
              operator: 'GT',
              data2Multiplier: 0.80,  // 80%
              context: {
                description: 'Non Heap Used',
                unit: 'B'
              }
            },
            {
              triggerId: triggerId,
              type: 'COMPARE',
              dataId: dataId,
              data2Id: heapMaxId,
              operator: 'LT',
              data2Multiplier: 0.20, // 20%
              context: {
                description: 'Non Heap Used',
                unit: 'B'
              }
            }
          ]
        };

        return this.HawkularAlertsManager.createTrigger(fullTrigger, () => {
          this.$log.error('Error on Trigger creation for ' + triggerId);
        });
      });

      let garbageTriggerPromise = this.HawkularAlertsManager.existTrigger(resourceId + '_jvm_garba').then(() => {
        this.$log.debug('GC trigger exists, nothing to do');
      }, () => {
        // Jvm trigger doesn't exist, need to create one
        let triggerId:string = resourceId + '_jvm_garba';
        let dataId:string = 'MI~R~[' + resourceId + '~~]~MT~WildFly Memory Metrics~Accumulated GC Duration';

        let fullTrigger = {
          trigger: {
            name: 'JVM Accumulated GC Duration',
            id: triggerId,
            description: 'Accumulated GC Duration for ' + resourceId,
            autoDisable: true, // Disable trigger after firing, to not have repeated alerts of same issue
            autoEnable: true, // Enable trigger once an alert is resolved
            autoResolve: false, // Don't change into AUTORESOLVE mode as we don't have AUTORESOLVE conditions
            severity: 'HIGH',
            actions: {email: [defaultEmail]},
            tags: {
              resourceId: resourceId
            },
            context: {
              alertType: 'GARBA',
              resourceType: 'App Server',
              resourceName: resourceId,
              resourcePath: this.$rootScope.resourcePath,
              triggerType: 'Threshold'
            }
          },
          dampenings: [
            {
              triggerId: triggerId,
              evalTimeSetting: 7 * 60000,
              triggerMode: 'FIRING',
              type: 'STRICT_TIME'
            }
          ],
          conditions: [
            {
              triggerId: triggerId,
              type: 'THRESHOLD',
              dataId: dataId,
              threshold: 200,
              operator: 'GT',
              context: {
                description: 'GC Duration',
                unit: 'ms'
              }
            }
          ]
        };

        return this.HawkularAlertsManager.createTrigger(fullTrigger, () => {
          this.$log.error('Error on Trigger creation for ' + triggerId);
        });
      });

      // WEB SESSION TRIGGERS

      let activeSessionsTriggerPromise = this.HawkularAlertsManager
        .existTrigger(resourceId + '_web_active_sessions').then(() => {
          this.$log.debug('Active Web Sessions trigger exists, nothing to do');
        }, () => {
          // Active Web Sessions trigger doesn't exist, need to create one

          let triggerId:string = resourceId + '_web_active_sessions';
          let dataId:string = 'MI~R~[' + resourceId +
            '~~]~MT~WildFly Aggregated Web Metrics~Aggregated Active Web Sessions';

          let fullTrigger = {
            trigger: {
              name: 'Web Sessions Active',
              id: triggerId,
              description: 'Active Web Sessions for ' + resourceId,
              autoDisable: true, // Disable trigger after firing, to not have repeated alerts of same issue
              autoEnable: true, // Enable trigger once an alert is resolved
              autoResolve: false, // Don't change into AUTORESOLVE mode as we don't have AUTORESOLVE conditions
              severity: 'MEDIUM',
              actions: {email: [defaultEmail]},
              tags: {
                resourceId: resourceId
              },
              context: {
                alertType: 'ACTIVE_SESSIONS',
                resourceType: 'App Server',
                resourceName: resourceId,
                resourcePath: this.$rootScope.resourcePath,
                triggerType: 'Range'
              }
            },
            dampenings: [
              {
                triggerId: triggerId,
                evalTimeSetting: 7 * 60000,
                triggerMode: 'FIRING',
                type: 'STRICT_TIME'
              }
            ],
            conditions: [
              {
                triggerId: triggerId,
                type: 'RANGE',
                dataId: dataId,
                operatorLow: 'INCLUSIVE',
                operatorHigh: 'INCLUSIVE',
                thresholdLow: AppServerWebDetailsController.DEFAULT_MIN_SESSIONS,
                thresholdHigh: AppServerWebDetailsController.DEFAULT_MAX_SESSIONS,
                inRange: false,
                context: {
                  description: 'Active Web Sessions',
                  unit: 'sessions'
                }
              }
            ]
          };

          return this.HawkularAlertsManager.createTrigger(fullTrigger, () => {
            this.$log.error('Error on Trigger creation for ' + triggerId);
          });
        });

      let expiredSessionsTriggerPromise = this.HawkularAlertsManager
        .existTrigger(resourceId + '_web_expired_sessions').then(() => {
          this.$log.debug('Expired Web Sessions trigger exists, nothing to do');
        }, () => {
          // Active Web Sessions trigger doesn't exist, need to create one

          let triggerId:string = resourceId + '_web_expired_sessions';
          let dataId:string = 'MI~R~[' + resourceId +
            '~~]~MT~WildFly Aggregated Web Metrics~Aggregated Expired Web Sessions';

          let fullTrigger = {
            trigger: {
              name: 'Web Sessions Expired',
              id: triggerId,
              description: 'Expired Web Sessions for ' + resourceId,
              autoDisable: true, // Disable trigger after firing, to not have repeated alerts of same issue
              autoEnable: true, // Enable trigger once an alert is resolved
              autoResolve: false, // Don't change into AUTORESOLVE mode as we don't have AUTORESOLVE conditions
              severity: 'LOW',
              actions: {email: [defaultEmail]},
              tags: {
                resourceId: resourceId
              },
              context: {
                alertType: 'EXPIRED_SESSIONS',
                resourceType: 'App Server',
                resourceName: resourceId,
                resourcePath: this.$rootScope.resourcePath,
                triggerType: 'Threshold'
              }
            },
            dampenings: [
              {
                triggerId: triggerId,
                evalTimeSetting: 7 * 60000,
                triggerMode: 'FIRING',
                type: 'STRICT_TIME'
              }
            ],
            conditions: [
              {
                triggerId: triggerId,
                type: 'THRESHOLD',
                dataId: dataId,
                threshold: AppServerWebDetailsController.DEFAULT_EXPIRED_SESSIONS_THRESHOLD,
                operator: 'GT',
                context: {
                  description: 'Expired Web Sessions',
                  unit: 'sessions'
                }
              }
            ]
          };

          return this.HawkularAlertsManager.createTrigger(fullTrigger, () => {
            this.$log.error('Error on Trigger creation for ' + triggerId);
          });
        });


      let rejectedSessionsTriggerPromise = this.HawkularAlertsManager
        .existTrigger(resourceId + '_web_rejected_sessions').then(() => {
          this.$log.debug('Rejected Web Sessions trigger exists, nothing to do');
        }, () => {
          // Rejected Web Sessions trigger doesn't exist, need to create one

          let triggerId:string = resourceId + '_web_rejected_sessions';
          let dataId:string = 'MI~R~[' + resourceId +
            '~~]~MT~WildFly Aggregated Web Metrics~Aggregated Rejected Web Sessions';

          let fullTrigger = {
            trigger: {
              name: 'Web Sessions Rejected',
              id: triggerId,
              description: 'Rejected Web Sessions for ' + resourceId,
              autoDisable: true, // Disable trigger after firing, to not have repeated alerts of same issue
              autoEnable: true, // Enable trigger once an alert is resolved
              autoResolve: false, // Don't change into AUTORESOLVE mode as we don't have AUTORESOLVE conditions
              severity: 'LOW',
              actions: {email: [defaultEmail]},
              tags: {
                resourceId: resourceId
              },
              context: {
                alertType: 'REJECTED_SESSIONS',
                resourceType: 'App Server',
                resourceName: resourceId,
                resourcePath: this.$rootScope.resourcePath,
                triggerType: 'Threshold'
              }
            },
            dampenings: [
              {
                triggerId: triggerId,
                evalTimeSetting: 7 * 60000,
                triggerMode: 'FIRING',
                type: 'STRICT_TIME'
              }
            ],
            conditions: [
              {
                triggerId: triggerId,
                type: 'THRESHOLD',
                dataId: dataId,
                threshold: AppServerWebDetailsController.DEFAULT_REJECTED_SESSIONS_THRESHOLD,
                operator: 'GT',
                context: {
                  description: 'Rejected Web Sessions',
                  unit: 'sessions'
                }
              }
            ]
          };

          return this.HawkularAlertsManager.createTrigger(fullTrigger, () => {
            this.$log.error('Error on Trigger creation for ' + triggerId);
          });
        });

      // FAILED DEPLOYMENT TRIGGER

      let failedDeploymentTriggerPromise = this.HawkularAlertsManager
        .existTrigger(resourceId + '_failed_deployment').then(() => {
          this.$log.debug('Failed Deployment trigger exists, nothing to do');
        }, () => {
          // Failed Deployment trigger doesn't exist, need to create one

          let triggerId:string = resourceId + '_failed_deployment';
          let dataId:string = resourceId + '_DeployApplicationResponse';

          let fullTrigger = {
            trigger: {
              name: 'Deployment Failure',
              id: triggerId,
              description: 'Deployment failure for ' + resourceId,
              autoDisable: true, // Disable trigger after firing, to not have repeated alerts of same issue
              autoEnable: true, // Enable trigger once an alert is resolved
              autoResolve: false, // Don't change into AUTORESOLVE mode as we don't have AUTORESOLVE conditions
              severity: 'MEDIUM',
              actions: {email: [defaultEmail]},
              tags: {
                resourceId: resourceId
              },
              context: {
                alertType: 'DEPLOYMENT_FAIL',
                resourceType: 'App Server Deployment',
                resourceName: resourceId,
                resourcePath: this.$rootScope.resourcePath,
                triggerType: 'Event'
              }
            },
            // default dampening, every time
            conditions: [
              {
                triggerId: triggerId,
                type: 'EVENT',
                dataId: dataId,
                expression: 'category == \'Hawkular Deployment\', text == \'ERROR\'',
                context: {
                  description: 'Deployment Failure'
                }
              }
            ]
          };

          return this.HawkularAlertsManager.createTrigger(fullTrigger, () => {
            this.$log.error('Error on Trigger creation for ' + triggerId);
          });
        });

      let log = this.$log;

      this.$q.all([defaultEmailPromise,
        heapTriggerPromise, nonHeapTriggerPromise, garbageTriggerPromise, //JVM
        activeSessionsTriggerPromise, expiredSessionsTriggerPromise, rejectedSessionsTriggerPromise, // WEB
        failedDeploymentTriggerPromise // FAILED DEPLOYMENT
      ]).then(() => {
        // do nothing
      }, () => {
        this.$log.error('Missing and unable to create new App-Server Alert triggers.');
      });
    }
  }

  _module.controller('AppServerDetailsController', AppServerDetailsController);

}
