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

import java.io.IOException;
import java.net.UnknownHostException;
import java.util.concurrent.Future;

import javax.ejb.AsyncResult;
import javax.ejb.Asynchronous;
import javax.ejb.Stateless;

import org.apache.http.HttpResponse;
import org.apache.http.StatusLine;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpHead;
import org.apache.http.impl.client.HttpClientBuilder;

/**
 * Bean that does the pinging. Runs async.
 *
 * @author Heiko W. Rupp
 *
 */
@Stateless
public class Pinger {

    @Asynchronous
    public Future<PingStatus> ping(PingStatus status) {

        HttpHead head = new HttpHead(status.destination.url);
        HttpClient client = HttpClientBuilder.create().build();

        try {
            HttpResponse httpResponse = client.execute(head);
            StatusLine statusLine = httpResponse.getStatusLine();
            long now = System.currentTimeMillis();

            status.code = statusLine.getStatusCode();
            status.duration = (int) (now - status.getTimestamp());
            status.setTimestamp(now);
        } catch (UnknownHostException e) {
            status.code = 404;
        } catch (IOException e) {
            Log.LOG.wPingExeption(e.getMessage());
            status.code = 500;
        } finally {
            head.releaseConnection();
        }

        return new AsyncResult<>(status);
    }
}
