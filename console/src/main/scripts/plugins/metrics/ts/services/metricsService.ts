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
     * @returns IChartDataPoint[]
     */
    public static formatBucketedChartOutput(response):IChartDataPoint[] {
      //  The schema is different for bucketed output
      return _.map(response, (point:IChartDataPoint) => {
        return {
          timestamp: point.start,
          date: new Date(point.start),
          value: !angular.isNumber(point.value) ? 0 : point.value,
          avg: (point.empty) ? 0 : point.avg,
          min: !angular.isNumber(point.min) ? 0 : point.min,
          max: !angular.isNumber(point.max) ? 0 : point.max,
          percentile95th: !angular.isNumber(point.percentile95th) ? 0 : point.percentile95th,
          median: !angular.isNumber(point.median) ? 0 : point.median,
          empty: point.empty
        };
      });
    }

    /**
     * formatCounterChartOutput
     * @param response
     * @param startTimeStamp
     * @param buckets
     * @returns IChartDataPoint[]
     */
    public static formatCounterChartOutput(response, startTimeStamp, buckets = 60):IChartDataPoint[] {
      if(response.length < 2) {
        return [];
      }

      // get the timestamp interval from the first two samples
      let tsStep = response[1].timestamp - response[0].timestamp;

      // sometimes there are gaps in data, which needs to be filled with empty values so the buckets get similar time
      // intervals. here we figure that and fill them. when metrics support buckets for counters, this is unnecessary
      let tmpArr = [response[0], response[1]];
      let k = 2;
      while(k < response.length) {
        if(response[k].timestamp - tmpArr[tmpArr.length-1].timestamp >= (tsStep * 2)) {
          tmpArr.push({timestamp: tmpArr[tmpArr.length-1].timestamp + tsStep, value: 0});
        }
        else {
          tmpArr.push(response[k++]);
        }
      }
      response = tmpArr;

      // also, if the data starts after the start timestamp, the chart will not have a proper scale, and not comparable
      // with others (eg: mem usage). so, if required, fill data with initial missing timestamps.
      while (response[0].timestamp > startTimeStamp) {
        response.unshift({timestamp: (response[0].timestamp - tsStep), value: 0});
      }

      // put things into buckets
      response = tmpArr;
      let result = response.reverse();
      /// FIXME: Simulating buckets.. this should come from metrics.
      if (response.length >= buckets) {
        let wnd: any = window;
        let step = wnd.Math.floor(response.length / buckets);
        result = [];
        let accValue = 0;
        var iTimeStamp = 0;
        _.forEach(response, (point:any, idx) => {
          if (iTimeStamp === 0) {
            iTimeStamp = point.timestamp;
          }

          accValue += point.value;

          if (parseInt(idx, 10) % step === (step - 1)) {
            result.push({timestamp: iTimeStamp, value: accValue});
            accValue = 0;
            iTimeStamp = 0;
          }
        });
        // just so that scale matches, sometimes there's some skew..
        result[result.length-1].timestamp = startTimeStamp;
      }

      //  The schema is different for bucketed output
      return _.map(result, (point:IChartDataPoint, idx) => {
        let theValue = idx === 0 ? 0 : (result[idx - 1].value - point.value);
        return {
          timestamp: point.timestamp,
          date: new Date(point.timestamp),
          value: theValue,
          avg: theValue,
          min: theValue,
          max: theValue,
          percentile95th: theValue,
          median: theValue,
          empty: !angular.isNumber(point.value)
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
