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

import org.hawkular.inventory.api.model.Metric
import org.hawkular.inventory.api.model.Resource
import org.junit.AfterClass
import org.junit.Assert
import org.junit.Test

import static org.junit.Assert.assertEquals
import static org.junit.Assert.assertTrue

class Scenario1ITest extends AbstractTestBase {

    static final String urlTypeId = "URL"
    static final String environmentId = "test"
    static final String statusCodeTypeId = "status.code.type"
    static final String durationTypeId = "status.duration.type"

    private static List<String> pathsToDelete = new ArrayList();

    @Test
    public void testScenario() throws Exception {
        //def response = client.get(path: "/hawkular-accounts/organizations")
        def response = client.get(path: "/hawkular-accounts/personas/current")
        assertEquals(200, response.status)
        String tenantId = response.data.id
        // println "tenantId = $tenantId"

        /* assert the test environment exists */
        /* There is a race condition when WildFly agent is enabled:
           both this test and Agent trigger the autocreation of test entities simultaneously,
           and one of them may get only a partially initialized state.
           That is why we do several delayed attempts do perform the first request.
         */
        String path = "/hawkular/inventory/environments/$environmentId";
        int attemptCount = 5;
        int delay = 500;
        for (int i = 0; i < attemptCount; i++) {
            try {
                response = client.get(path: path)
                /* all is well, we can leave the loop */
                break;
            } catch (groovyx.net.http.HttpResponseException e) {
                /* some initial attempts may fail */
            }
            println "'$path' not ready yet, about to retry after $delay ms"
            /* sleep one second */
            Thread.sleep(delay);
        }
        if (response.status != 200) {
            Assert.fail("Getting path '$path' returned status ${response.status}, tried $attemptCount times");
        }
        assertEquals(environmentId, response.data.id)

        /* assert the URL resource type exists */
        response = client.get(path: "/hawkular/inventory/resourceTypes/$urlTypeId")
        assertEquals(200, response.status)
        assertEquals(urlTypeId, response.data.id)

        /* assert the metric types exist */
        response = client.get(path: "/hawkular/inventory/metricTypes/$statusCodeTypeId")
        assertEquals(200, response.status)
        response = client.get(path: "/hawkular/inventory/metricTypes/$durationTypeId")
        assertEquals(200, response.status)

        /* create a URL */
        String resourceId = UUID.randomUUID().toString();
        def newResource = Resource.Blueprint.builder().withId(resourceId)
                .withResourceType(urlTypeId).withProperty("url", "http://hawkular.org").build()
        response = client.post(path: "/hawkular/inventory/$environmentId/resources", body : newResource)
        assertEquals(201, response.status)
        pathsToDelete.add("/hawkular/inventory/$environmentId/resources/$resourceId")


        /* create the metrics */
        String statusCodeId = UUID.randomUUID().toString();
        def codeMetric = Metric.Blueprint.builder().withMetricTypeId(statusCodeTypeId).withId(statusCodeId).build();
        response = client.post(path: "/hawkular/inventory/$environmentId/metrics", body: codeMetric)
        assertEquals(201, response.status)
        pathsToDelete.add("/hawkular/inventory/$environmentId/metrics/$statusCodeId")

        String durationId = UUID.randomUUID().toString();
        def durationMetric = Metric.Blueprint.builder().withMetricTypeId(durationTypeId).withId(durationId).build();
        response = client.post(path: "/hawkular/inventory/$environmentId/metrics", body: durationMetric)
        assertEquals(201, response.status)
        pathsToDelete.add("/hawkular/inventory/$environmentId/metrics/$durationId")

        /* assign metrics to the resource */
        response = client.post(path: "/hawkular/inventory/$environmentId/resources/$resourceId/metrics",
        body: [
            statusCodeId,
            durationId]
        )
        assertResponseOk(response.status)

        /* Pinger should start pinging now but we do not want to wait */

        // 9 simulate ping + response - metrics for ~ the last 30 minutes

        /* Wait till metrics gets initialized */
        path = "/hawkular/metrics/status"
        delay = 1000
        attemptCount = 30
        String metricsServiceStatus;
        for (int i = 0; i < attemptCount; i++) {
            response = client.get(path: path)
            if (response.status == 200) {
                metricsServiceStatus = response.data.MetricsService
                if ("STARTED".equals(metricsServiceStatus)) {
                    /* the service has started - we can leave the loop */
                    break;
                }
            }
            println "'MetricsService' not ready yet, about to retry after $delay ms"
            /* sleep one second */
            Thread.sleep(delay);
        }
        if (!"STARTED".equals(metricsServiceStatus)) {
            Assert.fail("MetricsService status still '$metricsServiceStatus' after trying $attemptCount times" +
                " with delay $delay ms.")
        }


        for (int i = -30 ; i <-3 ; i++ ) {
            postMetricValue(tenantId, resourceId, statusCodeId, 100 + i, i)
            postMetricValue(tenantId, resourceId, durationId, 200, i)
        }

        postMetricValue(tenantId, resourceId, statusCodeId, 500, -2)
        postMetricValue(tenantId, resourceId, statusCodeId, 404, -1)
        postMetricValue(tenantId, resourceId, statusCodeId, 200, 0)
        postMetricValue(tenantId, resourceId, statusCodeId, 42, 0)

        /* Get values for a chart - last 4h data */
        def end = System.currentTimeMillis()
        def start = end - 4 * 3600 * 1000 // 4h earlier
        response = client.get(path: "/hawkular/metrics/gauges/${resourceId}.$statusCodeId/data",
                query: [start: start, end: end], headers: ["Hawkular-Tenant": tenantId])
        assertEquals(31, response.data.size());

        response = client.get(path: "/hawkular/metrics/gauges/${resourceId}.$durationId/data",
                query: [start: start, end: end], headers: ["Hawkular-Tenant": tenantId])
        assertEquals(27, response.data.size());

        /* TODO: define an alert */
        // response = postDeletable(path: "alerts/triggers/")

    }

    @AfterClass
    static void cleanUp() {
        /* Let's delete the entities one after another in the inverse order as we created them */
        for (int i = pathsToDelete.size() - 1; i >= 0; i--) {
            String path = pathsToDelete.get(i);
            def response = client.delete(path : path)
            assertEquals(204, response.status)

            try {
                response = client.get(path : path)
                Assert.fail("The path '$path' should not exist after it was deleted")
            } catch (groovyx.net.http.HttpResponseException e) {
                assertEquals("Error message for path '$path'", "Not Found", e.getMessage())
            }
        }
    }
    private void assertResponseOk(int responseCode) {
        assertTrue("Response code should be 2xx or 304 but was "+ responseCode,
                (responseCode >= 200 && responseCode < 300) || responseCode == 304)
    }

    private void postMetricValue(String tenantId, String resourceId, String metricName, int value, int timeSkewMinutes = 0) {
        def response
        def now = System.currentTimeMillis()
        def tmp = "$resourceId.$metricName"

        long time = now + (timeSkewMinutes * 60 * 1000)

        response = client.post(path: "/hawkular/metrics/gauges/$tmp/data",
            headers: ["Hawkular-Tenant": tenantId],
            body: [
                [timestamp: time, value: value]
            ])
        assertResponseOk(response.status)
    }

}