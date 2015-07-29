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

import org.apache.http.HttpResponse;
import org.apache.http.HttpStatus;
import org.apache.http.HttpVersion;
import org.apache.http.message.BasicHttpResponse;
import org.junit.Assert;
import org.junit.Test;

/**
 * @author <a href="https://github.com/ppalaga">Peter Palaga</a>
 */
public class TraitsTest {

    @Test
    public void testCollect() {

        HttpResponse response = new BasicHttpResponse(HttpVersion.HTTP_1_0, HttpStatus.SC_OK, "OK");
        /* Real headers from google.cz */
        response.addHeader("Date", "Thu, 14 May 2015 16:23:11 GMT");
        response.addHeader("Expires", "-1");
        response.addHeader("Cache-Control", "private, max-age=0");
        response.addHeader("Content-Type", "text/html; charset=ISO-8859-2");
        response.addHeader("Set-Cookie", "PREF=ID=1cf542d95de677ce:FF=0:TM=1431620591: ... etc");
        response.addHeader("Set-Cookie", "NID=67=UwDo4W6rmaylwdjaMgnLW6N_Mtd5X4lFth36C ... etc");
        response.addHeader("Server", "gws");
        response.addHeader("X-XSS-Protection", "1; mode=block");
        response.addHeader("X-Frame-Options", "SAMEORIGIN");
        response.addHeader("Alternate-Protocol", "80:quic,p=1");
        response.addHeader("Accept-Ranges", "none");
        response.addHeader("Vary", "Accept-Encoding");
        response.addHeader("Transfer-Encoding", "chunked");

        String found = Traits.collect(response, 0, null).getPoweredBy();

        Assert.assertEquals("gws", found);

    }

    @Test
    public void testCollectEmpty() {

        HttpResponse response = new BasicHttpResponse(HttpVersion.HTTP_1_0, HttpStatus.SC_OK, "OK");
        String found = Traits.collect(response, 0, null).getPoweredBy();
        Assert.assertEquals(null, found);

    }

    @Test
    public void testCollectCase() {

        HttpResponse response = new BasicHttpResponse(HttpVersion.HTTP_1_0, HttpStatus.SC_OK, "OK");
        response.addHeader("sErVeR", "whatever-server");
        response.addHeader("X-POWERED-BY", "hawkular");

        String found = Traits.collect(response, 0, null).getPoweredBy();

        Assert.assertEquals("whatever-server, hawkular", found);

    }

    /**
     * Test multiple {@code X-Powered-By} headers, which occur e.g. with https://www.digitec.ch
     */
    @Test
    public void testCollectMultiple() {

        HttpResponse response = new BasicHttpResponse(HttpVersion.HTTP_1_0, HttpStatus.SC_OK, "OK");
        response.addHeader("X-Powered-By", "ASP.NET");
        response.addHeader("X-Powered-By", "ARR/2.5");
        /* yes, https://www.digitec.ch returns ASP.NET twice */
        response.addHeader("X-Powered-By", "ASP.NET");

        String found = Traits.collect(response, 0, null).getPoweredBy();

        Assert.assertEquals("ARR/2.5, ASP.NET", found);

    }

    /**
     * Test multiple {@code X-Powered-By} headers, which occur e.g. with https://www.digitec.ch
     */
    @Test
    public void testCollectAspnetVersion() {

        HttpResponse response = new BasicHttpResponse(HttpVersion.HTTP_1_0, HttpStatus.SC_OK, "OK");
        response.addHeader("X-Powered-By", "ASP.NET");
        response.addHeader("X-Powered-By", "ARR/2.5");
        response.addHeader("X-Aspnet-Version", "1.2.3");

        String found = Traits.collect(response, 0, null).getPoweredBy();

        Assert.assertEquals("ARR/2.5, ASP.NET/1.2.3", found);


        response = new BasicHttpResponse(HttpVersion.HTTP_1_0, HttpStatus.SC_OK, "OK");
        response.addHeader("X-Powered-By", "ASP.NET");
        response.addHeader("X-Aspnet-Version", "1.2.3");
        response.addHeader("X-Powered-By", "ARR/2.5");
        response.addHeader("X-Powered-By", "ASP.NET");

        found = Traits.collect(response, 0, null).getPoweredBy();

        Assert.assertEquals("ARR/2.5, ASP.NET/1.2.3", found);


        response = new BasicHttpResponse(HttpVersion.HTTP_1_0, HttpStatus.SC_OK, "OK");
        response.addHeader("X-Aspnet-Version", "1.2.3");
        response.addHeader("X-Powered-By", "ARR/2.5");

        found = Traits.collect(response, 0, null).getPoweredBy();

        Assert.assertEquals("ARR/2.5, ASP.NET/1.2.3", found);


        response = new BasicHttpResponse(HttpVersion.HTTP_1_0, HttpStatus.SC_OK, "OK");
        response.addHeader("Server", "Microsoft-IIS/8.0");
        response.addHeader("X-Aspnet-Version", "1.2.3");
        response.addHeader("X-Powered-By", "ASP.NET");

        found = Traits.collect(response, 0, null).getPoweredBy();

        Assert.assertEquals("Microsoft-IIS/8.0, ASP.NET/1.2.3", found);


    }
}
