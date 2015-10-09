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
package org.hawkular.inventory.rest.security;

import java.util.EnumMap;
import java.util.HashMap;
import java.util.Map;

import javax.annotation.PostConstruct;
import javax.enterprise.inject.Default;
import javax.inject.Inject;
import javax.inject.Singleton;
import javax.transaction.SystemException;
import javax.transaction.UserTransaction;

import org.hawkular.accounts.api.OperationService;
import org.hawkular.accounts.api.PermissionChecker;
import org.hawkular.accounts.api.model.Operation;
import org.hawkular.inventory.api.Inventory;
import org.hawkular.inventory.api.model.CanonicalPath;
import org.hawkular.inventory.api.model.Environment;
import org.hawkular.inventory.api.model.Feed;
import org.hawkular.inventory.api.model.Metric;
import org.hawkular.inventory.api.model.MetricType;
import org.hawkular.inventory.api.model.Relationship;
import org.hawkular.inventory.api.model.Resource;
import org.hawkular.inventory.api.model.ResourceType;
import org.hawkular.inventory.api.model.Tenant;
import org.hawkular.inventory.rest.RestApiLogger;
import org.hawkular.inventory.rest.cdi.AutoTenant;

/**
 * CDI bean that provides inventory-focused abstractions over Hawkular accounts.
 * It defines all the operations available in inventory and implements permission checking methods.
 *
 * @author Lukas Krejci
 * @since 0.0.2
 */
@Singleton
@Default
public class InventorySecurity implements Security {

    private final Map<Class<?>, Map<OperationType, Operation>> operationsByType =
            new HashMap<>();

    @Inject
    private PermissionChecker permissions;

    @Inject
    private OperationService operations;

    @Inject
    @AutoTenant
    private Inventory inventory;

    private boolean inventoryInitialized = false;

    @javax.annotation.Resource
    private UserTransaction transaction;

    public CreatePermissionCheckerFinisher canCreate(Class<?> entityType) {
        return new CreatePermissionCheckerFinisherImpl(entityType);
    }

    public boolean canUpdate(CanonicalPath path) {
        return safePermissionCheck(path, update(path.getSegment().getElementType()));
    }

    public boolean canDelete(CanonicalPath path) {
        return safePermissionCheck(path, delete(path.getSegment().getElementType()));
    }

    public boolean canAssociateFrom(CanonicalPath path) {
        return safePermissionCheck(path, associate());
    }

    public boolean canCopyEnvironment(CanonicalPath path) {
        return safePermissionCheck(path, copy());
    }

    private Operation create(Class<?> entityType) {
        return getOperation(entityType, OperationType.CREATE);
    }

    private Operation update(Class<?> entityType) {
        return getOperation(entityType, OperationType.UPDATE);
    }

    private Operation delete(Class<?> entityType) {
        return getOperation(entityType, OperationType.DELETE);
    }

    private Operation associate() {
        return operationsByType.get(Relationship.class).get(OperationType.ASSOCIATE);
    }

    private Operation copy() {
        return operationsByType.get(Environment.class).get(OperationType.COPY);
    }

    private Operation getOperation(Class<?> cls, OperationType operationType) {
        Map<OperationType, Operation> ops = operationsByType.get(cls);
        if (ops == null) {
            throw new IllegalArgumentException("There is no " + operationType + " operation for elements of type " +
                    cls);
        }

        return ops.get(operationType);
    }

    private boolean safePermissionCheck(CanonicalPath path, Operation operation) {
        return safePermissionCheck(path.getSegment().getElementType(), path.getSegment().getElementId(),
                operation, EntityIdUtils.getStableId(path));
    }

    private boolean safePermissionCheck(Class<?> entityType, String entityId, Operation operation, String stableId) {
        try {
            if (!inventoryInitialized) {
                //make sure the tenant exists prior to checking perms on it
                if (!inventory.tenants().get(entityId).exists()) {
                    inventory.tenants().create(Tenant.Blueprint.builder().withId(entityId).build());
                }
                inventoryInitialized = true;
            }
            RestApiLogger.LOGGER.debugf("Permission check for operation '%s' for entity with stable ID '%s'",
                    operation.getName(), stableId);
            return permissions.isAllowedTo(operation, stableId);
        } catch (Exception e) {
            RestApiLogger.LOGGER.securityCheckFailed(stableId, e);
            return false;
        }
    }

