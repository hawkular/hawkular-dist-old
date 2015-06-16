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
package org.hawkular.inventory.rest.test

import java.util.Map;

import org.junit.AfterClass
import org.junit.Assert;
import org.junit.BeforeClass
import org.junit.Test
import org.hawkular.integration.test.AbstractTestBase

import static org.junit.Assert.assertEquals

/**
 * Test the basic inventory functionality via REST.
 *
 * @author Heiko W. Rupp
 * @author <a href="https://github.com/ppalaga">Peter Palaga</a>
 */
class InventoryITest extends AbstractTestBase {
    private static final String urlTypeId = "URL"
    private static final String testEnvId = "test"
    private static final String environmentId = "itest-env-" + UUID.randomUUID().toString()
    private static final String pingableHostRTypeId = "itest-pingable-host-" + UUID.randomUUID().toString()
    private static final String responseTimeMTypeId = "itest-response-time-" + UUID.randomUUID().toString()
    private static final String responseStatusCodeMTypeId = "itest-response-status-code-" + UUID.randomUUID().toString()
    private static final String statusDurationMTypeId = "status.duration.type"
    private static final String statusCodeMTypeId = "status.code.type"
    private static final String host1ResourceId = "itest-host1-" + UUID.randomUUID().toString();
    private static final String host2ResourceId = "itest-host2-" + UUID.randomUUID().toString();
    private static final String responseTimeMetricId = "itest-response-time-" + host1ResourceId;
    private static final String responseStatusCodeMetricId = "itest-response-status-code-" + host1ResourceId;
    private static final String feedId = "itest-feed-" + UUID.randomUUID().toString();

    /* key is the path to delete while value is the path to GET to verify the deletion */
    private static Map<String, String> pathsToDelete = new LinkedHashMap();

