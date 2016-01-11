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
package org.hawkular.rx.cdi;

import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.ext.ContextResolver;
import javax.ws.rs.ext.Provider;

import org.hawkular.inventory.api.model.CanonicalPath;
import org.hawkular.inventory.api.model.RelativePath;
import org.hawkular.inventory.json.InventoryJacksonConfig;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

/**
 * @author Jirka Kremser
 * @since 0.1.0
 */
@Provider
@Produces(MediaType.APPLICATION_JSON)
public class JacksonConfig implements ContextResolver<ObjectMapper> {

    private ObjectMapper mapper;


    public JacksonConfig() {
        this.mapper = new ObjectMapper();
        initializeObjectMapper(this.mapper);

//        SimpleModule relationshipModule = new SimpleModule("RelationshipModule",
//                new Version(0, 1, 0, null, "org.hawkular.inventory",
//                        "inventory-rest-api"));
//        relationshipModule.addSerializer(Relationship.class, new RelationshipJacksonSerializer());
//        relationshipModule.addDeserializer(Relationship.class, new RelationshipJacksonDeserializer());
//
//        this.mapper.registerModule(relationshipModule);
    }

    public static void initializeObjectMapper(ObjectMapper mapper) {
        mapper.enable(SerializationFeature.INDENT_OUTPUT);
        mapper.disable(SerializationFeature.WRITE_NULL_MAP_VALUES);
        mapper.disable(SerializationFeature.WRITE_EMPTY_JSON_ARRAYS);
        mapper.setSerializationInclusion(JsonInclude.Include.NON_EMPTY);
        mapper.enable(JsonParser.Feature.ALLOW_SINGLE_QUOTES);
        mapper.enable(JsonParser.Feature.ALLOW_UNQUOTED_FIELD_NAMES);
        mapper.setSerializationInclusion(JsonInclude.Include.NON_EMPTY);
        mapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);

        InventoryJacksonConfig.configure(mapper);
        //need to reconfigure for path serialization
        mapper.addMixIn(CanonicalPath.class, PathSerializationMixin.class);
        mapper.addMixIn(RelativePath.class, PathSerializationMixin.class);
    }

    @Override public ObjectMapper getContext(Class<?> type) {
        return mapper;
    }
}
