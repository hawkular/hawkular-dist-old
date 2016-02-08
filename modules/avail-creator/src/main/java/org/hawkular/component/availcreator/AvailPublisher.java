/*
 * Copyright 2015-2016 Red Hat, Inc. and/or its affiliates
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
package org.hawkular.component.availcreator;

import static javax.ejb.TransactionAttributeType.NOT_SUPPORTED;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import javax.ejb.Asynchronous;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;

import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.HttpClientBuilder;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Publish Avail data
 *
 * @author Heiko W. Rupp
 */
@Stateless
@TransactionAttribute(NOT_SUPPORTED)
public class AvailPublisher {

    private static final String METRICS_BASE_URI;
    static {
        String host = System.getProperty("jboss.bind.address", "localhost");
        String port = System.getProperty("jboss.http.port", "8080");
        METRICS_BASE_URI = "http://"+ host + ":"+ port + "/hawkular/metrics";
    }

    @Asynchronous
    public void sendToMetricsViaRest(List<SingleAvail> availabilities) {
        // Send it to metrics via rest

        HttpClient client = HttpClientBuilder.create().build();

        for (SingleAvail avr : availabilities) {

            String rid = avr.id;
            String tenantId = avr.tenantId;

            HttpPost request = new HttpPost(METRICS_BASE_URI + "/availability/" + rid + "/data");
            request.addHeader("Hawkular-Tenant", tenantId);

            Availability availability = new Availability(avr.timestamp, avr.avail.toLowerCase());
            List<Availability> list = new ArrayList<>(1);
            list.add(availability);
            String payload;
            try {
                payload = new ObjectMapper().writeValueAsString(list);
            } catch (JsonProcessingException e) {
                Log.LOG.eCouldNotParseMessage(e);
                return;
            }
            request.setEntity(new StringEntity(payload, ContentType.APPLICATION_JSON));

            try {
                HttpResponse response = client.execute(request);
                if (response.getStatusLine().getStatusCode() > 399) {
                    Log.LOG.wAvailPostStatus(response.getStatusLine().toString());
                }
            } catch (IOException e) {
                Log.LOG.wAvailPostStatus(e.getMessage());
            }
        }
    }
}
