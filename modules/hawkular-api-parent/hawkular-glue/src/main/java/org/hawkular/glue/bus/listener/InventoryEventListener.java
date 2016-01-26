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
package org.hawkular.glue.bus.listener;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import javax.ejb.ActivationConfigProperty;
import javax.ejb.MessageDriven;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.jms.MessageListener;
import javax.naming.InitialContext;

import org.hawkular.alerts.api.model.Severity;
import org.hawkular.alerts.api.model.condition.Condition;
import org.hawkular.alerts.api.model.condition.ThresholdCondition;
import org.hawkular.alerts.api.model.condition.ThresholdCondition.Operator;
import org.hawkular.alerts.api.model.dampening.Dampening;
import org.hawkular.alerts.api.model.trigger.Mode;
import org.hawkular.alerts.api.model.trigger.Trigger;
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
 * An adapter that processes Hawkular Metrics data, extracts relevant metric datums, translates them to Alerting
 * Data format, and forwards them for Alert processing.
 * </p>
 * This is useful only when deploying into the Hawkular Bus with Hawkular Metrics. The expected message payload should
 * be JSON representation of {@link MetricDataMessage}.
 *
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

    private static final long MINUTE = 60000L;

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

    private void handleResourceTypeEvent(ResourceTypeEvent event) {
        try {
            init();
            log.warn("*********** " + event.toString());

            String tenantId = event.getTenant().getId();
            ResourceType rt = event.getObject();
            String groupTriggerId = "URL_Response";
            switch (rt.getId()) {
                case "URL":
                    Trigger group = new Trigger(tenantId, groupTriggerId, "URL Response");
                    group.setDescription("Response Time for URL");
                    group.setAutoEnable(true); // Enable trigger once an alert is resolved
                    group.setAutoResolve(true); // Support AUTORESOLVE mode as an inverse of the firing conditions
                    group.setSeverity(Severity.HIGH);
                    group.addAction("email", "[defaultEmail]");
                    group.addContext("alertType", "PINGRESPONSE");
                    group.addContext("resourceType", "URL");
                    group.addContext("triggerType", "Threshold");

                    Dampening dFiring = Dampening.forStrictTime(tenantId, groupTriggerId, Mode.FIRING, 7 * MINUTE);
                    Dampening dResolve = Dampening.forStrictTime(tenantId, groupTriggerId, Mode.AUTORESOLVE,
                            5 * MINUTE);

                    Map<String, String> conditionContext = new HashMap<>(2);
                    conditionContext.put("description", "Response Time");
                    conditionContext.put("unit", "ms");
                    Condition cFiring = new ThresholdCondition(tenantId, groupTriggerId, Mode.FIRING,
                            "status.duration", Operator.GT, 1000.0);
                    cFiring.setContext(conditionContext);
                    Condition cResolve = new ThresholdCondition(tenantId, groupTriggerId, Mode.AUTORESOLVE,
                            "status.duration", Operator.LTE, 1000.0);
                    cResolve.setContext(conditionContext);

                    definitions.addGroupTrigger(tenantId, group);
                    definitions.addGroupDampening(tenantId, dFiring);
                    definitions.addGroupDampening(tenantId, dResolve);
                    definitions.setGroupConditions(tenantId, groupTriggerId, Mode.FIRING,
                            Collections.singleton(cFiring), null);
                    break;

                default:
                    return; // no alerting
            }

        } catch (Exception e) {
            log.errorf("Error processing inventory bus event %s : %s", event, e);
        }
    }

    private void handleResourceEvent(ResourceEvent event) {
        try {
            init();
            log.warn("*********** " + event.toString());

            String tenantId = event.getTenant().getId();
            Resource r = event.getObject();
            String groupTriggerId = "URL_Response";

            switch (r.getType().getId()) {
                case "URL":
                default:
                    return; // no alerting
            }
        } catch (Exception e) {
            log.errorf("Error processing inventory bus event %s : %s", event, e);
        }
    }

    private synchronized void init() throws Exception {
        if (ctx == null) {
            ctx = new InitialContext();
        }
        if (definitions == null) {
            definitions = (DefinitionsService) ctx.lookup(DEFINITIONS_SERVICE);
        }
    }

}
