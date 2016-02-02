/*
 * Copyright 2015-2016 Red Hat, Inc. and/or its affiliates
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
package org.hawkular.integration.test;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.hawkular.accounts.api.model.HawkularUser;
import org.hawkular.accounts.api.model.Persona;
import org.hawkular.inventory.api.model.Environment;
import org.hawkular.inventory.api.model.Metric;
import org.hawkular.inventory.api.model.MetricType;
import org.hawkular.inventory.api.model.Resource;
import org.hawkular.inventory.api.model.ResourceType;
import org.hawkular.metrics.model.DataPoint;
import org.junit.Assert;
import org.testng.annotations.AfterClass;
import org.testng.annotations.Test;

import com.fasterxml.jackson.core.type.TypeReference;
import com.squareup.okhttp.Request;
import com.squareup.okhttp.RequestBody;
import com.squareup.okhttp.Response;

public class Scenario1ITest extends AbstractTestBase {

    static final String urlTypeId = "URL";
    static final String urlTypePath = "/" + urlTypeId;
    static final String environmentId = "test";
    static final String statusCodeTypeId = "status.code.type";
    static final String statusCodeTypePath = "/" + statusCodeTypeId;
    static final String durationTypeId = "status.duration.type";
    static final String durationTypePath = "/" + durationTypeId;

    private static List<String> pathsToDelete = new ArrayList<>();

    @Test
    public void testScenario() throws Throwable {
        Persona persona = getWithRetries("/hawkular/accounts/personas/current", HawkularUser.class, 10, 2000);
        String tenantId = persona.getIdAsUUID().toString();

        /* assert the test environment exists */
        /* There is a race condition when WildFly agent is enabled:
           both this test and Agent trigger the autocreation of test entities simultaneously,
           and one of them may get only a partially initialized state.
           That is why we do several delayed attempts do perform the first request.
         */
        String path = "/hawkular/inventory/environments/" + environmentId;
        Environment env = getWithRetries(path, Environment.class, 10, 2000);
        Assert.assertEquals(environmentId, env.getId());

        /* assert the URL resource type exists */
        path = "/hawkular/inventory/resourceTypes/" + urlTypeId;
        ResourceType resourceType = getWithRetries(path, ResourceType.class, 10, 2000);
        Assert.assertEquals(urlTypeId, resourceType.getId());

        /* assert the metric types exist */
        path = "/hawkular/inventory/metricTypes/" + statusCodeTypeId;
        MetricType statusCodeType = getWithRetries(path, MetricType.class, 10, 2000);
        Assert.assertEquals(statusCodeTypeId, statusCodeType.getId());

        path = "/hawkular/inventory/metricTypes/" + durationTypeId;
        MetricType durationType = getWithRetries(path, MetricType.class, 10, 2000);
        Assert.assertEquals(durationTypeId, durationType.getId());

        /* create a URL */
        String resourceId = UUID.randomUUID().toString();
        Resource.Blueprint newResource = Resource.Blueprint.builder().withId(resourceId)
                .withResourceTypePath(urlTypePath).withProperty("url", "http://hawkular.org").build();
        postNew("/hawkular/inventory/" + environmentId + "/resources", newResource);
        pathsToDelete.add("/hawkular/inventory/" + environmentId + "/resources/" + resourceId);

        /* create the metrics */
        String statusCodeId = UUID.randomUUID().toString();
        Metric.Blueprint codeMetric =
                Metric.Blueprint.builder().withMetricTypePath(statusCodeTypePath).withId(statusCodeId).build();
        postNew("/hawkular/inventory/" + environmentId + "/metrics", codeMetric);
        pathsToDelete.add("/hawkular/inventory/" + environmentId + "/metrics/" + statusCodeId);

        String durationId = UUID.randomUUID().toString();
        Metric.Blueprint durationMetric =
                Metric.Blueprint.builder().withMetricTypePath(durationTypePath).withId(durationId).build();
        postNew("/hawkular/inventory/" + environmentId + "/metrics", durationMetric);
        pathsToDelete.add("/hawkular/inventory/" + environmentId + "/metrics/" + durationId);

        /* assign metrics to the resource */
        Response response = post("/hawkular/inventory/" + environmentId + "/resources/" + resourceId + "/metrics",
                "[\"/e;" + environmentId + "/m;" + statusCodeId + "\", \"/e;" + environmentId + "/m;" + durationId
                        + "\"]");
        Assert.assertEquals(204, response.code());

        /* Pinger should start pinging now but we do not want to wait */

        // 9 simulate ping + response - metrics for ~ the last 30 minutes

        /* Wait till metrics gets initialized */
        path = "/hawkular/metrics/status";
        int delay = 1000;
        int attemptCount = 30;
        String metricsServiceStatus = null;
        for (int i = 0; i < 30; i++) {
            response = client.newCall(newAuthRequest().url(baseURI + path).build()).execute();
            if (response.code() == 200) {
                String mStatusStr = response.body().string();
                Map<String, String> mStatusMap = mapper.readValue(mStatusStr, mapTypeRef);
                metricsServiceStatus = mStatusMap.get("MetricsService");
                if ("STARTED".equals(metricsServiceStatus)) {
                    /* the service has started - we can leave the loop */
                    break;
                }
            }
            System.out.println("'MetricsService' not ready yet, about to retry after " + delay + " ms");
            /* sleep one second */
            Thread.sleep(delay);
        }
        if (!"STARTED".equals(metricsServiceStatus)) {
            Assert.fail("MetricsService status still '" + metricsServiceStatus + "' after trying " + attemptCount
                    + " times" +
                    " with delay $delay ms.");
        }

        for (int i = -30; i < -3; i++) {
            postMetricValue(tenantId, resourceId, statusCodeId, 100 + i, i);
            postMetricValue(tenantId, resourceId, durationId, 200, i);
        }

        postMetricValue(tenantId, resourceId, statusCodeId, 500, -2);
        postMetricValue(tenantId, resourceId, statusCodeId, 404, -1);
        postMetricValue(tenantId, resourceId, statusCodeId, 200, 0);
        postMetricValue(tenantId, resourceId, statusCodeId, 42, 0);

        /* Get values for a chart - last 4h data */
        long end = System.currentTimeMillis();
        long start = end - 4 * 3600 * 1000;// 4h earlier
        path = "/hawkular/metrics/gauges/" + resourceId + "." + statusCodeId + "/data";
        String query = "?start=" + start + "&end=" + end;
        response = client
                .newCall(newAuthRequest().addHeader("Hawkular-Tenant", tenantId).url(baseURI + path + query).build())
                .execute();
        String body = response.body().string();
        TypeReference<List<DataPoint<Double>>> dataPointListTypeRef = new TypeReference<List<DataPoint<Double>>>() {};
        List<DataPoint<Double>> statuses = mapper.readValue(body, dataPointListTypeRef);

        Assert.assertEquals(31, statuses.size());

        path = "/hawkular/metrics/gauges/" + resourceId + "." + durationId + "/data";
        query = "?start=" + start + "&end=" + end;
        response = client
                .newCall(newAuthRequest().addHeader("Hawkular-Tenant", tenantId).url(baseURI + path + query).build())
                .execute();
        body = response.body().string();
        List<DataPoint<Double>> durations = mapper.readValue(body, dataPointListTypeRef);
        Assert.assertEquals(27, durations.size());

        /* TODO: define an alert */
        // response = postDeletable(path: "alerts/triggers/")

    }

    @AfterClass
    static void cleanUp() throws IOException {
        /* Let's delete the entities one after another in the inverse order as we created them */
        for (int i = pathsToDelete.size() - 1; i >= 0; i--) {
            String path = pathsToDelete.get(i);
            Response response = client.newCall(newAuthRequest().url(baseURI + path).delete().build()).execute();
            Assert.assertEquals(204, response.code());

            response = client.newCall(newAuthRequest().url(baseURI + path).build()).execute();
            Assert.assertEquals(404, response.code());
        }
    }

    private void postMetricValue(String tenantId, String resourceId, String metricName, int value, int timeSkewMinutes)
            throws IOException {
        long now = System.currentTimeMillis();
        String tmp = resourceId + "." + metricName;

        long time = now + (timeSkewMinutes * 60 * 1000);

        String path = "/hawkular/metrics/gauges/" + tmp + "/data";
        String json = "[{timestamp: " + time + ", value: " + value + "}]";
        Request request = newAuthRequest().addHeader("Hawkular-Tenant", tenantId).url(baseURI + path)
                .post(RequestBody.create(MEDIA_TYPE_JSON, json)).build();
        Response response = client.newCall(request).execute();
        Assert.assertEquals(200, response.code());
    }
}
