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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.fasterxml.jackson.core.JsonParseException;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

/**
 * Deserialize incoming json Links into Link objects
 * Our input is like this:
 *
 * <pre>
 * {
 * "operationDefinitions": {
 * "href": "http://localhost:7080/rest/operation/definitions?resourceId=10584"
 * }
 * }
 * </pre>
 *
 * @author Heiko W. Rupp
 * @see LinkSerializer
 * @since 0.0.1
 */
public class LinkDeserializer extends JsonDeserializer<Link> {

    Pattern textPattern = Pattern.compile("\\S+"); // Non whitespace; could possibly be narrowed

    @Override
    public Link deserialize(JsonParser jp, DeserializationContext ctxt) throws IOException {

        String tmp = jp.getText(); // {
        validate(jp, tmp, "{");
        jp.nextToken(); // skip over { to the rel
        String rel = jp.getText();
        validateText(jp, rel);
        jp.nextToken(); // skip over  {
        tmp = jp.getText();
        validate(jp, tmp, "{");
        jp.nextToken(); // skip over "href"
        tmp = jp.getText();
        validate(jp, tmp, "href");
        jp.nextToken(); // skip to "http:// ... "
        String href = jp.getText();
        validateText(jp, href);
        jp.nextToken(); // skip }
        tmp = jp.getText();
        validate(jp, tmp, "}");
        jp.nextToken(); // skip }
        tmp = jp.getText();
        validate(jp, tmp, "}");

        Link link = new Link(rel, href);

        return link;
    }

    private void validateText(JsonParser jsonParser, String input) throws JsonProcessingException {
        Matcher m = textPattern.matcher(input);
        if (!m.matches()) {
            throw new JsonParseException("Unexpected token: " + input, jsonParser.getTokenLocation());
        }
    }

    private void validate(JsonParser jsonParser, String input, String expected) throws JsonProcessingException {
        if (!input.equals(expected)) {
            throw new JsonParseException("Unexpected token: " + input, jsonParser.getTokenLocation());
        }
    }
}
