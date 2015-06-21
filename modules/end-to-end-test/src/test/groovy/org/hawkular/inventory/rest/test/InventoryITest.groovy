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
 * @author jkremser
 */
class InventoryITest extends AbstractTestBase {
    private static final String inventoryEndpoint = "/hawkular/inventory"

    private static final String urlTypeId = "URL"
    private static final String testEnvId = "test"
    private static final String environmentId = "itest-env-" + UUID.randomUUID().toString()
    private static final String pingableHostRTypeId = "itest-pingable-host-" + UUID.randomUUID().toString()
    private static final String roomRTypeId = "itest-room-type-" + UUID.randomUUID().toString()
    private static final String typeVersion = "1.0"
    private static final String responseTimeMTypeId = "itest-response-time-" + UUID.randomUUID().toString()
    private static final String responseStatusCodeMTypeId = "itest-response-status-code-" + UUID.randomUUID().toString()
    private static final String statusDurationMTypeId = "status.duration.type"
    private static final String statusCodeMTypeId = "status.code.type"
    private static final String host1ResourceId = "itest-host1-" + UUID.randomUUID().toString();
    private static final String host2ResourceId = "itest-host2-" + UUID.randomUUID().toString();
    private static final String room1ResourceId = "itest-room1-" + UUID.randomUUID().toString();
    private static final String responseTimeMetricId = "itest-response-time-" + host1ResourceId;
    private static final String responseStatusCodeMetricId = "itest-response-status-code-" + host1ResourceId;
    private static final String feedId = "itest-feed-" + UUID.randomUUID().toString();

    /* key is the path to delete while value is the path to GET to verify the deletion */
    private static Map<String, String> pathsToDelete = new LinkedHashMap();

    private static String tenantId;

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
        tenantId = response.data.id

        /* Ensure the "test" env was autocreated.
         * We will do several attempts because race conditions
         * may happen between this script and WildFly Agent
         * who may have triggered the same initial tasks in Inventory.
         * A successfull GET to /hawkular/inventory/environments/test
         * should mean that all initial tasks are over */
        path = "$inventoryEndpoint/environments/$testEnvId"
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
        response = postDeletable(path: "environments", body: [id : environmentId])
        assertEquals(201, response.status)
        assertEquals(baseURI + "$inventoryEndpoint/environments/$environmentId", response.headers.Location)

        /* URL resource type should have been autocreated */
        response = client.get(path: "$inventoryEndpoint/resourceTypes/$urlTypeId")
        assertEquals(200, response.status)
        assertEquals(urlTypeId, response.data.id)

        /* Create a custom resource type */
        response = postDeletable(path: "resourceTypes", body: [id : pingableHostRTypeId, version : typeVersion])
        assertEquals(201, response.status)
        assertEquals(baseURI + "$inventoryEndpoint/resourceTypes/$pingableHostRTypeId", response.headers.Location)

        /* Create another resource type */
        response = postDeletable(path: "resourceTypes", body: [id : roomRTypeId, version : typeVersion])
        assertEquals(201, response.status)
        assertEquals(baseURI + "$inventoryEndpoint/resourceTypes/$roomRTypeId", response.headers.Location)

        /* Create a metric type */
        response = postDeletable(path: "metricTypes", body: [id : responseTimeMTypeId, unit : "MILLI_SECOND"])
        assertEquals(201, response.status)
        assertEquals(baseURI + "$inventoryEndpoint/metricTypes/$responseTimeMTypeId", response.headers.Location)

        /* Create another metric type */
        response = postDeletable(path: "metricTypes", body: [id : responseStatusCodeMTypeId, unit : "NONE"])
        assertEquals(201, response.status)
        assertEquals(baseURI + "$inventoryEndpoint/metricTypes/$responseStatusCodeMTypeId", response.headers.Location)

        /* link pingableHostRTypeId with responseTimeMTypeId and responseStatusCodeMTypeId */
        path = "$inventoryEndpoint/resourceTypes/$pingableHostRTypeId/metricTypes"
        response = client.post(path: path,
                body : [responseTimeMTypeId, responseStatusCodeMTypeId])
        assertEquals(204, response.status)
        pathsToDelete.put("$path/$responseTimeMTypeId", "$path/$responseTimeMTypeId")
        pathsToDelete.put("$path/$responseStatusCodeMTypeId", "$path/$responseStatusCodeMTypeId")

