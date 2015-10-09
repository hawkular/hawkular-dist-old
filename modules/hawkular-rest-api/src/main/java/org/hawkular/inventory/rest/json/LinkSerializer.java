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

import java.io.IOException;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;

/**
 * Special serializer for Link objects that does not map the classical {rel:abc, href:xyz} scheme,
 * but which puts the rel name "at the outside" like  { abc : { href : xyz }} to make it easier for
 * clients to access the link.
 * See also https://bugzilla.redhat.com/show_bug.cgi?id=845244
 *
 * @author Heiko W. Rupp
 * @see LinkDeserializer
 * @since 0.0.1
 */
public class LinkSerializer extends JsonSerializer<Link> {

    @Override
    public void serialize(Link link, JsonGenerator jsonGenerator,
            SerializerProvider serializerProvider) throws IOException {

        jsonGenerator.writeStartObject();
        jsonGenerator.writeFieldName(link.getRel());

        jsonGenerator.writeStartObject();
        jsonGenerator.writeFieldName("href");
        jsonGenerator.writeString(link.getHref());
        jsonGenerator.writeEndObject();

        jsonGenerator.writeEndObject();
    }
}
