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
package org.hawkular.inventory.rest.json;

import javax.enterprise.inject.Produces;

import org.hawkular.inventory.rest.cdi.Our;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * @author Lukas Krejci
 * @since 0.4.0
 */
public class ObjectMapperProvider {

    private final JacksonConfig config = new JacksonConfig();

    @Produces
    @Our
    public ObjectMapper getDefaultObjectMapper() {
        return config.getContext(ObjectMapper.class);
    }

    @Produces
    @JsonLd
    public ObjectMapper getJsonLdObjectMapper() {
        return config.getContext(EmbeddedObjectMapper.class);
    }
}