        /* add a metric */
        response = postDeletable(path: "$environmentId/metrics",
                body: [ id : responseTimeMetricId, metricTypeId : responseTimeMTypeId ]);
        assertEquals(201, response.status)
        assertEquals(baseURI + "$inventoryEndpoint/$environmentId/metrics/$responseTimeMetricId", response.headers.Location)

        /* add another metric */
        response = postDeletable(path: "$environmentId/metrics",
                body: [ id : responseStatusCodeMetricId, metricTypeId : responseStatusCodeMTypeId ]);
        assertEquals(201, response.status)
        assertEquals(baseURI + "$inventoryEndpoint/$environmentId/metrics/$responseStatusCodeMetricId", response.headers.Location)

        /* add a resource */
        response = postDeletable(path: "$environmentId/resources",
            body: [ id : host1ResourceId, resourceTypeId: pingableHostRTypeId ])
        assertEquals(201, response.status)
        assertEquals(baseURI + "$inventoryEndpoint/$environmentId/resources/$host1ResourceId", response.headers.Location)

        /* add another resource */
        response = postDeletable(path: "$environmentId/resources",
            body: [ id : host2ResourceId, resourceTypeId: pingableHostRTypeId ])
        assertEquals(201, response.status)
        assertEquals(baseURI + "$inventoryEndpoint/$environmentId/resources/$host2ResourceId", response.headers.Location)

        /* add a room resource */
        response = postDeletable(path: "$environmentId/resources",
            body: [ id : room1ResourceId, resourceTypeId: roomRTypeId ])
        assertEquals(201, response.status)
        assertEquals(baseURI + "$inventoryEndpoint/$environmentId/resources/$room1ResourceId", response.headers.Location)

        /* link the metric to resource */
        path = "$inventoryEndpoint/$environmentId/resources/$host1ResourceId/metrics"
        response = client.post(path: path,
            body: [responseTimeMetricId, responseStatusCodeMetricId]);
        assertEquals(204, response.status)
        pathsToDelete.put("$path/$responseTimeMetricId", "$path/$responseTimeMetricId")
        pathsToDelete.put("$path/$responseStatusCodeMetricId", "$path/$responseStatusCodeMetricId")

        /* add a feed */
        response = postDeletable(path: "$environmentId/feeds", body: [id: feedId])
        assertEquals(201, response.status)
        assertEquals(baseURI + "$inventoryEndpoint/$environmentId/feeds/$feedId", response.headers.Location)

        /* add a custom relationship, no need to clean up, it'll be deleted together with the resources */
        def relation = [id        : 42, // it's ignored anyway
                        source    : tenantId + "/" + environmentId + "/resources/" + host2ResourceId,
                        name      : "inTheSameRoom",
                        target    : tenantId + "/" + environmentId + "/resources/" + host1ResourceId,
                        properties: [
                                from      : "2000-01-01",
                                confidence: "90%"
                        ]]
        response = client.post(path: "$inventoryEndpoint/$environmentId/resources/$host2ResourceId/relationships",
                body: relation)
        assertEquals(201, response.status)

    }

//    @AfterClass
//    static void deleteEverything() {
//        /* the following would delete all data of the present user. We cannot do that as long as we do not have
//         * a dedicated user for running this very single test class. */
//        // def response = client.delete(path : "$inventoryEndpoint/tenant")
//        // assertEquals(204, response.status)
//
//        /* Let's delete the entities one after another in the reverse order as we created them */
//        List<Map.Entry> entries = new ArrayList<Map.Entry>(pathsToDelete.entrySet())
//        Collections.reverse(entries)
//        for (Map.Entry en : entries) {
//            String path = en.getKey();
//            String getValidationPath = en.getValue();
//            def response = client.delete(path : path)
//            assertEquals(204, response.status)
//
//            if (getValidationPath != null) {
//                try {
//                    response = client.get(path : getValidationPath)
//                    Assert.fail("The path '$getValidationPath' should not exist after the entity was deleted")
//                } catch (groovyx.net.http.HttpResponseException e) {
//                    assertEquals("Error message for path '$path'", "Not Found", e.getMessage())
//                }
//            }
//        }
//
//
//    }