    @BeforeClass
    static void setupData() {

        /* Make sure we can access the tenant first.
         * We will do several attempts because race conditions
         * may happen between this script and WildFly Agent
         * who may have triggered the same initial tasks in Accounts */
        def response = null
        int attemptCount = 5;
        int delay = 500;
        String path = "/hawkular-accounts/personas/current"
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
        String tenantId = response.data.id

        /* Ensure the "test" env was autocreated.
         * We will do several attempts because race conditions
         * may happen between this script and WildFly Agent
         * who may have triggered the same initial tasks in Inventory.
         * A successfull GET to /hawkular/inventory/environments/test
         * should mean that all initial tasks are over */
        path = "/hawkular/inventory/environments/$testEnvId"
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

        /* Create an environment that will be used exclusively by this test */
        response = postDeletable(path: "/hawkular/inventory/environments", body: [id : environmentId])
        assertEquals(201, response.status)
        assertEquals(baseURI + "/hawkular/inventory/environments/$environmentId", response.headers.Location)

        /* URL resource type should have been autocreated */
        response = client.get(path: "/hawkular/inventory/resourceTypes/$urlTypeId")
        assertEquals(200, response.status)
        assertEquals(urlTypeId, response.data.id)

        /* Create a custom resource type */
        response = postDeletable(path: "/hawkular/inventory/resourceTypes", body: [id : pingableHostRTypeId, version : "1.0"])
        assertEquals(201, response.status)
        assertEquals(baseURI + "/hawkular/inventory/resourceTypes/$pingableHostRTypeId", response.headers.Location)

        /* Create a metric type */
        response = postDeletable(path: "/hawkular/inventory/metricTypes", body: [id : responseTimeMTypeId, unit : "MILLI_SECOND"])
        assertEquals(201, response.status)
        assertEquals(baseURI + "/hawkular/inventory/metricTypes/$responseTimeMTypeId", response.headers.Location)

        /* Create another metric type */
        response = postDeletable(path: "/hawkular/inventory/metricTypes", body: [id : responseStatusCodeMTypeId, unit : "NONE"])
        assertEquals(201, response.status)
        assertEquals(baseURI + "/hawkular/inventory/metricTypes/$responseStatusCodeMTypeId", response.headers.Location)

        /* link pingableHostRTypeId with responseTimeMTypeId and responseStatusCodeMTypeId */
        path = "/hawkular/inventory/resourceTypes/$pingableHostRTypeId/metricTypes"
        response = client.post(path: path,
                body : [responseTimeMTypeId, responseStatusCodeMTypeId])
        assertEquals(204, response.status)
        pathsToDelete.put("$path/$responseTimeMTypeId", "$path/$responseTimeMTypeId")
        pathsToDelete.put("$path/$responseStatusCodeMTypeId", "$path/$responseStatusCodeMTypeId")

        /* add a metric */
        response = postDeletable(path: "/hawkular/inventory/$environmentId/metrics",
                body: [ id : responseTimeMetricId, metricTypeId : responseTimeMTypeId ]);
        assertEquals(201, response.status)
        assertEquals(baseURI + "/hawkular/inventory/$environmentId/metrics/$responseTimeMetricId", response.headers.Location)

        /* add another metric */
        response = postDeletable(path: "/hawkular/inventory/$environmentId/metrics",
                body: [ id : responseStatusCodeMetricId, metricTypeId : responseStatusCodeMTypeId ]);
        assertEquals(201, response.status)
        assertEquals(baseURI + "/hawkular/inventory/$environmentId/metrics/$responseStatusCodeMetricId", response.headers.Location)

        /* add a resource */
        response = postDeletable(path: "/hawkular/inventory/$environmentId/resources",
            body: [ id : host1ResourceId, resourceTypeId: pingableHostRTypeId ])
        assertEquals(201, response.status)
        assertEquals(baseURI + "/hawkular/inventory/$environmentId/resources/$host1ResourceId", response.headers.Location)

        /* add another resource */
        response = postDeletable(path: "/hawkular/inventory/$environmentId/resources",
            body: [ id : host2ResourceId, resourceTypeId: pingableHostRTypeId ])
        assertEquals(201, response.status)
        assertEquals(baseURI + "/hawkular/inventory/$environmentId/resources/$host2ResourceId", response.headers.Location)

        /* link the metric to resource */
        path = "/hawkular/inventory/$environmentId/resources/$host1ResourceId/metrics"
        response = client.post(path: path,
            body: [responseTimeMetricId, responseStatusCodeMetricId]);
        assertEquals(204, response.status)
        pathsToDelete.put("$path/$responseTimeMetricId", "$path/$responseTimeMetricId")
        pathsToDelete.put("$path/$responseStatusCodeMetricId", "$path/$responseStatusCodeMetricId")

        /* add a feed */
        response = postDeletable(path: "/hawkular/inventory/$environmentId/feeds", body: [ id : feedId ])
        assertEquals(201, response.status)
        assertEquals(baseURI + "/hawkular/inventory/$environmentId/feeds/$feedId", response.headers.Location)

    }

    @AfterClass
    static void deleteEverything() {
        /* the following would delete all data of the present user. We cannot do that as long as we do not have
         * a dedicated user for running this very single test class. */
        // def response = client.delete(path : "/hawkular/inventory/tenant")
        // assertEquals(204, response.status)

        /* Let's delete the entities one after another in the reverse order as we created them */
        List<Map.Entry> entries = new ArrayList<Map.Entry>(pathsToDelete.entrySet())
        Collections.reverse(entries)
        for (Map.Entry en : entries) {
            String path = en.getKey();
            String getValidationPath = en.getValue();
            def response = client.delete(path : path)
            assertEquals(204, response.status)

            if (getValidationPath != null) {
                try {
                    response = client.get(path : getValidationPath)
                    Assert.fail("The path '$getValidationPath' should not exist after the entity was deleted")
                } catch (groovyx.net.http.HttpResponseException e) {
                    assertEquals("Error message for path '$path'", "Not Found", e.getMessage())
                }
            }
        }


    }

//    Off, see https://issues.jboss.org/browse/HWKINVENT-69
//    @Test
//    void ping() {
//        def response = client.get(path: "")
//        assertEquals(200, response.status)
//    }

    @Test
    void testEnvironmentsCreated() {
        assertEntitiesExist("/hawkular/inventory/environments", [testEnvId, environmentId])
    }

