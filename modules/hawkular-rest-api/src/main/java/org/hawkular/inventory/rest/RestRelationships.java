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
import static javax.ws.rs.core.Response.Status.NOT_FOUND;

import static org.hawkular.inventory.rest.RequestUtil.extractPaging;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.inject.Inject;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriInfo;
import javax.ws.rs.ext.Providers;

import org.hawkular.inventory.api.Relationships;
import org.hawkular.inventory.api.ResolvableToSingleWithRelationships;
import org.hawkular.inventory.api.filters.RelationFilter;
import org.hawkular.inventory.api.filters.RelationWith;
import org.hawkular.inventory.api.model.AbstractElement;
import org.hawkular.inventory.api.model.CanonicalPath;
import org.hawkular.inventory.api.model.Entity;
import org.hawkular.inventory.api.model.Environment;
import org.hawkular.inventory.api.model.Feed;
import org.hawkular.inventory.api.model.Metric;
import org.hawkular.inventory.api.model.MetricType;
import org.hawkular.inventory.api.model.Relationship;
import org.hawkular.inventory.api.model.Resource;
import org.hawkular.inventory.api.model.ResourceType;
import org.hawkular.inventory.api.model.Tenant;
import org.hawkular.inventory.api.paging.Page;
import org.hawkular.inventory.api.paging.Pager;
import org.hawkular.inventory.rest.json.ApiError;
import org.hawkular.inventory.rest.json.JsonLd;
import org.hawkular.inventory.rest.security.EntityIdUtils;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wordnik.swagger.annotations.Api;
import com.wordnik.swagger.annotations.ApiOperation;
import com.wordnik.swagger.annotations.ApiParam;
import com.wordnik.swagger.annotations.ApiResponse;
import com.wordnik.swagger.annotations.ApiResponses;

/**
 * @author Jiri Kremser
 * @since 0.1.0
 */
@Path("/")
@Produces(APPLICATION_JSON)
@Consumes(APPLICATION_JSON)
@Api(value = "/.*/relationships", description = "Work with the relationships.")
public class RestRelationships extends RestBase {

    public static Map<String, Class<? extends Entity<?, ?>>> entityMap;

    static {
        try {
            entityMap = new HashMap<>(7);
            entityMap.put(Tenant.class.getSimpleName(), Tenant.class);
            entityMap.put(Environment.class.getSimpleName(), Environment.class);
            entityMap.put(ResourceType.class.getSimpleName(), ResourceType.class);
            entityMap.put(MetricType.class.getSimpleName(), MetricType.class);
            entityMap.put(Resource.class.getSimpleName(), Resource.class);
            entityMap.put(Metric.class.getSimpleName(), Metric.class);
            entityMap.put(Feed.class.getSimpleName(), Feed.class);
        } catch (Exception e) {
            // just to make sure class loading can't fail
        }
    }

    @Context
    private Providers providers;

    @Inject @JsonLd
    private ObjectMapper jsonLdMapper;

