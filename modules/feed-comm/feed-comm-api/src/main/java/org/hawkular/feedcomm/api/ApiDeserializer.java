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
package org.hawkular.feedcomm.api;

import org.hawkular.bus.common.BasicMessage;

/**
 * Given the special syntax of "apiName=JSON" this will deserialize the JSON into the appropriate API POJO.
 */
public class ApiDeserializer {

    // note that this assumes this class is in the same package as all the API POJOs
    private static final String API_PKG = ApiDeserializer.class.getPackage().getName();

    /**
     * Returns a string that encodes the given object as a JSON message but then
     * prefixes that JSON with additional information that a Hawkular client will
     * need to be able to deserialize the JSON.
     *
     * This string can be used to deserialize the object via {@link #deserialize(String)}.
     *
     * @param msg the message object that will be serialized into JSON
     * @return a string that includes the JSON that can be used by other Hawkular endpoints to deserialize the message.
     */
    public static String toHawkularFormat(BasicMessage msg) {
        return String.format("%s=%s", msg.getClass().getSimpleName(), msg.toJSON());
    }

    private static String[] fromHawkularFormat(String msg) {
        String[] nameAndJsonArray = msg.split("=", 2);
        if (nameAndJsonArray.length != 2) {
            throw new IllegalArgumentException("Cannot deserialize: [" + msg + "]");
        }
        return nameAndJsonArray;
    }

    public ApiDeserializer() {
    }

    public <T extends BasicMessage> T deserialize(String nameAndJson) {
        String[] nameAndJsonArray = fromHawkularFormat(nameAndJson);
        String name = nameAndJsonArray[0];
        String json = nameAndJsonArray[1];

        // The name is the actual name of the POJO that is used to deserialize the JSON.
        // If not fully qualified with a package then assume it is in our package.
        if (name.indexOf(".") == -1) {
            name = String.format("%s.%s", API_PKG, name);
        }

        try {
            Class<T> pojo = (Class<T>) Class.forName(name);
            return BasicMessage.fromJSON(json, pojo);
        } catch (Exception e) {
            throw new RuntimeException("Cannot deserialize: [" + nameAndJson + "]", e);
        }
    }
}
