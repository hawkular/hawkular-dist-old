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
import org.hawkular.inventory.api.model.Resource;
import org.hawkular.inventory.api.model.ResourceType;

/**
 * @author <a href="https://github.com/ppalaga">Peter Palaga</a>
 */
public class PingerTestUtils {

    public static final String TEST_RESOURCE_ID = "test-rsrc";
    public static final String TEST_TENANT_ID = "test-tenat";
    public static final String TEST_ENVIRONMENT_ID = "test-env";
    public static final String TEST_URL = "http://hawkular.github.io";
    public static final String GET_METHOD = "GET";

    public static Resource createTestResource() {
        Map<String, Object> props = new HashMap<>();
        props.put(ResourceField.url.name(), PingerTestUtils.TEST_URL);
        props.put(ResourceField.method.name(), PingerTestUtils.GET_METHOD);
        ResourceType urlType = new ResourceType(PingerTestUtils.TEST_TENANT_ID, PingDestination.URL_TYPE);
        Resource urlResource = new Resource(PingerTestUtils.TEST_TENANT_ID, PingerTestUtils.TEST_ENVIRONMENT_ID, null,
                PingerTestUtils.TEST_RESOURCE_ID, urlType, props);
        return urlResource;
    }

    /**
     * @return
     */
    public static PingDestination createTestPingDestination() {
        return new PingDestination(PingerTestUtils.TEST_TENANT_ID, PingerTestUtils.TEST_ENVIRONMENT_ID,
                PingerTestUtils.TEST_RESOURCE_ID, PingerTestUtils.TEST_URL, PingerTestUtils.GET_METHOD);
    }
}
