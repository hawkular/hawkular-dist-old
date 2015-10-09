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
package org.hawkular.inventory.rest;

import static javax.ws.rs.core.MediaType.APPLICATION_JSON;
import static javax.ws.rs.core.Response.Status.BAD_REQUEST;
import static javax.ws.rs.core.Response.Status.CONFLICT;
import static javax.ws.rs.core.Response.Status.CREATED;
import static javax.ws.rs.core.Response.Status.FORBIDDEN;
import static javax.ws.rs.core.Response.Status.INTERNAL_SERVER_ERROR;
import static javax.ws.rs.core.Response.Status.NOT_FOUND;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import javax.ws.rs.Consumes;
import javax.ws.rs.POST;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriInfo;

import org.hawkular.inventory.api.Data;
import org.hawkular.inventory.api.EntityAlreadyExistsException;
import org.hawkular.inventory.api.EntityNotFoundException;
import org.hawkular.inventory.api.Environments;
import org.hawkular.inventory.api.Feeds;
import org.hawkular.inventory.api.Inventory;
import org.hawkular.inventory.api.MetricTypes;
import org.hawkular.inventory.api.Metrics;
import org.hawkular.inventory.api.OperationTypes;
import org.hawkular.inventory.api.Relationships;
import org.hawkular.inventory.api.ResolvableToSingle;
import org.hawkular.inventory.api.ResolvableToSingleWithRelationships;
import org.hawkular.inventory.api.ResourceTypes;
import org.hawkular.inventory.api.Resources;
import org.hawkular.inventory.api.Tenants;
import org.hawkular.inventory.api.TransactionFrame;
import org.hawkular.inventory.api.WriteInterface;
import org.hawkular.inventory.api.model.AbstractElement;
import org.hawkular.inventory.api.model.Blueprint;
import org.hawkular.inventory.api.model.CanonicalPath;
import org.hawkular.inventory.api.model.DataEntity;
import org.hawkular.inventory.api.model.ElementBlueprintVisitor;
import org.hawkular.inventory.api.model.ElementTypeVisitor;
import org.hawkular.inventory.api.model.Entity;
import org.hawkular.inventory.api.model.Environment;
import org.hawkular.inventory.api.model.Feed;
import org.hawkular.inventory.api.model.Metric;
import org.hawkular.inventory.api.model.MetricType;
import org.hawkular.inventory.api.model.OperationType;
import org.hawkular.inventory.api.model.Path;
import org.hawkular.inventory.api.model.Relationship;
import org.hawkular.inventory.api.model.Resource;
import org.hawkular.inventory.api.model.ResourceType;

import com.wordnik.swagger.annotations.Api;
import com.wordnik.swagger.annotations.ApiOperation;
import com.wordnik.swagger.annotations.ApiParam;
import com.wordnik.swagger.annotations.ApiResponse;
import com.wordnik.swagger.annotations.ApiResponses;

/**
 * @author Lukas Krejci
 * @since 0.4.0
 */
@javax.ws.rs.Path("/bulk")
@Produces(APPLICATION_JSON)
@Consumes(APPLICATION_JSON)
@Api(value = "/bulk", description = "Endpoint for bulk operations on inventory entities")
public class RestBulk extends RestBase {

    private static CanonicalPath canonicalize(String path, CanonicalPath rootPath) {
        Path p;
        if (path == null || path.isEmpty()) {
            p = rootPath;
        } else {
            p = Path.fromPartiallyUntypedString(path, rootPath, rootPath, Entity.class);
        }
        if (p.isRelative()) {
            p = p.toRelativePath().applyTo(rootPath);
        }
        return p.toCanonicalPath();
    }

    private static void putStatus(Map<ElementType, Map<CanonicalPath, Integer>> statuses, ElementType et,
                                  CanonicalPath cp, Integer status) {

        Map<CanonicalPath, Integer> typeStatuses = statuses.get(et);
        if (typeStatuses == null) {
            typeStatuses = new HashMap<>();
            statuses.put(et, typeStatuses);
        }

        typeStatuses.put(cp, status);
    }

