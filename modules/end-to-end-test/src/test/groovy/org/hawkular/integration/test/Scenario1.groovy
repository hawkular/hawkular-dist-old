/**
 * Copyright 2015 Red Hat, Inc. and/or its affiliates
 * and other contributors as indicated by the @author tags.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.hawkular.integration.test

import org.hawkular.inventory.api.MetricDefinition
import org.hawkular.inventory.api.MetricUnit
import org.hawkular.inventory.api.Resource
import org.hawkular.inventory.api.ResourceType
import org.junit.Test

import static junit.framework.Assert.assertEquals

class Scenario1 extends org.hawkular.integration.test.AbstractTestBase {

    def tenantId = "i-test"
    def hawk_id = "hawkular_web"

    @Test
    public void testScenario() throws Exception {


        // 1) Add the resource to be monitored

        def hawk_web = new Resource();

        hawk_web.id = hawk_id;
        hawk_web.type = ResourceType.URL
        hawk_web.addParameter("url","http://hawkular.org")

        def response = client.post(path: "/inventory/$tenantId/resources", body : hawk_web)

        assertEquals(200, response.status)

        // 2) Add the "ping" status + time metrics
        def statusCode = new MetricDefinition("status.code");
        statusCode.description = "Status code returned from ping"
        def statusTime = new MetricDefinition("status.time",MetricUnit.MILLI_SECOND);
        statusTime.description = "Time to ping the target in ms"

        response = client.post(path: "/inventory/$tenantId/resource/$hawk_id/metrics",
            body: [ statusCode, statusTime])

        assertEquals(200, response.status)

        // 3 inform pinger is internal

        // 4 simulate ping + response - metrics for ~ the last 30 minutes
        for (int i = -30 ; i <-3 ; i++ ) {
            postMetricValue(hawk_id, statusTime, 100 + i, i)
            postMetricValue(hawk_id, statusCode, 200, i)
        }

        postMetricValue(statusCode, 500, i-2)
        postMetricValue(statusCode, 404, i-1)


        // 5 was simulated in step 4 as well

        // 6 Get values for a chart - last 4h data

        def end = System.currentTimeMillis()
        def start = end - 4 *3600 * 1000 // 4h earlier
        response = client.get(path: "/metrics/$tenantId/metrics/numeric/${hawk_id}.status.time/data", query:
                [start: start, end: end])

        // 7 define an alert

        response = client.post(path: "/alerts/triggers/")

    }

    private void postMetricValue(String resourceId, MetricDefinition metric, int value, int timeSkewMinutes = 0) {
        def response
        def now = System.currentTimeMillis()
        def tmp = "$resourceId.$metric.name"

        long time = now + (timeSkewMinutes * 60 * 1000)

        response = client.post(path: "/metrics/$tenantId/metrics/numeric/$tmp/data",
                body: [[timestamp: time, value: value]])
        assertEquals(200, response.status)
    }
}