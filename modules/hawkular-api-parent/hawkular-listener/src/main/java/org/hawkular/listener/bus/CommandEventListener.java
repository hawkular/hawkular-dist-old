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
package org.hawkular.listener.bus;

import java.util.Collections;
import java.util.UUID;

import javax.ejb.ActivationConfigProperty;
import javax.ejb.MessageDriven;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.jms.MessageListener;
import javax.naming.InitialContext;

import org.hawkular.alerts.api.model.event.Event;
import org.hawkular.alerts.api.services.AlertsService;
import org.hawkular.bus.common.BasicMessage;
import org.hawkular.bus.common.consumer.BasicMessageListener;
import org.hawkular.cmdgw.api.DeployApplicationResponse;
import org.hawkular.cmdgw.api.EventDestination;
import org.hawkular.inventory.paths.CanonicalPath;
import org.jboss.logging.Logger;

/**
 * Consume Command Gateway Events, convert to Hawkular Events and forward to alerts engine for persistence/evaluation.
 * <p>
 * This is useful only when deploying into the Hawkular Bus with Hawkular Command Gateway. The expected message
 * payload should be a command pojo.
 * </p>
 * @author Jay Shaughnessy
 * @author Lucas Ponce
 */
@MessageDriven(messageListenerInterface = MessageListener.class, activationConfig = {
        @ActivationConfigProperty(propertyName = "destinationType", propertyValue = "javax.jms.Topic"),
        @ActivationConfigProperty(propertyName = "destination", propertyValue = "HawkularCommandEvent") })
@TransactionAttribute(value = TransactionAttributeType.NOT_SUPPORTED)
public class CommandEventListener extends BasicMessageListener<BasicMessage> {
    private final Logger log = Logger.getLogger(CommandEventListener.class);

    private static final String ALERTS_SERVICE = "java:global/hawkular-alerts-rest/CassAlertsServiceImpl";

    private InitialContext ctx;
    private AlertsService alerts;

    @Override
    protected void onBasicMessage(BasicMessage msg) {

        if (msg instanceof DeployApplicationResponse) {
            try {
                init();

                DeployApplicationResponse dar = (DeployApplicationResponse) msg;

                String canonicalPathString = dar.getResourcePath();
                CanonicalPath canonicalPath = CanonicalPath.fromString(canonicalPathString);
                String tenantId = canonicalPath.ids().getTenantId();
                String feedId = canonicalPath.ids().getFeedId();
                String resourceId = canonicalPath.ids().getResourcePath().getSegment().getElementId();
                resourceId = resourceId.substring(0, resourceId.length() - 2); // trim trailing '~~'
                String eventId = UUID.randomUUID().toString();
                String dataId = feedId + "/" + resourceId + "_DeployApplicationResponse";
                String category = "Hawkular Deployment";
                String text = dar.getStatus().name();
                Event event = new Event(tenantId, eventId, dataId, category, text);
                event.addContext("CanonicalPath", canonicalPathString);
                event.addContext("Message", dar.getMessage());

                log.debugf("Received message [%s] and forwarding it to Alerts as event [%s]", dar, event);

                alerts.addEvents(Collections.singleton(event));

            } catch (Exception e) {
                log.errorf("Error processing event message [%s]: %s", msg.toJSON(), e);
            }
        } else if (msg instanceof EventDestination) {
            // other EventDestination messages are expected but not currently interesting for alerts
        } else {
            log.warnf("Unexpected Event Message [%s]", msg.toJSON());
        }
    }

    private synchronized void init() throws Exception {
        if (ctx == null) {
            ctx = new InitialContext();
        }
        if (alerts == null) {
            alerts = (AlertsService) ctx.lookup(ALERTS_SERVICE);
        }
    }

}