//    Off, see https://issues.jboss.org/browse/HWKINVENT-69
//    @Test
//    void ping() {
//        def response = client.get(path: "")
//        assertEquals(200, response.status)
//    }

    @Test
    void testEnvironmentsCreated() {
        assertEntitiesExist("environments", [testEnvId, environmentId])
    }

    @Test
    void testResourceTypesCreated() {
        assertEntityExists("resourceTypes/$urlTypeId", urlTypeId)
        assertEntityExists("resourceTypes/$pingableHostRTypeId", pingableHostRTypeId)
        assertEntityExists("resourceTypes/$roomRTypeId", roomRTypeId)

        assertEntitiesExist("resourceTypes", [urlTypeId, pingableHostRTypeId, roomRTypeId])

    }

    @Test
    void testMetricTypesCreated() {
        assertEntityExists("metricTypes/$responseTimeMTypeId", responseTimeMTypeId)
        assertEntityExists("metricTypes/$statusDurationMTypeId", statusDurationMTypeId)
        assertEntityExists("metricTypes/$statusCodeMTypeId", statusCodeMTypeId)
        assertEntitiesExist("metricTypes",
            [responseTimeMTypeId, responseStatusCodeMTypeId, statusDurationMTypeId, statusCodeMTypeId])
    }

    @Test
    void testMetricTypesLinked() {
        assertEntitiesExist("resourceTypes/$pingableHostRTypeId/metricTypes",
            [responseTimeMTypeId, responseStatusCodeMTypeId])
    }

    @Test
    void testResourcesCreated() {
        assertEntityExists("$environmentId/resources/$host1ResourceId", host1ResourceId)
        assertEntityExists("$environmentId/resources/$host2ResourceId", host2ResourceId)
        assertEntityExists("$environmentId/resources/$room1ResourceId", room1ResourceId)
    }

    @Test
    void testResourcesFilters() {
        def response = client.get(path: "$inventoryEndpoint/$environmentId/resources",
            query: [type: pingableHostRTypeId, typeVersion: typeVersion])
        assertEquals(2, response.data.size())

        response = client.get(path: "$inventoryEndpoint/$environmentId/resources",
            query: [type: roomRTypeId, typeVersion: typeVersion])
        assertEquals(1, response.data.size())

    }

    @Test
    void testMetricsCreated() {
        assertEntityExists("$environmentId/metrics/$responseTimeMetricId", responseTimeMetricId)
        assertEntityExists("$environmentId/metrics/$responseStatusCodeMetricId", responseStatusCodeMetricId)
        assertEntitiesExist("$environmentId/metrics", [ responseTimeMetricId, responseStatusCodeMetricId ])
    }

    @Test
    void testMetricsLinked() {
        assertEntitiesExist("$environmentId/resources/$host1ResourceId/metrics",
            [ responseTimeMetricId, responseStatusCodeMetricId ])
    }

    @Test
    void testPaging() {
        String path = "$inventoryEndpoint/$environmentId/resources"
        def response = client.get(path: path, query: [type: pingableHostRTypeId, typeVersion: typeVersion, page: 0, per_page: 2, sort: "id"])
        assertEquals(2, response.data.size())

        def first = response.data.get(0)
        def second = response.data.get(1)

        response = client.get(path: path, query: [type: pingableHostRTypeId, typeVersion: typeVersion, page: 0, per_page: 1, sort: "id"])
        assertEquals(1, response.data.size())
        assertEquals(first, response.data.get(0))

        response = client.get(path: path, query: [type: pingableHostRTypeId, typeVersion: typeVersion, page: 1, per_page: 1, sort: "id"])
        assertEquals(1, response.data.size())
        assertEquals(second, response.data.get(0))

        response = client.get(path: path, query: [type: pingableHostRTypeId, typeVersion: typeVersion, page : 0, per_page: 1, sort: "id",
                                                                               order: "desc"])
        assertEquals(1, response.data.size())
        assertEquals(second, response.data.get(0))

        response = client.get(path: path, query: [type: pingableHostRTypeId, typeVersion: typeVersion, page : 1, per_page: 1, sort: "id",
                                                                               order: "desc"])
        assertEquals(1, response.data.size())
        assertEquals(first, response.data.get(0))
    }

    @Test
    void testTenantsContainEnvironments() {
        assertRelationshipExists("tenants/$tenantId/relationships",
                "tenants/$tenantId",
                "contains",
                "$tenantId/environments/$environmentId")

        assertRelationshipJsonldExists("tenants/$tenantId/relationships",
                tenantId,
                "contains",
                environmentId)
    }

    @Test
    void testTenantsContainResourceTypes() {
        assertRelationshipExists("resourceTypes/$urlTypeId/relationships",
                "tenants/$tenantId",
                "contains",
                "$tenantId/resourceTypes/$urlTypeId")

        assertRelationshipExists("tenants/$tenantId/relationships",
                "tenants/$tenantId",
                "contains",
                "$tenantId/resourceTypes/$pingableHostRTypeId")
    }

    @Test
    void testTenantsContainMetricTypes() {
        assertRelationshipExists("metricTypes/$responseTimeMTypeId/relationships",
                "tenants/$tenantId",
                "contains",
                "$tenantId/metricTypes/$responseTimeMTypeId")

        assertRelationshipExists("tenants/$tenantId/relationships",
                "tenants/$tenantId",
                "contains",
                "$tenantId/metricTypes/$statusCodeMTypeId")
    }


    @Test
    void testEnvironmentsContainResources() {
        assertRelationshipExists("environments/$environmentId/relationships",
                "$tenantId/environments/$environmentId",
                "contains",
                "$tenantId/$environmentId/resources/$host2ResourceId")

        assertRelationshipExists("environments/$environmentId/relationships",
                "$tenantId/environments/$environmentId",
                "contains",
                "$tenantId/$environmentId/resources/$host1ResourceId")

        assertRelationshipJsonldExists("environments/$environmentId/relationships",
                environmentId,
                "contains",
                host1ResourceId)

        assertRelationshipJsonldExists("environments/$environmentId/relationships",
                environmentId,
                "contains",
                host2ResourceId)
    }

    @Test
    void testEnvironmentsContainFeeds() {
        assertRelationshipExists("environments/$environmentId/relationships",
                "$tenantId/environments/$environmentId",
                "contains",
                "$tenantId/$environmentId/feeds/$feedId")

        assertRelationshipJsonldExists("environments/$environmentId/relationships",
                environmentId,
                "contains",
                feedId)
    }

    @Test
    void testEnvironmentsContainMetrics() {
        assertRelationshipExists("environments/$environmentId/relationships",
                "$tenantId/environments/$environmentId",
                "contains",
                "$tenantId/$environmentId/metrics/$responseTimeMetricId")

        assertRelationshipExists("environments/$environmentId/relationships",
                "$tenantId/environments/$environmentId",
                "contains",
                "$tenantId/$environmentId/metrics/$responseStatusCodeMetricId")

        assertRelationshipJsonldExists("environments/$environmentId/relationships",
                environmentId,
                "contains",
                responseTimeMetricId)

        assertRelationshipJsonldExists("environments/$environmentId/relationships",
                environmentId,
                "contains",
                responseStatusCodeMetricId)
    }

    @Test
    void testResourceTypesOwnMetricTypes() {
        assertRelationshipExists("resourceTypes/$pingableHostRTypeId/relationships",
                "$tenantId/resourceTypes/$pingableHostRTypeId",
                "owns",
                "$tenantId/metricTypes/$responseTimeMTypeId")

        assertRelationshipExists("metricTypes/$responseStatusCodeMTypeId/relationships",
                "$tenantId/resourceTypes/$pingableHostRTypeId",
                "owns",
                "$tenantId/metricTypes/$responseStatusCodeMTypeId")

        assertRelationshipJsonldExists("resourceTypes/$pingableHostRTypeId/relationships",
                pingableHostRTypeId,
                "owns",
                responseTimeMTypeId)
    }

    @Test
    void testResourcesOwnMetrics() {
        assertRelationshipExists("$environmentId/resources/$host1ResourceId/relationships",
                "$tenantId/$environmentId/resources/$host1ResourceId",
                "owns",
                "$tenantId/$environmentId/metrics/$responseStatusCodeMetricId")

        assertRelationshipExists("$environmentId/resources/$host2ResourceId/relationships",
                "$tenantId/$environmentId/resources/$host2ResourceId",
                "owns",
                "$tenantId/$environmentId/metrics/$responseTimeMetricId")

        assertRelationshipJsonldExists("$environmentId/resources/$host2ResourceId/relationships",
                host2ResourceId,
                "owns",
                responseTimeMetricId)
    }

    @Test
    void testResourceTypesDefinesResources() {
        assertRelationshipExists("resourceTypes/$pingableHostRTypeId/relationships",
                "$tenantId/resourceTypes/$pingableHostRTypeId",
                "defines",
                "$tenantId/$environmentId/resources/$host2ResourceId")

        assertRelationshipJsonldExists("resourceTypes/$pingableHostRTypeId/relationships",
                urlTypeId,
                "defines",
                host2ResourceId)
    }

    @Test
    void testMetricTypesDefinesMetrics() {
        assertRelationshipJsonldExists("metricTypes/$responseStatusCodeMTypeId/relationships",
                responseStatusCodeMTypeId,
                "defines",
                responseStatusCodeMetricId)

        assertRelationshipJsonldExists("metricTypes/$responseTimeMTypeId/relationships",
                responseTimeMTypeId,
                "defines",
                responseStatusCodeMetricId)
    }

    @Test
    void testCustomRelationship() {
        assertRelationshipJsonldExists("$environmentId/resources/$host2ResourceId/relationships",
                host2ResourceId,
                "inTheSameRoom",
                host1ResourceId)
    }

    @Test
    void testRelationshipFiltering() {
        assertRelationshipExists("$environmentId/resources/$host2ResourceId/relationships",
                "$tenantId/$environmentId/resources/$host2ResourceId",
                "inTheSameRoom",
                "$tenantId/$environmentId/resources/$host1ResourceId", [property: "from", propertyValue: "2000-01-01"])

        assertRelationshipExists("$environmentId/resources/$host2ResourceId/relationships",
                "$tenantId/$environmentId/resources/$host2ResourceId",
                "inTheSameRoom",
                "$tenantId/$environmentId/resources/$host1ResourceId", [property: "confidence", propertyValue: "90%"])

        assertRelationshipExists("$environmentId/resources/$host2ResourceId/relationships",
                "$tenantId/$environmentId/resources/$host2ResourceId",
                "inTheSameRoom",
                "$tenantId/$environmentId/resources/$host1ResourceId", [named: "inTheSameRoom"])
    }

    private static void assertEntityExists(path, id) {
        def response = client.get(path: "$inventoryEndpoint/$path")
        assertEquals(200, response.status)
        assertEquals(id, response.data.id)
    }

    private static void assertEntitiesExist(path, ids) {
        def response = client.get(path: "$inventoryEndpoint/$path")

        //noinspection GroovyAssignabilityCheck
        def expectedIds = new ArrayList<>(ids)
        def entityIds = response.data.collect{ it.id }
        ids.forEach{entityIds.remove(it); expectedIds.remove(it)}

        Assert.assertTrue("Unexpected entities with ids: " + entityIds, entityIds.empty)
        Assert.assertTrue("Following entities not found: " + expectedIds, expectedIds.empty)
    }

    private static void assertRelationshipJsonldExists(path, source, label, target) {
        def response = client.get(path: "$inventoryEndpoint/$path", query: [jsonld: true])
        def needle = new Tuple(source, label, target);
        def haystack = response.data.collect{ new Tuple(it["source"]["shortId"], it["name"],
                it["target"]["shortId"])  }
        assert haystack.any{it == needle} : "Following edge not found: " + needle
        haystack.clear()
    }

    private static void assertRelationshipExists(path, source, label, target, query = [:]) {
        def response = client.get(path: "$inventoryEndpoint/$path", query: query)
        def needle = new Tuple(source, label, target);
        def haystack = response.data.collect{ new Tuple(it["source"], it["name"],
                it["target"])  }
        assert haystack.any{it == needle} : "Following edge not found: " + needle
        haystack.clear()
    }

    /* Add the deletable path to {@link #pathsToDelete} and send a {@code POST} request using the given map of
     * arguments. */
    private static Object postDeletable(Map args) {
        String getVerificationPath = args.path + "/" + args.body.id
        postDeletable(args, getVerificationPath)
    }
    private static Object postDeletable(Map args, String getVerificationPath) {
        args.path = inventoryEndpoint + "/" + args.path
        String path = args.path + "/" + args.body.id
        pathsToDelete.put(path, inventoryEndpoint + "/" + getVerificationPath)
        return client.post(args)
    }
}
