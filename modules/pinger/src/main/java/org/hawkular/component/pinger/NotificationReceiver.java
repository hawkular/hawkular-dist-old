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

import org.hawkular.bus.common.consumer.BasicMessageListener;
import org.hawkular.inventory.api.model.Resource;
import org.hawkular.inventory.api.observable.Action;
import org.hawkular.inventory.bus.api.ResourceEvent;

import javax.ejb.ActivationConfigProperty;
import javax.ejb.EJB;
import javax.ejb.MessageDriven;
import java.util.Map;

/**
 * Receiver that listens on JMS Topic and checks for updated resources.
 * Listening goes on 'java:/topic/HawkularInventoryChanges'
 *
 * @author Heiko W. Rupp
 */
@MessageDriven( activationConfig = {
        @ActivationConfigProperty(propertyName = "destinationType", propertyValue = "javax.jms.Topic"),
        @ActivationConfigProperty(propertyName = "destination", propertyValue = "java:/topic/HawkularInventoryChanges"),
        @ActivationConfigProperty(propertyName = "messageSelector", propertyValue = "entityType = 'resource'")
})
@SuppressWarnings("unused")
public class NotificationReceiver extends BasicMessageListener<ResourceEvent> {


    @EJB PingManager pingManager;

    @Override
    public void onBasicMessage(ResourceEvent message) {

        try {

            Log.LOG.debugf("Received message: %s", message);

            Map<String, String> details = message.getHeaders();
            String action;
            if (details != null) {
                action = details.get("action");
            } else {
                // should never happen as the selector should not let them pass
                Log.LOG.wNoAction();
                return;
            }

            Resource resource = message.getObject();

            if (!"URL".equals(resource.getType().getId())) {
                return;
            }
            String url = (String) resource.getProperties().get("url");
            PingDestination destination = new PingDestination(resource.getId(), url);

            if (message.getAction() == Action.Enumerated.CREATED) {
                pingManager.addDestination(destination);
            } else if (message.getAction() == Action.Enumerated.DELETED) {
                pingManager.removeDestination(destination);
            }

        } catch (Exception e) {
            e.printStackTrace();  // TODO: Customise this generated block
        }

    }

}
