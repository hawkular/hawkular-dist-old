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
import org.hawkular.alerts.api.model.condition.AvailabilityCondition;
import org.hawkular.alerts.api.model.condition.CompareCondition;
import org.hawkular.alerts.api.model.condition.Condition;
import org.hawkular.alerts.api.model.condition.EventCondition;
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
            log.warn("\n*********** " + event.toString());

            String tenantId = event.getTenant().getId();
            ResourceType rt = event.getObject();
            //String type = URLDecoder.decode(rt.getId(), "UTF-8");
            String type = rt.getId();
            switch (type) {
                case "Datasource": {
                    // Available Connections
                    String groupTriggerId = "DS_Conn";
                    log.warn("\n*********** Group Trigger: " + groupTriggerId);
                    Trigger group = new Trigger(tenantId, groupTriggerId, "Datasource Available Connections");
                    group.setDescription("Available Connection Count for DS");
                    group.setEnabled(true);
                    group.setAutoDisable(true); // Disable trigger when fired
                    group.setAutoEnable(true); // Enable trigger once an alert is resolved
                    group.setSeverity(Severity.MEDIUM);
                    group.addAction("email", "[defaultEmail]");
                    group.addContext("alertType", "DSCONN");
                    group.addContext("resourceType", "DataSource");
                    group.addContext("triggerType", "Threshold");

                    Dampening dFiring = Dampening.forStrictTime(tenantId, groupTriggerId, Mode.FIRING, 7 * MINUTE);

                    Map<String, String> conditionContext = new HashMap<>(2);
                    conditionContext.put("description", "Available Count");
                    conditionContext.put("unit", "connections");
                    Condition cFiring1 = new ThresholdCondition(tenantId, groupTriggerId, Mode.FIRING,
                            "Datasource Pool Metrics~Available Count", ThresholdCondition.Operator.LT, 200.0);
                    cFiring1.setContext(conditionContext);
                    List<Condition> conditions = new ArrayList<>(1);
                    conditions.add(cFiring1);

                    definitions.addGroupTrigger(tenantId, group);
                    definitions.addGroupDampening(tenantId, dFiring);
                    definitions.setGroupConditions(tenantId, groupTriggerId, Mode.FIRING, conditions, null);
                    log.warn("\n*********** Group Trigger Created: " + groupTriggerId);

                    // Wait Time
                    groupTriggerId = "DS_PoolWait";
                    log.warn("\n*********** Group Trigger: " + groupTriggerId);
                    group = new Trigger(tenantId, groupTriggerId, "Datasource Pool Wait Time");
                    group.setDescription("Pool Wait Time Responsiveness for DS");
                    group.setEnabled(true);
                    group.setAutoDisable(true); // Disable trigger when fired
                    group.setAutoEnable(true); // Enable trigger once an alert is resolved
                    group.setSeverity(Severity.MEDIUM);
                    group.addAction("email", "[defaultEmail]");
                    group.addContext("alertType", "DSRESP");
                    group.addContext("resourceType", "DataSource");
                    group.addContext("triggerType", "Threshold");

                    dFiring = Dampening.forStrictTime(tenantId, groupTriggerId, Mode.FIRING, 7 * MINUTE);

                    conditionContext.clear();
                    conditionContext.put("description", "Average Wait Time");
                    conditionContext.put("unit", "ms");
                    cFiring1 = new ThresholdCondition(tenantId, groupTriggerId, Mode.FIRING,
                            "Datasource Pool Metrics~Average Wait Time", ThresholdCondition.Operator.GT, 200.0);
                    cFiring1.setContext(conditionContext);
                    conditions.clear();
                    conditions.add(cFiring1);

                    definitions.addGroupTrigger(tenantId, group);
                    definitions.addGroupDampening(tenantId, dFiring);
                    definitions.setGroupConditions(tenantId, groupTriggerId, Mode.FIRING, conditions, null);
                    log.warn("\n*********** Group Trigger Created: " + groupTriggerId);

                    // Create Time
                    groupTriggerId = "DS_PoolCreate";
                    log.warn("\n*********** Group Trigger: " + groupTriggerId);
                    group = new Trigger(tenantId, groupTriggerId, "Datasource Pool Create Time");
                    group.setDescription("Pool Create Time Responsiveness for DS");
                    group.setEnabled(true);
                    group.setAutoDisable(true); // Disable trigger when fired
                    group.setAutoEnable(true); // Enable trigger once an alert is resolved
                    group.setSeverity(Severity.MEDIUM);
                    group.addAction("email", "[defaultEmail]");
                    group.addContext("alertType", "DSCREATE");
                    group.addContext("resourceType", "DataSource");
                    group.addContext("triggerType", "Threshold");

                    dFiring = Dampening.forStrictTime(tenantId, groupTriggerId, Mode.FIRING, 7 * MINUTE);

                    conditionContext.clear();
                    conditionContext.put("description", "Average Creation Time");
                    conditionContext.put("unit", "ms");
                    cFiring1 = new ThresholdCondition(tenantId, groupTriggerId, Mode.FIRING,
                            "Datasource Pool Metrics~Average Creation Time", ThresholdCondition.Operator.GT, 200.0);
                    cFiring1.setContext(conditionContext);
                    conditions.clear();
                    conditions.add(cFiring1);

                    definitions.addGroupTrigger(tenantId, group);
                    definitions.addGroupDampening(tenantId, dFiring);
                    definitions.setGroupConditions(tenantId, groupTriggerId, Mode.FIRING, conditions, null);
                    log.warn("\n*********** Group Trigger Created: " + groupTriggerId);

                    break;
                }
                case "Memory": {
                    // TODO: Verify that this is correct, I'm not sure the UI had this defined as needed
                    String groupTriggerId = "Memory_Available";
                    log.warn("\n*********** Group Trigger: " + groupTriggerId);
                    Trigger group = new Trigger(tenantId, groupTriggerId, "Memory Available");
                    group.setDescription("Memory Available percent of Total Memory");
                    group.setEnabled(true);
                    group.setAutoDisable(true); // Disable trigger when fired
                    group.setAutoEnable(true); // Enable trigger once an alert is resolved
                    group.setSeverity(Severity.MEDIUM);
                    group.addAction("email", "[defaultEmail]");
                    group.addContext("alertType", "AVAILABLE_MEMORY");
                    group.addContext("resourceType", "Memory");
                    group.addContext("triggerType", "RangeByPercent");
                    group.addContext("triggerTypeProperty1", "Available Memory");
                    group.addContext("triggerTypeProperty2", "Total Memory");

                    Dampening dFiring = Dampening.forStrictTime(tenantId, groupTriggerId, Mode.FIRING, 7 * MINUTE);

                    Map<String, String> conditionContext = new HashMap<>(2);
                    conditionContext.put("description", "Total Memory");
                    conditionContext.put("unit", "MB");
                    Condition cFiring1 = new CompareCondition(tenantId, groupTriggerId, Mode.FIRING,
                            "Available Memory", CompareCondition.Operator.GT, 0.80,
                            "Total Memory");
                    cFiring1.setContext(conditionContext);
                    Condition cFiring2 = new CompareCondition(tenantId, groupTriggerId, Mode.FIRING,
                            "Available Memory", CompareCondition.Operator.LT, 0.10,
                            "Total Memory");
                    List<Condition> conditions = new ArrayList<>(2);
                    conditions.add(cFiring1);
                    conditions.add(cFiring2);

                    definitions.addGroupTrigger(tenantId, group);
                    definitions.addGroupDampening(tenantId, dFiring);
                    definitions.setGroupConditions(tenantId, groupTriggerId, Mode.FIRING, conditions, null);
                    log.warn("\n*********** Group Trigger Created: " + groupTriggerId);

                    break;
                }
                case "Processor": {
                    // TODO: Verify that this is correct, I'm not sure the UI had this defined as needed
                    String groupTriggerId = "CPU_Usage";
                    log.warn("\n*********** Group Trigger: " + groupTriggerId);
                    Trigger group = new Trigger(tenantId, groupTriggerId, "CPU Usage");
                    group.setDescription("CPU Usage");
                    group.setEnabled(true);
                    group.setAutoDisable(true); // Disable trigger when fired
                    group.setAutoEnable(true); // Enable trigger once an alert is resolved
                    group.setSeverity(Severity.MEDIUM);
                    group.addAction("email", "[defaultEmail]");
                    group.addContext("alertType", "CPU_USAGE_EXCEED");
                    group.addContext("resourceType", "Processor");
                    group.addContext("triggerType", "Threshold");
                    group.addContext("triggerTypeProperty1", "CPU Usage");

                    Dampening dFiring = Dampening.forStrictTime(tenantId, groupTriggerId, Mode.FIRING, 7 * MINUTE);

                    Map<String, String> conditionContext = new HashMap<>(2);
                    conditionContext.put("description", "CPU Usage");
                    conditionContext.put("unit", "%");
                    Condition cFiring1 = new ThresholdCondition(tenantId, groupTriggerId, Mode.FIRING,
                            "CPU Usage", ThresholdCondition.Operator.GT, 0.20);
                    cFiring1.setContext(conditionContext);
                    List<Condition> conditions = new ArrayList<>(2);
                    conditions.add(cFiring1);

                    definitions.addGroupTrigger(tenantId, group);
                    definitions.addGroupDampening(tenantId, dFiring);
                    definitions.setGroupConditions(tenantId, groupTriggerId, Mode.FIRING, conditions, null);
                    log.warn("\n*********** Group Trigger Created: " + groupTriggerId);

                    break;
                }
                case "URL": {
                    // Response Time
                    String groupTriggerId = "URL_Response";
                    log.warn("\n*********** Group Trigger: " + groupTriggerId);
                    Trigger group = new Trigger(tenantId, groupTriggerId, "URL Response");
                    group.setDescription("Response Time for URL");
                    group.setEnabled(true);
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
                    log.warn("\n*********** Group Trigger Created: " + groupTriggerId);

                    // Avail
                    groupTriggerId = "URL_Down";
                    log.warn("\n*********** Group Trigger: " + groupTriggerId);
                    group = new Trigger(tenantId, groupTriggerId, "URL Down");
                    group.setDescription("Availability for URL");
                    group.setEnabled(true);
                    group.setAutoDisable(true); // Disable trigger when fired
                    group.setAutoEnable(true); // Enable trigger once an alert is resolved
                    group.setAutoResolve(true); // Support AUTORESOLVE mode as an inverse of the firing conditions
                    group.setSeverity(Severity.CRITICAL);
                    group.addAction("email", "[defaultEmail]");
                    group.addContext("alertType", "PINGAVAIL");
                    group.addContext("resourceType", "URL");
                    group.addContext("triggerType", "Availability");

                    dFiring = Dampening.forStrictTime(tenantId, groupTriggerId, Mode.FIRING, 7 * MINUTE);
                    dResolve = Dampening.forStrictTime(tenantId, groupTriggerId, Mode.AUTORESOLVE,
                            5 * MINUTE);

                    conditionContext.clear();
                    conditionContext.put("description", "Availability");
                    cFiring = new AvailabilityCondition(tenantId, groupTriggerId, Mode.FIRING,
                            "status.code", AvailabilityCondition.Operator.DOWN);
                    cFiring.setContext(conditionContext);
                    cResolve = new AvailabilityCondition(tenantId, groupTriggerId, Mode.FIRING,
                            "status.code", AvailabilityCondition.Operator.UP);
                    cResolve.setContext(conditionContext);

                    definitions.addGroupTrigger(tenantId, group);
                    definitions.addGroupDampening(tenantId, dFiring);
                    definitions.addGroupDampening(tenantId, dResolve);
                    definitions.setGroupConditions(tenantId, groupTriggerId, Mode.FIRING,
                            Collections.singleton(cFiring), null);
                    definitions.setGroupConditions(tenantId, groupTriggerId, Mode.AUTORESOLVE,
                            Collections.singleton(cResolve), null);
                    log.warn("\n*********** Group Trigger Created: " + groupTriggerId);

                    break;
                }
                case "WildFly Server": {
                    // JVM HEAP
                    String groupTriggerId = "JVM_HeapUsed";
                    log.warn("\n*********** Group Trigger: " + groupTriggerId);
                    Trigger group = new Trigger(tenantId, groupTriggerId, "JVM Heap Used");
                    group.setDescription("JVM Heap Used percent of Heap Max");
                    group.setEnabled(true);
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
                    log.warn("\n*********** Group Trigger Created: " + groupTriggerId);

                    // JVM NON-HEAP
                    groupTriggerId = "JVM_NonHeapUsed";
                    log.warn("\n*********** Group Trigger: " + groupTriggerId);
                    group = new Trigger(tenantId, groupTriggerId, "JVM Non Heap Used");
                    group.setDescription("JVM Non Heap Used percent of Heap Max");
                    group.setEnabled(true);
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
                    log.warn("\n*********** Group Trigger Created: " + groupTriggerId);

                    // Accumulated GC Time
                    // Note that the GC metric is a counter, an ever-increasing value reflecting the total time the JVM
                    // has spent doing GC.  'Accumulated' here reflects that we are combining the totals for 4
                    // different GCs in the VM, each a counter itself, and reporting a single metric value for total
                    // GC time spent. So, from an alerting perspective we want to alert when GC is taking unacceptably
                    // long. That means we need to alert on high *deltas* in the metric values reported, which reflect
                    // a lot of time spent in GC between readings.  We'll start with 200ms per minute for 5 minutes.
                    // TODO: 'Rate' This should likely be a new triggerType but for now we'll treat it like threshold.
                    groupTriggerId = "JVM_GC";
                    log.warn("\n*********** Group Trigger: " + groupTriggerId);
                    group = new Trigger(tenantId, groupTriggerId, "JVM Accumulated GC Duration");
                    group.setDescription("Accumulated GC Duration Per-Minute");
                    group.setEnabled(true);
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
                    log.warn("\n*********** Group Trigger Created: " + groupTriggerId);

                    // WEB SESSION TRIGGERS
                    // ACTIVE SESSIONS
                    groupTriggerId = "Web_SessionsActive";
                    log.warn("\n*********** Group Trigger: " + groupTriggerId);
                    group = new Trigger(tenantId, groupTriggerId, "Web Sessions Active");
                    group.setDescription("Active Web Sessions");
                    group.setEnabled(true);
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
                    log.warn("\n*********** Group Trigger Created: " + groupTriggerId);

                    definitions.addGroupTrigger(tenantId, group);
                    definitions.addGroupDampening(tenantId, dFiring);
                    definitions.setGroupConditions(tenantId, groupTriggerId, Mode.FIRING, conditions, null);
                    log.warn("\n*********** Group Trigger Created: " + groupTriggerId);

                    // EXPIRED SESSIONS
                    groupTriggerId = "Web_SessionsExpired";
                    log.warn("\n*********** Group Trigger: " + groupTriggerId);
                    group = new Trigger(tenantId, groupTriggerId, "Web Sessions Expired");
                    group.setDescription("Expired Web Sessions");
                    group.setEnabled(true);
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
                    log.warn("\n*********** Group Trigger Created: " + groupTriggerId);

                    // REJECTED SESSIONS
                    groupTriggerId = "Web_SessionsRejected";
                    log.warn("\n*********** Group Trigger: " + groupTriggerId);
                    group = new Trigger(tenantId, groupTriggerId, "Web Sessions Rejected");
                    group.setDescription("Rejected Web Sessions");
                    group.setEnabled(true);
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
                    log.warn("\n*********** Group Trigger Created: " + groupTriggerId);

                    // FAILED DEPLOYMENTS
                    groupTriggerId = "Deployment_Failure";
                    log.warn("\n*********** Group Trigger: " + groupTriggerId);
                    group = new Trigger(tenantId, groupTriggerId, "Deployment Failure");
                    group.setDescription("Deployment failure");
                    group.setEnabled(true);
                    group.setAutoDisable(true); // Disable trigger when fired
                    group.setAutoEnable(true); // Enable trigger once an alert is resolved
                    group.setSeverity(Severity.HIGH);
                    group.addAction("email", "[defaultEmail]");
                    group.addContext("alertType", "DEPLOYMENT_FAIL");
                    group.addContext("resourceType", "App Server Deployment");
                    group.addContext("triggerType", "Event");

                    // uses default dampening, fire on every failed deployment

                    conditionContext.clear();
                    conditionContext.put("description", "Deployment Failure");
                    cFiring1 = new EventCondition(tenantId, groupTriggerId, Mode.FIRING,
                            "DeployApplicationResponse", "category == 'Hawkular Deployment', text == 'ERROR'");
                    cFiring1.setContext(conditionContext);
                    conditions.clear();
                    conditions.add(cFiring1);

                    definitions.addGroupTrigger(tenantId, group);
                    definitions.setGroupConditions(tenantId, groupTriggerId, Mode.FIRING, conditions, null);
                    log.warn("\n*********** Group Trigger Created: " + groupTriggerId);

                    break;
                }
                default:
                    log.infof("\n*********** Group Trigger Not Created for type [%s] ", type);
                    return; // no alerting
            }

        } catch (Exception e) {
            log.errorf("Error processing inventory bus event %s : %s", event, e);
        }
    }

    private void handleResourceEvent(ResourceEvent event) {
        try {
            init();
            log.warn("\n*********** " + event.toString());

            String tenantId = event.getTenant().getId();
            Resource r = event.getObject();

            switch (r.getType().getId()) {
                case "Datasource": {
                    // Available Connections
                    String feedId = r.getPath().ids().getFeedId();
                    String resourceId = r.getId();
                    String qualifiedResourceId = feedId + "/" + resourceId;
                    Map<String, String> memberContext = new HashMap<>(2);
                    memberContext.put("resourceName", qualifiedResourceId);
                    memberContext.put("resourcePath", event.getHeaders().get("path"));
                    Map<String, String> memberTags = new HashMap<>(1);
                    memberTags.put("resourceId", qualifiedResourceId); // TODO: UI had this as feedId

                    String groupTriggerId = "DS_Connections";
                    String memberId = groupTriggerId + "_" + qualifiedResourceId;
                    String memberDescription = "Available Connection Count for DS " + resourceId;
                    Map<String, String> dataIdMap = new HashMap<>(2);
                    String dataId1 = "Datasource Pool Metrics~Available Count";
                    String memberDataId1 = getMetricId(dataId1, feedId, resourceId);
                    dataIdMap.put(dataId1, memberDataId1);
                    log.warn("\n*********** Member : " + memberId);
                    definitions.addMemberTrigger(tenantId, groupTriggerId, memberId, null, memberDescription,
                            memberContext, memberTags, dataIdMap);
                    log.warn("\n*********** Member Created : " + memberId);

                    // Wait Time
                    groupTriggerId = "DS_PoolWait";
                    memberId = groupTriggerId + "_" + qualifiedResourceId;
                    memberDescription = "Pool Wait Time Responsiveness for DS " + resourceId;
                    dataIdMap.clear();
                    dataId1 = "Datasource Pool Metrics~Average Wait Time";
                    memberDataId1 = getMetricId(dataId1, feedId, resourceId);
                    dataIdMap.put(dataId1, memberDataId1);
                    log.warn("\n*********** Member : " + memberId);
                    definitions.addMemberTrigger(tenantId, groupTriggerId, memberId, null, memberDescription,
                            memberContext, memberTags, dataIdMap);
                    log.warn("\n*********** Member Created : " + memberId);

                    // Create Time
                    groupTriggerId = "DS_PoolCreate";
                    memberId = groupTriggerId + "_" + qualifiedResourceId;
                    memberDescription = "Pool Create Time Responsiveness for DS " + resourceId;
                    dataIdMap.clear();
                    dataId1 = "Datasource Pool Metrics~Average Creation Time";
                    memberDataId1 = getMetricId(dataId1, feedId, resourceId);
                    dataIdMap.put(dataId1, memberDataId1);
                    log.warn("\n*********** Member : " + memberId);
                    definitions.addMemberTrigger(tenantId, groupTriggerId, memberId, null, memberDescription,
                            memberContext, memberTags, dataIdMap);
                    log.warn("\n*********** Member Created : " + memberId);
                    break;
                }
                case "Memory": {
                    // TODO: Verify that this is correct, I'm not sure the UI had this defined as needed
                    String feedId = r.getPath().ids().getFeedId();
                    String resourceId = r.getId();
                    String qualifiedResourceId = feedId + "/" + resourceId;
                    Map<String, String> memberContext = new HashMap<>(2);
                    memberContext.put("resourceName", qualifiedResourceId); // TODO: UI had this as feedId
                    memberContext.put("resourcePath", event.getHeaders().get("path"));
                    Map<String, String> memberTags = new HashMap<>(1);
                    memberTags.put("resourceId", qualifiedResourceId); // TODO: UI had this as feedId

                    String groupTriggerId = "Memory_Available";
                    String memberId = groupTriggerId + "_" + qualifiedResourceId;
                    String memberDescription = "Memory Available percent of Total Memory for " + resourceId;
                    Map<String, String> dataIdMap = new HashMap<>(2);
                    String dataId1 = "Available Memory";
                    String dataId2 = "Total Memory";
                    String memberDataId1 = getMetricId(dataId1, feedId, resourceId);
                    String memberDataId2 = getMetricId(dataId2, feedId, resourceId);
                    dataIdMap.put(dataId1, memberDataId1);
                    dataIdMap.put(dataId2, memberDataId2);
                    log.warn("\n*********** Member : " + memberId);
                    definitions.addMemberTrigger(tenantId, groupTriggerId, memberId, null, memberDescription,
                            memberContext, memberTags, dataIdMap);
                    log.warn("\n*********** Member Created : " + memberId);
                    break;
                }
                case "Processor": {
                    // TODO: Verify that this is correct, I'm not sure the UI had this defined as needed
                    String feedId = r.getPath().ids().getFeedId();
                    String resourceId = r.getId();
                    String qualifiedResourceId = feedId + "/" + resourceId;
                    Map<String, String> memberContext = new HashMap<>(2);
                    memberContext.put("resourceName", qualifiedResourceId); // TODO: UI had this as feedId
                    memberContext.put("resourcePath", event.getHeaders().get("path"));
                    Map<String, String> memberTags = new HashMap<>(1);
                    memberTags.put("resourceId", qualifiedResourceId); // TODO: UI had this as feedId

                    String groupTriggerId = "CPU_Usage";
                    String memberId = groupTriggerId + "_" + qualifiedResourceId;
                    String memberDescription = "CPU Usage for " + resourceId;
                    Map<String, String> dataIdMap = new HashMap<>(2);
                    String dataId1 = "CPU Usage";
                    String memberDataId1 = getMetricId(dataId1, feedId, resourceId);
                    dataIdMap.put(dataId1, memberDataId1);
                    log.warn("\n*********** Member : " + memberId);
                    definitions.addMemberTrigger(tenantId, groupTriggerId, memberId, null, memberDescription,
                            memberContext, memberTags, dataIdMap);
                    log.warn("\n*********** Member Created : " + memberId);

                    break;
                }
                case "URL": {
                    // common to members
                    String feedId = r.getPath().ids().getFeedId();
                    String url = event.getHeaders().get("url");
                    //String resourceId = String.valueOf(MessageDigest.getInstance("MD5").digest(
                    //        r.getId().getBytes("UTF-8")));
                    String resourceId = r.getId();
                    //String qualifiedResourceId = feedId + "/" + resourceId;
                    Map<String, String> memberContext = new HashMap<>(2);
                    memberContext.put("resourceName", url);
                    memberContext.put("resourcePath", event.getHeaders().get("path"));
                    Map<String, String> memberTags = new HashMap<>(1);
                    memberTags.put("resourceId", resourceId);

                    // Response Time
                    String groupTriggerId = "URL_Response";
                    String memberId = groupTriggerId + "_" + resourceId;
                    String memberName = "URL Response [" + url + "]";
                    String memberDescription = "Response Time for URL " + url;
                    Map<String, String> dataIdMap = new HashMap<>(2);
                    String dataId1 = "status.duration";
                    String memberDataId1 = resourceId + ".status.duration";
                    dataIdMap.put(dataId1, memberDataId1);
                    log.warn("\n*********** Member : " + memberId);
                    definitions.addMemberTrigger(tenantId, groupTriggerId, memberId, null, memberDescription,
                            memberContext, memberTags, dataIdMap);
                    log.warn("\n*********** Member Created : " + memberId);

                    // Avail
                    groupTriggerId = "URL_Down";
                    memberId = groupTriggerId + "_" + resourceId;
                    memberName = "URL Availability [" + url + "]";
                    memberDescription = "Availability for URL " + url;
                    dataIdMap.clear();
                    dataId1 = "status.code";
                    memberDataId1 = resourceId + ".status.code";
                    dataIdMap.put(dataId1, memberDataId1);
                    log.warn("\n*********** Member : " + memberId);
                    definitions.addMemberTrigger(tenantId, groupTriggerId, memberId, null, memberDescription,
                            memberContext, memberTags, dataIdMap);
                    log.warn("\n*********** Member Created : " + memberId);

                    break;
                }
                case "WildFly Server": {
                    // The Wildfly agent generates resource IDs unique among the app servers it is monitoring because
                    // each resource is prefixed with the managedServerName.  But when dealing with multiple
                    // Wildfly-agent feeds a resource ID is not guaranteed to be unique.  So, we further qualify
                    // the resource ID with the feed ID and use this qualifiedResourceId in the trigger definition.

                    // common to members
                    String feedId = r.getPath().ids().getFeedId();
                    String resourceId = r.getId();
                    if (resourceId.endsWith("~~")) {
                        resourceId = resourceId.substring(0, resourceId.length() - 2);
                    }
                    String qualifiedResourceId = feedId + "/" + resourceId;
                    Map<String, String> memberContext = new HashMap<>(2);
                    memberContext.put("resourceName", qualifiedResourceId);
                    memberContext.put("resourcePath", event.getHeaders().get("path"));
                    Map<String, String> memberTags = new HashMap<>(1);
                    memberTags.put("resourceId", qualifiedResourceId);

                    // JVM HEAP
                    String groupTriggerId = "JVM_HeapUsed";
                    String memberId = groupTriggerId + "_" + qualifiedResourceId;
                    String memberDescription = "JVM Heap Used percent of Heap Max for " + resourceId;
                    Map<String, String> dataIdMap = new HashMap<>(2);
                    String dataId1 = "WildFly Memory Metrics~Heap Used";
                    String dataId2 = "WildFly Memory Metrics~Heap Max";
                    String memberDataId1 = getMetricId(dataId1, feedId, resourceId);
                    String memberDataId2 = getMetricId(dataId2, feedId, resourceId);
                    dataIdMap.put(dataId1, memberDataId1);
                    dataIdMap.put(dataId2, memberDataId2);
                    log.warn("\n*********** Member : " + memberId);
                    definitions.addMemberTrigger(tenantId, groupTriggerId, memberId, null, memberDescription,
                            memberContext, memberTags, dataIdMap);
                    log.warn("\n*********** Member Created : " + memberId);

                    // JVM NON-HEAP
                    groupTriggerId = "JVM_NonHeapUsed";
                    memberId = groupTriggerId + "_" + qualifiedResourceId;
                    memberDescription = "JVM Non Heap Used percent of Heap Max for " + resourceId;
                    dataIdMap.clear();
                    dataId1 = "WildFly Memory Metrics~NonHeap Used";
                    dataId2 = "WildFly Memory Metrics~Heap Max";
                    memberDataId1 = getMetricId(dataId1, feedId, resourceId);
                    memberDataId2 = getMetricId(dataId2, feedId, resourceId);
                    dataIdMap.put(dataId1, memberDataId1);
                    dataIdMap.put(dataId2, memberDataId2);
                    log.warn("\n*********** Member : " + memberId);
                    definitions.addMemberTrigger(tenantId, groupTriggerId, memberId, null, memberDescription,
                            memberContext, memberTags, dataIdMap);
                    log.warn("\n*********** Member Created : " + memberId);

                    // Accumulated GC Time
                    // Note that the GC metric is a counter, an ever-increasing value reflecting the total time the JVM
                    // has spent doing GC.  'Accumulated' here reflects that we are combining the totals for 4
                    // different GCs in the VM, each a counter itself, and reporting a single metric value for total
                    // GC time spent. So, from an alerting perspective we want to alert when GC is taking unacceptably
                    // long. That means we need to alert on high *deltas* in the metric values reported, which reflect
                    // a lot of time spent in GC between readings.  We'll start with 200ms per minute for 5 minutes.
                    // TODO: 'Rate' This should likely be a new triggerType but for now we'll treat it like threshold.
                    groupTriggerId = "JVM_GC";
                    memberId = groupTriggerId + "_" + qualifiedResourceId;
                    memberDescription = "Accumulated GC Duration Per-Minute for " + resourceId;
                    dataIdMap.clear();
                    dataId1 = "WildFly Memory Metrics~Accumulated GC Duration";
                    memberDataId1 = getMetricId(dataId1, feedId, resourceId);
                    dataIdMap.put(dataId1, memberDataId1);
                    log.warn("\n*********** Member : " + memberId);
                    definitions.addMemberTrigger(tenantId, groupTriggerId, memberId, null,
                            memberDescription, memberContext, memberTags, dataIdMap);
                    log.warn("\n*********** Member Created : " + memberId);

                    // WEB SESSION TRIGGERS
                    // ACTIVE SESSIONS
                    groupTriggerId = "Web_SessionsActive";
                    memberId = groupTriggerId + "_" + qualifiedResourceId;
                    memberDescription = "Active Web Sessions for " + resourceId;
                    dataIdMap.clear();
                    dataId1 = "WildFly Aggregated Web Metrics~Aggregated Active Web Sessions";
                    memberDataId1 = getMetricId(dataId1, feedId, resourceId);
                    dataIdMap.put(dataId1, memberDataId1);
                    log.warn("\n*********** Member : " + memberId);
                    definitions.addMemberTrigger(tenantId, groupTriggerId, memberId, null,
                            memberDescription, memberContext, memberTags, dataIdMap);
                    log.warn("\n*********** Member Created : " + memberId);

                    // EXPIRED SESSIONS
                    groupTriggerId = "Web_SessionsExpired";
                    memberId = groupTriggerId + "_" + qualifiedResourceId;
                    memberDescription = "Expired Web Sessions Per-Minute for " + resourceId;
                    dataIdMap.clear();
                    dataId1 = "WildFly Aggregated Web Metrics~Aggregated Expired Web Sessions";
                    memberDataId1 = getMetricId(dataId1, feedId, resourceId);
                    dataIdMap.put(dataId1, memberDataId1);
                    log.warn("\n*********** Member : " + memberId);
                    definitions.addMemberTrigger(tenantId, groupTriggerId, memberId, null,
                            memberDescription, memberContext, memberTags, dataIdMap);
                    log.warn("\n*********** Member Created : " + memberId);

                    // REJECTED SESSIONS
                    groupTriggerId = "Web_SessionsRejected";
                    memberId = groupTriggerId + "_" + qualifiedResourceId;
                    memberDescription = "Rejected Web Sessions Per-Minute for " + resourceId;
                    dataIdMap.clear();
                    dataId1 = "WildFly Aggregated Web Metrics~Aggregated Rejected Web Sessions";
                    memberDataId1 = getMetricId(dataId1, feedId, resourceId);
                    dataIdMap.put(dataId1, memberDataId1);
                    log.warn("\n*********** Member : " + memberId);
                    definitions.addMemberTrigger(tenantId, groupTriggerId, memberId, null,
                            memberDescription, memberContext, memberTags, dataIdMap);
                    log.warn("\n*********** Member Created : " + memberId);

                    // FAILED DEPLOYMENTS
                    groupTriggerId = "Deployment_Failure";
                    memberId = groupTriggerId + "_" + qualifiedResourceId;
                    memberDescription = "Deployment failure for " + resourceId;
                    dataIdMap.clear();
                    dataId1 = "DeployApplicationResponse";
                    memberDataId1 = qualifiedResourceId + "_" + dataId1;
                    dataIdMap.put(dataId1, memberDataId1);
                    log.warn("\n*********** Member : " + memberId);
                    definitions.addMemberTrigger(tenantId, groupTriggerId, memberId, null,
                            memberDescription, memberContext, memberTags, dataIdMap);
                    log.warn("\n*********** Member Created : " + memberId);

                    break;
                }
                default:
                    log.infof("\n*********** Member Trigger Not Created for resource [%s,%s] ", r.getType().getId(),
                            r.getId());
                    return; // no alerting
            }
        } catch (Exception e) {
            log.errorf("Error processing inventory bus event %s : %s", event, e);
        }
    }

    private String getMetricId(String groupDataId, String feedId, String resId) {
        return "MI~R~[" + feedId + "/" + resId + "~~]~MT~" + groupDataId;
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
