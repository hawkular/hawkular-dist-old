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

import java.util.HashMap;

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

    //@Test // put this back if we revert HAWKULAR-451, remove this if we do not revert it
    public void testApiDeserializerError() {
        ApiDeserializer ad = new ApiDeserializer();

        String nameAndJson = EchoRequest.class.getName() + "={\"boo\":\"msg\"}";
        try {
            ad.deserialize(nameAndJson);
            Assert.fail("Should not have deserialized");
        } catch (Exception ok) {
        }
    }

    @Test
    public void testExecuteOperationRequest() {
        ExecuteOperationRequest newpojo;
        ExecuteOperationRequest pojo = new ExecuteOperationRequest();
        pojo.setOperationName("opname");
        pojo.setResourceId("resid");
        pojo.setParameters(new HashMap<String, String>());
        pojo.getParameters().put("one", "1");
        pojo.getParameters().put("two", "22");
        pojo.getParameters().put("three", "333");

        newpojo = testSpecificPojo(pojo);
        Assert.assertEquals(pojo.getOperationName(), newpojo.getOperationName());
        Assert.assertEquals(pojo.getResourceId(), newpojo.getResourceId());
        Assert.assertEquals(pojo.getParameters(), newpojo.getParameters());
    }

    @Test
    public void testGenericSuccessResponse() {
        GenericSuccessResponse newpojo;
        GenericSuccessResponse pojo = new GenericSuccessResponse();
        pojo.setMessage("howdy!");

        newpojo = testSpecificPojo(pojo);
        Assert.assertEquals(pojo.getMessage(), newpojo.getMessage());
    }

    @Test
    public void testGenericErrorResponse() {
        GenericErrorResponse newpojo;
        GenericErrorResponse pojo = new GenericErrorResponse();
        pojo.setErrorMessage("howdy!");
        pojo.setStackTrace("stack trace here");

        newpojo = testSpecificPojo(pojo);
        Assert.assertEquals(pojo.getErrorMessage(), newpojo.getErrorMessage());
        Assert.assertEquals(pojo.getStackTrace(), newpojo.getStackTrace());
    }

    @Test
    public void testEchoRequest() {
        EchoRequest newpojo;
        EchoRequest pojo = new EchoRequest();
        pojo.setEchoMessage("howdy!");

        newpojo = testSpecificPojo(pojo);
        Assert.assertEquals(pojo.getEchoMessage(), newpojo.getEchoMessage());
    }

    @Test
    public void testEchoResponse() {
        EchoResponse newpojo;
        EchoResponse pojo = new EchoResponse();
        pojo.setReply("what up?");

        newpojo = testSpecificPojo(pojo);
        Assert.assertEquals(pojo.getReply(), newpojo.getReply());
    }

    // takes a POJO, gets its JSON, then deserializes that JSON back into a POJO.
    private <T extends BasicMessage> T testSpecificPojo(T pojo) {
        String nameAndJson = String.format("%s=%s", pojo.getClass().getSimpleName(), pojo.toJSON());
        System.out.println("ApiDeserializerTest: " + nameAndJson);
        ApiDeserializer ad = new ApiDeserializer();
        T results = ad.deserialize(nameAndJson);
        Assert.assertNotSame(pojo, results); // just sanity check
        return results;
    }
}