    private static String arrow(Relationship.Blueprint b) {
        switch (b.getDirection()) {
            case both:
                return "<-(" + b.getName() + ")->";
            case outgoing:
                return "-(" + b.getName() + ")->";
            case incoming:
                return "<-(" + b.getName() + ")-";
            default:
                throw new IllegalStateException("Unhandled direction type: " + b.getDirection());
        }
    }

    private static WriteInterface<?, ?, ?, ?> step(Class<?> elementClass, Class<?> nextType,
                                                   ResolvableToSingle<?, ?> single) {

        return ElementTypeVisitor.accept(elementClass,
                new ElementTypeVisitor.Simple<WriteInterface<?, ?, ?, ?>, Void>() {

                    @Override
                    protected WriteInterface<?, ?, ?, ?> defaultAction() {
                        throw new IllegalArgumentException("Entity of type '" + nextType.getSimpleName() + "' cannot " +
                                "be created under an entity of type '" + elementClass.getSimpleName() + "'.");
                    }

                    @Override
                    public WriteInterface<?, ?, ?, ?> visitEnvironment(Void parameter) {
                        return ElementTypeVisitor.accept(nextType, new RejectingVisitor() {
                            @Override
                            public WriteInterface<?, ?, ?, ?> visitFeed(Void parameter) {
                                return ((Environments.Single) single).feeds();
                            }

                            @Override
                            public WriteInterface<?, ?, ?, ?> visitMetric(Void parameter) {
                                return ((Environments.Single) single).feedlessMetrics();
                            }

                            @Override
                            public WriteInterface<?, ?, ?, ?> visitResource(Void parameter) {
                                return ((Environments.Single) single).feedlessResources();
                            }
                        }, null);
                    }

                    @Override
                    public WriteInterface<?, ?, ?, ?> visitFeed(Void parameter) {
                        return ElementTypeVisitor.accept(nextType, new RejectingVisitor() {
                            @Override
                            public WriteInterface<?, ?, ?, ?> visitMetric(Void parameter) {
                                return ((Feeds.Single) single).metrics();
                            }

                            @Override
                            public WriteInterface<?, ?, ?, ?> visitMetricType(Void parameter) {
                                return ((Feeds.Single) single).metricTypes();
                            }

                            @Override
                            public WriteInterface<?, ?, ?, ?> visitResource(Void parameter) {
                                return ((Feeds.Single) single).resources();
                            }

                            @Override
                            public WriteInterface<?, ?, ?, ?> visitResourceType(Void parameter) {
                                return ((Feeds.Single) single).resourceTypes();
                            }
                        }, null);
                    }

                    @Override
                    public WriteInterface<?, ?, ?, ?> visitMetric(Void parameter) {
                        return defaultAction();
                    }

                    @Override
                    public WriteInterface<?, ?, ?, ?> visitMetricType(Void parameter) {
                        return defaultAction();
                    }

                    @Override
                    public WriteInterface<?, ?, ?, ?> visitOperationType(Void parameter) {
                        return ElementTypeVisitor.accept(nextType, new RejectingVisitor() {
                            @Override
                            public WriteInterface<?, ?, ?, ?> visitData(Void parameter) {
                                return ((OperationTypes.Single) single).data();
                            }
                        }, null);
                    }

                    @Override
                    public WriteInterface<?, ?, ?, ?> visitResource(Void parameter) {
                        return ElementTypeVisitor.accept(nextType, new RejectingVisitor() {
                            @Override
                            public WriteInterface<?, ?, ?, ?> visitData(Void parameter) {
                                return ((Resources.Single) single).data();
                            }

                            @Override
                            public WriteInterface<?, ?, ?, ?> visitResource(Void parameter) {
                                return ((Resources.Single) single).containedChildren();
                            }
                        }, null);
                    }

                    @Override
                    public WriteInterface<?, ?, ?, ?> visitResourceType(Void parameter) {
                        return ElementTypeVisitor.accept(nextType, new RejectingVisitor() {
                            @Override
                            public WriteInterface<?, ?, ?, ?> visitData(Void parameter) {
                                return ((ResourceTypes.Single) single).data();
                            }

                            @Override
                            public WriteInterface<?, ?, ?, ?> visitOperationType(Void parameter) {
                                return ((ResourceTypes.Single) single).operationTypes();
                            }
                        }, null);
                    }

                    @Override
                    public WriteInterface<?, ?, ?, ?> visitTenant(Void parameter) {
                        return ElementTypeVisitor.accept(nextType, new RejectingVisitor() {
                            @Override
                            public WriteInterface<?, ?, ?, ?> visitEnvironment(Void parameter) {
                                return ((Tenants.Single) single).environments();
                            }

                            @Override
                            public WriteInterface<?, ?, ?, ?> visitMetricType(Void parameter) {
                                return ((Tenants.Single) single).feedlessMetricTypes();
                            }

                            @Override
                            public WriteInterface<?, ?, ?, ?> visitResourceType(Void parameter) {
                                return ((Tenants.Single) single).feedlessResourceTypes();
                            }
                        }, null);
                    }

                    class RejectingVisitor extends ElementTypeVisitor.Simple<WriteInterface<?, ?, ?, ?>, Void> {
                        @Override
                        protected WriteInterface<?, ?, ?, ?> defaultAction() {
                            throw new IllegalArgumentException(
                                    "Entity of type '" + nextType.getSimpleName() + "' cannot " +
                                            "be created under an entity of type '" + elementClass.getSimpleName() +
                                            "'.");
                        }
                    }
                }, null);
    }

