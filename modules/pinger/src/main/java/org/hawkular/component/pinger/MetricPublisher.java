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
import java.util.ArrayList;
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

    private static void addDataItem(List<Map<String, Object>> mMetrics, String resourceId, long timestamp,
            Number value, String name) {
        Map<String, Number> dataMap = new HashMap<>(2);
        dataMap.put("timestamp", timestamp);
        dataMap.put("value", value);
        List<Map<String, Number>> data = new ArrayList<>(1);
        data.add(dataMap);
        Map<String, Object> outer = new HashMap<>(2);
        outer.put("id", resourceId + ".status." + name);
        outer.put("data", data);
        mMetrics.add(outer);
    }

    @javax.annotation.Resource(lookup = "java:/topic/HawkularMetricData")
    javax.jms.Topic topic;

    @javax.annotation.Resource(lookup = "java:/HawkularBusConnectionFactory")
    ConnectionFactory connectionFactory;

    private final PingerConfiguration configuration = PingerConfiguration.getInstance();

    /**
     * Serializes the given {@link PingStatus} and then submits it to Hawkular-metrics service via REST
     *
     * @param status
     *            the {@link PingStatus} to publish
     */
    @Asynchronous
    public void sendToMetricsViaRest(PingStatus status) {

        List<Map<String, Object>> mMetrics = new ArrayList<>();

        final PingDestination dest = status.getDestination();
        final String resourceId = dest.getResourceId();
        final long timestamp = status.getTimestamp();
        addDataItem(mMetrics, resourceId, timestamp, status.getDuration(), "duration");
        addDataItem(mMetrics, resourceId, timestamp, status.getCode(), "code");

        // Send it to metrics via rest
        String payload = new Gson().toJson(mMetrics);
        HttpClient client = HttpClientBuilder.create().build();

        HttpPost request = new HttpPost(configuration.getMetricsBaseUri() + "/gauges/data");
        request.addHeader("Hawkular-Tenant", status.getDestination().getTenantId());

        request.setEntity(new StringEntity(payload, ContentType.APPLICATION_JSON));

        try {
            HttpResponse response = client.execute(request);
            if (response.getStatusLine().getStatusCode() > 399) {
                Log.LOG.metricPostStatus(response.getStatusLine().toString());
            }
        } catch (IOException e) {
            e.printStackTrace(); // TODO: Customise this generated block
        }
    }

    /**
     * Serializes the given {@link PingStatus} and then submits it on the Metrics topic of the bus.
     *
     * @param status
     *            the {@link PingStatus} to publish
     */
    @Asynchronous
    public void publishToTopic(PingStatus status) {
        if (topic != null) {

            try (ConnectionContextFactory factory = new ConnectionContextFactory(connectionFactory)) {

                List<SingleMetric> singleMetrics = new ArrayList<>();

                final PingDestination dest = status.getDestination();
                final String resourceId = dest.getResourceId();
                final long timestamp = status.getTimestamp();

                SingleMetric singleMetric = new SingleMetric(resourceId + ".status.duration", timestamp,
                        (double) status.getDuration());
                singleMetrics.add(singleMetric);
                singleMetric = new SingleMetric(resourceId + ".status.code", timestamp, (double) status.getCode());
                singleMetrics.add(singleMetric);

                Map<String, Object> outer = new HashMap<>(1);

                Map<String, Object> data = new HashMap<>(2);
                data.put("tenantId", status.getDestination().getTenantId());
                data.put("data", singleMetrics);

                outer.put("metricData", data);

                Endpoint endpoint = new Endpoint(Endpoint.Type.TOPIC, topic.getTopicName());
                ProducerConnectionContext pc = factory.createProducerConnectionContext(endpoint);
                BasicMessage msg = new ObjectMessage(outer);
                MessageProcessor processor = new MessageProcessor();
                processor.send(pc, msg);
            } catch (Exception e) {
                e.printStackTrace();
            }
        } else {
            Log.LOG.wNoTopicConnection("HawkularMetricData");
        }
    }

}
