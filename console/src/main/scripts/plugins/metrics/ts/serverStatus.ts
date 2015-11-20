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

module HawkularMetrics {
  export class ServerStatus {

    constructor (public value:string, public state: string, public icon: string) {
    }

    static SERVER_UP = new ServerStatus('Up', 'up', 'fa-arrow-up');
    static SERVER_DOWN = new ServerStatus('Down', 'down', 'fa-arrow-down');
    static SERVER_UNKNOW = new ServerStatus('Unknown', 'unknown', 'fa-chain-broken');
    static SERVER_STARTING = new ServerStatus('Starting', 'starting', 'fa-spinner');
    static SERVER_RESTART_REQUIRED = new ServerStatus('Restart Required', 'restart required', 'fa-repeat');

    toString = () => {
      return this.value;
    };
  }

  export class ServerType {
    constructor (public value:string, public type:string) {
    }

    static SERVER_EAP = new ServerType('EAP', 'eap');
    static SERVER_WILDFLY = new ServerType('WildFly', 'wildfly');

    toString = () => {
      return this.value;
    };
  }
}
