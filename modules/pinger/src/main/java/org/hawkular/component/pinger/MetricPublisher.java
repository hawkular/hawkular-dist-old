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
import javax.jms.JMSException;
import javax.ws.rs.client.Client;
import javax.ws.rs.client.ClientBuilder;
import javax.ws.rs.client.Entity;
import javax.ws.rs.client.WebTarget;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
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
     * Send a list of metric data for a tenant to the Hwkular-metrics service via REST
     * @param tenantId Name of the tenant
     * @param metrics List of metrics
     */
    @Asynchronous
    public void sendToMetricsViaRest(String tenantId, List<SingleMetric> metrics) {
        // Send it to metrics via rest
        Client client = ClientBuilder.newClient();
        WebTarget target = client.target("http://localhost:8080/hawkular/metrics/" + tenantId +
                "/metrics/numeric/data");


        Entity<List<SingleMetric>> payload = Entity.entity(metrics, MediaType.APPLICATION_JSON_TYPE);
        Response response = target.request().post(payload);

        Log.LOG.metricPostStatus( response.getStatus() + " : " + response.getStatusInfo());
    }

    /**
     * Put a list of metric data on the Metrics topic.
     * @param tenantId
     * @param metrics Metrics to publish
     */
    @Asynchronous
    public void publishToTopic(String tenantId, List<SingleMetric> metrics) {
        if (topic != null) {

            ConnectionContextFactory factory = null;
            try {

                Map<String,Object> data = new HashMap<>(2);
                data.put("tenantId",tenantId);
                data.put("data",metrics);

                Endpoint endpoint = new Endpoint(Endpoint.Type.TOPIC,topic.getTopicName());
                factory = new ConnectionContextFactory(connectionFactory);
                ProducerConnectionContext pc = factory.createProducerConnectionContext(endpoint);
                BasicMessage msg = new ObjectMessage(data);
                MessageProcessor processor = new MessageProcessor();
                processor.send(pc, msg);
            }
            catch (Exception e) {
                e.printStackTrace();
            }
            finally {
                if (factory!=null) {
                    try {
                        factory.close();
                    } catch (JMSException e) {
                        e.printStackTrace();  // TODO: Customise this generated block
                    }
                }
            }
        }
        else {
            Log.LOG.wNoTopicConnection("HawkularMetricData");
        }
    }


}