    @Test
    void testResourceTypesCreated() {
        assertEntityExists("/hawkular/inventory/resourceTypes/$urlTypeId", urlTypeId)
        assertEntityExists("/hawkular/inventory/resourceTypes/$pingableHostRTypeId", pingableHostRTypeId)

        assertEntitiesExist("/hawkular/inventory/resourceTypes", [urlTypeId, pingableHostRTypeId])

    }

    @Test
    void testMetricTypesCreated() {
        assertEntityExists("/hawkular/inventory/metricTypes/$responseTimeMTypeId", responseTimeMTypeId)
        assertEntityExists("/hawkular/inventory/metricTypes/$statusDurationMTypeId", statusDurationMTypeId)
        assertEntityExists("/hawkular/inventory/metricTypes/$statusCodeMTypeId", statusCodeMTypeId)
        assertEntitiesExist("/hawkular/inventory/metricTypes",
            [responseTimeMTypeId, responseStatusCodeMTypeId, statusDurationMTypeId, statusCodeMTypeId])
    }

    @Test
    void testMetricTypesLinked() {
        assertEntitiesExist("/hawkular/inventory/resourceTypes/$pingableHostRTypeId/metricTypes",
            [responseTimeMTypeId, responseStatusCodeMTypeId])
    }

    @Test
    void testResourcesCreated() {
        assertEntityExists("/hawkular/inventory/$environmentId/resources/$host1ResourceId", host1ResourceId)
    }

    @Test
    void testMetricsCreated() {
        assertEntityExists("/hawkular/inventory/$environmentId/metrics/$responseTimeMetricId", responseTimeMetricId)
        assertEntityExists("/hawkular/inventory/$environmentId/metrics/$responseStatusCodeMetricId", responseStatusCodeMetricId)
        assertEntitiesExist("/hawkular/inventory/$environmentId/metrics", [ responseTimeMetricId, responseStatusCodeMetricId ])
    }

    @Test
    void testMetricsLinked() {
        assertEntitiesExist("/hawkular/inventory/$environmentId/resources/$host1ResourceId/metrics",
            [ responseTimeMetricId, responseStatusCodeMetricId ])
    }

    @Test
    void testPaging() {
        String path = "/hawkular/inventory/$environmentId/resources"
        def response = client.get(path: path, query: [type: pingableHostRTypeId, page: 0, per_page: 2, sort: "id"])
        assertEquals(2, response.data.size())

        def first = response.data.get(0)
        def second = response.data.get(1)

        response = client.get(path: path, query: [type: pingableHostRTypeId, page: 0, per_page: 1, sort: "id"])
        assertEquals(1, response.data.size())
        assertEquals(first, response.data.get(0))

        response = client.get(path: path, query: [type: pingableHostRTypeId, page: 1, per_page: 1, sort: "id"])
        assertEquals(1, response.data.size())
        assertEquals(second, response.data.get(0))

        response = client.get(path: path, query: [type: pingableHostRTypeId, page : 1, per_page: 1, sort: "id",
                                                                               order: "desc"])
        assertEquals(1, response.data.size())
        assertEquals(first, response.data.get(0))
    }

    private static void assertEntityExists(path, id) {
        def response = client.get(path: path)
        assertEquals(200, response.status)
        assertEquals(id, response.data.id)
    }

    private static void assertEntitiesExist(path, ids) {
        def response = client.get(path: path)

        //noinspection GroovyAssignabilityCheck
        def expectedIds = new ArrayList<>(ids)
        def entityIds = response.data.collect{ it.id }
        ids.forEach{entityIds.remove(it); expectedIds.remove(it)}

        Assert.assertTrue("Unexpected entities with ids: " + entityIds, entityIds.empty)
        Assert.assertTrue("Following entities not found: " + expectedIds, expectedIds.empty)
    }

    /* Add the deletable path to {@link #pathsToDelete} and send a {@code POST} request using the given map of
     * arguments. */
    private static Object postDeletable(Map args) {
        String getVerificationPath = args.path + "/" + args.body.id
        postDeletable(args, getVerificationPath)
    }
    private static Object postDeletable(Map args, String getVerificationPath) {
        String path = args.path + "/" + args.body.id
        pathsToDelete.put(path, getVerificationPath)
        return client.post(args)
    }
}
