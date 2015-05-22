/*
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
package org.hawkular.component.pinger;

import java.util.HashMap;
import java.util.Map;

import org.hawkular.component.pinger.PingDestination.ResourceField;
import org.hawkular.component.pinger.Traits.TraitHeader;
import org.hawkular.inventory.api.model.Resource;
import org.hawkular.inventory.api.model.ResourceType;
import org.junit.Assert;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import com.google.common.collect.ImmutableMap;

/**
 * Simple test for the pinger
 *
 * @author Heiko W. Rupp
 * @author <a href="https://github.com/ppalaga">Peter Palaga</a>
 */
public class PingManagerTest {

    private static final String TEST_RESOURCE_ID = "test-rsrc";
    private static final String TEST_TENANT_ID = "test-tenat";
    private static final String TEST_ENVIRONMENT_ID = "test-env";
    private static final String TEST_URL = "http://hawkular.github.io";
    private static final String GET_METHOD = "GET";

    @Test
    public void testScheduleWork() throws Exception {

        PingManager manager = new PingManager();
        manager.pinger = new Pinger();
        Map<String, Object> props = new HashMap<>();
        props.put(ResourceField.url.name(), TEST_URL);
        props.put(ResourceField.method.name(), GET_METHOD);
        ResourceType urlType = new ResourceType(TEST_TENANT_ID, PingDestination.URL_TYPE, "0");
        Resource urlResource = new Resource(TEST_TENANT_ID, TEST_ENVIRONMENT_ID, null, TEST_RESOURCE_ID, urlType,
                props);
        manager.newUrlsCollector.call(urlResource);
        manager.metricPublisher = Mockito.mock(MetricPublisher.class);
        manager.traitsPublisher = Mockito.mock(TraitsPublisher.class);

        manager.scheduleWork();

        PingDestination expectedDest = new PingDestination(TEST_TENANT_ID, TEST_ENVIRONMENT_ID, TEST_RESOURCE_ID,
                TEST_URL, GET_METHOD);

        Map<TraitHeader, String> expectedTraitsItems = new ImmutableMap.Builder<TraitHeader, String>().put(
                TraitHeader.SERVER, "GitHub.com").build();

        ArgumentCaptor<PingStatus> metricsRestStatusCaptor = ArgumentCaptor.forClass(PingStatus.class);
        Mockito.verify(manager.metricPublisher).sendToMetricsViaRest(metricsRestStatusCaptor.capture());
        assertStatus(expectedDest, expectedTraitsItems, metricsRestStatusCaptor.getValue());

        ArgumentCaptor<PingStatus> metricsStatusCaptor = ArgumentCaptor.forClass(PingStatus.class);
        Mockito.verify(manager.metricPublisher).publishToTopic(metricsStatusCaptor.capture());
        assertStatus(expectedDest, expectedTraitsItems, metricsStatusCaptor.getValue());

        ArgumentCaptor<PingStatus> traitsStatusCaptor = ArgumentCaptor.forClass(PingStatus.class);
        Mockito.verify(manager.traitsPublisher).publish(traitsStatusCaptor.capture());
        assertStatus(expectedDest, expectedTraitsItems, traitsStatusCaptor.getValue());

    }

    private static void assertStatus(PingDestination expectedDest, Map<TraitHeader, String> expectedTraitsItems,
            PingStatus foundStatus) {
        Assert.assertEquals(expectedDest, foundStatus.getDestination());
        Assert.assertEquals(expectedTraitsItems, foundStatus.getTraits().getItems());
    }
}