    private static ResolvableToSingle<?, ?> create(Blueprint b, WriteInterface<?, ?, ?, ?> wrt) {
        return b.accept(new ElementBlueprintVisitor.Simple<ResolvableToSingle<?, ?>, Void>() {
            @SuppressWarnings("unchecked")
            @Override
            public ResolvableToSingle<?, ?> visitData(DataEntity.Blueprint<?> data, Void parameter) {
                return ((Data.ReadWrite) wrt).create(data);
            }

            @Override
            public ResolvableToSingle<?, ?> visitEnvironment(Environment.Blueprint environment, Void parameter) {
                return ((Environments.ReadWrite) wrt).create(environment);
            }

            @Override
            public ResolvableToSingle<?, ?> visitFeed(Feed.Blueprint feed, Void parameter) {
                return ((Feeds.ReadWrite) wrt).create(feed);
            }

            @Override public ResolvableToSingle<?, ?> visitMetric(Metric.Blueprint metric, Void parameter) {
                return ((Metrics.ReadWrite) wrt).create(metric);
            }

            @Override public ResolvableToSingle<?, ?> visitMetricType(MetricType.Blueprint metricType, Void parameter) {
                return ((MetricTypes.ReadWrite) wrt).create(metricType);
            }

            @Override
            public ResolvableToSingle<?, ?> visitOperationType(OperationType.Blueprint operationType, Void parameter) {
                return ((OperationTypes.ReadWrite) wrt).create(operationType);
            }

            @Override
            public ResolvableToSingle<?, ?> visitResource(Resource.Blueprint resource, Void parameter) {
                return ((Resources.ReadWrite) wrt).create(resource);
            }

            @Override
            public ResolvableToSingle<?, ?> visitResourceType(ResourceType.Blueprint type, Void parameter) {
                return ((ResourceTypes.ReadWrite) wrt).create(type);
            }
        }, null);
    }

