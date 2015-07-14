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

import org.junit.Assert;
import org.junit.Test;

public class GenericErrorResponseBuilderTest {

    @Test
    public void testBuilder() {
        GenericErrorResponseBuilder bldr;
        GenericErrorResponse response;

        // empty response
        bldr = new GenericErrorResponseBuilder();
        response = bldr.build();
        Assert.assertNull(response.getErrorMessage());
        Assert.assertNull(response.getStackTrace());

        // error message only
        bldr = new GenericErrorResponseBuilder();
        bldr.setErrorMessage("err msg");
        response = bldr.build();
        Assert.assertEquals("err msg", response.getErrorMessage());
        Assert.assertNull(response.getStackTrace());

        // stack trace only (even if that doesn't really make sense)
        bldr = new GenericErrorResponseBuilder();
        bldr.setStackTrace("stack trace here");
        response = bldr.build();
        Assert.assertEquals("stack trace here", response.getStackTrace());
        Assert.assertNull(response.getErrorMessage());

        // use Throwable to set both error message and stack trace
        bldr = new GenericErrorResponseBuilder();
        bldr.setThrowable(new Exception("TEST!"));
        response = bldr.build();
        Assert.assertEquals("TEST!", response.getErrorMessage());
        Assert.assertTrue(response.getStackTrace().startsWith("java.lang.Exception: TEST!"));

        // use the static method to do it
        response = GenericErrorResponseBuilder.buildWithThrowable(new Exception("TEST!"));
        Assert.assertEquals("TEST!", response.getErrorMessage());
        Assert.assertTrue(response.getStackTrace().startsWith("java.lang.Exception: TEST!"));
    }

}
