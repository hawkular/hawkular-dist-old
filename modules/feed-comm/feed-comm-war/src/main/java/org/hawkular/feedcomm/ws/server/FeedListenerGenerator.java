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
package org.hawkular.feedcomm.ws.server;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.annotation.PostConstruct;
import javax.annotation.Resource;
import javax.ejb.EJB;
import javax.ejb.Singleton;
import javax.ejb.Startup;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.jms.ConnectionFactory;
import javax.naming.InitialContext;
import javax.persistence.PostRemove;

import org.hawkular.bus.common.ConnectionContextFactory;
import org.hawkular.bus.common.Endpoint;
import org.hawkular.bus.common.MessageProcessor;
import org.hawkular.bus.common.consumer.ConsumerConnectionContext;
import org.hawkular.feedcomm.ws.Constants;
import org.hawkular.feedcomm.ws.MsgLogger;
import org.hawkular.feedcomm.ws.mdb.ExecuteOperationListener;

@Startup
@Singleton
@TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
public class FeedListenerGenerator {
    @EJB
    private ConnectedFeeds connectedFeeds;

    @Resource(mappedName = Constants.CONNECTION_FACTORY_JNDI)
    private ConnectionFactory connectionFactory;

    private Map<String, ConnectionContextFactory> connContextFactories;
    private Map<String, List<ConsumerConnectionContext>> consumerContexts;

    @PostConstruct
    public void initialize() throws Exception {
        // TODO I think we can remove this if-statement
        if (this.connectionFactory == null) {
            MsgLogger.LOG.warnf("Injection of ConnectionFactory is not working - looking it up explicitly");
            InitialContext ctx = new InitialContext();
            this.connectionFactory = (ConnectionFactory) ctx.lookup(Constants.CONNECTION_FACTORY_JNDI);
        } else {
            MsgLogger.LOG.warnf("Injection of ConnectionFactory works - you can remove the hack");
        }

        connContextFactories = new HashMap<>();
        consumerContexts = new HashMap<>();
    }

    @PostRemove
    public void shutdown() throws Exception {
        if (connContextFactories != null) {
            for (String feedId : this.connContextFactories.keySet()) {
                removeListeners(feedId);
            }
        }
    }

    /**
     * @return the connection factory this object will use when connecting to the messaging system.
     */
    public ConnectionFactory getConnectionFactory() {
        return this.connectionFactory;
    }

    public void addListeners(String feedId) throws Exception {
        removeListeners(feedId); // make sure any old ones aren't still hanging around
        ConnectionContextFactory ccf = new ConnectionContextFactory(true, connectionFactory);
        this.connContextFactories.put(feedId, ccf);
        List<ConsumerConnectionContext> contextList = new ArrayList<ConsumerConnectionContext>();
        this.consumerContexts.put(feedId, contextList);

        MsgLogger.LOG.infof("Adding listeners for feed [%s]", feedId);

        MessageProcessor messageProcessor = new MessageProcessor();
        String messageSelector = String.format("%s = '%s'", Constants.HEADER_FEEDID, feedId);

        // add listeners for all the feed endpoints - the listeners only get messages destined for their feed ID
        Endpoint endpoint = new Endpoint(Endpoint.Type.QUEUE, Constants.DEST_FEED_EXECUTE_OP);
        ConsumerConnectionContext ccc = ccf.createConsumerConnectionContext(endpoint, messageSelector);
        messageProcessor.listen(ccc, new ExecuteOperationListener(connectedFeeds));
        contextList.add(ccc);

        return;
    }

    public void removeListeners(String feedId) {
        // When we created the factory, we had it reuse its one connection for all contexts.
        // When closing the factory, it then closes that connection which (should) close all
        // consumers the factory created. But this doesn't seem to work, so I'm closing all contexts first
        // then the factory.

        List<ConsumerConnectionContext> contextList = this.consumerContexts.remove(feedId);
        ConnectionContextFactory factory = this.connContextFactories.remove(feedId);

        if (contextList != null) {
            for (ConsumerConnectionContext context : contextList) {
                try {
                    context.close();
                } catch (Exception e) {
                    MsgLogger.LOG.errorf(e, "Failed to close consumer context; will keep trying to close the rest");
                }
            }
        }

        if (factory != null) {
            try {
                MsgLogger.LOG.infof("Removing listeners for feed [%s]", feedId);
                factory.close();
            } catch (Exception e) {
                MsgLogger.LOG.errorf(e, "Failed to removing listeners for feed [%s]", feedId);
            }
        }
    }
}
