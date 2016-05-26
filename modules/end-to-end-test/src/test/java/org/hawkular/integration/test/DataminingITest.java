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

import java.util.Collections;
import java.util.Map;

import org.hawkular.accounts.api.model.HawkularUser;
import org.hawkular.accounts.api.model.Persona;
import org.hawkular.inventory.api.model.CanonicalPath;
import org.hawkular.inventory.api.model.Environment;
import org.hawkular.inventory.api.model.Feed;
import org.hawkular.inventory.api.model.Metric;
import org.hawkular.inventory.api.model.MetricDataType;
import org.hawkular.inventory.api.model.MetricType;
import org.hawkular.inventory.api.model.MetricUnit;
import org.hawkular.inventory.api.model.Relationship;
import org.junit.Assert;
import org.testng.annotations.Test;

import com.squareup.okhttp.Request;
import com.squareup.okhttp.RequestBody;
import com.squareup.okhttp.Response;

/**
 * @author Pavol Loffay
 */
public class DataminingITest extends AbstractTestBase {

    private static final String PREDICTION_REL = "__inPrediction";
    private static final String FORECAST_HORIZON = "forecastingHorizon";

    private static final String environmentId = "test";
    private static final String feedId = "itest-dtm-feed";
    private static final String metricType1Id = "itest-dtm-mt1";
    private static final String metricType2Id = "itest-dtm-mt2";
    private static final String metricId11 = "itest-dtm-m11";
    private static final String metricId12 = "itest-dtm-m12";
    private static final String metricId21 = "itest-dtm-m21";

    private String relationIdToTenant;
    private String relationIdToMetricType2;
    private String relationIdToMetric21;

    private int forecastingHorizonTenant = 1233;
    private int forecastingHorizonMetricType2 = 245914;
    private int forecastingHorizonMetric21 = 6984;

    private Long collectionIntervalMetric11 = 789L;
    private Long collectionIntervalMetricType1 = 8897L;

    private String tenantId;

    @Test(groups = "createInventory")
    public void createInventory() throws Throwable {
        Persona persona = getWithRetries("/hawkular/accounts/personas/current", HawkularUser.class, 10, 2000);
        tenantId = persona.getIdAsUUID().toString();
        Assert.assertTrue("Cannot get the current tenant id.", tenantId != null && !tenantId.trim().isEmpty());

        /* assert the test environment exists */
        /* There is a race condition when WildFly agent is enabled:
           both this test and Agent trigger the autocreation of test entities simultaneously,
           and one of them may get only a partially initialized state.
           That is why we do several delayed attempts do perform the first request.
         */
        String path = "/hawkular/inventory/environments/" + environmentId;
        Environment env = getWithRetries(path, Environment.class, 10, 2000);
        Assert.assertEquals("Unable to get the '" + environmentId + "' environment.", environmentId, env.getId());

        // create feed
        Feed.Blueprint feed = Feed.Blueprint.builder().withId(feedId).build();
        postNew("/hawkular/inventory/feeds", feed);

        // create metricType
        MetricType.Blueprint metricType = MetricType.Blueprint.builder(MetricDataType.GAUGE)
                .withId(metricType1Id).withUnit(MetricUnit.BYTES).withInterval(collectionIntervalMetricType1).build();
        MetricType.Blueprint metricType2 = MetricType.Blueprint.builder(MetricDataType.GAUGE)
                .withId(metricType2Id).withUnit(MetricUnit.BYTES).withInterval(2000L).build();
        postNew("/hawkular/inventory/feeds/" + feedId + "/metricTypes", metricType);
        postNew("/hawkular/inventory/feeds/" + feedId + "/metricTypes", metricType2);

        // create metric
        Metric.Blueprint metric11 = Metric.Blueprint.builder().withId(metricId11)
                .withMetricTypePath(metricType1Id).withInterval(collectionIntervalMetric11).build();
        Metric.Blueprint metric12 = Metric.Blueprint.builder().withId(metricId12)
                .withMetricTypePath(metricType1Id).build();
        Metric.Blueprint metric21 = Metric.Blueprint.builder().withId(metricId21)
                .withMetricTypePath(metricType2Id).build();
        postNew("/hawkular/inventory/feeds/" + feedId + "/metrics", metric11);
        postNew("/hawkular/inventory/feeds/" + feedId + "/metrics", metric12);
        postNew("/hawkular/inventory/feeds/" + feedId + "/metrics", metric21);
    }