    @POST
    @javax.ws.rs.Path("/")
    @ApiOperation("Bulk creation of new entities. The response body contains details about results of creation" +
            " of individual entities. The return value is a map where keys are types of entities created and values" +
            " are again maps where keys are the canonical paths of the entities to be created and values are HTTP" +
            " status codes - 201 OK, 400 if invalid path is supplied, 409 if the entity already exists on given path" +
            " or 500 in case of internal error.")
    @ApiResponses({
            @ApiResponse(code = 201, message = "Entities successfully created"),
    })
    public Response addEntities(@ApiParam("This is a map where keys are paths to the parents under which entities " +
            "should be created. The values are again maps where keys are one of [environment, resourceType, " +
            "metricType, operationType, feed, resource, metric, dataEntity, relationship] and values are arrays of " +
            "blueprints of entities of the corresponding types.") Map<String, Map<ElementType, List<Object>>> entities,
                                @Context UriInfo uriInfo) {

        CanonicalPath rootPath = CanonicalPath.of().tenant(getTenantId()).get();

        Map<ElementType, Map<CanonicalPath, Integer>> statuses = bulkCreate(entities, rootPath);

        return Response.status(CREATED).entity(statuses).build();
    }

    private Map<ElementType, Map<CanonicalPath, Integer>> bulkCreate(
            Map<String, Map<ElementType, List<Object>>> entities, CanonicalPath rootPath) {

        Map<ElementType, Map<CanonicalPath, Integer>> statuses = new HashMap<>();

        TransactionFrame transaction = inventory.newTransactionFrame();
        Inventory binv = transaction.boundInventory();

        IdExtractor idExtractor = new IdExtractor();

        try {
            for (Map.Entry<String, Map<ElementType, List<Object>>> e : entities.entrySet()) {
                Map<ElementType, List<Object>> allBlueprints = e.getValue();

                CanonicalPath parentPath = canonicalize(e.getKey(), rootPath);

                ResolvableToSingle<?, ?> single = binv.inspect(parentPath, ResolvableToSingle.class);

                for (Map.Entry<ElementType, List<Object>> ee : allBlueprints.entrySet()) {
                    ElementType elementType = ee.getKey();
                    List<Object> rawBlueprints = ee.getValue();

                    List<Blueprint> blueprints = deserializeBlueprints(elementType, rawBlueprints);

                    if (elementType == ElementType.relationship) {
                        bulkCreateRelationships(statuses, parentPath,
                                (ResolvableToSingleWithRelationships<?, ?>) single, elementType, blueprints);
                    } else {
                        bulkCreateEntity(statuses, idExtractor, parentPath, single, elementType, blueprints);
                    }
                }
            }
            transaction.commit();
            return statuses;
        } catch (Throwable t) {
            // TODO this potentially leaves behind the security resources of the entities that have been created
            // before the transaction failure
            transaction.rollback();
            throw t;
        }
    }

    private List<Blueprint> deserializeBlueprints(ElementType elementType, List<Object> rawBlueprints) {
        return rawBlueprints.stream().map((o) -> {
            try {
                String js = mapper.writeValueAsString(o);
                return (Blueprint) mapper.reader(elementType.blueprintType).readValue(js);
            } catch (IOException e1) {
                throw new IllegalArgumentException("Failed to deserialize as " + elementType
                        .blueprintType + " the following data: " + o, e1);
            }
        }).collect(Collectors.toList());
    }

    private void bulkCreateEntity(Map<ElementType, Map<CanonicalPath, Integer>> statuses,
                                  IdExtractor idExtractor, CanonicalPath parentPath,
                                  ResolvableToSingle<?, ?> single, ElementType elementType,
                                  List<Blueprint> blueprints) {
        if (!parentPath.modified().canExtendTo(elementType.elementType)) {
            putStatus(statuses, elementType, parentPath, BAD_REQUEST.getStatusCode());
            return;
        }

        if (!canCreateUnderParent(elementType, parentPath)) {
            for (Blueprint b : blueprints) {
                String id = b.accept(idExtractor, null);
                putStatus(statuses, elementType, parentPath.extend(elementType.elementType, id).get(),
                        FORBIDDEN.getStatusCode());
            }
            return;
        }

        for (Blueprint b : blueprints) {
            String id = b.accept(idExtractor, null);

            CanonicalPath childPath = parentPath.extend(elementType.elementType, id).get();

            WriteInterface<?, ?, ?, ?> wrt =
                    step(parentPath.getSegment().getElementType(), elementType
                            .elementType, single);

            try {
                create(b, wrt);
                putStatus(statuses, elementType, childPath, CREATED.getStatusCode());
            } catch (EntityAlreadyExistsException ex) {
                putStatus(statuses, elementType, childPath, CONFLICT.getStatusCode());
            } catch (Exception ex) {
                RestApiLogger.LOGGER.failedToCreateBulkEntity(childPath, ex);
                putStatus(statuses, elementType, childPath, INTERNAL_SERVER_ERROR.getStatusCode());
            }
        }
    }

