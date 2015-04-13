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
package org.hawkular.component.availcreator;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;

import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.HttpClientBuilder;
import org.hawkular.bus.common.BasicMessage;
import org.hawkular.bus.common.ConnectionContextFactory;
import org.hawkular.bus.common.Endpoint;
import org.hawkular.bus.common.MessageProcessor;
import org.hawkular.bus.common.ObjectMessage;
import org.hawkular.bus.common.producer.ProducerConnectionContext;

import com.google.gson.Gson;

/**
 * Publish Avail data
 *
 * @author Heiko W. Rupp
 */
@Stateless
public class AvailPublisher {

    // Avoid concurrent Asynchronous calls to REST services. There seems to be a serious issue with undertow and
    // concurrent async calls, which hangs the thread.  (note - this is a pooled MDB, not a singleton)
    //@Asynchronous
    // I don't think we need to propagate the Tx here, just make the rest call outside of a Tx.
    @TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
    public void sendToMetricsViaRest(List<SingleAvail> availabilities) {
        // Send it to metrics via rest

        HttpClient client = HttpClientBuilder.create().build();

        for (SingleAvail avr : availabilities) {

            String rid = avr.id;
            String tenantId = avr.tenantId;

            HttpPost request = new HttpPost("http://localhost:8080/hawkular-metrics/" + tenantId +
                    "/metrics/availability/" + rid + "/data");

            Availability availability = new Availability(avr.timestamp, avr.avail.toLowerCase());
            List<Availability> list = new ArrayList<>(1);
            list.add(availability);
            String payload = new Gson().toJson(list);
            request.setEntity(new StringEntity(payload, ContentType.APPLICATION_JSON));

            try {
                HttpResponse response = client.execute(request);
                if (response.getStatusLine().getStatusCode() > 399) {
                    Log.LOG.availPostStatus(response.getStatusLine().toString());
                }
            } catch (IOException e) {
                e.printStackTrace();  // TODO: Customize this generated block
            }
        }
    }

    public void publishToTopic(List<SingleAvail> availRecordList, MetricReceiver metricReceiver) {
        if (metricReceiver.topic != null) {
            Map<String, Object> outer = new HashMap<>(1);
            Map<String, Object> data = new HashMap<>(2);
            data.put("data", availRecordList);
            outer.put("availData", data);

            try (ConnectionContextFactory factory = new ConnectionContextFactory(metricReceiver.connectionFactory)) {
                Endpoint endpoint = new Endpoint(Endpoint.Type.TOPIC, metricReceiver.topic.getTopicName());
                ProducerConnectionContext pc = factory.createProducerConnectionContext(endpoint);
                BasicMessage msg = new ObjectMessage(outer);
                MessageProcessor processor = new MessageProcessor();
                processor.send(pc, msg);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        else {
            Log.LOG.wNoTopicConnection("HawkularAvailData");
        }
    }
}
