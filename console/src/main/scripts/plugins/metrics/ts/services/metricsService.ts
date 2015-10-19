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

/// <reference path="../metricsPlugin.ts"/>

module HawkularMetrics {


  export interface IMetricsResponse {
    timestamp: number;
    value?: number;
    avg: number;
    min: number;
    max: number;
    percentile95th?: number;
    median?: number;
  }


  export interface IContextChartDataPoint {
    timestamp: number;
    start?: number;
    end?: number;
    value: number;
    avg: number;
    empty: boolean;
  }

  export interface IChartDataPoint extends IContextChartDataPoint {
    date: Date;
    min: number;
    max: number;
    percentile95th: number;
    median: number;
  }

  export interface IChartData {
    id: MetricId;
    startTimeStamp: TimestampInMillis;
    endTimeStamp: TimestampInMillis;
    dataPoints: IChartDataPoint[];
    contextDataPoints: IChartDataPoint[];
    annotationDataPoints: IChartDataPoint[];
  }

  export interface IMetricsService {
    retrieveGaugeMetrics(personaId:PersonaId, metricId:MetricId,
                        startTime?:TimestampInMillis,
                        endTime?:TimestampInMillis,
                        buckets?:number):ng.IPromise<IChartDataPoint[]>;
  }

  export class MetricsService implements IMetricsService {

    public static $inject = ['$log', 'HawkularMetric', 'NotificationsService'];

    constructor(private $log:ng.ILogService,
                private HawkularMetric:any,
                private NotificationsService:INotificationsService) {
    }


    /**
     * formatBucketedChartOutput
     * @param response
     * @param multiplier Value to multiply the original value with. Eg. 100 for double -> % or (1/1024) for byte->kb
     * @returns IChartDataPoint[]
     */
    public static formatBucketedChartOutput(response,multiplier?: number):IChartDataPoint[] {
      if (!multiplier) {
          multiplier =1;
      }
      //  The schema is different for bucketed output
      return _.map(response, (point:IChartDataPoint) => {
        return {
          timestamp: point.start,
          date: new Date(point.start),
          value: !angular.isNumber(point.value) ? 0 : point.value * multiplier,
          avg: (point.empty) ? 0 : point.avg * multiplier,
          min: !angular.isNumber(point.min) ? 0 : point.min * multiplier,
          max: !angular.isNumber(point.max) ? 0 : point.max * multiplier,
          percentile95th: !angular.isNumber(point.percentile95th) ? 0 : point.percentile95th * multiplier,
          median: !angular.isNumber(point.median) ? 0 : point.median * multiplier,
          empty: point.empty
        };
      });
    }

    /**
     * RetrieveGaugeMetrics
     * @param personaId
     * @param metricId
     * @param startTime
     * @param endTime
     * @param buckets
     * @returns ng.IPromise<IChartDataPoint[]>
     */
    public retrieveGaugeMetrics(personaId:PersonaId,
                               metricId:MetricId,
                               startTime?:TimestampInMillis,
                               endTime?:TimestampInMillis,
                               buckets = 120):ng.IPromise<IChartDataPoint[]> {

      // calling refreshChartData without params use the model values
      if (!endTime) {
        endTime = Date.now();
      }
      if (!startTime) {
        startTime = Date.now() - (8 * 60 * 60 * 1000);
      }

      return this.HawkularMetric.GaugeMetricData(personaId).queryMetrics({
        gaugeId: metricId,
        start: startTime,
        end: endTime,
        buckets: buckets
      }).$promise;

    }


  }

  _module.service('MetricsService', MetricsService);
}
