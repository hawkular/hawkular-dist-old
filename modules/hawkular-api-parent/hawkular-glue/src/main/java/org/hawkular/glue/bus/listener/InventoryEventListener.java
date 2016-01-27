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

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.ejb.ActivationConfigProperty;
import javax.ejb.MessageDriven;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.jms.MessageListener;
import javax.naming.InitialContext;

import org.hawkular.alerts.api.model.Severity;
import org.hawkular.alerts.api.model.condition.CompareCondition;
import org.hawkular.alerts.api.model.condition.Condition;
import org.hawkular.alerts.api.model.condition.RateCondition;
import org.hawkular.alerts.api.model.condition.ThresholdCondition;
import org.hawkular.alerts.api.model.condition.ThresholdCondition.Operator;
import org.hawkular.alerts.api.model.condition.ThresholdRangeCondition;
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
            switch (rt.getId()) {
                case "Wildfly Server": {
                    // JVM HEAP
                    String groupTriggerId = "JVM_HeapUsed";
                    Trigger group = new Trigger(tenantId, groupTriggerId, "JVM Heap Used");
                    group.setDescription("JVM Heap Used of Heap Max");
                    group.setAutoDisable(true); // Disable trigger when fired
                    group.setAutoEnable(true); // Enable trigger once an alert is resolved
                    group.setSeverity(Severity.MEDIUM);
                    group.addAction("email", "[defaultEmail]");
                    group.addContext("alertType", "PHEAP");
                    group.addContext("resourceType", "App Server");
                    group.addContext("triggerType", "RangeByPercent");
                    group.addContext("triggerTypeProperty1", "heapMaxId");
                    group.addContext("triggerTypeProperty2", "Heap Max");

                    Dampening dFiring = Dampening.forStrictTime(tenantId, groupTriggerId, Mode.FIRING, 7 * MINUTE);

                    Map<String, String> conditionContext = new HashMap<>(2);
                    conditionContext.put("description", "Heap Used");
                    conditionContext.put("unit", "B");
                    Condition cFiring1 = new CompareCondition(tenantId, groupTriggerId, Mode.FIRING,
                            "WildFly Memory Metrics~Heap Used", CompareCondition.Operator.GT, 0.80,
                            "WildFly Memory Metrics~Heap Max");
                    cFiring1.setContext(conditionContext);
                    Condition cFiring2 = new CompareCondition(tenantId, groupTriggerId, Mode.FIRING,
                            "WildFly Memory Metrics~Heap Used", CompareCondition.Operator.LT, 0.20,
                            "WildFly Memory Metrics~Heap Max");
                    List<Condition> conditions = new ArrayList<>(2);
                    conditions.add(cFiring1);
                    conditions.add(cFiring2);

                    definitions.addGroupTrigger(tenantId, group);
                    definitions.addGroupDampening(tenantId, dFiring);
                    definitions.setGroupConditions(tenantId, groupTriggerId, Mode.FIRING, conditions, null);

                    // JVM NON-HEAP
                    groupTriggerId = "JVM_NonHeapUsed";
                    group = new Trigger(tenantId, groupTriggerId, "JVM Non Heap Used");
                    group.setDescription("JVM Non Heap Used of Heap Max");
                    group.setAutoDisable(true); // Disable trigger when fired
                    group.setAutoEnable(true); // Enable trigger once an alert is resolved
                    group.setSeverity(Severity.HIGH);
                    group.addAction("email", "[defaultEmail]");
                    group.addContext("alertType", "NHEAP");
                    group.addContext("resourceType", "App Server");
                    group.addContext("triggerType", "RangeByPercent");
                    group.addContext("triggerTypeProperty1", "heapMaxId");
                    group.addContext("triggerTypeProperty2", "Heap Max");

                    dFiring = Dampening.forStrictTime(tenantId, groupTriggerId, Mode.FIRING, 7 * MINUTE);

                    conditionContext.clear();
                    conditionContext.put("description", "Non Heap Used");
                    conditionContext.put("unit", "B");
                    cFiring1 = new CompareCondition(tenantId, groupTriggerId, Mode.FIRING,
                            "WildFly Memory Metrics~NonHeap Used", CompareCondition.Operator.GT, 0.80,
                            "WildFly Memory Metrics~Heap Max");
                    cFiring1.setContext(conditionContext);
                    cFiring2 = new CompareCondition(tenantId, groupTriggerId, Mode.FIRING,
                            "WildFly Memory Metrics~NonHeap Used", CompareCondition.Operator.LT, 0.20,
                            "WildFly Memory Metrics~Heap Max");
                    conditions.clear();
                    conditions.add(cFiring1);
                    conditions.add(cFiring2);

                    definitions.addGroupTrigger(tenantId, group);
                    definitions.addGroupDampening(tenantId, dFiring);
                    definitions.setGroupConditions(tenantId, groupTriggerId, Mode.FIRING, conditions, null);

                    // Accumulated GC Time
                    // Note that the GC metric is a counter, an ever-increasing value reflecting the total time the JVM
                    // has spent doing GC.  'Accumulated' here reflects that we are combining the totals for 4
                    // different GCs in the VM, each a counter itself, and reporting a single metric value for total
                    // GC time spent. So, from an alerting perspective we want to alert when GC is taking unacceptably
                    // long. That means we need to alert on high *deltas* in the metric values reported, which reflect
                    // a lot of time spent in GC between readings.  We'll start with 200ms per minute for 5 minutes.
                    // TODO: 'Rate' This should likely be a new triggerType but for now we'll treat it like threshold.
                    groupTriggerId = "JVM_GC";
                    group = new Trigger(tenantId, groupTriggerId, "JVM Accumulated GC Duration");
                    group.setDescription("Accumulated GC Duration");
                    group.setAutoDisable(true); // Disable trigger when fired
                    group.setAutoEnable(true); // Enable trigger once an alert is resolved
                    group.setSeverity(Severity.HIGH);
                    group.addAction("email", "[defaultEmail]");
                    group.addContext("alertType", "GARBA");
                    group.addContext("resourceType", "App Server");
                    group.addContext("triggerType", "Threshold");

                    dFiring = Dampening.forStrictTime(tenantId, groupTriggerId, Mode.FIRING, 5 * MINUTE);

                    conditionContext.clear();
                    conditionContext.put("description", "GC Duration");
                    conditionContext.put("unit", "ms");
                    cFiring1 = new RateCondition(tenantId, groupTriggerId, Mode.FIRING,
                            "WildFly Memory Metrics~Accumulated GC Duration", RateCondition.Direction.INCREASING,
                            RateCondition.Period.MINUTE, RateCondition.Operator.GT, 200.0);
                    cFiring1.setContext(conditionContext);
                    conditions.clear();
                    conditions.add(cFiring1);

                    definitions.addGroupTrigger(tenantId, group);
                    definitions.addGroupDampening(tenantId, dFiring);
                    definitions.setGroupConditions(tenantId, groupTriggerId, Mode.FIRING, conditions, null);

                    // WEB SESSION TRIGGERS
                    // ACTIVE SESSIONS
                    groupTriggerId = "Web_SessionsActive";
                    group = new Trigger(tenantId, groupTriggerId, "Web Sessions Active");
                    group.setDescription("Active Web Sessions");
                    group.setAutoDisable(true); // Disable trigger when fired
                    group.setAutoEnable(true); // Enable trigger once an alert is resolved
                    group.setSeverity(Severity.MEDIUM);
                    group.addAction("email", "[defaultEmail]");
                    group.addContext("alertType", "ACTIVE_SESSIONS");
                    group.addContext("resourceType", "App Server");
                    group.addContext("triggerType", "Range");

                    dFiring = Dampening.forStrictTime(tenantId, groupTriggerId, Mode.FIRING, 7 * MINUTE);

                    conditionContext.clear();
                    conditionContext.put("description", "Active Web Sessions");
                    conditionContext.put("unit", "sessions");
                    cFiring1 = new ThresholdRangeCondition(tenantId, groupTriggerId, Mode.FIRING,
                            "WildFly Aggregated Web Metrics~Aggregated Active Web Sessions",
                            ThresholdRangeCondition.Operator.INCLUSIVE, ThresholdRangeCondition.Operator.INCLUSIVE,
                            20.0, 5000.0, false);
                    cFiring1.setContext(conditionContext);
                    conditions.clear();
                    conditions.add(cFiring1);

                    definitions.addGroupTrigger(tenantId, group);
                    definitions.addGroupDampening(tenantId, dFiring);
                    definitions.setGroupConditions(tenantId, groupTriggerId, Mode.FIRING, conditions, null);

                    // EXPIRED SESSIONS
                    groupTriggerId = "Web_SessionsExpired";
                    group = new Trigger(tenantId, groupTriggerId, "Web Sessions Expired");
                    group.setDescription("Expired Web Sessions");
                    group.setAutoDisable(true); // Disable trigger when fired
                    group.setAutoEnable(true); // Enable trigger once an alert is resolved
                    group.setSeverity(Severity.LOW);
                    group.addAction("email", "[defaultEmail]");
                    group.addContext("alertType", "EXPIRED_SESSIONS");
                    group.addContext("resourceType", "App Server");
                    group.addContext("triggerType", "Threshold");

                    dFiring = Dampening.forStrictTime(tenantId, groupTriggerId, Mode.FIRING, 5 * MINUTE);

                    conditionContext.clear();
                    conditionContext.put("description", "Expired Web Sessions");
                    conditionContext.put("unit", "sessions");
                    cFiring1 = new RateCondition(tenantId, groupTriggerId, Mode.FIRING,
                            "WildFly Aggregated Web Metrics~Aggregated Expired Web Sessions",
                            RateCondition.Direction.INCREASING, RateCondition.Period.MINUTE,
                            RateCondition.Operator.GT,
                            15.0);
                    cFiring1.setContext(conditionContext);
                    conditions.clear();
                    conditions.add(cFiring1);

                    definitions.addGroupTrigger(tenantId, group);
                    definitions.addGroupDampening(tenantId, dFiring);
                    definitions.setGroupConditions(tenantId, groupTriggerId, Mode.FIRING, conditions, null);

                    // REJECTED SESSIONS
                    groupTriggerId = "Web_SessionsRejected";
                    group = new Trigger(tenantId, groupTriggerId, "Web Sessions Rejected");
                    group.setDescription("Rejected Web Sessions");
                    group.setAutoDisable(true); // Disable trigger when fired
                    group.setAutoEnable(true); // Enable trigger once an alert is resolved
                    group.setSeverity(Severity.LOW);
                    group.addAction("email", "[defaultEmail]");
                    group.addContext("alertType", "REJECTED_SESSIONS");
                    group.addContext("resourceType", "App Server");
                    group.addContext("triggerType", "Threshold");

                    dFiring = Dampening.forStrictTime(tenantId, groupTriggerId, Mode.FIRING, 5 * MINUTE);

                    conditionContext.clear();
                    conditionContext.put("description", "Expired Web Sessions");
                    conditionContext.put("unit", "sessions");
                    cFiring1 = new RateCondition(tenantId, groupTriggerId, Mode.FIRING,
                            "WildFly Aggregated Web Metrics~Aggregated Rejected Web Sessions",
                            RateCondition.Direction.INCREASING, RateCondition.Period.MINUTE,
                            RateCondition.Operator.GT,
                            15.0);
                    cFiring1.setContext(conditionContext);
                    conditions.clear();
                    conditions.add(cFiring1);

                    definitions.addGroupTrigger(tenantId, group);
                    definitions.addGroupDampening(tenantId, dFiring);
                    definitions.setGroupConditions(tenantId, groupTriggerId, Mode.FIRING, conditions, null);

                    break;
                }
                case "URL": {
                    String groupTriggerId = "URL_Response";

                    Trigger group = new Trigger(tenantId, groupTriggerId, "URL Response");
                    group.setDescription("Response Time for URL");
                    group.setAutoDisable(true); // Disable trigger when fired
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
                    definitions.setGroupConditions(tenantId, groupTriggerId, Mode.AUTORESOLVE,
                            Collections.singleton(cResolve), null);
                    break;
                }
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
                    Map<String, String> dataIdMap = new HashMap<>();
                    //tags: {
                    //  resourceId: resourceId
                    //},
                    //context: {
                    //  resourceName: url,
                    //  resourcePath: resourcePath,

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
