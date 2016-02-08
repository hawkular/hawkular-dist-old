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

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

import javax.ejb.ActivationConfigProperty;
import javax.ejb.EJB;
import javax.ejb.MessageDriven;
import javax.ejb.TransactionAttribute;
import javax.jms.Message;
import javax.jms.MessageListener;
import javax.jms.TextMessage;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Receiver that listens on JMS Topic and checks for metrics *.status.code
 * Listening goes on 'java:/topic/HawkularMetricData'.
 * Then computes availability and forwards that to a topic for availability
 *
 * Requires this in standalone.xml:
 *
 *  <admin-object use-java-context="true"
 *      enabled="true"
 *      class-name="org.apache.activemq.command.ActiveMQTopic"
 *      jndi-name="java:/topic/HawkularAvailData"
 *      pool-name="HawkularAvailData">
 *            <config-property name="PhysicalName">HawkularAvailData</config-property>
 *  </admin-object>
 *
 * @author Heiko W. Rupp
 */
@MessageDriven(activationConfig = {
        @ActivationConfigProperty(propertyName = "destinationType", propertyValue = "javax.jms.Topic"),
        @ActivationConfigProperty(propertyName = "destination", propertyValue = "HawkularMetricData")
})
@TransactionAttribute(value = NOT_SUPPORTED)
public class MetricReceiver implements MessageListener {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @EJB
    AvailPublisher availPublisher;

    @Override
    public void onMessage(Message message) {

        try {
            String payload = ((TextMessage) message).getText();
            JsonNode rootNode = objectMapper.readTree(payload);

            JsonNode metricData = rootNode.get("metricData");
            // Get <rid>.status.code  metrics
            String tenant = metricData.get("tenantId").textValue();
            JsonNode data = metricData.get("data");
            List<SingleAvail> outer = new ArrayList<>();

            Iterator<JsonNode> items = data.elements();
            while (items.hasNext()) {
                JsonNode item = items.next();

                String source = item.get("source").textValue();
                if (source.endsWith(".status.code")) {
                    int code = item.get("value").intValue();

                    String id = source.substring(0, source.indexOf("."));
                    long timestamp = item.get("timestamp").longValue();

                    String avail = computeAvail(code);

                    SingleAvail ar = new SingleAvail(tenant, id, timestamp, avail);
                    outer.add(ar);
                }
            }
            if (!outer.isEmpty()) {
                availPublisher.sendToMetricsViaRest(outer);
            }

        } catch (Exception e) {
            Log.LOG.eCouldNotHandleBusMessage(e);
        }

    }

    /**
     * Do the work of computing the availability from the status code
     * @param code Status code of the web request
     * @return "UP" or "DOWN" accordingly
     */
    private String computeAvail(int code) {
        if (code <= 399) {
            return "UP";
        }
        return "DOWN";
    }

}
