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
import org.apache.http.StatusLine;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpHead;
import org.apache.http.impl.client.HttpClientBuilder;

import javax.ejb.Stateless;
import javax.ejb.Timeout;
import java.io.IOException;
import java.net.UnknownHostException;

/**
 * Bean that does the pinging
 *
 * @author Heiko W. Rupp
 *
 * TODO should this be a MDB, so that we can have many requests in the pipe?
 */
@Stateless
public class Pinger {

    @Timeout()
    public PingStatus ping(PingDestination destination) {

        HttpHead head = new HttpHead(destination.url);
        HttpClient client = HttpClientBuilder.create().build();


        long t1 = System.currentTimeMillis();
        PingStatus status = new PingStatus(destination,t1);

        try {
            HttpResponse httpResponse = client.execute(head);
            StatusLine statusLine = httpResponse.getStatusLine();
            long t2 = System.currentTimeMillis();

            status.code = statusLine.getStatusCode();
            status.duration = (int)(t2-t1);
            status.setTimestamp(t2);
        } catch (UnknownHostException e) {
            status.code = 404;
            status.setTimestamp(t1);
        } catch (IOException e) {
            Log.LOG.wPingExeption(e.getMessage());
            status.setTimestamp(t1);
            status.code = 500;
        } finally {
            head.releaseConnection();
        }

        return status;

    }
}