    @PostConstruct
    public void initOperationsMap() {

        // Monitor – a read-only role. Cannot modify any resource.
        // Operator – Monitor permissions, plus can modify runtime state, but cannot modify anything that ends up in the
        //            persistent configuration. Could, for example, restart a server.
        // Maintainer – Operator permissions, plus can modify the persistent configuration.
        // Deployer – like a Maintainer, but with permission to modify persistent configuration constrained to resources
        //            that are considered to be "application resources". A deployment is an application resource. The
        //            messaging server is not. Items like datasources and JMS destinations are not considered to be
        //            application resources by default, but this is configurable.
        //
        // Three roles are granted permissions for security sensitive items:
        //
        // SuperUser – has all permissions. Equivalent to a JBoss AS 7 administrator.
        // Administrator – has all permissions except cannot read or write resources related to the administrative audit
        //                 logging system.
        // Auditor – can read anything. Can only modify the resources related to the administrative audit logging
        //           system.

        if (!SecurityIntegration.isDummy()) {
            try {
                transaction.begin();
                operations.setup("update-tenant").add("SuperUser").persist();
                operations.setup("delete-tenant").add("SuperUser").persist();

                operations.setup("create-environment").add("Administrator").persist();
                operations.setup("update-environment").add("Administrator").persist();
                operations.setup("delete-environment").add("Administrator").persist();
                operations.setup("copy-environment").add("Administrator").persist();

                operations.setup("create-resourceType").add("Administrator").persist();
                operations.setup("update-resourceType").add("Administrator").persist();
                operations.setup("delete-resourceType").add("Administrator").persist();

                operations.setup("create-metricType").add("Administrator").persist();
                operations.setup("update-metricType").add("Administrator").persist();
                operations.setup("delete-metricType").add("Administrator").persist();

                operations.setup("create-operationType").add("Administrator").persist();
                operations.setup("update-operationType").add("Administrator").persist();
                operations.setup("delete-operationType").add("Administrator").persist();

                operations.setup("create-feed").add("Administrator").persist();
                operations.setup("update-feed").add("Administrator").persist();
                operations.setup("delete-feed").add("Administrator").persist();

                operations.setup("create-resource").add("Maintainer").persist();
                operations.setup("update-resource").add("Maintainer").persist();
                operations.setup("delete-resource").add("Maintainer").persist();

                operations.setup("create-metric").add("Maintainer").persist();
                operations.setup("update-metric").add("Maintainer").persist();
                operations.setup("delete-metric").add("Maintainer").persist();

                operations.setup("associate").add("Operator").persist();

                transaction.commit();
            } catch (Throwable t) {
                try {
                    transaction.rollback();
                } catch (SystemException e) {
                    throw new IllegalStateException("Unable to do the rollback: " + e.getMessage(), t);
                }
                throw new IllegalStateException(t);
            }

            Operation updateTenantOperation = operations.getByName("update-tenant");
            Operation deleteTenantOperation = operations.getByName("delete-tenant");

            Operation createEnvironmentOperation = operations.getByName("create-environment");
            Operation updateEnvironmentOperation = operations.getByName("update-environment");
            Operation deleteEnvironmentOperation = operations.getByName("delete-environment");
            Operation copyEnvironmentOperation = operations.getByName("copy-environment");

            Operation createResourceTypeOperation = operations.getByName("create-resourceType");
            Operation updateResourceTypeOperation = operations.getByName("update-resourceType");
            Operation deleteResourceTypeOperation = operations.getByName("delete-resourceType");

            Operation createMetricTypeOperation = operations.getByName("create-metricType");
            Operation updateMetricTypeOperation = operations.getByName("update-metricType");
            Operation deleteMetricTypeOperation = operations.getByName("delete-metricType");

            Operation createOperationTypeOperation = operations.getByName("create-operationType");
            Operation updateOperationTypeOperation = operations.getByName("update-operationType");
            Operation deleteOperationTypeOperation = operations.getByName("delete-operationType");

            Operation createFeedOperation = operations.getByName("create-feed");
            Operation updateFeedOperation = operations.getByName("update-feed");
            Operation deleteFeedOperation = operations.getByName("delete-feed");

            Operation createResourceOperation = operations.getByName("create-resource");
            Operation updateResourceOperation = operations.getByName("update-resource");
            Operation deleteResourceOperation = operations.getByName("delete-resource");

            Operation createMetricOperation = operations.getByName("create-metric");
            Operation updateMetricOperation = operations.getByName("update-metric");
            Operation deleteMetricOperation = operations.getByName("delete-metric");

            Operation associate = operations.getByName("associate");

            operationsByType.put(Tenant.class, new EnumMap<OperationType, Operation>(OperationType.class) {{
                put(OperationType.UPDATE, updateTenantOperation);
                put(OperationType.DELETE, deleteTenantOperation);
            }});

            operationsByType.put(Environment.class, new EnumMap<OperationType, Operation>(OperationType.class) {{
                put(OperationType.CREATE, createEnvironmentOperation);
                put(OperationType.UPDATE, updateEnvironmentOperation);
                put(OperationType.DELETE, deleteEnvironmentOperation);
                put(OperationType.COPY, copyEnvironmentOperation);
            }});

            operationsByType.put(ResourceType.class, new EnumMap<OperationType, Operation>(OperationType.class) {{
                put(OperationType.CREATE, createResourceTypeOperation);
                put(OperationType.UPDATE, updateResourceTypeOperation);
                put(OperationType.DELETE, deleteResourceTypeOperation);
            }});

            operationsByType.put(MetricType.class, new EnumMap<OperationType, Operation>(OperationType.class) {{
                put(OperationType.CREATE, createMetricTypeOperation);
                put(OperationType.UPDATE, updateMetricTypeOperation);
                put(OperationType.DELETE, deleteMetricTypeOperation);
            }});

            operationsByType.put(Feed.class, new EnumMap<OperationType, Operation>(OperationType.class) {{
                put(OperationType.CREATE, createFeedOperation);
                put(OperationType.UPDATE, updateFeedOperation);
                put(OperationType.DELETE, deleteFeedOperation);
            }});

            operationsByType.put(Resource.class, new EnumMap<OperationType, Operation>(OperationType.class) {{
                put(OperationType.CREATE, createResourceOperation);
                put(OperationType.UPDATE, updateResourceOperation);
                put(OperationType.DELETE, deleteResourceOperation);
            }});

            operationsByType.put(Metric.class, new EnumMap<OperationType, Operation>(OperationType.class) {{
                put(OperationType.CREATE, createMetricOperation);
                put(OperationType.UPDATE, updateMetricOperation);
                put(OperationType.DELETE, deleteMetricOperation);
            }});

            operationsByType.put(Relationship.class, new EnumMap<OperationType, Operation>(OperationType.class) {{
                put(OperationType.ASSOCIATE, associate);
            }});

            operationsByType.put(org.hawkular.inventory.api.model.OperationType.class, new EnumMap<OperationType,
                    Operation>(OperationType.class) {{
                put(OperationType.CREATE, createOperationTypeOperation);
                put(OperationType.UPDATE, updateOperationTypeOperation);
                put(OperationType.DELETE, deleteOperationTypeOperation);
            }});
        }
    }

    private enum OperationType {
        CREATE, UPDATE, DELETE, COPY, ASSOCIATE
    }

    public final class CreatePermissionCheckerFinisherImpl implements Security.CreatePermissionCheckerFinisher {

        private final Class<?> createdType;

        private CreatePermissionCheckerFinisherImpl(Class<?> createdType) {
            this.createdType = createdType;
        }

        public boolean under(CanonicalPath path) {
            String entityId = EntityIdUtils.getStableId(path);
            return safePermissionCheck(createdType, path.getSegment().getElementId(), create(createdType), entityId);
        }
    }
}
