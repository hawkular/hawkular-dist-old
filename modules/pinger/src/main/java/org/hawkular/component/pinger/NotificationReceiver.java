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
import com.google.gson.GsonBuilder;
import org.hawkular.bus.common.SimpleBasicMessage;
import org.hawkular.bus.common.consumer.BasicMessageListener;
import org.hawkular.inventory.api.Resource;
import org.hawkular.inventory.api.ResourceType;

import javax.ejb.ActivationConfigProperty;
import javax.ejb.EJB;
import javax.ejb.MessageDriven;
import java.util.Map;

/**
 * Receiver that listens on JMS Topic and checks for updated resources.
 * Listening goes on 'java:/topic/HawkularNotifications'
 *
 * @author Heiko W. Rupp
 */
@MessageDriven( activationConfig = {
        @ActivationConfigProperty(propertyName = "destinationType", propertyValue = "javax.jms.Topic"),
        @ActivationConfigProperty(propertyName = "destination", propertyValue = "HawkularNotifications"),
        @ActivationConfigProperty(propertyName = "messageSelector", propertyValue = "code LIKE 'resource%'")
})
@SuppressWarnings("unused")
public class NotificationReceiver extends BasicMessageListener<SimpleBasicMessage> {


    @EJB PingManager pingManager;

    @Override
    public void onBasicMessage(SimpleBasicMessage message) {

        try {

            String payload = message.getMessage();
            Map<String, String> details = message.getHeaders();
            String code;
            if (details!=null) {
                code = details.get("code");
            } else {
                // should never happen as the selector should not let them pass
                Log.LOG.wNoCode();
                return;
            }

            Gson gson = new GsonBuilder().create();

            Resource resource = gson.fromJson(payload, Resource.class);
            if (!resource.getType().equals(ResourceType.URL)) {
                return;
            }
            String url = resource.getParameters().get("url");
            PingDestination destination = new PingDestination(resource.getId(), url);

            if ("resource_added".equals(code)) {

                pingManager.addDestination(destination);
            }
            else if ("resource_deleted".equals(code)) {
                pingManager.removeDestination(destination);
            }

        } catch (Exception e) {
            e.printStackTrace();  // TODO: Customise this generated block
        }

    }

}
