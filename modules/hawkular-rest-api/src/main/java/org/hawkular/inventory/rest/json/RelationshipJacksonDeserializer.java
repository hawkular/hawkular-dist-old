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

import static org.hawkular.inventory.rest.json.RelationshipJacksonSerializer.FIELD_ID;
import static org.hawkular.inventory.rest.json.RelationshipJacksonSerializer.FIELD_NAME;
import static org.hawkular.inventory.rest.json.RelationshipJacksonSerializer.FIELD_PROPERTIES;
import static org.hawkular.inventory.rest.json.RelationshipJacksonSerializer.FIELD_SOURCE;
import static org.hawkular.inventory.rest.json.RelationshipJacksonSerializer.FIELD_TARGET;

import java.io.IOException;
import java.util.Map;
import java.util.Spliterator;
import java.util.Spliterators;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

import org.hawkular.inventory.api.model.CanonicalPath;
import org.hawkular.inventory.api.model.Relationship;
import org.hawkular.inventory.rest.security.EntityIdUtils;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonNode;

/**
 *
 * This class should contain the inverse function for
 * {@link RelationshipJacksonSerializer#serialize(org.hawkular.inventory.api.model.Relationship,
 * com.fasterxml.jackson.core.JsonGenerator, com.fasterxml.jackson.databind.SerializerProvider)}
 *
 * @author Jirka Kremser
 * @since 0.1.0
 */
public class RelationshipJacksonDeserializer extends JsonDeserializer<Relationship> {

    @Override
    public Relationship deserialize(JsonParser jp, DeserializationContext deserializationContext) throws
            IOException {
        JsonNode node = jp.getCodec().readTree(jp);
        String id = node.get(FIELD_ID) != null ? node.get(FIELD_ID).asText(): null;

        // other fields are not compulsory, e.g. when deleting the relationship {id: foo} is just fine
        String name = "";
        if (node.get(FIELD_NAME) != null) {
            name = node.get(FIELD_NAME).asText();
        }
        CanonicalPath source = null, target = null;
        if (node.get(FIELD_SOURCE) != null && !node.get(FIELD_SOURCE).asText().isEmpty()) {
            String sourcePath = node.get(FIELD_SOURCE).asText();
            source = CanonicalPath.fromString(sourcePath);
        }
        if (node.get(FIELD_TARGET) != null && !node.get(FIELD_TARGET).asText().isEmpty()) {
            String targetPath = node.get(FIELD_TARGET).asText();
            target = CanonicalPath.fromString(targetPath);
        }

        JsonNode properties = node.get(FIELD_PROPERTIES);
        Map<String, Object> relProperties = null;
        if (properties != null) {
            try {
                Stream<Map.Entry<String, JsonNode>> stream = StreamSupport
                        .stream(Spliterators.spliteratorUnknownSize(properties.fields(), Spliterator.ORDERED), false);

                relProperties = stream
                        .collect(Collectors.toMap(Map.Entry::getKey,
                                ((Function<Map.Entry<String, JsonNode>, JsonNode>) Map.Entry::getValue)
                                        .andThen(x -> (Object) x.asText())));
            } catch (Exception e) {
                throw new IllegalArgumentException("Error during relationship deserialization," +
                        " unable to recognize properties: " + properties);
            }
        }

        return new Relationship(id, name, source, target, relProperties);
    }

    private void validatePath(String path){
        if (!EntityIdUtils.isValidRestPath(path)) {
            throw new IllegalArgumentException("Error during relationship deserialization," +
                    " unable to recognize following path: " + path);
        }
    }
}
