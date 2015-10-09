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

/// <reference path='../../includes.ts'/>
/// <reference path='topologyGlobals.ts'/>

module HawkularTopology {

  _module.config([
    '$routeProvider', 'HawtioNavBuilderProvider',
    ($routeProvider, builder:HawtioMainNav.BuilderFactory) => {

      $routeProvider
      .when(
        '/hawkular-ui/topology/view',
        { templateUrl: builder.join(HawkularTopology.templatePath, 'index.html') }
        );
    }]);

  export class TopologyController {
    public static $inject = ['$rootScope', '$log', '$routeParams', '$modal', 'HawkularAccount',
    /*'NotificationsService',*/ 'userDetails'];
    private data: any;

    constructor(private $rootScope:any,
      private $log:ng.ILogService,
      private $routeParams:any,
      private $modal:any,
      private HawkularAccount:any,
      // private NotificationsService:INotificationsService,
      private userDetails:any) {

      $log.info('Loading topology controller');


      var datasets = [];

      function sink(dataset) {
        datasets.push(dataset);
      }
      window['datasets'] = datasets;
      sink({
        'items': {
          '39113587-088f-11e5-b0b0-525400398fe5': {
            'apiVersion': 'v1beta3',
            'kind': 'Node',
            'metadata': {
              'creationTimestamp': '2015-06-01T18:51:33Z',
              'name': 'node-1.rha',
              'resourceVersion': '10065',
              'selfLink': '/api/v1beta3/nodes/node-1.rha',
              'uid': '39113587-088f-11e5-b0b0-525400398fe5'
            },
            'spec': {
              'externalID': 'node-1.rha'
            },
            'status': {
              'capacity': {
                'cpu': '1',
                'memory': '4047776Ki'
              },
              'conditions': [
              {
                'lastHeartbeatTime': '2015-06-02T15:41:47Z',
                'lastTransitionTime': '2015-06-01T18:52:24Z',
                'reason': 'kubelet is posting ready status',
                'status': 'True',
                'type': 'Ready'
              }
              ],
              'nodeInfo': {
                'bootID': 'd51f8e13-399c-4245-9e88-3091c4d1f6f2',
                'containerRuntimeVersion': 'docker://1.6.0',
                'kernelVersion': '4.0.4-301.fc22.x86_64',
                'kubeProxyVersion': 'v0.16.2-659-g63182318c5876b',
                'kubeletVersion': 'v0.16.2-659-g63182318c5876b',
                'machineID': '0fed1fe218d1a8449292cce385ada4e6',
                'osImage': 'Red Hat Enterprise Linux Atomic Host 7.1',
                'systemUUID': '0FED1FE2-18D1-A844-9292-CCE385ADA4E6'
              }
            }
          },
          '3953a982-088f-11e5-b0b0-525400398fe5': {
            'apiVersion': 'v1beta3',
            'kind': 'Service',
            'metadata': {
              'creationTimestamp': '2015-06-01T18:51:33Z',
              'labels': {
                'component': 'apiserver',
                'provider': 'kubernetes'
              },
              'name': 'kubernetes',
              'namespace': 'default',
              'resourceVersion': '5',
              'selfLink': '/api/v1beta3/namespaces/default/services/kubernetes',
              'uid': '3953a982-088f-11e5-b0b0-525400398fe5'
            },
            'spec': {
              'portalIP': '10.254.0.2',
              'ports': [
              {
                'name': '',
                'port': 443,
                'protocol': 'TCP',
                'targetPort': 443
              }
              ],
              'selector': null,
              'sessionAffinity': 'None'
            },
            'status': {}
          },
          '3953c23b-088f-11e5-b0b0-525400398fe5': {
            'apiVersion': 'v1beta3',
            'kind': 'Service',
            'metadata': {
              'creationTimestamp': '2015-06-01T18:51:33Z',
              'labels': {
                'component': 'apiserver',
                'provider': 'kubernetes'
              },
              'name': 'kubernetes-ro',
              'namespace': 'default',
              'resourceVersion': '6',
              'selfLink': '/api/v1beta3/namespaces/default/services/kubernetes-ro',
              'uid': '3953c23b-088f-11e5-b0b0-525400398fe5'
            },
            'spec': {
              'portalIP': '10.254.0.1',
              'ports': [
              {
                'name': '',
                'port': 80,
                'protocol': 'TCP',
                'targetPort': 80
              }
              ],
              'selector': null,
              'sessionAffinity': 'None'
            },
            'status': {}
          },
          '79ec9243-08fc-11e5-a9e7-525400398fe5': {
            'apiVersion': 'v1beta3',
            'kind': 'Service',
            'metadata': {
              'creationTimestamp': '2015-06-02T07:53:37Z',
              'labels': {
                'name': 'database',
                'template': 'ruby-helloworld-sample'
              },
              'name': 'database',
              'namespace': 'sample',
              'resourceVersion': '1515',
              'selfLink': '/api/v1beta3/namespaces/sample/services/database',
              'uid': '79ec9243-08fc-11e5-a9e7-525400398fe5'
            },
            'spec': {
              'portalIP': '10.254.234.188',
              'ports': [
              {
                'name': '',
                'port': 5434,
                'protocol': 'TCP',
                'targetPort': 3306
              }
              ],
              'selector': {
                'name': 'database'
              },
              'sessionAffinity': 'None'
            },
            'status': {}
          },
          '7a01f790-08fc-11e5-a9e7-525400398fe5': {
            'apiVersion': 'v1beta3',
            'kind': 'Service',
            'metadata': {
              'creationTimestamp': '2015-06-02T07:53:37Z',
              'labels': {
                'name': 'frontend',
                'template': 'ruby-helloworld-sample'
              },
              'name': 'frontend',
              'namespace': 'sample',
              'resourceVersion': '1517',
              'selfLink': '/api/v1beta3/namespaces/sample/services/frontend',
              'uid': '7a01f790-08fc-11e5-a9e7-525400398fe5'
            },
            'spec': {
              'portalIP': '10.254.83.42',
              'ports': [
              {
                'name': '',
                'port': 80,
                'protocol': 'TCP',
                'targetPort': 8080
              }
              ],
              'selector': {
                'name': 'frontend'
              },
              'sessionAffinity': 'None'
            },
            'status': {}
          },
          '7a0ea065-08fc-11e5-a9e7-525400398fe5': {
            'apiVersion': 'v1beta3',
            'kind': 'ReplicationController',
            'metadata': {
              'creationTimestamp': '2015-06-02T07:53:37Z',
              'labels': {
                'name': 'database',
                'template': 'ruby-helloworld-sample'
              },
              'name': 'database',
              'namespace': 'sample',
              'resourceVersion': '1527',
              'selfLink': '/api/v1beta3/namespaces/sample/replicationcontrollers/database',
              'uid': '7a0ea065-08fc-11e5-a9e7-525400398fe5'
            },
            'spec': {
              'replicas': 1,
              'selector': {
                'name': 'database',
                'template': 'ruby-helloworld-sample'
              },
              'template': {
                'metadata': {
                  'creationTimestamp': null,
                  'labels': {
                    'name': 'database',
                    'template': 'ruby-helloworld-sample'
                  }
                },
                'spec': {
                  'containers': [
                  {
                    'capabilities': {},
                    'env': [
                    {
                      'name': 'MYSQL_ROOT_PASSWORD',
                      'value': 'rQHfVnTo'
                    },
                    {
                      'name': 'MYSQL_DATABASE',
                      'value': 'root'
                    }
                    ],
                    'image': 'mysql',
                    'imagePullPolicy': 'IfNotPresent',
                    'name': 'ruby-helloworld-database',
                    'ports': [
                    {
                      'containerPort': 3306,
                      'protocol': 'TCP'
                    }
                    ],
                    'resources': {},
                    'securityContext': {
                      'capabilities': {}
                    },
                    'terminationMessagePath': '/dev/termination-log'
                  }
                  ],
                  'dnsPolicy': 'ClusterFirst',
                  'restartPolicy': 'Always',
                  'volumes': null
                }
              }
            },
            'status': {
              'replicas': 1
            }
          },
          '7a132ea2-08fc-11e5-a9e7-525400398fe5': {
            'apiVersion': 'v1beta3',
            'kind': 'Pod',
            'metadata': {
              'annotations': {
                'kubernetes.io/created-by': '{\'kind\':\'SerializedReference\',\'apiVersion\':\'v1beta3\','
                + '\'reference\':{\'kind\':\'ReplicationController\',\'namespace\':\'sample\',\'name\':\'database\','
                + '\'uid\':\'7a0ea065-08fc-11e5-a9e7-525400398fe5\',\'apiVersion\':\'v1beta3\','
                + '\'resourceVersion\':\'1519\'}}'
              },
              'creationTimestamp': '2015-06-02T07:53:37Z',
              'generateName': 'database-',
              'labels': {
                'name': 'database',
                'template': 'ruby-helloworld-sample'
              },
              'name': 'database-f807k',
              'namespace': 'sample',
              'resourceVersion': '1546',
              'selfLink': '/api/v1beta3/namespaces/sample/pods/database-f807k',
              'uid': '7a132ea2-08fc-11e5-a9e7-525400398fe5'
            },
            'spec': {
              'containers': [
              {
                'capabilities': {},
                'env': [
                {
                  'name': 'MYSQL_ROOT_PASSWORD',
                  'value': 'rQHfVnTo'
                },
                {
                  'name': 'MYSQL_DATABASE',
                  'value': 'root'
                }
                ],
                'image': 'mysql',
                'imagePullPolicy': 'IfNotPresent',
                'name': 'ruby-helloworld-database',
                'ports': [
                {
                  'containerPort': 3306,
                  'protocol': 'TCP'
                }
                ],
                'resources': {},
                'securityContext': {
                  'capabilities': {}
                },
                'terminationMessagePath': '/dev/termination-log'
              }
              ],
              'dnsPolicy': 'ClusterFirst',
              'host': 'node-1.rha',
              'restartPolicy': 'Always',
              'volumes': null
            },
            'status': {
              'Condition': [
              {
                'status': 'True',
                'type': 'Ready'
              }
              ],
              'containerStatuses': [
              {
                'containerID': 'docker://87e17c20159bb290f2cd7b3f364c9303e8f3b0e4a01d7059adfb1ceadbe5aa6f',
                'image': 'mysql',
                'imageID': 'docker://ff78d9bb5f46b3a619310a8e3f3e62b98ce08b476d0d5d4088f1853d604f8218',
                'lastState': {},
                'name': 'ruby-helloworld-database',
                'ready': true,
                'restartCount': 0,
                'state': {
                  'running': {
                    'startedAt': '2015-06-02T07:53:47Z'
                  }
                }
              }
              ],
              'phase': 'Running',
              'podIP': '18.0.61.8'
            }
          },
          '7a1a82bd-08fc-11e5-a9e7-525400398fe5': {
            'apiVersion': 'v1beta3',
            'kind': 'ReplicationController',
            'metadata': {
              'creationTimestamp': '2015-06-02T07:53:37Z',
              'labels': {
                'name': 'frontend',
                'template': 'ruby-helloworld-sample'
              },
              'name': 'frontend',
              'namespace': 'sample',
              'resourceVersion': '1656',
              'selfLink': '/api/v1beta3/namespaces/sample/replicationcontrollers/frontend',
              'uid': '7a1a82bd-08fc-11e5-a9e7-525400398fe5'
            },
            'spec': {
              'replicas': 5,
              'selector': {
                'name': 'frontend',
                'template': 'ruby-helloworld-sample'
              },
              'template': {
                'metadata': {
                  'creationTimestamp': null,
                  'labels': {
                    'name': 'frontend',
                    'template': 'ruby-helloworld-sample'
                  }
                },
                'spec': {
                  'containers': [
                  {
                    'capabilities': {},
                    'env': [
                    {
                      'name': 'ADMIN_USERNAME',
                      'value': 'admin6TM'
                    },
                    {
                      'name': 'ADMIN_PASSWORD',
                      'value': 'xImx1tHR'
                    },
                    {
                      'name': 'MYSQL_ROOT_PASSWORD',
                      'value': 'rQHfVnTo'
                    },
                    {
                      'name': 'MYSQL_DATABASE',
                      'value': 'root'
                    }
                    ],
                    'image': 'openshift/ruby-hello-world',
                    'imagePullPolicy': 'IfNotPresent',
                    'name': 'ruby-helloworld',
                    'ports': [
                    {
                      'containerPort': 8080,
                      'protocol': 'TCP'
                    }
                    ],
                    'resources': {},
                    'securityContext': {
                      'capabilities': {}
                    },
                    'terminationMessagePath': '/dev/termination-log'
                  }
                  ],
                  'dnsPolicy': 'ClusterFirst',
                  'restartPolicy': 'Always',
                  'volumes': null
                }
              }
            },
            'status': {
              'replicas': 5
            }
          },
          '891054a1-0890-11e5-a3b5-525400398fe5': {
            'apiVersion': 'v1beta3',
            'kind': 'Service',
            'metadata': {
              'creationTimestamp': '2015-06-01T19:00:57Z',
              'labels': {
                'name': 'redis-master'
              },
              'name': 'redis-master',
              'namespace': 'guestbook4',
              'resourceVersion': '81',
              'selfLink': '/api/v1beta3/namespaces/guestbook4/services/redis-master',
              'uid': '891054a1-0890-11e5-a3b5-525400398fe5'
            },
            'spec': {
              'portalIP': '10.254.166.23',
              'ports': [
              {
                'name': '',
                'port': 6379,
                'protocol': 'TCP',
                'targetPort': 6379
              }
              ],
              'selector': {
                'name': 'redis-master'
              },
              'sessionAffinity': 'None'
            },
            'status': {}
          },
          '89222e96-0890-11e5-a3b5-525400398fe5': {
            'apiVersion': 'v1beta3',
            'kind': 'Service',
            'metadata': {
              'creationTimestamp': '2015-06-01T19:00:57Z',
              'labels': {
                'name': 'redis-slave'
              },
              'name': 'redis-slave',
              'namespace': 'guestbook4',
              'resourceVersion': '83',
              'selfLink': '/api/v1beta3/namespaces/guestbook4/services/redis-slave',
              'uid': '89222e96-0890-11e5-a3b5-525400398fe5'
            },
            'spec': {
              'portalIP': '10.254.94.104',
              'ports': [
              {
                'name': '',
                'port': 6379,
                'protocol': 'TCP',
                'targetPort': 6379
              }
              ],
              'selector': {
                'name': 'redis-slave'
              },
              'sessionAffinity': 'None'
            },
            'status': {}
          },
          '892e8cee-0890-11e5-a3b5-525400398fe5': {
            'apiVersion': 'v1beta3',
            'kind': 'Service',
            'metadata': {
              'creationTimestamp': '2015-06-01T19:00:57Z',
              'labels': {
                'name': 'frontend'
              },
              'name': 'frontend',
              'namespace': 'guestbook4',
              'resourceVersion': '85',
              'selfLink': '/api/v1beta3/namespaces/guestbook4/services/frontend',
              'uid': '892e8cee-0890-11e5-a3b5-525400398fe5'
            },
            'spec': {
              'portalIP': '10.254.144.177',
              'ports': [
              {
                'name': '',
                'port': 80,
                'protocol': 'TCP',
                'targetPort': 80
              }
              ],
              'selector': {
                'name': 'frontend'
              },
              'sessionAffinity': 'None'
            },
            'status': {}
          },
          '89443a7e-0890-11e5-a3b5-525400398fe5': {
            'apiVersion': 'v1beta3',
            'kind': 'Pod',
            'metadata': {
              'creationTimestamp': '2015-06-01T19:00:57Z',
              'labels': {
                'name': 'redis-master'
              },
              'name': 'redis-master',
              'namespace': 'guestbook4',
              'resourceVersion': '686',
              'selfLink': '/api/v1beta3/namespaces/guestbook4/pods/redis-master',
              'uid': '89443a7e-0890-11e5-a3b5-525400398fe5'
            },
            'spec': {
              'containers': [
              {
                'capabilities': {},
                'image': 'stefwalter/redis:latest',
                'imagePullPolicy': 'Always',
                'name': 'master',
                'ports': [
                {
                  'containerPort': 6379,
                  'protocol': 'TCP'
                }
                ],
                'resources': {},
                'securityContext': {
                  'capabilities': {}
                },
                'terminationMessagePath': '/dev/termination-log'
              }
              ],
              'dnsPolicy': 'ClusterFirst',
              'host': 'node-1.rha',
              'restartPolicy': 'Always',
              'volumes': null
            },
            'status': {
              'Condition': [
              {
                'status': 'True',
                'type': 'Ready'
              }
              ],
              'containerStatuses': [
              {
                'containerID': 'docker://da14d7343dcfe3ebb613dbffe253644f31d5ad344fc59884556760ec70b64d09',
                'image': 'stefwalter/redis:latest',
                'imageID': 'docker://deb0a69eaa07fa6dd2f7fdd5cda053fa8bb1d2002040cb9172a16cf66005162b',
                'lastState': {
                  'termination': {
                    'containerID': 'docker://bd9e1653f5b7dfe66e0fb69682df25897d34869d4ed44b35c3b7693ad0d94c5f',
                    'exitCode': 0,
                    'finishedAt': '2015-06-02T05:39:43Z',
                    'startedAt': '2015-06-01T19:01:17Z'
                  }
                },
                'name': 'master',
                'ready': true,
                'restartCount': 1,
                'state': {
                  'running': {
                    'startedAt': '2015-06-02T05:40:50Z'
                  }
                }
              }
              ],
              'phase': 'Running',
              'podIP': '18.0.61.7'
            }
          },
          '8959751f-0890-11e5-a3b5-525400398fe5': {
            'apiVersion': 'v1beta3',
            'kind': 'ReplicationController',
            'metadata': {
              'creationTimestamp': '2015-06-01T19:00:57Z',
              'labels': {
                'name': 'redis-slave'
              },
              'name': 'redis-slave',
              'namespace': 'guestbook4',
              'resourceVersion': '111',
              'selfLink': '/api/v1beta3/namespaces/guestbook4/replicationcontrollers/redis-slave',
              'uid': '8959751f-0890-11e5-a3b5-525400398fe5'
            },
            'spec': {
              'replicas': 2,
              'selector': {
                'name': 'redis-slave'
              },
              'template': {
                'metadata': {
                  'creationTimestamp': null,
                  'labels': {
                    'name': 'redis-slave'
                  }
                },
                'spec': {
                  'containers': [
                  {
                    'capabilities': {},
                    'image': 'stefwalter/redis-slave:v2',
                    'imagePullPolicy': 'IfNotPresent',
                    'name': 'slave',
                    'ports': [
                    {
                      'containerPort': 6379,
                      'protocol': 'TCP'
                    }
                    ],
                    'resources': {},
                    'securityContext': {
                      'capabilities': {}
                    },
                    'terminationMessagePath': '/dev/termination-log'
                  }
                  ],
                  'dnsPolicy': 'ClusterFirst',
                  'restartPolicy': 'Always',
                  'volumes': null
                }
              }
            },
            'status': {
              'replicas': 2
            }
          },
          '8960db98-0890-11e5-a3b5-525400398fe5': {
            'apiVersion': 'v1beta3',
            'kind': 'Pod',
            'metadata': {
              'annotations': {
                'kubernetes.io/created-by': '{\'kind\':\'SerializedReference\',\'apiVersion\':\'v1beta3\','
                + '\'reference\':{\'kind\':\'ReplicationController\',\'namespace\':\'guestbook4\','
                + '\'name\':\'redis-slave\',\'uid\':\'8959751f-0890-11e5-a3b5-525400398fe5\','
                + '\'apiVersion\':\'v1beta3\',\'resourceVersion\':\'90\'}}'
              },
              'creationTimestamp': '2015-06-01T19:00:57Z',
              'generateName': 'redis-slave-',
              'labels': {
                'name': 'redis-slave'
              },
              'name': 'redis-slave-xmboh',
              'namespace': 'guestbook4',
              'resourceVersion': '675',
              'selfLink': '/api/v1beta3/namespaces/guestbook4/pods/redis-slave-xmboh',
              'uid': '8960db98-0890-11e5-a3b5-525400398fe5'
            },
            'spec': {
              'containers': [
              {
                'capabilities': {},
                'image': 'stefwalter/redis-slave:v2',
                'imagePullPolicy': 'IfNotPresent',
                'name': 'slave',
                'ports': [
                {
                  'containerPort': 6379,
                  'protocol': 'TCP'
                }
                ],
                'resources': {},
                'securityContext': {
                  'capabilities': {}
                },
                'terminationMessagePath': '/dev/termination-log'
              }
              ],
              'dnsPolicy': 'ClusterFirst',
              'host': 'node-1.rha',
              'restartPolicy': 'Always',
              'volumes': null
            },
            'status': {
              'Condition': [
              {
                'status': 'True',
                'type': 'Ready'
              }
              ],
              'containerStatuses': [
              {
                'containerID': 'docker://18e52168219dd3edd71cfd37c94750a627fd63b3542d79bc7dc1f8bbf002d245',
                'image': 'stefwalter/redis-slave:v2',
                'imageID': 'docker://e6dc7726402fed07c856f82df186ecabeeea99b9d6846b5e72e1d6de59f50fad',
                'lastState': {
                  'termination': {
                    'containerID': 'docker://6e4fcfa83e6cb1539126ab9db203f624d71a8e2602c04fcaec04bc521e11dd87',
                    'exitCode': 0,
                    'finishedAt': '2015-06-02T05:39:43Z',
                    'startedAt': '2015-06-01T19:01:11Z'
                  }
                },
                'name': 'slave',
                'ready': true,
                'restartCount': 1,
                'state': {
                  'running': {
                    'startedAt': '2015-06-02T05:40:40Z'
                  }
                }
              }
              ],
              'phase': 'Running',
              'podIP': '18.0.61.2'
            }
          },
          '89610137-0890-11e5-a3b5-525400398fe5': {
            'apiVersion': 'v1beta3',
            'kind': 'Pod',
            'metadata': {
              'annotations': {
                'kubernetes.io/created-by': '{\'kind\':\'SerializedReference\',\'apiVersion\':\'v1beta3\','
                + '\'reference\':{\'kind\':\'ReplicationController\',\'namespace\':\'guestbook4\','
                + '\'name\':\'redis-slave\',\'uid\':\'8959751f-0890-11e5-a3b5-525400398fe5\','
                + '\'apiVersion\':\'v1beta3\',\'resourceVersion\':\'90\'}}'
              },
              'creationTimestamp': '2015-06-01T19:00:57Z',
              'generateName': 'redis-slave-',
              'labels': {
                'name': 'redis-slave'
              },
              'name': 'redis-slave-y1a8g',
              'namespace': 'guestbook4',
              'resourceVersion': '678',
              'selfLink': '/api/v1beta3/namespaces/guestbook4/pods/redis-slave-y1a8g',
              'uid': '89610137-0890-11e5-a3b5-525400398fe5'
            },
            'spec': {
              'containers': [
              {
                'capabilities': {},
                'image': 'stefwalter/redis-slave:v2',
                'imagePullPolicy': 'IfNotPresent',
                'name': 'slave',
                'ports': [
                {
                  'containerPort': 6379,
                  'protocol': 'TCP'
                }
                ],
                'resources': {},
                'securityContext': {
                  'capabilities': {}
                },
                'terminationMessagePath': '/dev/termination-log'
              }
              ],
              'dnsPolicy': 'ClusterFirst',
              'host': 'node-1.rha',
              'restartPolicy': 'Always',
              'volumes': null
            },
            'status': {
              'Condition': [
              {
                'status': 'True',
                'type': 'Ready'
              }
              ],
              'containerStatuses': [
              {
                'containerID': 'docker://cbbe7ae54aac317a2bbd5d02215715650b54ae380667ba09594a3ba1b05bee89',
                'image': 'stefwalter/redis-slave:v2',
                'imageID': 'docker://e6dc7726402fed07c856f82df186ecabeeea99b9d6846b5e72e1d6de59f50fad',
                'lastState': {
                  'termination': {
                    'containerID': 'docker://a729ab2330c44ffe0e0596f54e28eac927661478cfaf35b23802ce855b61fa3a',
                    'exitCode': 0,
                    'finishedAt': '2015-06-02T05:39:43Z',
                    'startedAt': '2015-06-01T19:01:12Z'
                  }
                },
                'name': 'slave',
                'ready': true,
                'restartCount': 1,
                'state': {
                  'running': {
                    'startedAt': '2015-06-02T05:40:40Z'
                  }
                }
              }
              ],
              'phase': 'Running',
              'podIP': '18.0.61.6'
            }
          },
          '89672aaf-0890-11e5-a3b5-525400398fe5': {
            'apiVersion': 'v1beta3',
            'kind': 'ReplicationController',
            'metadata': {
              'creationTimestamp': '2015-06-01T19:00:57Z',
              'labels': {
                'name': 'frontend'
              },
              'name': 'frontend',
              'namespace': 'guestbook4',
              'resourceVersion': '116',
              'selfLink': '/api/v1beta3/namespaces/guestbook4/replicationcontrollers/frontend',
              'uid': '89672aaf-0890-11e5-a3b5-525400398fe5'
            },
            'spec': {
              'replicas': 3,
              'selector': {
                'name': 'frontend'
              },
              'template': {
                'metadata': {
                  'creationTimestamp': null,
                  'labels': {
                    'name': 'frontend'
                  }
                },
                'spec': {
                  'containers': [
                  {
                    'capabilities': {},
                    'image': 'stefwalter/example-guestbook-php-redis:v2',
                    'imagePullPolicy': 'IfNotPresent',
                    'name': 'php-redis',
                    'ports': [
                    {
                      'containerPort': 80,
                      'protocol': 'TCP'
                    }
                    ],
                    'resources': {},
                    'securityContext': {
                      'capabilities': {}
                    },
                    'terminationMessagePath': '/dev/termination-log'
                  }
                  ],
                  'dnsPolicy': 'ClusterFirst',
                  'restartPolicy': 'Always',
                  'volumes': null
                }
              }
            },
            'status': {
              'replicas': 3
            }
          },
          '897f26dd-0890-11e5-a3b5-525400398fe5': {
            'apiVersion': 'v1beta3',
            'kind': 'Pod',
            'metadata': {
              'annotations': {
                'kubernetes.io/created-by': '{\'kind\':\'SerializedReference\',\'apiVersion\':\'v1beta3\','
                + '\'reference\':{\'kind\':\'ReplicationController\',\'namespace\':\'guestbook4\','
                + '\'name\':\'frontend\',\'uid\':\'89672aaf-0890-11e5-a3b5-525400398fe5\',\'apiVersion\':\'v1beta3\','
                + '\'resourceVersion\':\'94\'}}'
              },
              'creationTimestamp': '2015-06-01T19:00:57Z',
              'generateName': 'frontend-',
              'labels': {
                'name': 'frontend'
              },
              'name': 'frontend-cfie3',
              'namespace': 'guestbook4',
              'resourceVersion': '673',
              'selfLink': '/api/v1beta3/namespaces/guestbook4/pods/frontend-cfie3',
              'uid': '897f26dd-0890-11e5-a3b5-525400398fe5'
            },
            'spec': {
              'containers': [
              {
                'capabilities': {},
                'image': 'stefwalter/example-guestbook-php-redis:v2',
                'imagePullPolicy': 'IfNotPresent',
                'name': 'php-redis',
                'ports': [
                {
                  'containerPort': 80,
                  'protocol': 'TCP'
                }
                ],
                'resources': {},
                'securityContext': {
                  'capabilities': {}
                },
                'terminationMessagePath': '/dev/termination-log'
              }
              ],
              'dnsPolicy': 'ClusterFirst',
              'host': 'node-1.rha',
              'restartPolicy': 'Always',
              'volumes': null
            },
            'status': {
              'Condition': [
              {
                'status': 'True',
                'type': 'Ready'
              }
              ],
              'containerStatuses': [
              {
                'containerID': 'docker://5ab9deb0eb5b45395ebdf6717b44c768d6f10b29fc250c1d82a982e8438c95c6',
                'image': 'stefwalter/example-guestbook-php-redis:v2',
                'imageID': 'docker://c868c3491a62e04c25b462f06f8dc195732f6d521c91c41bb22a60999c9d99c5',
                'lastState': {
                  'termination': {
                    'containerID': 'docker://8d27607dbe58b6802bcbf0fd3b07aa19288e5b9fe3d0847759d1c4154c2d49ab',
                    'exitCode': 0,
                    'finishedAt': '2015-06-02T05:39:43Z',
                    'startedAt': '2015-06-01T19:01:17Z'
                  }
                },
                'name': 'php-redis',
                'ready': true,
                'restartCount': 1,
                'state': {
                  'running': {
                    'startedAt': '2015-06-02T05:40:38Z'
                  }
                }
              }
              ],
              'phase': 'Running',
              'podIP': '18.0.61.3'
            }
          },
          '897f4916-0890-11e5-a3b5-525400398fe5': {
            'apiVersion': 'v1beta3',
            'kind': 'Pod',
            'metadata': {
              'annotations': {
                'kubernetes.io/created-by': '{\'kind\':\'SerializedReference\',\'apiVersion\':\'v1beta3\','
                + '\'reference\':{\'kind\':\'ReplicationController\',\'namespace\':\'guestbook4\',\'name\':\'frontend'
                + '\',\'uid\':\'89672aaf-0890-11e5-a3b5-525400398fe5\',\'apiVersion\':\'v1beta3\','
                + '\'resourceVersion\':\'94\'}}'
              },
              'creationTimestamp': '2015-06-01T19:00:57Z',
              'generateName': 'frontend-',
              'labels': {
                'name': 'frontend'
              },
              'name': 'frontend-cv934',
              'namespace': 'guestbook4',
              'resourceVersion': '671',
              'selfLink': '/api/v1beta3/namespaces/guestbook4/pods/frontend-cv934',
              'uid': '897f4916-0890-11e5-a3b5-525400398fe5'
            },
            'spec': {
              'containers': [
              {
                'capabilities': {},
                'image': 'stefwalter/example-guestbook-php-redis:v2',
                'imagePullPolicy': 'IfNotPresent',
                'name': 'php-redis',
                'ports': [
                {
                  'containerPort': 80,
                  'protocol': 'TCP'
                }
                ],
                'resources': {},
                'securityContext': {
                  'capabilities': {}
                },
                'terminationMessagePath': '/dev/termination-log'
              }
              ],
              'dnsPolicy': 'ClusterFirst',
              'host': 'node-1.rha',
              'restartPolicy': 'Always',
              'volumes': null
            },
            'status': {
              'Condition': [
              {
                'status': 'True',
                'type': 'Ready'
              }
              ],
              'containerStatuses': [
              {
                'containerID': 'docker://5fda570e5ebdab354538ece879b3281ac373e81085d9b0181025de53824dacd0',
                'image': 'stefwalter/example-guestbook-php-redis:v2',
                'imageID': 'docker://c868c3491a62e04c25b462f06f8dc195732f6d521c91c41bb22a60999c9d99c5',
                'lastState': {
                  'termination': {
                    'containerID': 'docker://4e1fd493c8202cd6467117ba475f8301e16c3180a38de425e8c3f04cddc4e028',
                    'exitCode': 0,
                    'finishedAt': '2015-06-02T05:39:43Z',
                    'startedAt': '2015-06-01T19:01:17Z'
                  }
                },
                'name': 'php-redis',
                'ready': true,
                'restartCount': 1,
                'state': {
                  'running': {
                    'startedAt': '2015-06-02T05:40:37Z'
                  }
                }
              }
              ],
              'phase': 'Running',
              'podIP': '18.0.61.4'
            }
          },
          '897f63c3-0890-11e5-a3b5-525400398fe5': {
            'apiVersion': 'v1beta3',
            'kind': 'Pod',
            'metadata': {
              'annotations': {
                'kubernetes.io/created-by': '{\'kind\':\'SerializedReference\',\'apiVersion\':\'v1beta3\','
                + '\'reference\':{\'kind\':\'ReplicationController\',\'namespace\':\'guestbook4\','
                + '\'name\':\'frontend\',\'uid\':\'89672aaf-0890-11e5-a3b5-525400398fe5\',\'apiVersion\':\'v1beta3\','
                + '\'resourceVersion\':\'94\'}}'
              },
              'creationTimestamp': '2015-06-01T19:00:57Z',
              'generateName': 'frontend-',
              'labels': {
                'name': 'frontend'
              },
              'name': 'frontend-rz8eu',
              'namespace': 'guestbook4',
              'resourceVersion': '669',
              'selfLink': '/api/v1beta3/namespaces/guestbook4/pods/frontend-rz8eu',
              'uid': '897f63c3-0890-11e5-a3b5-525400398fe5'
            },
            'spec': {
              'containers': [
              {
                'capabilities': {},
                'image': 'stefwalter/example-guestbook-php-redis:v2',
                'imagePullPolicy': 'IfNotPresent',
                'name': 'php-redis',
                'ports': [
                {
                  'containerPort': 80,
                  'protocol': 'TCP'
                }
                ],
                'resources': {},
                'securityContext': {
                  'capabilities': {}
                },
                'terminationMessagePath': '/dev/termination-log'
              }
              ],
              'dnsPolicy': 'ClusterFirst',
              'host': 'node-1.rha',
              'restartPolicy': 'Always',
              'volumes': null
            },
            'status': {
              'Condition': [
              {
                'status': 'True',
                'type': 'Ready'
              }
              ],
              'containerStatuses': [
              {
                'containerID': 'docker://fc28e55cf876722558dd643fd0c0d1b511e74dc9e3521c3053fbc67bf351fbfd',
                'image': 'stefwalter/example-guestbook-php-redis:v2',
                'imageID': 'docker://c868c3491a62e04c25b462f06f8dc195732f6d521c91c41bb22a60999c9d99c5',
                'lastState': {
                  'termination': {
                    'containerID': 'docker://0ec0d3ca6117976f50923178cd84171dc3b8fe89b14ffe22b17b0ab3f4d9bfb1',
                    'exitCode': 0,
                    'finishedAt': '2015-06-02T05:39:43Z',
                    'startedAt': '2015-06-01T19:01:17Z'
                  }
                },
                'name': 'php-redis',
                'ready': true,
                'restartCount': 1,
                'state': {
                  'running': {
                    'startedAt': '2015-06-02T05:40:40Z'
                  }
                }
              }
              ],
              'phase': 'Running',
              'podIP': '18.0.61.5'
            }
          },
          'a2d40845-08fc-11e5-a9e7-525400398fe5': {
            'apiVersion': 'v1beta3',
            'kind': 'Pod',
            'metadata': {
              'annotations': {
                'kubernetes.io/created-by': '{\'kind\':\'SerializedReference\',\'apiVersion\':\'v1beta3\','
                + '\'reference\':{\'kind\':\'ReplicationController\',\'namespace\':\'sample\','
                + '\'name\':\'frontend\',\'uid\':\'7a1a82bd-08fc-11e5-a9e7-525400398fe5\',\'apiVersion\':\'v1beta3\','
                + '\'resourceVersion\':\'1556\'}}'
              },
              'creationTimestamp': '2015-06-02T07:54:46Z',
              'generateName': 'frontend-',
              'labels': {
                'name': 'frontend',
                'template': 'ruby-helloworld-sample'
              },
              'name': 'frontend-kelvj',
              'namespace': 'sample',
              'resourceVersion': '1611',
              'selfLink': '/api/v1beta3/namespaces/sample/pods/frontend-kelvj',
              'uid': 'a2d40845-08fc-11e5-a9e7-525400398fe5'
            },
            'spec': {
              'containers': [
              {
                'capabilities': {},
                'env': [
                {
                  'name': 'ADMIN_USERNAME',
                  'value': 'admin6TM'
                },
                {
                  'name': 'ADMIN_PASSWORD',
                  'value': 'xImx1tHR'
                },
                {
                  'name': 'MYSQL_ROOT_PASSWORD',
                  'value': 'rQHfVnTo'
                },
                {
                  'name': 'MYSQL_DATABASE',
                  'value': 'root'
                }
                ],
                'image': 'openshift/ruby-hello-world',
                'imagePullPolicy': 'IfNotPresent',
                'name': 'ruby-helloworld',
                'ports': [
                {
                  'containerPort': 8080,
                  'protocol': 'TCP'
                }
                ],
                'resources': {},
                'securityContext': {
                  'capabilities': {}
                },
                'terminationMessagePath': '/dev/termination-log'
              }
              ],
              'dnsPolicy': 'ClusterFirst',
              'host': 'node-1.rha',
              'restartPolicy': 'Always',
              'volumes': null
            },
            'status': {
              'Condition': [
              {
                'status': 'True',
                'type': 'Ready'
              }
              ],
              'containerStatuses': [
              {
                'containerID': 'docker://163729b9628761e10629452dfde7f21a68f6de24340b2850527d4065e340e684',
                'image': 'openshift/ruby-hello-world',
                'imageID': 'docker://c9917ac09d5bcd173594453e2fa9dcf71b1fc6a48eeedc46844dcbd6ee8957f2',
                'lastState': {},
                'name': 'ruby-helloworld',
                'ready': true,
                'restartCount': 0,
                'state': {
                  'running': {
                    'startedAt': '2015-06-02T07:55:00Z'
                  }
                }
              }
              ],
              'phase': 'Running',
              'podIP': '18.0.61.13'
            }
          },
          'a82eb2b2-08fc-11e5-a9e7-525400398fe5': {
            'apiVersion': 'v1beta3',
            'kind': 'Node',
            'metadata': {
              'creationTimestamp': '2015-06-02T07:54:55Z',
              'name': 'node-2.rha',
              'resourceVersion': '10064',
              'selfLink': '/api/v1beta3/nodes/node-2.rha',
              'uid': 'a82eb2b2-08fc-11e5-a9e7-525400398fe5'
            },
            'spec': {
              'externalID': 'node-2.rha'
            },
            'status': {
              'capacity': {
                'cpu': '1',
                'memory': '2049452Ki'
              },
              'conditions': [
              {
                'lastHeartbeatTime': '2015-06-02T15:41:47Z',
                'lastTransitionTime': '2015-06-02T07:54:59Z',
                'reason': 'kubelet is posting ready status',
                'status': 'True',
                'type': 'Ready'
              }
              ],
              'nodeInfo': {
                'bootID': 'f18301fb-e2d0-47db-840c-4fa812f3806c',
                'containerRuntimeVersion': 'docker://1.6.0',
                'kernelVersion': '4.0.4-301.fc22.x86_64',
                'kubeProxyVersion': 'v0.16.2-659-g63182318c5876b',
                'kubeletVersion': 'v0.16.2-659-g63182318c5876b',
                'machineID': '45bb3b96146aa94f299b9eb43646eb35',
                'osImage': 'Red Hat Enterprise Linux Atomic Host 7.1',
                'systemUUID': '64D6E7C8-F4DC-8F4B-A8B3-48A77A09BED5'
              }
            }
          },
          'a9bc7525-08fc-11e5-a9e7-525400398fe5': {
            'apiVersion': 'v1beta3',
            'kind': 'Node',
            'metadata': {
              'creationTimestamp': '2015-06-02T07:54:57Z',
              'name': 'node-3.rha',
              'resourceVersion': '10066',
              'selfLink': '/api/v1beta3/nodes/node-3.rha',
              'uid': 'a9bc7525-08fc-11e5-a9e7-525400398fe5'
            },
            'spec': {
              'externalID': 'node-3.rha'
            },
            'status': {
              'capacity': {
                'cpu': '1',
                'memory': '2049452Ki'
              },
              'conditions': [
              {
                'lastHeartbeatTime': '2015-06-02T15:41:47Z',
                'lastTransitionTime': '2015-06-02T07:54:58Z',
                'reason': 'kubelet is posting ready status',
                'status': 'True',
                'type': 'Ready'
              }
              ],
              'nodeInfo': {
                'bootID': 'f7f2dbb2-1e41-4572-a51a-af8f32fe8e61',
                'containerRuntimeVersion': 'docker://1.6.0',
                'kernelVersion': '4.0.4-301.fc22.x86_64',
                'kubeProxyVersion': 'v0.16.2-659-g63182318c5876b',
                'kubeletVersion': 'v0.16.2-659-g63182318c5876b',
                'machineID': '45bb3b96146aa94f299b9eb43646eb35',
                'osImage': 'Red Hat Enterprise Linux Atomic Host 7.1',
                'systemUUID': 'C27B1F97-235F-D44E-A335-3D0EB4089311'
              }
            }
          },
          'b215c18b-08fc-11e5-a9e7-525400398fe5': {
            'apiVersion': 'v1beta3',
            'kind': 'Pod',
            'metadata': {
              'annotations': {
                'kubernetes.io/created-by': '{\'kind\':\'SerializedReference\',\'apiVersion\':\'v1beta3\','
                + '\'reference\':{\'kind\':\'ReplicationController\',\'namespace\':\'sample\',\'name\':\'frontend\','
                + '\'uid\':\'7a1a82bd-08fc-11e5-a9e7-525400398fe5\',\'apiVersion\':\'v1beta3\','
                + '\'resourceVersion\':\'1635\'}}'
              },
              'creationTimestamp': '2015-06-02T07:55:11Z',
              'generateName': 'frontend-',
              'labels': {
                'name': 'frontend',
                'template': 'ruby-helloworld-sample'
              },
              'name': 'frontend-tcfwz',
              'namespace': 'sample',
              'resourceVersion': '1690',
              'selfLink': '/api/v1beta3/namespaces/sample/pods/frontend-tcfwz',
              'uid': 'b215c18b-08fc-11e5-a9e7-525400398fe5'
            },
            'spec': {
              'containers': [
              {
                'capabilities': {},
                'env': [
                {
                  'name': 'ADMIN_USERNAME',
                  'value': 'admin6TM'
                },
                {
                  'name': 'ADMIN_PASSWORD',
                  'value': 'xImx1tHR'
                },
                {
                  'name': 'MYSQL_ROOT_PASSWORD',
                  'value': 'rQHfVnTo'
                },
                {
                  'name': 'MYSQL_DATABASE',
                  'value': 'root'
                }
                ],
                'image': 'openshift/ruby-hello-world',
                'imagePullPolicy': 'IfNotPresent',
                'name': 'ruby-helloworld',
                'ports': [
                {
                  'containerPort': 8080,
                  'protocol': 'TCP'
                }
                ],
                'resources': {},
                'securityContext': {
                  'capabilities': {}
                },
                'terminationMessagePath': '/dev/termination-log'
              }
              ],
              'dnsPolicy': 'ClusterFirst',
              'host': 'node-2.rha',
              'restartPolicy': 'Always',
              'volumes': null
            },
            'status': {
              'Condition': [
              {
                'status': 'True',
                'type': 'Ready'
              }
              ],
              'containerStatuses': [
              {
                'containerID': 'docker://b8231bc91c6fa04296965a317bbe470374b537148a926f26aebd7fe53316c208',
                'image': 'openshift/ruby-hello-world',
                'imageID': 'docker://c9917ac09d5bcd173594453e2fa9dcf71b1fc6a48eeedc46844dcbd6ee8957f2',
                'lastState': {},
                'name': 'ruby-helloworld',
                'ready': true,
                'restartCount': 0,
                'state': {
                  'running': {
                    'startedAt': '2015-06-02T07:55:31Z'
                  }
                }
              }
              ],
              'phase': 'Running',
              'podIP': '18.0.13.2'
            }
          },
          'b2160699-08fc-11e5-a9e7-525400398fe5': {
            'apiVersion': 'v1beta3',
            'kind': 'Pod',
            'metadata': {
              'annotations': {
                'kubernetes.io/created-by': '{\'kind\':\'SerializedReference\',\'apiVersion\':\'v1beta3\','
                + '\'reference\':{\'kind\':\'ReplicationController\',\'namespace\':\'sample\',\'name\':\'frontend\','
                + '\'uid\':\'7a1a82bd-08fc-11e5-a9e7-525400398fe5\',\'apiVersion\':\'v1beta3\','
                + '\'resourceVersion\':\'1635\'}}'
              },
              'creationTimestamp': '2015-06-02T07:55:11Z',
              'generateName': 'frontend-',
              'labels': {
                'name': 'frontend',
                'template': 'ruby-helloworld-sample'
              },
              'name': 'frontend-si2t7',
              'namespace': 'sample',
              'resourceVersion': '1686',
              'selfLink': '/api/v1beta3/namespaces/sample/pods/frontend-si2t7',
              'uid': 'b2160699-08fc-11e5-a9e7-525400398fe5'
            },
            'spec': {
              'containers': [
              {
                'capabilities': {},
                'env': [
                {
                  'name': 'ADMIN_USERNAME',
                  'value': 'admin6TM'
                },
                {
                  'name': 'ADMIN_PASSWORD',
                  'value': 'xImx1tHR'
                },
                {
                  'name': 'MYSQL_ROOT_PASSWORD',
                  'value': 'rQHfVnTo'
                },
                {
                  'name': 'MYSQL_DATABASE',
                  'value': 'root'
                }
                ],
                'image': 'openshift/ruby-hello-world',
                'imagePullPolicy': 'IfNotPresent',
                'name': 'ruby-helloworld',
                'ports': [
                {
                  'containerPort': 8080,
                  'protocol': 'TCP'
                }
                ],
                'resources': {},
                'securityContext': {
                  'capabilities': {}
                },
                'terminationMessagePath': '/dev/termination-log'
              }
              ],
              'dnsPolicy': 'ClusterFirst',
              'host': 'node-3.rha',
              'restartPolicy': 'Always',
              'volumes': null
            },
            'status': {
              'Condition': [
              {
                'status': 'True',
                'type': 'Ready'
              }
              ],
              'containerStatuses': [
              {
                'containerID': 'docker://7e56230164bedf6022581bfb33221c3412ce5144f92618f6a140887d25a77e26',
                'image': 'openshift/ruby-hello-world',
                'imageID': 'docker://c9917ac09d5bcd173594453e2fa9dcf71b1fc6a48eeedc46844dcbd6ee8957f2',
                'lastState': {},
                'name': 'ruby-helloworld',
                'ready': true,
                'restartCount': 0,
                'state': {
                  'running': {
                    'startedAt': '2015-06-02T07:55:30Z'
                  }
                }
              }
              ],
              'phase': 'Running',
              'podIP': '18.0.29.2'
            }
          },
          'b2163172-08fc-11e5-a9e7-525400398fe5': {
            'apiVersion': 'v1beta3',
            'kind': 'Pod',
            'metadata': {
              'annotations': {
                'kubernetes.io/created-by': '{\'kind\':\'SerializedReference\',\'apiVersion\':\'v1beta3\','
                + '\'reference\':{\'kind\':\'ReplicationController\',\'namespace\':\'sample\',\'name\':\'frontend\','
                + '\'uid\':\'7a1a82bd-08fc-11e5-a9e7-525400398fe5\',\'apiVersion\':\'v1beta3\','
                + '\'resourceVersion\':\'1635\'}}'
              },
              'creationTimestamp': '2015-06-02T07:55:11Z',
              'generateName': 'frontend-',
              'labels': {
                'name': 'frontend',
                'template': 'ruby-helloworld-sample'
              },
              'name': 'frontend-ldxlo',
              'namespace': 'sample',
              'resourceVersion': '1687',
              'selfLink': '/api/v1beta3/namespaces/sample/pods/frontend-ldxlo',
              'uid': 'b2163172-08fc-11e5-a9e7-525400398fe5'
            },
            'spec': {
              'containers': [
              {
                'capabilities': {},
                'env': [
                {
                  'name': 'ADMIN_USERNAME',
                  'value': 'admin6TM'
                },
                {
                  'name': 'ADMIN_PASSWORD',
                  'value': 'xImx1tHR'
                },
                {
                  'name': 'MYSQL_ROOT_PASSWORD',
                  'value': 'rQHfVnTo'
                },
                {
                  'name': 'MYSQL_DATABASE',
                  'value': 'root'
                }
                ],
                'image': 'openshift/ruby-hello-world',
                'imagePullPolicy': 'IfNotPresent',
                'name': 'ruby-helloworld',
                'ports': [
                {
                  'containerPort': 8080,
                  'protocol': 'TCP'
                }
                ],
                'resources': {},
                'securityContext': {
                  'capabilities': {}
                },
                'terminationMessagePath': '/dev/termination-log'
              }
              ],
              'dnsPolicy': 'ClusterFirst',
              'host': 'node-2.rha',
              'restartPolicy': 'Always',
              'volumes': null
            },
            'status': {
              'Condition': [
              {
                'status': 'True',
                'type': 'Ready'
              }
              ],
              'containerStatuses': [
              {
                'containerID': 'docker://973747defe4f4eea027410a9bd27d52b11be36b5d95fb34abbc8619fce2c9a24',
                'image': 'openshift/ruby-hello-world',
                'imageID': 'docker://c9917ac09d5bcd173594453e2fa9dcf71b1fc6a48eeedc46844dcbd6ee8957f2',
                'lastState': {},
                'name': 'ruby-helloworld',
                'ready': true,
                'restartCount': 0,
                'state': {
                  'running': {
                    'startedAt': '2015-06-02T07:55:31Z'
                  }
                }
              }
              ],
              'phase': 'Running',
              'podIP': '18.0.13.3'
            }
          },
          'b21644cd-08fc-11e5-a9e7-525400398fe5': {
            'apiVersion': 'v1beta3',
            'kind': 'Pod',
            'metadata': {
              'annotations': {
                'kubernetes.io/created-by': '{\'kind\':\'SerializedReference\',\'apiVersion\':\'v1beta3\','
                + '\'reference\':{\'kind\':\'ReplicationController\',\'namespace\':\'sample\',\'name\':\'frontend\','
                + '\'uid\':\'7a1a82bd-08fc-11e5-a9e7-525400398fe5\',\'apiVersion\':\'v1beta3\','
                + '\'resourceVersion\':\'1635\'}}'
              },
              'creationTimestamp': '2015-06-02T07:55:11Z',
              'generateName': 'frontend-',
              'labels': {
                'name': 'frontend',
                'template': 'ruby-helloworld-sample'
              },
              'name': 'frontend-mtdl4',
              'namespace': 'sample',
              'resourceVersion': '1689',
              'selfLink': '/api/v1beta3/namespaces/sample/pods/frontend-mtdl4',
              'uid': 'b21644cd-08fc-11e5-a9e7-525400398fe5'
            },
            'spec': {
              'containers': [
              {
                'capabilities': {},
                'env': [
                {
                  'name': 'ADMIN_USERNAME',
                  'value': 'admin6TM'
                },
                {
                  'name': 'ADMIN_PASSWORD',
                  'value': 'xImx1tHR'
                },
                {
                  'name': 'MYSQL_ROOT_PASSWORD',
                  'value': 'rQHfVnTo'
                },
                {
                  'name': 'MYSQL_DATABASE',
                  'value': 'root'
                }
                ],
                'image': 'openshift/ruby-hello-world',
                'imagePullPolicy': 'IfNotPresent',
                'name': 'ruby-helloworld',
                'ports': [
                {
                  'containerPort': 8080,
                  'protocol': 'TCP'
                }
                ],
                'resources': {},
                'securityContext': {
                  'capabilities': {}
                },
                'terminationMessagePath': '/dev/termination-log'
              }
              ],
              'dnsPolicy': 'ClusterFirst',
              'host': 'node-3.rha',
              'restartPolicy': 'Always',
              'volumes': null
            },
            'status': {
              'Condition': [
              {
                'status': 'True',
                'type': 'Ready'
              }
              ],
              'containerStatuses': [
              {
                'containerID': 'docker://8c4e6deb53cf817255b1c21442ea1eb4ca934190910b6873c5b28168faa8b7a7',
                'image': 'openshift/ruby-hello-world',
                'imageID': 'docker://c9917ac09d5bcd173594453e2fa9dcf71b1fc6a48eeedc46844dcbd6ee8957f2',
                'lastState': {},
                'name': 'ruby-helloworld',
                'ready': true,
                'restartCount': 0,
                'state': {
                  'running': {
                    'startedAt': '2015-06-02T07:55:30Z'
                  }
                }
              }
              ],
              'phase': 'Running',
              'podIP': '18.0.29.3'
            }
          }
        },
        'relations': [
        {
          'source': '79ec9243-08fc-11e5-a9e7-525400398fe5',
          'target': '7a132ea2-08fc-11e5-a9e7-525400398fe5'
        },
        {
          'source': '7a01f790-08fc-11e5-a9e7-525400398fe5',
          'target': 'a2d40845-08fc-11e5-a9e7-525400398fe5'
        },
        {
          'source': '7a01f790-08fc-11e5-a9e7-525400398fe5',
          'target': 'b215c18b-08fc-11e5-a9e7-525400398fe5'
        },
        {
          'source': '7a01f790-08fc-11e5-a9e7-525400398fe5',
          'target': 'b2160699-08fc-11e5-a9e7-525400398fe5'
        },
        {
          'source': '7a01f790-08fc-11e5-a9e7-525400398fe5',
          'target': 'b2163172-08fc-11e5-a9e7-525400398fe5'
        },
        {
          'source': '7a01f790-08fc-11e5-a9e7-525400398fe5',
          'target': 'b21644cd-08fc-11e5-a9e7-525400398fe5'
        },
        {
          'source': '891054a1-0890-11e5-a3b5-525400398fe5',
          'target': '89443a7e-0890-11e5-a3b5-525400398fe5'
        },
        {
          'source': '89222e96-0890-11e5-a3b5-525400398fe5',
          'target': '8960db98-0890-11e5-a3b5-525400398fe5'
        },
        {
          'source': '89222e96-0890-11e5-a3b5-525400398fe5',
          'target': '89610137-0890-11e5-a3b5-525400398fe5'
        },
        {
          'source': '892e8cee-0890-11e5-a3b5-525400398fe5',
          'target': '897f26dd-0890-11e5-a3b5-525400398fe5'
        },
        {
          'source': '892e8cee-0890-11e5-a3b5-525400398fe5',
          'target': '897f4916-0890-11e5-a3b5-525400398fe5'
        },
        {
          'source': '892e8cee-0890-11e5-a3b5-525400398fe5',
          'target': '897f63c3-0890-11e5-a3b5-525400398fe5'
        },
        {
          'source': '39113587-088f-11e5-b0b0-525400398fe5',
          'target': '7a132ea2-08fc-11e5-a9e7-525400398fe5'
        },
        {
          'source': '39113587-088f-11e5-b0b0-525400398fe5',
          'target': '89443a7e-0890-11e5-a3b5-525400398fe5'
        },
        {
          'source': '39113587-088f-11e5-b0b0-525400398fe5',
          'target': '8960db98-0890-11e5-a3b5-525400398fe5'
        },
        {
          'source': '39113587-088f-11e5-b0b0-525400398fe5',
          'target': '89610137-0890-11e5-a3b5-525400398fe5'
        },
        {
          'source': '39113587-088f-11e5-b0b0-525400398fe5',
          'target': '897f26dd-0890-11e5-a3b5-525400398fe5'
        },
        {
          'source': '39113587-088f-11e5-b0b0-525400398fe5',
          'target': '897f4916-0890-11e5-a3b5-525400398fe5'
        },
        {
          'source': '39113587-088f-11e5-b0b0-525400398fe5',
          'target': '897f63c3-0890-11e5-a3b5-525400398fe5'
        },
        {
          'source': '39113587-088f-11e5-b0b0-525400398fe5',
          'target': 'a2d40845-08fc-11e5-a9e7-525400398fe5'
        },
        {
          'source': 'a82eb2b2-08fc-11e5-a9e7-525400398fe5',
          'target': 'b215c18b-08fc-11e5-a9e7-525400398fe5'
        },
        {
          'source': 'a82eb2b2-08fc-11e5-a9e7-525400398fe5',
          'target': 'b2163172-08fc-11e5-a9e7-525400398fe5'
        },
        {
          'source': 'a9bc7525-08fc-11e5-a9e7-525400398fe5',
          'target': 'b2160699-08fc-11e5-a9e7-525400398fe5'
        },
        {
          'source': 'a9bc7525-08fc-11e5-a9e7-525400398fe5',
          'target': 'b21644cd-08fc-11e5-a9e7-525400398fe5'
        },
        {
          'source': '8959751f-0890-11e5-a3b5-525400398fe5',
          'target': '8960db98-0890-11e5-a3b5-525400398fe5'
        },
        {
          'source': '8959751f-0890-11e5-a3b5-525400398fe5',
          'target': '89610137-0890-11e5-a3b5-525400398fe5'
        },
        {
          'source': '89672aaf-0890-11e5-a3b5-525400398fe5',
          'target': '897f26dd-0890-11e5-a3b5-525400398fe5'
        },
        {
          'source': '89672aaf-0890-11e5-a3b5-525400398fe5',
          'target': '897f4916-0890-11e5-a3b5-525400398fe5'
        },
        {
          'source': '89672aaf-0890-11e5-a3b5-525400398fe5',
          'target': '897f63c3-0890-11e5-a3b5-525400398fe5'
        },
        {
          'source': '7a0ea065-08fc-11e5-a9e7-525400398fe5',
          'target': '7a132ea2-08fc-11e5-a9e7-525400398fe5'
        },
        {
          'source': '7a1a82bd-08fc-11e5-a9e7-525400398fe5',
          'target': 'a2d40845-08fc-11e5-a9e7-525400398fe5'
        },
        {
          'source': '7a1a82bd-08fc-11e5-a9e7-525400398fe5',
          'target': 'b215c18b-08fc-11e5-a9e7-525400398fe5'
        },
        {
          'source': '7a1a82bd-08fc-11e5-a9e7-525400398fe5',
          'target': 'b2160699-08fc-11e5-a9e7-525400398fe5'
        },
        {
          'source': '7a1a82bd-08fc-11e5-a9e7-525400398fe5',
          'target': 'b2163172-08fc-11e5-a9e7-525400398fe5'
        },
        {
          'source': '7a1a82bd-08fc-11e5-a9e7-525400398fe5',
          'target': 'b21644cd-08fc-11e5-a9e7-525400398fe5'
        }
        ]
      });



sink({
  'items': {
    '39113587-088f-11e5-b0b0-525400398fe5': {
      'apiVersion': 'v1beta3',
      'kind': 'Node',
      'metadata': {
        'creationTimestamp': '2015-06-01T18:51:33Z',
        'name': 'node-1.rha',
        'resourceVersion': '10465',
        'selfLink': '/api/v1beta3/nodes/node-1.rha',
        'uid': '39113587-088f-11e5-b0b0-525400398fe5'
      },
      'spec': {
        'externalID': 'node-1.rha'
      },
      'status': {
        'capacity': {
          'cpu': '1',
          'memory': '4047776Ki'
        },
        'conditions': [
        {
          'lastHeartbeatTime': '2015-06-02T16:02:34Z',
          'lastTransitionTime': '2015-06-01T18:52:24Z',
          'reason': 'kubelet is posting ready status',
          'status': 'True',
          'type': 'Ready'
        }
        ],
        'nodeInfo': {
          'bootID': 'd51f8e13-399c-4245-9e88-3091c4d1f6f2',
          'containerRuntimeVersion': 'docker://1.6.0',
          'kernelVersion': '4.0.4-301.fc22.x86_64',
          'kubeProxyVersion': 'v0.16.2-659-g63182318c5876b',
          'kubeletVersion': 'v0.16.2-659-g63182318c5876b',
          'machineID': '0fed1fe218d1a8449292cce385ada4e6',
          'osImage': 'Red Hat Enterprise Linux Atomic Host 7.1',
          'systemUUID': '0FED1FE2-18D1-A844-9292-CCE385ADA4E6'
        }
      }
    },
    '3953a982-088f-11e5-b0b0-525400398fe5': {
      'apiVersion': 'v1beta3',
      'id': '3953a982-088f-11e5-b0b0-525400398fe5',
      'index': 10,
      'kind': 'Service',
      'metadata': {
        'creationTimestamp': '2015-06-01T18:51:33Z',
        'labels': {
          'component': 'apiserver',
          'provider': 'kubernetes'
        },
        'name': 'kubernetes',
        'namespace': 'default',
        'resourceVersion': '5',
        'selfLink': '/api/v1beta3/namespaces/default/services/kubernetes',
        'uid': '3953a982-088f-11e5-b0b0-525400398fe5'
      },
      'px': 525.4949878190479,
      'py': 261.9052678438836,
      'spec': {
        'portalIP': '10.254.0.2',
        'ports': [
        {
          'name': '',
          'port': 443,
          'protocol': 'TCP',
          'targetPort': 443
        }
        ],
        'selector': null,
        'sessionAffinity': 'None'
      },
      'status': {},
      'weight': 0,
      'x': 523.394215056511,
      'y': 258.51865695490426
    },
    '3953c23b-088f-11e5-b0b0-525400398fe5': {
      'apiVersion': 'v1beta3',
      'id': '3953c23b-088f-11e5-b0b0-525400398fe5',
      'index': 9,
      'kind': 'Service',
      'metadata': {
        'creationTimestamp': '2015-06-01T18:51:33Z',
        'labels': {
          'component': 'apiserver',
          'provider': 'kubernetes'
        },
        'name': 'kubernetes-ro',
        'namespace': 'default',
        'resourceVersion': '6',
        'selfLink': '/api/v1beta3/namespaces/default/services/kubernetes-ro',
        'uid': '3953c23b-088f-11e5-b0b0-525400398fe5'
      },
      'px': 463.4721433746296,
      'py': 299.3408189944274,
      'spec': {
        'portalIP': '10.254.0.1',
        'ports': [
        {
          'name': '',
          'port': 80,
          'protocol': 'TCP',
          'targetPort': 80
        }
        ],
        'selector': null,
        'sessionAffinity': 'None'
      },
      'status': {},
      'weight': 0,
      'x': 457.33703512035993,
      'y': 298.8470800923316
    },
    '891054a1-0890-11e5-a3b5-525400398fe5': {
      'apiVersion': 'v1beta3',
      'id': '891054a1-0890-11e5-a3b5-525400398fe5',
      'index': 13,
      'kind': 'Service',
      'metadata': {
        'creationTimestamp': '2015-06-01T19:00:57Z',
        'labels': {
          'name': 'redis-master'
        },
        'name': 'redis-master',
        'namespace': 'guestbook4',
        'resourceVersion': '81',
        'selfLink': '/api/v1beta3/namespaces/guestbook4/services/redis-master',
        'uid': '891054a1-0890-11e5-a3b5-525400398fe5'
      },
      'px': -400.54802999104936,
      'py': 1435.2252494952356,
      'spec': {
        'portalIP': '10.254.166.23',
        'ports': [
        {
          'name': '',
          'port': 6379,
          'protocol': 'TCP',
          'targetPort': 6379
        }
        ],
        'selector': {
          'name': 'redis-master'
        },
        'sessionAffinity': 'None'
      },
      'status': {},
      'weight': 1,
      'x': -470.1904506611357,
      'y': 1491.5415506877396
    },
    '89222e96-0890-11e5-a3b5-525400398fe5': {
      'apiVersion': 'v1beta3',
      'id': '89222e96-0890-11e5-a3b5-525400398fe5',
      'index': 14,
      'kind': 'Service',
      'metadata': {
        'creationTimestamp': '2015-06-01T19:00:57Z',
        'labels': {
          'name': 'redis-slave'
        },
        'name': 'redis-slave',
        'namespace': 'guestbook4',
        'resourceVersion': '83',
        'selfLink': '/api/v1beta3/namespaces/guestbook4/services/redis-slave',
        'uid': '89222e96-0890-11e5-a3b5-525400398fe5'
      },
      'px': 354.5234029520906,
      'py': 91.42330478629532,
      'spec': {
        'portalIP': '10.254.94.104',
        'ports': [
        {
          'name': '',
          'port': 6379,
          'protocol': 'TCP',
          'targetPort': 6379
        }
        ],
        'selector': {
          'name': 'redis-slave'
        },
        'sessionAffinity': 'None'
      },
      'status': {},
      'weight': 2,
      'x': 320.56221866582,
      'y': 102.00799729694968
    },
    '892e8cee-0890-11e5-a3b5-525400398fe5': {
      'apiVersion': 'v1beta3',
      'id': '892e8cee-0890-11e5-a3b5-525400398fe5',
      'index': 15,
      'kind': 'Service',
      'metadata': {
        'creationTimestamp': '2015-06-01T19:00:57Z',
        'labels': {
          'name': 'frontend'
        },
        'name': 'frontend',
        'namespace': 'guestbook4',
        'resourceVersion': '85',
        'selfLink': '/api/v1beta3/namespaces/guestbook4/services/frontend',
        'uid': '892e8cee-0890-11e5-a3b5-525400398fe5'
      },
      'px': 1594.7252608712558,
      'py': -541.7816406725098,
      'spec': {
        'portalIP': '10.254.144.177',
        'ports': [
        {
          'name': '',
          'port': 80,
          'protocol': 'TCP',
          'targetPort': 80
        }
        ],
        'selector': {
          'name': 'frontend'
        },
        'sessionAffinity': 'None'
      },
      'status': {},
      'weight': 3,
      'x': 1594.905337628749,
      'y': -538.4689827387112
    },
    '89443a7e-0890-11e5-a3b5-525400398fe5': {
      'apiVersion': 'v1beta3',
      'id': '89443a7e-0890-11e5-a3b5-525400398fe5',
      'index': 0,
      'kind': 'Pod',
      'metadata': {
        'creationTimestamp': '2015-06-01T19:00:57Z',
        'labels': {
          'name': 'redis-master'
        },
        'name': 'redis-master',
        'namespace': 'guestbook4',
        'resourceVersion': '686',
        'selfLink': '/api/v1beta3/namespaces/guestbook4/pods/redis-master',
        'uid': '89443a7e-0890-11e5-a3b5-525400398fe5'
      },
      'px': -322.20293463806587,
      'py': -207.4572525751052,
      'spec': {
        'containers': [
        {
          'capabilities': {},
          'image': 'stefwalter/redis:latest',
          'imagePullPolicy': 'Always',
          'name': 'master',
          'ports': [
          {
            'containerPort': 6379,
            'protocol': 'TCP'
          }
          ],
          'resources': {},
          'securityContext': {
            'capabilities': {}
          },
          'terminationMessagePath': '/dev/termination-log'
        }
        ],
        'dnsPolicy': 'ClusterFirst',
        'host': 'node-1.rha',
        'restartPolicy': 'Always',
        'volumes': null
      },
      'status': {
        'Condition': [
        {
          'status': 'True',
          'type': 'Ready'
        }
        ],
        'containerStatuses': [
        {
          'containerID': 'docker://da14d7343dcfe3ebb613dbffe253644f31d5ad344fc59884556760ec70b64d09',
          'image': 'stefwalter/redis:latest',
          'imageID': 'docker://deb0a69eaa07fa6dd2f7fdd5cda053fa8bb1d2002040cb9172a16cf66005162b',
          'lastState': {
            'termination': {
              'containerID': 'docker://bd9e1653f5b7dfe66e0fb69682df25897d34869d4ed44b35c3b7693ad0d94c5f',
              'exitCode': 0,
              'finishedAt': '2015-06-02T05:39:43Z',
              'startedAt': '2015-06-01T19:01:17Z'
            }
          },
          'name': 'master',
          'ready': true,
          'restartCount': 1,
          'state': {
            'running': {
              'startedAt': '2015-06-02T05:40:50Z'
            }
          }
        }
        ],
        'phase': 'Running',
        'podIP': '18.0.61.7'
      },
      'weight': 2,
      'x': -330.26477097206845,
      'y': -169.24672952413917
    },
    '8959751f-0890-11e5-a3b5-525400398fe5': {
      'apiVersion': 'v1beta3',
      'id': '8959751f-0890-11e5-a3b5-525400398fe5',
      'index': 11,
      'kind': 'ReplicationController',
      'metadata': {
        'creationTimestamp': '2015-06-01T19:00:57Z',
        'labels': {
          'name': 'redis-slave'
        },
        'name': 'redis-slave',
        'namespace': 'guestbook4',
        'resourceVersion': '111',
        'selfLink': '/api/v1beta3/namespaces/guestbook4/replicationcontrollers/redis-slave',
        'uid': '8959751f-0890-11e5-a3b5-525400398fe5'
      },
      'px': 423.87570524344557,
      'py': 71.86078221268558,
      'spec': {
        'replicas': 2,
        'selector': {
          'name': 'redis-slave'
        },
        'template': {
          'metadata': {
            'creationTimestamp': null,
            'labels': {
              'name': 'redis-slave'
            }
          },
          'spec': {
            'containers': [
            {
              'capabilities': {},
              'image': 'stefwalter/redis-slave:v2',
              'imagePullPolicy': 'IfNotPresent',
              'name': 'slave',
              'ports': [
              {
                'containerPort': 6379,
                'protocol': 'TCP'
              }
              ],
              'resources': {},
              'securityContext': {
                'capabilities': {}
              },
              'terminationMessagePath': '/dev/termination-log'
            }
            ],
            'dnsPolicy': 'ClusterFirst',
            'restartPolicy': 'Always',
            'volumes': null
          }
        }
      },
      'status': {
        'replicas': 2
      },
      'weight': 2,
      'x': 406.9411278600464,
      'y': 78.64957678310188
    },
    '8960db98-0890-11e5-a3b5-525400398fe5': {
      'apiVersion': 'v1beta3',
      'id': '8960db98-0890-11e5-a3b5-525400398fe5',
      'index': 1,
      'kind': 'Pod',
      'metadata': {
        'annotations': {
          'kubernetes.io/created-by': '{\'kind\':\'SerializedReference\',\'apiVersion\':\'v1beta3\','
          + '\'reference\':{\'kind\':\'ReplicationController\',\'namespace\':\'guestbook4\',\'name\':\'redis-slave\','
          + '\'uid\':\'8959751f-0890-11e5-a3b5-525400398fe5\',\'apiVersion\':\'v1beta3\',\'resourceVersion\':\'90\'}}'
        },
        'creationTimestamp': '2015-06-01T19:00:57Z',
        'generateName': 'redis-slave-',
        'labels': {
          'name': 'redis-slave'
        },
        'name': 'redis-slave-xmboh',
        'namespace': 'guestbook4',
        'resourceVersion': '675',
        'selfLink': '/api/v1beta3/namespaces/guestbook4/pods/redis-slave-xmboh',
        'uid': '8960db98-0890-11e5-a3b5-525400398fe5'
      },
      'px': 253.97503022839777,
      'py': 122.7309799090041,
      'spec': {
        'containers': [
        {
          'capabilities': {},
          'image': 'stefwalter/redis-slave:v2',
          'imagePullPolicy': 'IfNotPresent',
          'name': 'slave',
          'ports': [
          {
            'containerPort': 6379,
            'protocol': 'TCP'
          }
          ],
          'resources': {},
          'securityContext': {
            'capabilities': {}
          },
          'terminationMessagePath': '/dev/termination-log'
        }
        ],
        'dnsPolicy': 'ClusterFirst',
        'host': 'node-1.rha',
        'restartPolicy': 'Always',
        'volumes': null
      },
      'status': {
        'Condition': [
        {
          'status': 'True',
          'type': 'Ready'
        }
        ],
        'containerStatuses': [
        {
          'containerID': 'docker://18e52168219dd3edd71cfd37c94750a627fd63b3542d79bc7dc1f8bbf002d245',
          'image': 'stefwalter/redis-slave:v2',
          'imageID': 'docker://e6dc7726402fed07c856f82df186ecabeeea99b9d6846b5e72e1d6de59f50fad',
          'lastState': {
            'termination': {
              'containerID': 'docker://6e4fcfa83e6cb1539126ab9db203f624d71a8e2602c04fcaec04bc521e11dd87',
              'exitCode': 0,
              'finishedAt': '2015-06-02T05:39:43Z',
              'startedAt': '2015-06-01T19:01:11Z'
            }
          },
          'name': 'slave',
          'ready': true,
          'restartCount': 1,
          'state': {
            'running': {
              'startedAt': '2015-06-02T05:40:40Z'
            }
          }
        }
        ],
        'phase': 'Running',
        'podIP': '18.0.61.2'
      },
      'weight': 3,
      'x': 201.96996121657807,
      'y': 134.57442174449884
    },
    '89610137-0890-11e5-a3b5-525400398fe5': {
      'apiVersion': 'v1beta3',
      'id': '89610137-0890-11e5-a3b5-525400398fe5',
      'index': 4,
      'kind': 'Pod',
      'metadata': {
        'annotations': {
          'kubernetes.io/created-by': '{\'kind\':\'SerializedReference\',\'apiVersion\':\'v1beta3\','
          + '\'reference\':{\'kind\':\'ReplicationController\',\'namespace\':\'guestbook4\',\'name\':\'redis-slave\','
          + '\'uid\':\'8959751f-0890-11e5-a3b5-525400398fe5\',\'apiVersion\':\'v1beta3\',\'resourceVersion\':\'90\'}}'
        },
        'creationTimestamp': '2015-06-01T19:00:57Z',
        'generateName': 'redis-slave-',
        'labels': {
          'name': 'redis-slave'
        },
        'name': 'redis-slave-y1a8g',
        'namespace': 'guestbook4',
        'resourceVersion': '678',
        'selfLink': '/api/v1beta3/namespaces/guestbook4/pods/redis-slave-y1a8g',
        'uid': '89610137-0890-11e5-a3b5-525400398fe5'
      },
      'px': 392.77933934511833,
      'py': 82.20660921640913,
      'spec': {
        'containers': [
        {
          'capabilities': {},
          'image': 'stefwalter/redis-slave:v2',
          'imagePullPolicy': 'IfNotPresent',
          'name': 'slave',
          'ports': [
          {
            'containerPort': 6379,
            'protocol': 'TCP'
          }
          ],
          'resources': {},
          'securityContext': {
            'capabilities': {}
          },
          'terminationMessagePath': '/dev/termination-log'
        }
        ],
        'dnsPolicy': 'ClusterFirst',
        'host': 'node-1.rha',
        'restartPolicy': 'Always',
        'volumes': null
      },
      'status': {
        'Condition': [
        {
          'status': 'True',
          'type': 'Ready'
        }
        ],
        'containerStatuses': [
        {
          'containerID': 'docker://cbbe7ae54aac317a2bbd5d02215715650b54ae380667ba09594a3ba1b05bee89',
          'image': 'stefwalter/redis-slave:v2',
          'imageID': 'docker://e6dc7726402fed07c856f82df186ecabeeea99b9d6846b5e72e1d6de59f50fad',
          'lastState': {
            'termination': {
              'containerID': 'docker://a729ab2330c44ffe0e0596f54e28eac927661478cfaf35b23802ce855b61fa3a',
              'exitCode': 0,
              'finishedAt': '2015-06-02T05:39:43Z',
              'startedAt': '2015-06-01T19:01:12Z'
            }
          },
          'name': 'slave',
          'ready': true,
          'restartCount': 1,
          'state': {
            'running': {
              'startedAt': '2015-06-02T05:40:40Z'
            }
          }
        }
        ],
        'phase': 'Running',
        'podIP': '18.0.61.6'
      },
      'weight': 3,
      'x': 447.2274793497317,
      'y': 63.11738471755024
    },
    '89672aaf-0890-11e5-a3b5-525400398fe5': {
      'apiVersion': 'v1beta3',
      'id': '89672aaf-0890-11e5-a3b5-525400398fe5',
      'index': 12,
      'kind': 'ReplicationController',
      'metadata': {
        'creationTimestamp': '2015-06-01T19:00:57Z',
        'labels': {
          'name': 'frontend'
        },
        'name': 'frontend',
        'namespace': 'guestbook4',
        'resourceVersion': '116',
        'selfLink': '/api/v1beta3/namespaces/guestbook4/replicationcontrollers/frontend',
        'uid': '89672aaf-0890-11e5-a3b5-525400398fe5'
      },
      'px': 260.90629540462,
      'py': 128.67915158011232,
      'spec': {
        'replicas': 3,
        'selector': {
          'name': 'frontend'
        },
        'template': {
          'metadata': {
            'creationTimestamp': null,
            'labels': {
              'name': 'frontend'
            }
          },
          'spec': {
            'containers': [
            {
              'capabilities': {},
              'image': 'stefwalter/example-guestbook-php-redis:v2',
              'imagePullPolicy': 'IfNotPresent',
              'name': 'php-redis',
              'ports': [
              {
                'containerPort': 80,
                'protocol': 'TCP'
              }
              ],
              'resources': {},
              'securityContext': {
                'capabilities': {}
              },
              'terminationMessagePath': '/dev/termination-log'
            }
            ],
            'dnsPolicy': 'ClusterFirst',
            'restartPolicy': 'Always',
            'volumes': null
          }
        }
      },
      'status': {
        'replicas': 3
      },
      'weight': 3,
      'x': 327.5613862969874,
      'y': 111.10673012344549
    },
    '897f26dd-0890-11e5-a3b5-525400398fe5': {
      'apiVersion': 'v1beta3',
      'id': '897f26dd-0890-11e5-a3b5-525400398fe5',
      'index': 6,
      'kind': 'Pod',
      'metadata': {
        'annotations': {
          'kubernetes.io/created-by': '{\'kind\':\'SerializedReference\',\'apiVersion\':\'v1beta3\','
          + '\'reference\':{\'kind\':\'ReplicationController\',\'namespace\':\'guestbook4\',\'name\':\'frontend\','
          + '\'uid\':\'89672aaf-0890-11e5-a3b5-525400398fe5\',\'apiVersion\':\'v1beta3\',\'resourceVersion\':\'94\'}}'
        },
        'creationTimestamp': '2015-06-01T19:00:57Z',
        'generateName': 'frontend-',
        'labels': {
          'name': 'frontend'
        },
        'name': 'frontend-cfie3',
        'namespace': 'guestbook4',
        'resourceVersion': '673',
        'selfLink': '/api/v1beta3/namespaces/guestbook4/pods/frontend-cfie3',
        'uid': '897f26dd-0890-11e5-a3b5-525400398fe5'
      },
      'px': -8.327533665412252,
      'py': 162.30976668350297,
      'spec': {
        'containers': [
        {
          'capabilities': {},
          'image': 'stefwalter/example-guestbook-php-redis:v2',
          'imagePullPolicy': 'IfNotPresent',
          'name': 'php-redis',
          'ports': [
          {
            'containerPort': 80,
            'protocol': 'TCP'
          }
          ],
          'resources': {},
          'securityContext': {
            'capabilities': {}
          },
          'terminationMessagePath': '/dev/termination-log'
        }
        ],
        'dnsPolicy': 'ClusterFirst',
        'host': 'node-1.rha',
        'restartPolicy': 'Always',
        'volumes': null
      },
      'status': {
        'Condition': [
        {
          'status': 'True',
          'type': 'Ready'
        }
        ],
        'containerStatuses': [
        {
          'containerID': 'docker://5ab9deb0eb5b45395ebdf6717b44c768d6f10b29fc250c1d82a982e8438c95c6',
          'image': 'stefwalter/example-guestbook-php-redis:v2',
          'imageID': 'docker://c868c3491a62e04c25b462f06f8dc195732f6d521c91c41bb22a60999c9d99c5',
          'lastState': {
            'termination': {
              'containerID': 'docker://8d27607dbe58b6802bcbf0fd3b07aa19288e5b9fe3d0847759d1c4154c2d49ab',
              'exitCode': 0,
              'finishedAt': '2015-06-02T05:39:43Z',
              'startedAt': '2015-06-01T19:01:17Z'
            }
          },
          'name': 'php-redis',
          'ready': true,
          'restartCount': 1,
          'state': {
            'running': {
              'startedAt': '2015-06-02T05:40:38Z'
            }
          }
        }
        ],
        'phase': 'Running',
        'podIP': '18.0.61.3'
      },
      'weight': 3,
      'x': 157.24946043411106,
      'y': 87.78303793802469
    },
    '897f4916-0890-11e5-a3b5-525400398fe5': {
      'apiVersion': 'v1beta3',
      'id': '897f4916-0890-11e5-a3b5-525400398fe5',
      'index': 7,
      'kind': 'Pod',
      'metadata': {
        'annotations': {
          'kubernetes.io/created-by': '{\'kind\':\'SerializedReference\',\'apiVersion\':\'v1beta3\','
          + '\'reference\':{\'kind\':\'ReplicationController\',\'namespace\':\'guestbook4\',\'name\':\'frontend\','
          + '\'uid\':\'89672aaf-0890-11e5-a3b5-525400398fe5\',\'apiVersion\':\'v1beta3\',\'resourceVersion\':\'94\'}}'
        },
        'creationTimestamp': '2015-06-01T19:00:57Z',
        'generateName': 'frontend-',
        'labels': {
          'name': 'frontend'
        },
        'name': 'frontend-cv934',
        'namespace': 'guestbook4',
        'resourceVersion': '671',
        'selfLink': '/api/v1beta3/namespaces/guestbook4/pods/frontend-cv934',
        'uid': '897f4916-0890-11e5-a3b5-525400398fe5'
      },
      'px': 403.9176234315363,
      'py': 8.905389161641848,
      'spec': {
        'containers': [
        {
          'capabilities': {},
          'image': 'stefwalter/example-guestbook-php-redis:v2',
          'imagePullPolicy': 'IfNotPresent',
          'name': 'php-redis',
          'ports': [
          {
            'containerPort': 80,
            'protocol': 'TCP'
          }
          ],
          'resources': {},
          'securityContext': {
            'capabilities': {}
          },
          'terminationMessagePath': '/dev/termination-log'
        }
        ],
        'dnsPolicy': 'ClusterFirst',
        'host': 'node-1.rha',
        'restartPolicy': 'Always',
        'volumes': null
      },
      'status': {
        'Condition': [
        {
          'status': 'True',
          'type': 'Ready'
        }
        ],
        'containerStatuses': [
        {
          'containerID': 'docker://5fda570e5ebdab354538ece879b3281ac373e81085d9b0181025de53824dacd0',
          'image': 'stefwalter/example-guestbook-php-redis:v2',
          'imageID': 'docker://c868c3491a62e04c25b462f06f8dc195732f6d521c91c41bb22a60999c9d99c5',
          'lastState': {
            'termination': {
              'containerID': 'docker://4e1fd493c8202cd6467117ba475f8301e16c3180a38de425e8c3f04cddc4e028',
              'exitCode': 0,
              'finishedAt': '2015-06-02T05:39:43Z',
              'startedAt': '2015-06-01T19:01:17Z'
            }
          },
          'name': 'php-redis',
          'ready': true,
          'restartCount': 1,
          'state': {
            'running': {
              'startedAt': '2015-06-02T05:40:37Z'
            }
          }
        }
        ],
        'phase': 'Running',
        'podIP': '18.0.61.4'
      },
      'weight': 3,
      'x': 548.4506097097817,
      'y': -65.87284174180098
    },
    '897f63c3-0890-11e5-a3b5-525400398fe5': {
      'apiVersion': 'v1beta3',
      'id': '897f63c3-0890-11e5-a3b5-525400398fe5',
      'index': 8,
      'kind': 'Pod',
      'metadata': {
        'annotations': {
          'kubernetes.io/created-by': '{\'kind\':\'SerializedReference\',\'apiVersion\':\'v1beta3\','
          + '\'reference\':{\'kind\':\'ReplicationController\',\'namespace\':\'guestbook4\',\'name\':\'frontend\','
          + '\'uid\':\'89672aaf-0890-11e5-a3b5-525400398fe5\',\'apiVersion\':\'v1beta3\',\'resourceVersion\':\'94\'}}'
        },
        'creationTimestamp': '2015-06-01T19:00:57Z',
        'generateName': 'frontend-',
        'labels': {
          'name': 'frontend'
        },
        'name': 'frontend-rz8eu',
        'namespace': 'guestbook4',
        'resourceVersion': '669',
        'selfLink': '/api/v1beta3/namespaces/guestbook4/pods/frontend-rz8eu',
        'uid': '897f63c3-0890-11e5-a3b5-525400398fe5'
      },
      'px': 895.5900578989485,
      'py': -143.00981121991757,
      'spec': {
        'containers': [
        {
          'capabilities': {},
          'image': 'stefwalter/example-guestbook-php-redis:v2',
          'imagePullPolicy': 'IfNotPresent',
          'name': 'php-redis',
          'ports': [
          {
            'containerPort': 80,
            'protocol': 'TCP'
          }
          ],
          'resources': {},
          'securityContext': {
            'capabilities': {}
          },
          'terminationMessagePath': '/dev/termination-log'
        }
        ],
        'dnsPolicy': 'ClusterFirst',
        'host': 'node-1.rha',
        'restartPolicy': 'Always',
        'volumes': null
      },
      'status': {
        'Condition': [
        {
          'status': 'True',
          'type': 'Ready'
        }
        ],
        'containerStatuses': [
        {
          'containerID': 'docker://fc28e55cf876722558dd643fd0c0d1b511e74dc9e3521c3053fbc67bf351fbfd',
          'image': 'stefwalter/example-guestbook-php-redis:v2',
          'imageID': 'docker://c868c3491a62e04c25b462f06f8dc195732f6d521c91c41bb22a60999c9d99c5',
          'lastState': {
            'termination': {
              'containerID': 'docker://0ec0d3ca6117976f50923178cd84171dc3b8fe89b14ffe22b17b0ab3f4d9bfb1',
              'exitCode': 0,
              'finishedAt': '2015-06-02T05:39:43Z',
              'startedAt': '2015-06-01T19:01:17Z'
            }
          },
          'name': 'php-redis',
          'ready': true,
          'restartCount': 1,
          'state': {
            'running': {
              'startedAt': '2015-06-02T05:40:40Z'
            }
          }
        }
        ],
        'phase': 'Running',
        'podIP': '18.0.61.5'
      },
      'weight': 3,
      'x': 1001.292356339048,
      'y': -195.29383278798383
    },
    'a82eb2b2-08fc-11e5-a9e7-525400398fe5': {
      'apiVersion': 'v1beta3',
      'id': 'a82eb2b2-08fc-11e5-a9e7-525400398fe5',
      'index': 3,
      'kind': 'Node',
      'metadata': {
        'creationTimestamp': '2015-06-02T07:54:55Z',
        'name': 'node-2.rha',
        'resourceVersion': '10463',
        'selfLink': '/api/v1beta3/nodes/node-2.rha',
        'uid': 'a82eb2b2-08fc-11e5-a9e7-525400398fe5'
      },
      'px': 421.83957932880463,
      'py': 122.24596083543373,
      'spec': {
        'externalID': 'node-2.rha'
      },
      'status': {
        'capacity': {
          'cpu': '1',
          'memory': '2049452Ki'
        },
        'conditions': [
        {
          'lastHeartbeatTime': '2015-06-02T16:02:31Z',
          'lastTransitionTime': '2015-06-02T07:54:59Z',
          'reason': 'kubelet is posting ready status',
          'status': 'True',
          'type': 'Ready'
        }
        ],
        'nodeInfo': {
          'bootID': 'f18301fb-e2d0-47db-840c-4fa812f3806c',
          'containerRuntimeVersion': 'docker://1.6.0',
          'kernelVersion': '4.0.4-301.fc22.x86_64',
          'kubeProxyVersion': 'v0.16.2-659-g63182318c5876b',
          'kubeletVersion': 'v0.16.2-659-g63182318c5876b',
          'machineID': '45bb3b96146aa94f299b9eb43646eb35',
          'osImage': 'Red Hat Enterprise Linux Atomic Host 7.1',
          'systemUUID': '64D6E7C8-F4DC-8F4B-A8B3-48A77A09BED5'
        }
      },
      'weight': 0,
      'x': 423.67729126205217,
      'y': 134.2229502494745
    },
    'a9bc7525-08fc-11e5-a9e7-525400398fe5': {
      'apiVersion': 'v1beta3',
      'id': 'a9bc7525-08fc-11e5-a9e7-525400398fe5',
      'index': 5,
      'kind': 'Node',
      'metadata': {
        'creationTimestamp': '2015-06-02T07:54:57Z',
        'name': 'node-3.rha',
        'resourceVersion': '10464',
        'selfLink': '/api/v1beta3/nodes/node-3.rha',
        'uid': 'a9bc7525-08fc-11e5-a9e7-525400398fe5'
      },
      'px': 275.976833717852,
      'py': 229.8390490800018,
      'spec': {
        'externalID': 'node-3.rha'
      },
      'status': {
        'capacity': {
          'cpu': '1',
          'memory': '2049452Ki'
        },
        'conditions': [
        {
          'lastHeartbeatTime': '2015-06-02T16:02:32Z',
          'lastTransitionTime': '2015-06-02T07:54:58Z',
          'reason': 'kubelet is posting ready status',
          'status': 'True',
          'type': 'Ready'
        }
        ],
        'nodeInfo': {
          'bootID': 'f7f2dbb2-1e41-4572-a51a-af8f32fe8e61',
          'containerRuntimeVersion': 'docker://1.6.0',
          'kernelVersion': '4.0.4-301.fc22.x86_64',
          'kubeProxyVersion': 'v0.16.2-659-g63182318c5876b',
          'kubeletVersion': 'v0.16.2-659-g63182318c5876b',
          'machineID': '45bb3b96146aa94f299b9eb43646eb35',
          'osImage': 'Red Hat Enterprise Linux Atomic Host 7.1',
          'systemUUID': 'C27B1F97-235F-D44E-A335-3D0EB4089311'
        }
      },
      'weight': 0,
      'x': 282.69751139808943,
      'y': 234.8450788370995
    }
  },
  'relations': [
  {
    'source': '891054a1-0890-11e5-a3b5-525400398fe5',
    'target': '89443a7e-0890-11e5-a3b5-525400398fe5'
  },
  {
    'source': '89222e96-0890-11e5-a3b5-525400398fe5',
    'target': '8960db98-0890-11e5-a3b5-525400398fe5'
  },
  {
    'source': '89222e96-0890-11e5-a3b5-525400398fe5',
    'target': '89610137-0890-11e5-a3b5-525400398fe5'
  },
  {
    'source': '892e8cee-0890-11e5-a3b5-525400398fe5',
    'target': '897f26dd-0890-11e5-a3b5-525400398fe5'
  },
  {
    'source': '892e8cee-0890-11e5-a3b5-525400398fe5',
    'target': '897f4916-0890-11e5-a3b5-525400398fe5'
  },
  {
    'source': '892e8cee-0890-11e5-a3b5-525400398fe5',
    'target': '897f63c3-0890-11e5-a3b5-525400398fe5'
  },
  {
    'source': '39113587-088f-11e5-b0b0-525400398fe5',
    'target': '89443a7e-0890-11e5-a3b5-525400398fe5'
  },
  {
    'source': '39113587-088f-11e5-b0b0-525400398fe5',
    'target': '8960db98-0890-11e5-a3b5-525400398fe5'
  },
  {
    'source': '39113587-088f-11e5-b0b0-525400398fe5',
    'target': '89610137-0890-11e5-a3b5-525400398fe5'
  },
  {
    'source': '39113587-088f-11e5-b0b0-525400398fe5',
    'target': '897f26dd-0890-11e5-a3b5-525400398fe5'
  },
  {
    'source': '39113587-088f-11e5-b0b0-525400398fe5',
    'target': '897f4916-0890-11e5-a3b5-525400398fe5'
  },
  {
    'source': '39113587-088f-11e5-b0b0-525400398fe5',
    'target': '897f63c3-0890-11e5-a3b5-525400398fe5'
  },
  {
    'source': '8959751f-0890-11e5-a3b5-525400398fe5',
    'target': '8960db98-0890-11e5-a3b5-525400398fe5'
  },
  {
    'source': '8959751f-0890-11e5-a3b5-525400398fe5',
    'target': '89610137-0890-11e5-a3b5-525400398fe5'
  },
  {
    'source': '89672aaf-0890-11e5-a3b5-525400398fe5',
    'target': '897f26dd-0890-11e5-a3b5-525400398fe5'
  },
  {
    'source': '89672aaf-0890-11e5-a3b5-525400398fe5',
    'target': '897f4916-0890-11e5-a3b5-525400398fe5'
  },
  {
    'source': '89672aaf-0890-11e5-a3b5-525400398fe5',
    'target': '897f63c3-0890-11e5-a3b5-525400398fe5'
  }
  ]
});













      var index = 0;
      $rootScope.data = window['datasets'][index];
      this.data = $rootScope.data;

      $rootScope.kinds = {
        Pod: '#vertex-Pod',
        ReplicationController: '#vertex-ReplicationController',
        Node: '#vertex-Node',
        Service: '#vertex-Service'
      };

      $rootScope.poke = () => {
        index += 1;
        $rootScope.data = window['datasets'][index % window['datasets'].length];
      };

      $rootScope.$on('select', (ev, item) => {
        var text = '';
        if (item) {
          text = 'Selected: ' + item.metadata.name;
        }
        angular.element(document.getElementById('selected')).text(text);
      });
    }

    // todo: create methods and fields instead of doing everything on the '$rootScope'

  }

  _module.controller('HawkularTopology.TopologyController', TopologyController);

  // so the same scroll doesn't trigger multiple times
  angular.module('infinite-scroll').value('THROTTLE_MILLISECONDS', 250);

  hawtioPluginLoader.addModule(HawkularTopology.pluginName);
}