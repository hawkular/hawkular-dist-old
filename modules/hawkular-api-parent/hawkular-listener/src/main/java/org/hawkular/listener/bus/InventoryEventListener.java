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

import javax.ejb.ActivationConfigProperty;
import javax.ejb.MessageDriven;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.jms.MessageListener;
import javax.naming.InitialContext;

import org.hawkular.alerts.api.services.DefinitionsService;
import org.hawkular.inventory.api.model.Resource;
import org.hawkular.inventory.api.model.ResourceType;
import org.hawkular.inventory.bus.api.InventoryEvent;
import org.hawkular.inventory.bus.api.InventoryEventMessageListener;
import org.hawkular.inventory.bus.api.ResourceEvent;
import org.hawkular.inventory.bus.api.ResourceTypeEvent;
import org.jboss.logging.Logger;

/**
 * <p>
 * Listen for Hawkular Inventory events posted to the bus and take necessary actions. Note that with the MIQ
 * integration we no longer generate OutOfBox group triggers (and therefore no member triggers) because these
 * definitions could no longer be instrumented via the Hawkular UI.  Instead, MIQ has its own Alert definition
 * mechanism that integrates with Hawkular Alerting via the Ruby Client Gem.
 * </p><p>
 * For now I've left some infrastructure in place in case we want to use this listener for a different purpose.
 * </p>
 * @author Jay Shaughnessy
 * @author Lucas Ponce
 */
@MessageDriven(messageListenerInterface = MessageListener.class, activationConfig = {
        @ActivationConfigProperty(propertyName = "destinationType", propertyValue = "javax.jms.Topic"),
        @ActivationConfigProperty(propertyName = "destination", propertyValue = "HawkularInventoryChanges") })
@TransactionAttribute(value = TransactionAttributeType.NOT_SUPPORTED)
public class InventoryEventListener extends InventoryEventMessageListener {
    private final Logger log = Logger.getLogger(InventoryEventListener.class);

    private static final String DEFINITIONS_SERVICE = "java:global/hawkular-alerts-rest/CassDefinitionsServiceImpl";

    // private static final long MINUTE = 60000L;

    private InitialContext ctx;
    private DefinitionsService definitions;

    @Override
    protected void onBasicMessage(InventoryEvent<?> event) {
        switch (event.getAction()) {
            case CREATED:
            case DELETED:
                if (event instanceof ResourceTypeEvent) {
                    handleResourceTypeEvent((ResourceTypeEvent) event);
                } else if (event instanceof ResourceEvent) {
                    handleResourceEvent((ResourceEvent) event);
                }
                break;
            default:
                break; // not interesting
        }
    }

    /**
     * When creating a relevant type generate necessary group trigger. The triggers define out-of-box
     * events that subsequently get pulled into MIQ.
     *
     * @param event Create/Delete event
     */
    private void handleResourceTypeEvent(ResourceTypeEvent event) {
        try {
            init();

            String tenantId = event.getTenant().getId();
            ResourceType rt = event.getObject();
            String type = rt.getId();
            switch (type) {
                case "Datasource":
                case "Memory":
                case "Processor":
                case "WildFly Server": {
                    // No OOB Group Triggers
                    break;
                }
                default:
                    log.debugf("Unhandled Type [%s] ", type);
                    return;
            }

        } catch (Exception e) {
            log.errorf("Error processing inventory bus event %s : %s", event, e);
        }
    }

    private void handleResourceEvent(ResourceEvent event) {
        try {
            init();

            String tenantId = event.getTenant().getId();
            Resource r = event.getObject();
            String type = r.getType().getId();
            switch (type) {
                case "Datasource":
                case "Memory":
                case "Processor":
                case "WildFly Server": {
                    // No OOB Group Triggers
                    break;
                }
                default:
                    log.debugf("Unhandled Type [%s] ", type);
                    return;
            }
        } catch (Exception e) {
            log.errorf("Error processing inventory bus event %s : %s", event, e);
        }
    }

    /*
    private String getMetricId(String groupDataId, String feedId, String resId) {
        return getMetricId(groupDataId, feedId, resId, "~~");
    }

    private String getMetricId(String groupDataId, String feedId, String resId, String resIdSuffix) {
        return "MI~R~[" + feedId + "/" + resId + resIdSuffix + "]~MT~" + groupDataId;
    }
    */

    private synchronized void init() throws Exception {
        if (ctx == null) {
            ctx = new InitialContext();
        }
        if (definitions == null) {
            definitions = (DefinitionsService) ctx.lookup(DEFINITIONS_SERVICE);
        }
    }

}
