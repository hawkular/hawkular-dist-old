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

import org.hawkular.inventory.api.model.Environment
import org.hawkular.inventory.api.model.Metric
import org.hawkular.inventory.api.model.MetricType
import org.hawkular.inventory.api.model.Resource
import org.hawkular.inventory.api.model.ResourceType
import org.hawkular.inventory.api.model.Tenant

import org.junit.Test

import static junit.framework.Assert.assertEquals

class Scenario1 extends AbstractTestBase {

    def tenantId = "i-test"
    def environmentId = "test"
    def hawk_id = "hawkular_web"

    @Test
    public void testScenario() throws Exception {

        // 1) create tenant in inventory
        def tenant = new Tenant(tenantId)
        def response = client.post(path: "inventory/tenants", body : tenant)
        assertResponseOk(response.status)

        // 2) create environment in inventory
        def environment = new Environment(environmentId)
        response = client.post(path: "inventory/$tenantId/environments", body : environment)
        assertResponseOk(response.status)

        // 3) create resource type in inventory
        def res_type = new ResourceType(tenantId, "URL", "1.0")
        response = client.post(path: "inventory/$tenantId/resourceTypes", body : res_type)
        assertResponseOk(response.status)

        // 4) create resource in inventory
        def hawk_web = new Resource(tenantId, environmentId, hawk_id, res_type)
        hawk_web.getProperties().put("url", "http://hawkular.org")
        response = client.post(path: "inventory/$tenantId/$environmentId/resources", body : hawk_web)
        assertResponseOk(response.status)

        // 5) create metric types ("ping" status + time metrics)
        def status_code_type = new MetricType(tenantId, "status.code.type")
        status_code_type.getProperties().put("description", "Status code returned from ping")
        def status_time_type = new MetricType(tenantId, "status.time.type", MetricUnit.MILLI_SECOND)
        status_time_type.getProperties().put("description", "Time to ping the target in ms")
        response = client.post(path: "inventory/$tenantId/metricTypes", body: status_code_type)
        assertResponseOk(response.status)
        response = client.post(path: "inventory/$tenantId/metricTypes", body: status_time_type)
        assertResponseOk(response.status)

        // 6) create metrics
        def status_code = new Metric(tenantId, environmentId, "status.code", status_code_type)
        def status_time = new Metric(tenantId, environmentId, "status.time", status_time_type)
        response = client.post(path: "inventory/$tenantId/$environmentId/metrics", body: status_code)
        assertResponseOk(response.status)
        response = client.post(path: "inventory/$tenantId/$environmentId/metrics", body: status_time)
        assertResponseOk(response.status)

        // 7) assign metrics to the resource
        response = client.post(path: "inventory/$tenantId/$environmentId/resources/$hawk_id/metrics",
                body: ["status.code", "status.time"]
        )
        assertResponseOk(response.status)

        // 8 informing pinger is internal (bus msg)

        // 9 simulate ping + response - metrics for ~ the last 30 minutes
        for (int i = -30 ; i <-3 ; i++ ) {
            postMetricValue(hawk_id, status_time.id, 100 + i, i)
            postMetricValue(hawk_id, status_code.id, 200, i)
        }

        postMetricValue(hawk_id, status_code.id, 500, -2)
        postMetricValue(hawk_id, status_code.id, 404, -1)
        postMetricValue(hawk_id, status_code.id, 200, 0)
        postMetricValue(hawk_id, status_time.id, 42, 0)

        // 10 Get values for a chart - last 4h data

        def end = System.currentTimeMillis()
        def start = end - 4 *3600 * 1000 // 4h earlier
        response = client.get(path: "/hawkular-metrics/$tenantId/metrics/numeric/${hawk_id}.status.time/data", query:
                [start: start, end: end])

        println(response.data)

        // 11 define an alert

//        response = client.post(path: "alerts/triggers/")

    }

    private void assertResponseOk(int responseCode) {
        assertTrue("Response code should be 2xx or 304", (responseCode.status >= 200 && responseCode.status < 300) ||
                responseCode.status == 304)
    }

    private void postMetricValue(String resourceId, String metricName, int value, int timeSkewMinutes = 0) {
        def response
        def now = System.currentTimeMillis()
        def tmp = "$resourceId.$metricName"

        long time = now + (timeSkewMinutes * 60 * 1000)

        response = client.post(path: "/hawkular-metrics/$tenantId/metrics/numeric/$tmp/data",
                body: [[timestamp: time, value: value]])
        assertResponseOk(response.status)
    }
}