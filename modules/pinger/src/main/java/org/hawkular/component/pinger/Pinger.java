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

/**
 * Bean that does the pinging
 *
 * @author Heiko W. Rupp
 */
@Stateless
public class Pinger {

    @Timeout()
    public PingStatus ping(String destination) {

        HttpHead head = new HttpHead(destination);
        HttpClient client = HttpClientBuilder.create().build();


        PingStatus status = null;
        try {
            long t1 = System.currentTimeMillis();
            HttpResponse httpResponse = client.execute(head);
            StatusLine statusLine = httpResponse.getStatusLine();
            long t2 = System.currentTimeMillis();


            status = new PingStatus(statusLine.getStatusCode(), (int) (t2-t1));
        } catch (IOException e) {
            e.printStackTrace();  // TODO: Customise this generated block
        } finally {
            head.releaseConnection();
        }

        return status;

    }
}
