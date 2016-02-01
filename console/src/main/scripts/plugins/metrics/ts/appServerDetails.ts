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

/// <reference path="metricsPlugin.ts"/>
/// <reference path="services/alertsManager.ts"/>
/// <reference path="services/errorsManager.ts"/>

module HawkularMetrics {

  export class AppServerDetailsController {
    /// for minification only
    public static $inject = ['$rootScope', '$scope', '$route', '$routeParams', '$q', '$timeout', 'HawkularOps',
      'NotificationsService', 'HawkularInventory', 'HawkularAlertsManager', '$log', '$location', 'HawkularAlert'];

    public static LT = 'LT'; /// blue
    public static GT = 'GT'; /// blue
    public resourcePath: string;
    public jdrGenerating: boolean;
    public hasGeneratedSuccessfully: boolean;
    public hasGeneratedError: boolean;

    private defaultEmail: string;
    private defaultAction: any;
    private feedId: FeedId;
    private resourceId: ResourceId;

    /* tslint:disable:variable-name */

    constructor(private $rootScope: any,
                private $scope: any,
                private $route: any,
                private $routeParams: any,
                private $q: ng.IQService,
                private $timeout: ng.ITimeoutService,
                private HawkularOps: any,
                private NotificationsService: INotificationsService,
                private HawkularInventory: any,
                private HawkularAlertsManager: any,
                private $log: ng.ILogService,
                private $location: ng.ILocationService,
                private HawkularAlert: any,
                public availableTabs: any,
                public activeTab: any) {
      $scope.tabs = this;
      HawkularOps.init(this.NotificationsService);

      this.defaultEmail = this.$rootScope.userDetails.email || 'myemail@company.com';
      this.createDefaultActions();
      this.feedId = this.$routeParams.feedId;
      this.resourceId = this.$routeParams.feedId + '/' + this.$routeParams.resourceId;
      $scope.$on('$routeUpdate', (action, newRoute) => {
        if (newRoute.params.action && newRoute.params.action === 'export-jdr') {
          $scope.tabs.requestExportJDR();
          $location.search('action', null);
        }
      });

      $scope.$on('SwitchedPersona', () => $location.path('/hawkular-ui/app/app-list'));

      HawkularInventory.ResourceUnderFeed.get({
        feedId: this.$routeParams.feedId,
        resourcePath: this.$routeParams.resourceId + '~~'
      }, (resource: IResourcePath) => {
        this.resourcePath = resource.path;
        this.$rootScope.resourcePath = this.resourcePath;

        // Optimally built-in triggers should be created outside of the UI, server-side. There is no good reason
        // a user should have to open the UI and navigate to a resource just to start alerting on that resource. It
        // should start automatically when the resource is discovered/created/imported. But, until that approach is
        // in place we'll do it here.  This is still an improvement from before, when the user had to actually
        // click on the 'Alert Settings' link for the resource.

        // THESE HAVE BEEN MIGRATED TO THE SERVER!
        this.loadTriggers();
      });

      if (!$rootScope.hasOwnProperty('isExperimentalWatch')) {
        let experimentalTabs = [''];
        $rootScope.isExperimentalWatch = $rootScope.$watch('isExperimental', (isExperimental) => {
          this.$timeout(() => {
            _.forEach(this.availableTabs, (tab: any) => {
              if (experimentalTabs.indexOf(tab.id) !== -1) {
                tab.enabled = isExperimental;
              }
            });
          });
        });
      }

      this.availableTabs = [
        {
          id: 'overview', name: 'Overview', enabled: true,
          src: 'plugins/metrics/html/app-details/detail-overview.html',
          controller: HawkularMetrics.AppServerOverviewDetailsController
        },
        {
          id: 'jvm', name: 'JVM', enabled: true,
          src: 'plugins/metrics/html/app-details/detail-jvm.html',
          controller: HawkularMetrics.AppServerJvmDetailsController
        },
        {
          id: 'platform', name: 'Platform', enabled: true,
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
          id: 'transactions', name: 'Transactions', enabled: true,
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

      this.activeTab = $routeParams.tabId || 'overview';
      if (!$rootScope.hasOwnProperty('exportJdrSuccess')) {
        $rootScope.exportJdrSuccess = $rootScope.$on('ExportJDRSuccess', (event, data) => {
          if (data && data.hasOwnProperty('jdrResponse') && data.hasOwnProperty('fileName')) {
            const resourceId = data['jdrResponse'].resourcePath.split(';').last().replace(/~/g, '');
            const action =
              `<a href="${data.url}" download="${data.fileName}">Download JDR for server ${resourceId}</a>`;
            this.NotificationsService.removeFromMessagesByKeyValue('resourcePath', data['jdrResponse'].resourcePath);
            this.NotificationsService.pushActionMessage(
              action,
              `Generated JDR for server ${resourceId}`
            );
          }
          this.$log.info('JDR generated!');
          this.jdrGenerating = false;
          this.hasGeneratedSuccessfully = true;
          this.hasGeneratedError = false;
        });
      }

      if (!$rootScope.hasOwnProperty('exportJdrError')) {
        $rootScope.exportJdrError = $rootScope.$on('ExportJDRError', (event, data) => {
          if (data && data.hasOwnProperty('jdrResponse')) {
            const resourceId = data['jdrResponse'].resourcePath.split(';').last().replace(/~/g, '');
            this.NotificationsService.removeFromMessagesByKeyValue('resourcePath', data['jdrResponse'].resourcePath);
            this.NotificationsService.error(`JDR generation for server ${resourceId} failed.`);
          }
          this.$log.info('JDR generation failed!');
          this.jdrGenerating = false;
          this.hasGeneratedSuccessfully = false;
          this.hasGeneratedError = true;
        });
      }
    }

    private createDefaultActions(): void {
      //TODO: There are no properties set up! After moving to alerts 0.9.x enable properties
      this.defaultAction = new AlertActionsBuilder()
        .withActionId('email-to-admin')
        .withActionPlugin('email')
        .build();
    }

    public updateTab(newTabId: string) {
      this.$route.updateParams({tabId: newTabId});
    }

    public requestExportJDR() {
      this.jdrGenerating = true;
      this.NotificationsService.pushLoadingMessage(
        `Generating JDR for server ${this.$routeParams.resourceId}`,
        this.resourcePath
      );
      this.HawkularOps.performExportJDROperation(
        this.resourcePath,
        this.$rootScope.userDetails.token,
        this.$rootScope.currentPersona.id
      );
    }

    private loadTriggers(): void {
      // Check if triggers exist on controller creation. If not, create the triggers before continuing.

      let defaultEmailPromise = this.HawkularAlertsManager.addEmailAction(_.cloneDeep(this.defaultAction));

      // The Wildfly agent generates resource IDs unique among the app servers it is monitoring because
      // each resource is prefixed with the managedServerName.  But when dealing with multiple Wildfly-agent feeds
      // a resource ID is not guaranteed to be unique.  So, we further qualify the resource ID with the feed ID and
      // use this qualifiedResourceId in the trigger definition.
      let qualifiedResourceId: string = this.$routeParams.feedId + '/' + this.$routeParams.resourceId;
      let metPrefix: string = MetricsService.getMetricId('M', this.$routeParams.feedId,
        this.$routeParams.resourceId + '~~', '');

      // JVM TRIGGERS

      let heapTriggerPromise = this.HawkularAlertsManager.existTrigger(qualifiedResourceId + '_jvm_pheap').then(() => {
        this.$log.debug('Heap Used trigger exists, nothing to do');
      }, () => {
        // Jvm trigger doesn't exist, need to create one
        //let low = AppServerJvmDetailsController.MAX_HEAP * 0.2;
        //let high = AppServerJvmDetailsController.MAX_HEAP * 0.8;

        let triggerId: string = qualifiedResourceId + '_jvm_pheap';
        let dataId: string = metPrefix + 'WildFly Memory Metrics~Heap Used';
        let heapMaxId: string = metPrefix + 'WildFly Memory Metrics~Heap Max';

        let fullTrigger = {
          trigger: {
            name: 'JVM Heap Used',
            id: triggerId,
            description: 'JVM Heap Used for ' + qualifiedResourceId,
            autoDisable: true, // Disable trigger after firing, to not have repeated alerts of same issue
            autoEnable: true, // Enable trigger once an alert is resolved
            autoResolve: false, // Don't change into AUTORESOLVE mode as we don't have AUTORESOLVE conditions
            severity: 'MEDIUM',
            actions: [this.defaultAction],
            firingMatch: 'ANY',
            tags: {
              resourceId: qualifiedResourceId
            },
            context: {
              alertType: 'PHEAP',
              resourceType: 'App Server',
              resourceName: qualifiedResourceId,
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

      let nonHeapTriggerPromise = this.HawkularAlertsManager.existTrigger(qualifiedResourceId + '_jvm_nheap')
        .then(() => {
          this.$log.debug('Non Heap Used trigger exists, nothing to do');
        }, () => {
          // Jvm trigger doesn't exist, need to create one
          //let low = AppServerJvmDetailsController.MAX_HEAP * 0.2;
          //let high = AppServerJvmDetailsController.MAX_HEAP * 0.8;

          let triggerId: string = qualifiedResourceId + '_jvm_nheap';
          let dataId: string = metPrefix + 'WildFly Memory Metrics~NonHeap Used';
          let heapMaxId: string = metPrefix + 'WildFly Memory Metrics~Heap Max';

          let fullTrigger = {
            trigger: {
              name: 'JVM Non Heap Used',
              id: triggerId,
              description: 'JVM Non Heap Used for ' + qualifiedResourceId,
              autoDisable: true, // Disable trigger after firing, to not have repeated alerts of same issue
              autoEnable: true, // Enable trigger once an alert is resolved
              autoResolve: false, // Don't change into AUTORESOLVE mode as we don't have AUTORESOLVE conditions
              severity: 'HIGH',
              actions: [this.defaultAction],
              firingMatch: 'ANY',
              tags: {
                resourceId: qualifiedResourceId
              },
              context: {
                alertType: 'NHEAP',
                resourceType: 'App Server',
                resourceName: qualifiedResourceId,
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

      let garbageTriggerPromise = this.HawkularAlertsManager.existTrigger(qualifiedResourceId + '_jvm_garba')
        .then(() => {
          this.$log.debug('GC trigger exists, nothing to do');
        }, () => {
          // Jvm trigger doesn't exist, need to create one
          let triggerId: string = qualifiedResourceId + '_jvm_garba';
          let dataId: string = metPrefix + 'WildFly Memory Metrics~Accumulated GC Duration';

          // Note that the GC metric is a counter, an ever-increasing value reflecting the total time the JVM
          // has spent doing GC.  'Accumulated' here reflects that we are combining the totals for 4 different GCs in
          // the VM, each a counter itself, and reporting a single metric value for total GC time spent. So, from
          // an alerting perspective we want to alert when GC is taking unacceptably long. That means we need to
          // alert on high *deltas* in the metric values reported, which reflect a lot of time spent in GC between
          // readings.  We'll start with 200ms per minute for 5 minutes.
          // TODO: 'Rate' This should likely be a new triggerType but for now we'll treat it like threshold.
          let fullTrigger = {
            trigger: {
              name: 'JVM Accumulated GC Duration',
              id: triggerId,
              description: 'Accumulated GC Duration for ' + qualifiedResourceId,
              autoDisable: true, // Disable trigger after firing, to not have repeated alerts of same issue
              autoEnable: true, // Enable trigger once an alert is resolved
              autoResolve: false, // Don't change into AUTORESOLVE mode as we don't have AUTORESOLVE conditions
              severity: 'HIGH',
              actions: [this.defaultAction],
              tags: {
                resourceId: qualifiedResourceId
              },
              context: {
                alertType: 'GARBA',
                resourceType: 'App Server',
                resourceName: qualifiedResourceId,
                resourcePath: this.$rootScope.resourcePath,
                triggerType: 'Threshold'
              }
            },
            dampenings: [
              {
                triggerId: triggerId,
                evalTimeSetting: 5 * 60000,
                triggerMode: 'FIRING',
                type: 'STRICT_TIME'
              }
            ],
            conditions: [
              {
                triggerId: triggerId,
                type: 'RATE',
                dataId: dataId,
                direction: 'INCREASING',
                period: 'MINUTE',
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
        .existTrigger(qualifiedResourceId + '_web_active_sessions').then(() => {
          this.$log.debug('Active Web Sessions trigger exists, nothing to do');
        }, () => {
          // Active Web Sessions trigger doesn't exist, need to create one

          let triggerId: string = qualifiedResourceId + '_web_active_sessions';
          let dataId: string = metPrefix + 'WildFly Aggregated Web Metrics~Aggregated Active Web Sessions';

          let fullTrigger = {
            trigger: {
              name: 'Web Sessions Active',
              id: triggerId,
              description: 'Active Web Sessions for ' + qualifiedResourceId,
              autoDisable: true, // Disable trigger after firing, to not have repeated alerts of same issue
              autoEnable: true, // Enable trigger once an alert is resolved
              autoResolve: false, // Don't change into AUTORESOLVE mode as we don't have AUTORESOLVE conditions
              severity: 'MEDIUM',
              actions: [this.defaultAction],
              tags: {
                resourceId: qualifiedResourceId
              },
              context: {
                alertType: 'ACTIVE_SESSIONS',
                resourceType: 'App Server',
                resourceName: qualifiedResourceId,
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
        .existTrigger(qualifiedResourceId + '_web_expired_sessions').then(() => {
          this.$log.debug('Expired Web Sessions trigger exists, nothing to do');
        }, () => {
          // Active Web Sessions trigger doesn't exist, need to create one

          let triggerId: string = qualifiedResourceId + '_web_expired_sessions';
          let dataId: string = metPrefix + 'WildFly Aggregated Web Metrics~Aggregated Expired Web Sessions';

          let fullTrigger = {
            trigger: {
              name: 'Web Sessions Expired',
              id: triggerId,
              description: 'Expired Web Sessions for ' + qualifiedResourceId,
              autoDisable: true, // Disable trigger after firing, to not have repeated alerts of same issue
              autoEnable: true, // Enable trigger once an alert is resolved
              autoResolve: false, // Don't change into AUTORESOLVE mode as we don't have AUTORESOLVE conditions
              severity: 'LOW',
              actions: [this.defaultAction],
              tags: {
                resourceId: qualifiedResourceId
              },
              context: {
                alertType: 'EXPIRED_SESSIONS',
                resourceType: 'App Server',
                resourceName: qualifiedResourceId,
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
        .existTrigger(qualifiedResourceId + '_web_rejected_sessions').then(() => {
          this.$log.debug('Rejected Web Sessions trigger exists, nothing to do');
        }, () => {
          // Rejected Web Sessions trigger doesn't exist, need to create one

          let triggerId: string = qualifiedResourceId + '_web_rejected_sessions';
          let dataId: string = metPrefix + 'WildFly Aggregated Web Metrics~Aggregated Rejected Web Sessions';

          let fullTrigger = {
            trigger: {
              name: 'Web Sessions Rejected',
              id: triggerId,
              description: 'Rejected Web Sessions for ' + qualifiedResourceId,
              autoDisable: true, // Disable trigger after firing, to not have repeated alerts of same issue
              autoEnable: true, // Enable trigger once an alert is resolved
              autoResolve: false, // Don't change into AUTORESOLVE mode as we don't have AUTORESOLVE conditions
              severity: 'LOW',
              actions: [this.defaultAction],
              tags: {
                resourceId: qualifiedResourceId
              },
              context: {
                alertType: 'REJECTED_SESSIONS',
                resourceType: 'App Server',
                resourceName: qualifiedResourceId,
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
        .existTrigger(qualifiedResourceId + '_failed_deployment').then(() => {
          this.$log.debug('Failed Deployment trigger exists, nothing to do');
        }, () => {
          // Failed Deployment trigger doesn't exist, need to create one

          let triggerId: string = qualifiedResourceId + '_failed_deployment';

          // Note that this dataId does not map to a metric, it maps to Events being generated by
          // the CommandEventListener in HK Alerts' Bus module.  Any change here *must* have an analogous
          // change there or the condition will not match the actual events.
          let dataId: string = qualifiedResourceId + '_DeployApplicationResponse';

          let fullTrigger = {
            trigger: {
              name: 'Deployment Failure',
              id: triggerId,
              description: 'Deployment failure for ' + qualifiedResourceId,
              autoDisable: true, // Disable trigger after firing, to not have repeated alerts of same issue
              autoEnable: true, // Enable trigger once an alert is resolved
              autoResolve: false, // Don't change into AUTORESOLVE mode as we don't have AUTORESOLVE conditions
              severity: 'MEDIUM',
              actions: [this.defaultAction],
              tags: {
                resourceId: qualifiedResourceId
              },
              context: {
                alertType: 'DEPLOYMENT_FAIL',
                resourceType: 'App Server Deployment',
                resourceName: qualifiedResourceId,
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

      let promises = [defaultEmailPromise];
      promises.push(heapTriggerPromise, nonHeapTriggerPromise, garbageTriggerPromise); //JVM
      promises.push(activeSessionsTriggerPromise, expiredSessionsTriggerPromise, rejectedSessionsTriggerPromise); //WEB
      promises.push(failedDeploymentTriggerPromise); //FAILED DEPLOYMENT
      promises.push(this.registerAvailableMemoryAlert(), this.registerAvailableCpuAlerts()); //Platform
      this.$q.all(promises).then(() => {
        // do nothing
      }, () => {
        this.$log.error('Missing and unable to create new App-Server Alert triggers.');
      });
    }

    private registerAvailableCpuAlerts(): any {
      let procesorPromises = [];
      this.HawkularInventory.ResourceOfTypeUnderFeed.query({
        environmentId: globalEnvironmentId,
        feedId: this.feedId,
        resourceTypeId: 'Processor'
      }).$promise.then((resources) => {
        _.forEach(resources, (resource) => {
          const triggerId = this.$routeParams.feedId + '_cpu_usage_' + resource['id'];

          this.HawkularAlertsManager.existTrigger(triggerId).then(() => {
            this.$log.debug('Usage of CPU trigger for "' + triggerId + '" exists, nothing to do');
          }, () => {
            procesorPromises.push(this.HawkularAlertsManager.createTrigger(
              this.createCpuTrigger(resource, triggerId), () => {
                this.$log.error('Error on Trigger creation for ' + triggerId);
              }));
          });
        });
      });
      return procesorPromises;
    }

    private createCpuTrigger(cpuResource, triggerId): IAlertDefinition {
      const dataId = MetricsService.getMetricId('M', this.feedId, cpuResource['id'], 'CPU Usage');
      const description = 'Usage of CPU ' + cpuResource['name'] + ' outside bounds';
      return {
        trigger: new AlertDefinitionTriggerBuilder()
          .withId(triggerId)
          .withName('CPU usage')
          .withDescription(description)
          .withActions([this.defaultAction])
          .withTags({ resourceId: this.feedId, resourceName: cpuResource['name'] })
          .withContext(
            new AlertDefinitionContextBuilder(AlertDefinitionContext.TRESHOLD_TRIGGER_TYPE)
              .withAlertType('CPU_USAGE_EXCEED')
              .withResourceType('CPU')
              .withResourceName(this.feedId)
              .withResourcePath(this.$rootScope.resourcePath)
              .build()
          )
          .build(),
        dampenings: AppServerDetailsController.defaultDampenings(triggerId),
        conditions: [
          new AlertDefinitionConditionBuilder(AlertDefinitionCondition.DEFAULT_TRESHOLD_TYPE)
            .withTriggerId(triggerId)
            .withDataId(dataId)
            .withOperator('GT')
            .withThreshold(0.2) //20%
            .withContext({
              description: 'CPU Usage',
              unit: '%'
            })
            .build()
        ]
      };
    }

    private registerAvailableMemoryAlert(): any {
      const memoryResourceId = AppServerPlatformDetailsController.getMemoryResourceId(this.$routeParams.feedId);
      const dataId = MetricsService.getMetricId('M', this.$routeParams.feedId, memoryResourceId, 'Available Memory');
      const totalMemoryId = MetricsService.getMetricId('M', this.$routeParams.feedId, memoryResourceId, 'Total Memory');
      const triggerId = this.$routeParams.feedId + '_available_memory';

      const description = [
        'Minimum of Available memory for',
        this.feedId, 'is',
        AppServerPlatformDetailsController.MINIMUM_AVAIL_MEM
      ].join(' ');

      const conditionContext = {
        description: 'Total memory',
        unit: 'MB'
      };
      Object.freeze(conditionContext);

      return this.HawkularAlertsManager
        .existTrigger(triggerId).then(() => {
          this.$log.debug('Available memory trigger for "' + this.$routeParams.feedId + '" exists, nothing to do');
        }, () => {
          let fullTrigger: IAlertDefinition = {
            trigger: new AlertDefinitionTriggerBuilder()
              .withId(triggerId)
              .withName('Available memory')
              .withDescription(description)
              .withTags({ resourceId: this.feedId })
              .withActions([this.defaultAction])
              .withContext(
                new AlertDefinitionContextBuilder(AlertDefinitionContext.RANGE_PERCENT_TRIGGER_TYPE)
                  .withAlertType('AVAILABLE_MEMORY')
                  .withResourceType('Memory')
                  .withResourceName(this.feedId)
                  .withResourcePath(this.$rootScope.resourcePath)
                  .withTriggerTypeProperty1(totalMemoryId)
                  .withTriggerTypeProperty2('Total memory').build()
              ).build(),
            dampenings: AppServerDetailsController.defaultDampenings(triggerId),
            conditions: [
              new AlertDefinitionConditionBuilder(AlertDefinitionCondition.DEFAULT_COMPARE_TYPE)
                .withTriggerId(triggerId)
                .withDataId(dataId)
                .withData2Id(totalMemoryId)
                .withOperator(AppServerDetailsController.GT)
                .withContext(conditionContext).withData2Multiplier(0.80).build(),
              new AlertDefinitionConditionBuilder(AlertDefinitionCondition.DEFAULT_COMPARE_TYPE)
                .withTriggerId(triggerId)
                .withDataId(dataId)
                .withData2Id(totalMemoryId)
                .withOperator(AppServerDetailsController.LT)
                .withContext(conditionContext).withData2Multiplier(0.10).build()
            ]
          };

          return this.HawkularAlertsManager.createTrigger(fullTrigger, () => {
            this.$log.error('Error on Trigger creation for ' + triggerId);
          });
        });
    }

    private static defaultDampenings(triggerId): AlertDefinitionDampening[] {
      return [
        new AlertDefinitionDampeningBuilder().withTriggerId(triggerId).build()
      ];
    }
  }

  _module.controller('AppServerDetailsController', AppServerDetailsController);

}
