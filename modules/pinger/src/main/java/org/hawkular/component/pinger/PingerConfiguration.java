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

/**
 * A class to have the REST end point URLs on one place.
 *
 * @author <a href="https://github.com/ppalaga">Peter Palaga</a>
 */
public class PingerConfiguration {

    private static final PingerConfiguration DEFAULTS = new PingerConfiguration(
            "http://localhost:8080/hawkular/inventory", "http://localhost:8080/hawkular-metrics");

    public static PingerConfiguration defaults() {
        return DEFAULTS;
    }

    private final String inventoryBaseUri;
    private final String metricsBaseUri;

    public PingerConfiguration(String inventoryBaseUri, String metricsBaseUri) {
        super();
        this.inventoryBaseUri = inventoryBaseUri;
        this.metricsBaseUri = metricsBaseUri;
    }

    public String getInventoryBaseUri() {
        return inventoryBaseUri;
    }

    public String getMetricsBaseUri() {
        return metricsBaseUri;
    }
}
