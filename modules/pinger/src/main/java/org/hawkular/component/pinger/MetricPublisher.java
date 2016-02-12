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
package org.hawkular.component.pinger;

import java.util.Arrays;

import javax.annotation.PostConstruct;
import javax.annotation.Resource;
import javax.ejb.Asynchronous;
import javax.ejb.Singleton;
import javax.jms.ConnectionFactory;
import javax.jms.JMSContext;
import javax.jms.JMSException;
import javax.jms.JMSProducer;
import javax.jms.Queue;
import javax.jms.TextMessage;

/**
 * Publish metrics data
 *
 * @author Heiko W. Rupp
 */
@Singleton
public class MetricPublisher {
    @Resource(mappedName = "java:/queue/hawkular/metrics/gauges/new")
    Queue gaugesQueue;

    @Resource(mappedName = "java:/HawkularBusConnectionFactory")
    private ConnectionFactory connectionFactory;

    private JMSContext context;
    private JMSProducer producer;

    @PostConstruct
    public void createContext() {
        context = connectionFactory.createContext();
        producer = context.createProducer();
    }

    /**
     * Submits data from {@link PingStatus} to Metrics via Bus
     *
     * @param status
     *            the {@link PingStatus} to publish
     */
    @Asynchronous
    public void publish(PingStatus status) {
        final PingDestination dest = status.getDestination();
        final String resourceId = dest.getResourceId();
        final long timestamp = status.getTimestamp();
        MetricDataMessage message = new MetricDataMessage();
        MetricDataMessage.MetricData metricData = new MetricDataMessage.MetricData();

        MetricDataMessage.SingleMetric durationMetric = new MetricDataMessage.SingleMetric(
                resourceId,
                timestamp,
                status.getDuration()
        );

        MetricDataMessage.SingleMetric statusCodeMetric = new MetricDataMessage.SingleMetric(
                resourceId,
                timestamp,
                status.getCode()
        );

        metricData.setTenantId(status.getDestination().getTenantId());
        metricData.setData(Arrays.asList(durationMetric, statusCodeMetric));
        message.setMetricData(metricData);

        TextMessage jmsMessage = context.createTextMessage();
        String json = message.toJSON();
        try {
            jmsMessage.setText(json);
            producer.send(gaugesQueue, jmsMessage);
        } catch (JMSException e) {
            Log.LOG.eCouldNotSendMessage(e);
        }

    }

}