    private void bulkCreateRelationships(Map<ElementType, Map<CanonicalPath, Integer>> statuses,
                                         CanonicalPath parentPath, ResolvableToSingleWithRelationships<?, ?> single,
                                         ElementType elementType, List<Blueprint> blueprints) {
        if (!security.canAssociateFrom(parentPath)) {
            for (Blueprint b : blueprints) {
                Relationship.Blueprint rb = (Relationship.Blueprint) b;
                String id = parentPath.toString() + arrow(rb) + rb.getOtherEnd();
                putStatus(statuses, elementType, parentPath.extend(elementType.elementType, id).get(),
                        FORBIDDEN.getStatusCode());
            }
            return;
        }

        for (Blueprint b : blueprints) {
            Relationship.Blueprint rb = (Relationship.Blueprint) b;

            try {
                Relationships.Single rel = single.relationships(rb.getDirection())
                        .linkWith(rb.getName(), rb.getOtherEnd(), rb.getProperties());

                putStatus(statuses, elementType, rel.entity().getPath(), CREATED.getStatusCode());
            } catch (EntityNotFoundException ex) {
                String fakeId = parentPath.toString() + arrow(rb) + rb.getOtherEnd().toString();

                putStatus(statuses, elementType, CanonicalPath.of().relationship(fakeId).get(),
                        NOT_FOUND.getStatusCode());
            }
        }
    }

    private boolean canCreateUnderParent(ElementType elementType, CanonicalPath parentPath) {
        switch (elementType) {
            case dataEntity:
                return security.canUpdate(parentPath);
            case relationship:
                throw new IllegalArgumentException("Cannot create anything under a relationship.");
            default:
                return security.canCreate(elementType.elementType).under(parentPath);
        }
    }

    private enum ElementType {
        environment(Environment.class, Environment.Blueprint.class),
        resourceType(ResourceType.class, ResourceType.Blueprint.class),
        metricType(MetricType.class, MetricType.Blueprint.class),
        operationType(OperationType.class, OperationType.Blueprint.class),
        feed(Feed.class, Feed.Blueprint.class),
        metric(Metric.class, Metric.Blueprint.class),
        resource(Resource.class, Resource.Blueprint.class),
        dataEntity(DataEntity.class, DataEntity.Blueprint.class),
        relationship(Relationship.class, Relationship.Blueprint.class);

        final Class<? extends AbstractElement<?, ?>> elementType;
        final Class<? extends Blueprint> blueprintType;

        ElementType(Class<? extends AbstractElement<?, ?>> elementType, Class<? extends Blueprint> blueprintType) {
            this.elementType = elementType;
            this.blueprintType = blueprintType;
        }
    }

    private static class IdExtractor extends ElementBlueprintVisitor.Simple<String, Void> {
        @Override
        protected String defaultAction(Object blueprint, Void parameter) {
            return ((Entity.Blueprint) blueprint).getId();
        }

        @Override
        public String visitData(DataEntity.Blueprint<?> data, Void parameter) {
            return data.getRole().name();
        }

        @Override
        public String visitRelationship(Relationship.Blueprint relationship, Void parameter) {
            return arrow(relationship) + relationship.getOtherEnd().toString();
        }
    }
}

