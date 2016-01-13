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

module HawkularMetrics {


/// NOTE: this pattern is used because enums cant be used with strings
  export class EventNames {

    public static CHART_TIMERANGE_CHANGED = new EventNames('ChartTimeRangeChanged');
    public static AVAIL_CHART_TIMERANGE_CHANGED = new EventNames('AvailChartTimeRangeChanged');
    public static CONTEXT_CHART_TIMERANGE_CHANGED = new EventNames('ContextChartTimeRangeChanged');
    public static REFRESH_CHART = new EventNames('RefreshChart');
    public static REFRESH_AVAIL_CHART = new EventNames('RefreshAvailabilityChart');

    public static DONUT_CHART_RENDERED = new EventNames('HkDonutChartRendered');

    public static SWITCHED_PERSONA = new EventNames('SwitchedPersona');
    public static CURRENT_PERSONA_LOADED = new EventNames('CurrentPersonaLoaded');

    public static IDLE_TIMEOUT = new EventNames('IdleTimeout');
    public static IDLE_START = new EventNames('IdleStart');
    public static IDLE_END = new EventNames('IdleEnd');


    constructor(public value:string) {
      // empty
    }

    public toString():string {
      return this.value;
    }
  }


}