    @Test(dependsOnGroups = "createInventory", groups = "enablePrediction")
    public void testEnablePrediction() throws Throwable {
        // enable prediction for all metrics
        Map<String, Object> properties = Collections.singletonMap(FORECAST_HORIZON, forecastingHorizonTenant);
        Relationship relationshipToTenant = new Relationship("ids", PREDICTION_REL,
                CanonicalPath.of().tenant(tenantId).get(),
                CanonicalPath.of().tenant(tenantId).get(),
                properties);
        relationIdToTenant = locationId(postNewWithResponse("/hawkular/inventory/tenants/relationships",
                relationshipToTenant));
        Thread.sleep(1500);
        getWithRetries("/hawkular/datamining/metrics/" + metricId11, 10, 2000, tenantId);
        getWithRetries("/hawkular/datamining/metrics/" + metricId12, 10, 2000, tenantId);
        getWithRetries("/hawkular/datamining/metrics/" + metricId21, 10, 2000, tenantId);
        // check forecasting horizon
        String model11 = getWithRetries("/hawkular/datamining/metrics/" + metricId11, 10, 2000, tenantId);
        String model12 = getWithRetries("/hawkular/datamining/metrics/" + metricId12, 10, 2000, tenantId);
        Assert.assertTrue(model11.contains("" + forecastingHorizonTenant));
        // check collectionIntervalMetric11
        Assert.assertTrue(model11.contains("" + collectionIntervalMetric11));
        Assert.assertTrue(model12.contains("" + collectionIntervalMetricType1));

        // enable prediction metric21
        properties = Collections.singletonMap(FORECAST_HORIZON, forecastingHorizonMetric21);
        Relationship relationshipToMetric21 = new Relationship("ids", PREDICTION_REL,
                CanonicalPath.of().tenant(tenantId).get(),
                CanonicalPath.of().tenant(tenantId).feed(feedId).metric(metricId21).get(),
                properties);
        relationIdToMetric21 = locationId(postNewWithResponse("/hawkular/inventory/tenants/relationships",
                relationshipToMetric21));
        Thread.sleep(1500);
        // check forecasting horizon
        Assert.assertTrue(getWithRetries("/hawkular/datamining/metrics/" + metricId21, 10, 2000, tenantId)
                .contains("" + forecastingHorizonMetric21));

        // enable prediction metricType2
        properties = Collections.singletonMap(FORECAST_HORIZON, forecastingHorizonMetricType2);
        Relationship relationshipToMetricType2 = new Relationship("id", PREDICTION_REL,
                CanonicalPath.of().tenant(tenantId).get(),
                CanonicalPath.of().tenant(tenantId).feed(feedId).metricType(metricType2Id).get(),
                properties);
        relationIdToMetricType2 = locationId(postNewWithResponse("/hawkular/inventory/tenants/relationships",
                relationshipToMetricType2));
        Thread.sleep(1500);
        // check forecasting horizon
        Assert.assertTrue(getWithRetries("/hawkular/datamining/metrics/" + metricId21, 10, 2000, tenantId)
                .contains("" + forecastingHorizonMetric21));
    }

    @Test(dependsOnGroups = "enablePrediction", groups = {"disablePrediction"})
    public void testDisablePrediction() throws Throwable {
        // remove prediction metric21
        Relationship relationshipToMetric21 = new Relationship(relationIdToMetric21, "s", CanonicalPath.empty().get(),
                CanonicalPath.empty().get());
        deleteObject("/hawkular/inventory/tenants/relationships", relationshipToMetric21);
        Thread.sleep(1500);
        // check forecasting horizon
        Assert.assertTrue(getWithRetries("/hawkular/datamining/metrics/" + metricId21, 10, 2000, tenantId)
                .contains("" + forecastingHorizonMetricType2));

        // remove prediction metricType2
        Relationship relationshipToMetricType2 = new Relationship(relationIdToMetricType2, "", CanonicalPath.empty()
                .get(), CanonicalPath.empty().get());
        deleteObject("/hawkular/inventory/tenants/relationships", relationshipToMetricType2);
        Thread.sleep(1500);
        // check forecasting horizon
        Assert.assertTrue(getWithRetries("/hawkular/datamining/metrics/" + metricId21, 10, 2000, tenantId)
                .contains("" + forecastingHorizonTenant));

        // remove prediction tenant
        Relationship relationshipToTenant = new Relationship(relationIdToTenant, "", CanonicalPath.empty().get(),
                CanonicalPath.empty().get());
        deleteObject("/hawkular/inventory/tenants/relationships", relationshipToTenant);
        Thread.sleep(1500);
        // check forecasting horizon
        try {
            getWithRetries("/hawkular/datamining/metrics/" + metricId11, 1, 2000, tenantId);
            Assert.fail("ShouldFail");
        } catch (AssertionError ex) {
            if (ex.getMessage().equals("ShouldFail")) {Assert.fail();}
        }
        try {
            getWithRetries("/hawkular/datamining/metrics/" + metricId12, 1, 2000, tenantId);
            Assert.fail("ShouldFail");
        } catch (AssertionError ex) {
            if (ex.getMessage().equals("ShouldFail")) {Assert.fail();}
        }
        try {
            getWithRetries("/hawkular/datamining/metrics/" + metricId21, 1, 2000, tenantId);
            Assert.fail("ShouldFail");
        } catch (AssertionError ex) {
            if (ex.getMessage().equals("ShouldFail")) {Assert.fail();}
        }
    }