    @GET
    @Path("{path:.*}/relationships")
    @ApiOperation("Retrieves relationships")
    @ApiResponses({
            @ApiResponse(code = 200, message = "The list of relationships"),
            @ApiResponse(code = 404, message = "Accompanying entity doesn't exist", response = ApiError
                    .class),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Response get(@PathParam("path") String path,
                        @DefaultValue("both") @QueryParam("direction") String direction,
                        @DefaultValue("") @QueryParam("property") String propertyName,
                        @DefaultValue("") @QueryParam("propertyValue") String propertyValue,
                        @DefaultValue("") @QueryParam("named") String named,
                        @DefaultValue("") @QueryParam("sourceType") String sourceType,
                        @DefaultValue("") @QueryParam("targetType") String targetType,
                        @DefaultValue("false") @QueryParam("jsonld") String jsonLd,
                        @Context UriInfo uriInfo) {
        String securityId = fixUpRestPath(path);
        if (!EntityIdUtils.isValidRestPath(securityId)) {
            return Response.status(NOT_FOUND).build();
        }
        CanonicalPath cPath = EntityIdUtils.toCanonicalPath(securityId);
        ResolvableToSingleWithRelationships<Relationship, Relationship.Update> resolvable =
                getResolvableFromCanonicalPath(cPath);
        Pager pager = extractPaging(uriInfo);
        RelationFilter[] filters = extractFilters(propertyName, propertyValue, named, sourceType,
            targetType, uriInfo);
        Relationships.Direction directed = Relationships.Direction.valueOf(direction);
        Page<Relationship> relations = resolvable.relationships(directed).getAll(filters).entities(pager);

        boolean jsonLdBool = Boolean.parseBoolean(jsonLd);
        if (jsonLdBool) {
            return ResponseUtil.pagedResponse(Response.ok(), uriInfo, jsonLdMapper, relations).build();
        } else {
            return pagedResponse(Response.ok(), uriInfo, relations).build();
        }
    }

    @GET
    @Path("/relationships/{relationshipId}")
    @ApiOperation("Retrieves relationship info")
    @ApiResponses({
        @ApiResponse(code = 200, message = "The details of relationship"),
        @ApiResponse(code = 404, message = "Accompanying entity doesn't exist", response = ApiError
            .class),
        @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Response getRelationship(@PathParam("relationshipId") String relationshipId,
                                    @DefaultValue("false") @QueryParam("jsonld") String jsonLd,
                                    @Context UriInfo uriInfo) throws JsonProcessingException {
        Relationship relationship = inventory.relationships().get(relationshipId).entity();
        ObjectMapper mapper = Boolean.parseBoolean(jsonLd) ? jsonLdMapper : this.mapper;
        Object json = mapper.writeValueAsString(relationship);
        return Response.ok(json).build();
    }

    @DELETE
    @Path("{path:.*}/relationships")
    @ApiOperation("Deletes a relationship")
    @ApiResponses({
            @ApiResponse(code = 200, message = "The list of relationships"),
            @ApiResponse(code = 404, message = "Accompanying entity doesn't exist", response = ApiError
                    .class),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Response delete(@PathParam("path") String path,
                           @ApiParam(required = true) Relationship relation,
                           @Context UriInfo uriInfo) {
        String securityId = fixUpRestPath(path);
        if (!EntityIdUtils.isValidRestPath(securityId)) {
            return Response.status(NOT_FOUND).build();
        }
        checkForWellKnownLabels(relation.getName(), "delete");
        CanonicalPath cPath = EntityIdUtils.toCanonicalPath(securityId);
        ResolvableToSingleWithRelationships<Relationship, Relationship.Update> resolvable =
                getResolvableFromCanonicalPath(cPath);

        // delete the relationship
        resolvable.relationships(Relationships.Direction.both).delete(relation.getId());
        if (RestApiLogger.LOGGER.isDebugEnabled()) {
            RestApiLogger.LOGGER.debug("deleting relationship with id: " + relation.getId() + " and name: " +
                                               relation.getName());
        }

        return Response.noContent().build();
    }

    @POST
    @Path("{path:.*}/relationships")
    @ApiOperation("Creates a relationship")
    @ApiResponses({
            @ApiResponse(code = 201, message = "OK"),
            @ApiResponse(code = 400, message = "Invalid input data", response = ApiError.class),
            @ApiResponse(code = 404, message = "Accompanying entity doesn't exist", response =
                    ApiError.class),
            @ApiResponse(code = 409, message = "Relationship already exists", response = ApiError.class),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Response create(@PathParam("path") String path,
                           @ApiParam(required = true) Relationship relation,
                           @Context UriInfo uriInfo) {

        String restPath = fixUpRestPath(path);
        if (!EntityIdUtils.isValidRestPath(restPath)) {
            return Response.status(NOT_FOUND).build();
        }
        checkForWellKnownLabels(relation.getName(), "create");
        CanonicalPath cPath = EntityIdUtils.toCanonicalPath(restPath);
        ResolvableToSingleWithRelationships<Relationship, Relationship.Update> resolvable =
                getResolvableFromCanonicalPath(cPath);

        Relationships.Direction directed;
        CanonicalPath theOtherSide;
        String[] chunks = path.split("/");
        String currentEntityId = chunks[chunks.length - 1];
        if (currentEntityId.equals(relation.getSource().getSegment().getElementId())) {
            directed = Relationships.Direction.outgoing;
            theOtherSide = relation.getTarget();
        } else if (currentEntityId.equals(relation.getTarget().getSegment().getElementId())) {
            directed = Relationships.Direction.incoming;
            theOtherSide = relation.getSource();
        } else {
            throw new IllegalArgumentException("Either source or target of the relationship must correspond with the " +
                                                       "resource being modified.");
        }

        // link the current entity with the target or the source of the relationship
        String newId = resolvable.relationships(directed).linkWith(relation.getName(), theOtherSide, relation
                .getProperties()).entity().getId();
        if (RestApiLogger.LOGGER.isDebugEnabled()) {
            RestApiLogger.LOGGER.debug("creating relationship with id: " + newId + " and name: " +
                                               relation.getName());
        }

        return ResponseUtil.created(uriInfo, newId).build();
    }

    @PUT
    @Path("{path:.*}/relationships")
    @ApiOperation("Updates a relationship")
    @ApiResponses({
            @ApiResponse(code = 204, message = "OK"),
            @ApiResponse(code = 400, message = "Invalid input data", response = ApiError.class),
            @ApiResponse(code = 404, message = "Accompanying entity doesn't exist", response =
                    ApiError.class),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Response update(@PathParam("path") String path,
            @ApiParam(required = true) Relationship relation,
            @Context UriInfo uriInfo) {
        String securityId = fixUpRestPath(path);
        if (!EntityIdUtils.isValidRestPath(securityId)) {
            return Response.status(NOT_FOUND).build();
        }

        // perhaps we could have allowed updating the properties of well-known rels
        checkForWellKnownLabels(relation.getName(), "update");
        CanonicalPath cPath = EntityIdUtils.toCanonicalPath(securityId);
        ResolvableToSingleWithRelationships<Relationship, Relationship.Update> resolvable =
                getResolvableFromCanonicalPath(cPath);

        // update the relationship
        resolvable.relationships(Relationships.Direction.both).update(relation.getId(), Relationship.Update.builder()
                .withProperties(relation.getProperties()).build());
        if (RestApiLogger.LOGGER.isDebugEnabled()) {
            RestApiLogger.LOGGER.debug("updating relationship with id: " + relation.getId() + " and name: " +
                    relation.getName());
        }

        return Response.noContent().build();
    }

    private String fixUpRestPath(String urlPath) {
        if (urlPath == null) return null;
        return urlPath.startsWith("tenants") ? "tenants/" + getTenantId() : getTenantId() + "/" + urlPath;
    }

    @SuppressWarnings("unchecked")
    private <E extends AbstractElement<?, U>, U extends AbstractElement.Update>
    ResolvableToSingleWithRelationships<E, U> getResolvableFromCanonicalPath(CanonicalPath cPath) {
        return inventory.inspect(cPath, ResolvableToSingleWithRelationships.class);
    }

    public static RelationFilter[] extractFilters(String propertyName,
                                                  String propertyValue,
                                                  String named,
                                                  String sourceType,
                                                  String targetType,
                                                  UriInfo info) {
        List<RelationFilter> filters = new ArrayList<>();
        if (!propertyName.isEmpty() && !propertyValue.isEmpty()) {
            filters.add(RelationWith.propertyValue(propertyName, propertyValue));
        }
        if (!named.isEmpty()) {
            List<String> namedParam = info.getQueryParameters().get("named");
            if (namedParam == null || namedParam.isEmpty()) {
                throw new IllegalArgumentException("Malformed URL param, the right format is: " +
                                                           "named=label1&named=label2&named=labelN");
            }
            filters.add(RelationWith.names(namedParam.toArray(new String[namedParam.size()])));
        }
        if (!sourceType.isEmpty()) {
            List<String> sourceParam = info.getQueryParameters().get("sourceType");
            if (sourceParam == null || sourceParam.isEmpty()) {
                throw new IllegalArgumentException("Malformed URL param, the right format is: " +
                                                           "sourceType=type1&sourceType=type2&sourceType=typeN");
            }
            Class<? extends Entity<?, ?>>[] types = sourceParam.stream()
                    .map(typeString -> entityMap.get(typeString))
                    .toArray(size -> new Class[size]);
            if (!sourceParam.isEmpty()) {
                filters.add(RelationWith.sourcesOfTypes(types));
            }
        }
        if (!targetType.isEmpty()) {
            List<String> targetParam = info.getQueryParameters().get("targetType");
            if (targetParam == null || targetParam.isEmpty()) {
                throw new IllegalArgumentException("Malformed URL param, the right format is: " +
                                                           "targetType=type1&targetType=type2&targetType=typeN");
            }
            Class<? extends Entity<?, ?>>[] types = (Class<? extends Entity<?, ?>>[]) targetParam.stream()
                    .map(typeString -> entityMap.get(typeString))
                    .toArray(size -> new Class[size]);
            if (!targetParam.isEmpty()) {
                filters.add(RelationWith.targetsOfTypes(types));
            }
        }
        return filters.isEmpty() ? RelationFilter.all() : filters.toArray(new RelationFilter[filters.size()]);
    }

    private void checkForWellKnownLabels(String name, String operation) {
        if (Arrays.stream(Relationships.WellKnown.values()).anyMatch(x -> x.name().equals(name))) {
            throw new IllegalArgumentException("Unable to " + operation + " a relationship with well defined name. " +
                    "Restricted names: " + Arrays.asList(Relationships.WellKnown.values()));
        }
    }
}
