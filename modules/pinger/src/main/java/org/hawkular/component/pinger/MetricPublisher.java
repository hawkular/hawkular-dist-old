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

import com.google.gson.Gson;
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
import org.hawkular.metrics.client.common.SingleMetric;

import javax.ejb.Asynchronous;
import javax.ejb.Stateless;
import javax.jms.ConnectionFactory;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Publish metrics data
 *
 * @author Heiko W. Rupp
 */
@Stateless
public class MetricPublisher {

    @javax.annotation.Resource( lookup = "java:/topic/HawkularMetricData")
    javax.jms.Topic topic;

    @javax.annotation.Resource (lookup = "java:/HawkularBusConnectionFactory")
    ConnectionFactory connectionFactory;


    /**
     * Send a list of metric data for a tenant to the Hawkular-metrics service via REST
     * @param tenantId Name of the tenant
     * @param metrics List of metrics
     */
    @Asynchronous
    public void sendToMetricsViaRest(String tenantId, List<Map<String, Object>> metrics) {
        // Send it to metrics via rest
        String payload = new Gson().toJson(metrics);
        HttpClient client = HttpClientBuilder.create().build();
        HttpPost request = new HttpPost("http://localhost:8080/hawkular-metrics/" + tenantId +
                        "/metrics/numeric/data");
        request.setEntity(new StringEntity(payload, ContentType.APPLICATION_JSON));


        try {
            HttpResponse response = client.execute(request);
            if (response.getStatusLine().getStatusCode()>399) {
                Log.LOG.metricPostStatus(response.getStatusLine().toString());
            }
        } catch (IOException e) {
            e.printStackTrace();  // TODO: Customise this generated block
        }
    }

    /**
     * Put a list of metric data on the Metrics topic.
     * @param tenantId Id of the tenant
     * @param metrics Metrics to publish
     */
    @Asynchronous
    public void publishToTopic(String tenantId, List<SingleMetric> metrics) {
        if (topic != null) {

            try ( ConnectionContextFactory factory = new ConnectionContextFactory(connectionFactory)) {

                Map<String,Object> outer = new HashMap<>(1);

                Map<String,Object> data = new HashMap<>(2);
                data.put("tenantId",tenantId);
                data.put("data",metrics);

                outer.put("metricData",data);

                Endpoint endpoint = new Endpoint(Endpoint.Type.TOPIC,topic.getTopicName());
                ProducerConnectionContext pc = factory.createProducerConnectionContext(endpoint);
                BasicMessage msg = new ObjectMessage(outer);
                MessageProcessor processor = new MessageProcessor();
                processor.send(pc, msg);
            }
            catch (Exception e) {
                e.printStackTrace();
            }
        }
        else {
            Log.LOG.wNoTopicConnection("HawkularMetricData");
        }
    }


}
