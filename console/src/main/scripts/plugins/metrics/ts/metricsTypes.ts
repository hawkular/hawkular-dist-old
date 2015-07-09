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
/// <reference path="../../includes.ts"/>
/// <reference path="errorManager.ts"/>


module HawkularMetrics {

/// Typescript 1.4 introduces type aliases:
/// http://blogs.msdn.com/b/typescript/archive/2015/01/16/announcing-typescript-1-4.aspx
/// Some Type aliases to make things more type safe than just string or number. Implies how it is being used and is
/// especially useful for refactoring.

export type TenantId = string;
export type ResourceId = string;
export type MetricId = string;
export type TimestampInMillis = number;


}
