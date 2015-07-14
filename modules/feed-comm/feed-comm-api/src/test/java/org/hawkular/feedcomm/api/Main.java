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
package org.hawkular.feedcomm.api;

import org.hawkular.bus.common.ConnectionContextFactory;
import org.hawkular.bus.common.Endpoint;
import org.hawkular.bus.common.MessageProcessor;
import org.hawkular.bus.common.consumer.BasicMessageListener;
import org.hawkular.bus.common.consumer.ConsumerConnectionContext;
import org.hawkular.bus.common.producer.ProducerConnectionContext;

public class Main {
    private static final String BROKER_URL = "vm://mybroker?broker.persistent=false";
    private static final Endpoint ENDPOINT = new Endpoint(Endpoint.Type.QUEUE, "myqueue");

    public static void main(String[] args) throws Exception {

        try (Consumer consumer = new Consumer(); Producer producer = new Producer()) {
            consumer.consume();
            producer.produce();
            Thread.sleep(1000); // give some time for message to flow before shutting down
        }
    }

    private static class Consumer implements AutoCloseable {
        ConnectionContextFactory cachedFactory;

        public void consume() throws Exception {
            ConnectionContextFactory factory = new ConnectionContextFactory(BROKER_URL);
            ConsumerConnectionContext context = factory.createConsumerConnectionContext(ENDPOINT);
            BasicMessageListener<EchoRequest> listener = new BasicMessageListener<EchoRequest>() {
                @Override
                protected void onBasicMessage(EchoRequest echoRequest) {
                    System.out.println("\n========== RECEIVED MESSAGE START ==========");
                    System.out.printf("Consumed EchoRequest: echoMessage=[%s]\n", echoRequest.getEchoMessage());
                    System.out.println("Consumed EchoRequest.toString: " + echoRequest.toString());
                    System.out.println("Consumed EchoRequest.toJSON: " + echoRequest.toJSON());
                    System.out.println("Consumed EchoRequest.hashCode: " + echoRequest.hashCode());
                    System.out.println("========== RECEIVED MESSAGE END ==========\n");
                }
            };
            MessageProcessor processor = new MessageProcessor();
            processor.listen(context, listener);

            // remember this so we can clean up after ourselves later
            this.cachedFactory = factory;
        }

        public void close() throws Exception {
            this.cachedFactory.close();
        }
    }

    private static class Producer implements AutoCloseable {
        ConnectionContextFactory cachedFactory;

        public void produce() throws Exception {
            ConnectionContextFactory factory = new ConnectionContextFactory(BROKER_URL);
            ProducerConnectionContext pc = factory.createProducerConnectionContext(ENDPOINT);
            EchoRequest req = new EchoRequest();
            req.setEchoMessage("wotgorilla");
            MessageProcessor processor = new MessageProcessor();
            processor.send(pc, req);

            // remember this so we can clean up after ourselves later
            this.cachedFactory = factory;
        }

        public void close() throws Exception {
            this.cachedFactory.close();
        }
    }
}
