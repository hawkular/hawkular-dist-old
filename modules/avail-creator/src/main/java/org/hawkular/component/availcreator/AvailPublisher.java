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

import java.util.List;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import javax.annotation.Resource;
import javax.ejb.Asynchronous;
import javax.ejb.Singleton;
import javax.ejb.TransactionAttribute;
import javax.jms.ConnectionFactory;
import javax.jms.JMSContext;
import javax.jms.JMSProducer;
import javax.jms.Queue;

import org.hawkular.component.availcreator.AvailDataMessage.AvailData;
import org.hawkular.component.availcreator.AvailDataMessage.SingleAvail;

/**
 * Publish Avail data
 *
 * @author Heiko W. Rupp
 */
@Singleton
@TransactionAttribute(NOT_SUPPORTED)
public class AvailPublisher {

    @Resource(mappedName = "java:/queue/hawkular/metrics/availability/new")
    Queue availabilityQueue;

    @Resource(mappedName = "java:/HawkularBusConnectionFactory")
    ConnectionFactory connectionFactory;

    private JMSContext context;
    private JMSProducer producer;

    @PostConstruct
    public void createContext() {
        context = connectionFactory.createContext();
        producer = context.createProducer();
    }

    @Asynchronous
    public void publish(List<SingleAvail> availabilities) {

        AvailData availData = new AvailData();
        availData.setData(availabilities);
        AvailDataMessage availDataMessage = new AvailDataMessage(availData);

        try {
            producer.send(availabilityQueue, availDataMessage.toJSON());
        } catch (Exception e) {
            Log.LOG.wAvailPostStatus(e.getMessage());
        }
    }

    @PreDestroy
    public void closeContext() {
        if (context != null) {
            try {
                context.close();
            } catch (Exception ignored) {
            }
        }
    }
}
