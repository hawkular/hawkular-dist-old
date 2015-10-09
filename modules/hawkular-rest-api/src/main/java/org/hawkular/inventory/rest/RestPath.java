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

import static org.hawkular.inventory.rest.RequestUtil.extractPaging;

import javax.inject.Inject;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriInfo;
import javax.ws.rs.ext.Providers;

import org.hawkular.inventory.api.Relationships;
import org.hawkular.inventory.api.ResolvableToSingle;
import org.hawkular.inventory.api.ResolvableToSingleWithRelationships;
import org.hawkular.inventory.api.filters.RelationFilter;
import org.hawkular.inventory.api.model.CanonicalPath;
import org.hawkular.inventory.api.model.Entity;
import org.hawkular.inventory.api.model.Relationship;
import org.hawkular.inventory.api.paging.Page;
import org.hawkular.inventory.api.paging.Pager;
import org.hawkular.inventory.rest.json.ApiError;
import org.hawkular.inventory.rest.json.JsonLd;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wordnik.swagger.annotations.Api;
import com.wordnik.swagger.annotations.ApiOperation;
import com.wordnik.swagger.annotations.ApiResponse;
import com.wordnik.swagger.annotations.ApiResponses;

/**
 * @author Lukas Krejci
 * @since 0.2.0
 */
@Path("/path")
@Produces(value = APPLICATION_JSON)
@Consumes(value = APPLICATION_JSON)
@Api(value = "/path", description = "The endpoint to obtain inventory entities by their canonical path.")
public class RestPath extends RestBase {

    @Context
    private Providers providers;

    @Inject @JsonLd
    private ObjectMapper jsonLdMapper;

    @GET
    @Path("/{entityPath:.+}")
    @ApiOperation("Return an entity with the provided canonical path")
    @ApiResponses({
            @ApiResponse(code = 200, message = "The entity", response = Entity.class),
            @ApiResponse(code = 401, message = "Unauthorized access"),
            @ApiResponse(code = 404, message = "The entity doesn't exist", response = ApiError.class),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Response get(@PathParam("entityPath") String entityPath, @Context UriInfo uriInfo) {
        String tenantId = getTenantId();
        CanonicalPath tenant = CanonicalPath.of().tenant(tenantId).get();

        // "/path".length() == 5
        CanonicalPath path = CanonicalPath.fromPartiallyUntypedString(uriInfo.getPath(false).substring(5), tenant,
                Entity.class);

        return Response.ok(inventory.inspect(path, ResolvableToSingle.class).entity()).build();
//        return Response.ok(inventory.getElement(path)).build();
    }

    @GET
    @Path("/{entityPath:.+}/relationships")
    @ApiOperation("Return an entity with the provided canonical path")
    @ApiResponses({
                          @ApiResponse(code = 200, message = "The entity", response = Entity.class),
                          @ApiResponse(code = 401, message = "Unauthorized access"),
                          @ApiResponse(code = 404, message = "The entity doesn't exist", response = ApiError.class),
                          @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
                  })
    public Response getRelationships(@PathParam("entityPath") String entityPath,
                                     @DefaultValue("both") @QueryParam("direction") String direction,
                                     @DefaultValue("") @QueryParam("property") String propertyName,
                                     @DefaultValue("") @QueryParam("propertyValue") String propertyValue,
                                     @DefaultValue("") @QueryParam("named") String named,
                                     @DefaultValue("") @QueryParam("sourceType") String sourceType,
                                     @DefaultValue("") @QueryParam("targetType") String targetType,
                                     @DefaultValue("false") @QueryParam("jsonld") String jsonLd,
                                     @Context UriInfo uriInfo) {
        String tenantId = getTenantId();
        CanonicalPath tenant = CanonicalPath.of().tenant(tenantId).get();
        System.out.println(uriInfo);

        // "/path".length() == 5
        // "/relationships".length() == 14
        String pathString = uriInfo.getPath(false);
        CanonicalPath path = CanonicalPath.fromPartiallyUntypedString(pathString.substring(5, pathString.length() -
                14), tenant, Entity.class);
        RelationFilter[] filters = RestRelationships.extractFilters(propertyName, propertyValue, named, sourceType,
                targetType, uriInfo);
        Pager pager = extractPaging(uriInfo);

        @SuppressWarnings("unchecked")
        ResolvableToSingleWithRelationships<Relationship, Relationship.Update> resolvable =
                (ResolvableToSingleWithRelationships<Relationship, Relationship.Update>) inventory.inspect(path,
                        ResolvableToSingleWithRelationships.class);
        Page<Relationship> relations =
                resolvable.relationships(Relationships.Direction.valueOf(direction)).getAll(filters).entities(pager);

        boolean jsonLdBool = Boolean.parseBoolean(jsonLd);
        if (jsonLdBool) {
            return ResponseUtil.pagedResponse(Response.ok(), uriInfo, jsonLdMapper, relations).build();
        } else {
            return pagedResponse(Response.ok(), uriInfo, relations).build();
        }
    }
}