    @Test(dependsOnGroups = {"createInventory", "disablePrediction"})
    public void testChangeMetricCollectionInterval() throws Throwable {
        Map<String, Object> properties = Collections.singletonMap(FORECAST_HORIZON, forecastingHorizonTenant);
        Relationship relationshipToTenant = new Relationship("ids", PREDICTION_REL,
                CanonicalPath.of().tenant(tenantId).get(),
                CanonicalPath.of().tenant(tenantId).get(),
                properties);
        String relationIdToTenant = locationId(postNewWithResponse("/hawkular/inventory/tenants/relationships",
                relationshipToTenant));
        Thread.sleep(1500);
        // check prediction enabled
        getWithRetries("/hawkular/datamining/metrics/" + metricId11, 10, 2000, tenantId);

        // change collection interval of metric11
        Long newCollectionIntervalMetric1 = 4589624L;
        Metric.Update metric11Update = Metric.Update.builder().withInterval(newCollectionIntervalMetric1).build();
        putObject("/hawkular/inventory/feeds/" + feedId + "/metrics/" + metricId11, metric11Update);
        Thread.sleep(1500);
        Assert.assertTrue(getWithRetries("/hawkular/datamining/metrics/" + metricId11, 10, 2000, tenantId)
                .contains("" + newCollectionIntervalMetric1));

        // change collection interval of Type1,
        Long newCollectionIntervalMetricType1 = 123957L;
        MetricType.Update metricType1Update = MetricType.Update.builder()
                .withInterval(newCollectionIntervalMetricType1).build();
        Assert.assertTrue(getWithRetries("/hawkular/datamining/metrics/" + metricId12, 10, 2000, tenantId)
                .contains("" + collectionIntervalMetricType1));
        putObject("/hawkular/inventory/feeds/" + feedId + "/metricTypes/" + metricType1Id, metricType1Update);
        Thread.sleep(1500);
        Assert.assertTrue(getWithRetries("/hawkular/datamining/metrics/" + metricId12, 10, 2000, tenantId)
                .contains("" + newCollectionIntervalMetricType1));
        Assert.assertTrue(getWithRetries("/hawkular/datamining/metrics/" + metricId11, 10, 2000, tenantId)
                .contains("" + newCollectionIntervalMetric1));

        //delete relationship
        Relationship relationshipToTenantDelete = new Relationship(relationIdToTenant, "", CanonicalPath.empty().get(),
                CanonicalPath.empty().get());
        deleteObject("/hawkular/inventory/tenants/relationships", relationshipToTenantDelete);
    }

    protected String getWithRetries(String path, int attemptCount, long attemptDelay, String tenantId)
            throws Throwable {

        Throwable e = null;
        String url = baseURI + path;
        for (int i = 0; i < attemptCount; i++) {
            try {
                Request request = newAuthRequest().url(url).header("Hawkular-Tenant", tenantId).build();
                Response response = client.newCall(request).execute();
                String responseBody = response.body().string();
                Assert.assertEquals("Response msg: " + responseBody, 200, response.code());
                System.out.println("Got after " + (i + 1) + " retries: " + url);
                return responseBody;
            } catch (Throwable t) {
                /* some initial attempts may fail */
                e = t;
            }
            System.out.println("URL [" + url + "] not ready yet on " + (i + 1) + " of " + attemptCount
                    + " attempts, about to retry after " + attemptDelay + " ms");
            Thread.sleep(attemptDelay);
        }
        if (e != null) {
            throw e;
        } else {
            throw new AssertionError("Could not get [" + url + "]");
        }
    }

    protected Response postNewWithResponse(String path, Object payload) throws Throwable {
        String json = mapper.writeValueAsString(payload);
        Response response = post(path, json);
        Assert.assertEquals("Response msg: " + response.body().string(), 201, response.code());
        return response;
    }

    protected Response deleteObject(String path, Object payload) throws Throwable {
        String json = mapper.writeValueAsString(payload);
        Response response = delete(path, json);
        Assert.assertEquals("Response msg: " + response.body().string(), 204, response.code());
        return response;
    }

    protected Response delete(String path, String payload) throws Throwable {
        Request request =
                newAuthRequest().url(baseURI + path).delete(RequestBody.create(MEDIA_TYPE_JSON, payload)).build();
        return client.newCall(request).execute();
    }

    protected Response putObject(String path, Object payload) throws Throwable {
        String json = mapper.writeValueAsString(payload);
        Response response = put(path, json);
        Assert.assertEquals("Response msg: " + response.body().string(), 204, response.code());
        return response;
    }

    protected Response put(String path, String payload) throws Throwable {
        Request request =
                newAuthRequest().url(baseURI + path).put(RequestBody.create(MEDIA_TYPE_JSON, payload)).build();
        return client.newCall(request).execute();
    }

    public String locationId(Response response) {
        String location = response.header("Location");
        String locationId = location.substring(location.lastIndexOf("/") + 1);

        return locationId;
    }
}
