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
import org.junit.Assert;
import org.junit.Test;

public class ApiDeserializerTest {

    @Test
    public void testApiDeserializer() {
        ApiDeserializer ad = new ApiDeserializer();

        String nameAndJson = EchoRequest.class.getName() + "={\"echoMessage\":\"msg\"}";
        BasicMessage request = ad.deserialize(nameAndJson);
        Assert.assertTrue(request instanceof EchoRequest);
        EchoRequest echoRequest = (EchoRequest) request;
        Assert.assertEquals("msg", echoRequest.getEchoMessage());
    }

    @Test
    public void testApiDeserializerError() {
        ApiDeserializer ad = new ApiDeserializer();

        String nameAndJson = EchoRequest.class.getName() + "={\"boo\":\"msg\"}";
        try {
            ad.deserialize(nameAndJson);
            Assert.fail("Should not have deserialized");
        } catch (Exception ok) {
        }
    }

}
