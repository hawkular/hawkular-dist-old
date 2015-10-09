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
import static javax.ws.rs.core.Response.Status.FORBIDDEN;

import static org.hawkular.inventory.rest.RequestUtil.extractPaging;

import java.util.Set;

import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriInfo;

import org.hawkular.inventory.api.Environments;
import org.hawkular.inventory.api.model.CanonicalPath;
import org.hawkular.inventory.api.model.Feed;
import org.hawkular.inventory.api.paging.Page;
import org.hawkular.inventory.rest.json.ApiError;

import com.wordnik.swagger.annotations.ApiOperation;
import com.wordnik.swagger.annotations.ApiParam;
import com.wordnik.swagger.annotations.ApiResponse;
import com.wordnik.swagger.annotations.ApiResponses;

/**
 * @author Lukas Krejci
 * @since 0.0.1
 */
@Path("/")
@Produces(value = APPLICATION_JSON)
@Consumes(value = APPLICATION_JSON)
public class RestFeeds extends RestBase {

    @POST
    @Path("/{environmentId}/feeds")
    @ApiOperation("Registers a feed with the inventory, giving it a unique ID.")
    @ApiResponses({
            @ApiResponse(code = 201, message = "OK", response = Feed.class),
            @ApiResponse(code = 400, message = "Invalid inputs", response = ApiError.class),
            @ApiResponse(code = 401, message = "Unauthorized access"),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Response register(@PathParam("environmentId") String environmentId,
            @ApiParam(required = true) Feed.Blueprint blueprint, @Context UriInfo uriInfo) {

        String tenantId = getTenantId();

        CanonicalPath env = CanonicalPath.of().tenant(tenantId).environment(environmentId).get();

        if (!security.canCreate(Feed.class).under(env)) {
            return Response.status(FORBIDDEN).build();
        }

        Feed feed = inventory.inspect(env, Environments.Single.class).feeds().create(blueprint).entity();
        return ResponseUtil.created(uriInfo, feed.getId()).entity(feed).build();
    }

    @GET
    @Path("/{environmentId}/feeds")
    @ApiOperation("Return all the feeds registered with the inventory")
    @ApiResponses({
            @ApiResponse(code = 200, message = "OK", response = Set.class),
            @ApiResponse(code = 400, message = "Invalid inputs", response = ApiError.class),
            @ApiResponse(code = 401, message = "Unauthorized access"),
            @ApiResponse(code = 404, message = "Environment doesn't exist", response = ApiError.class),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Response getAll(@PathParam("environmentId") String environmentId, @Context UriInfo uriInfo) {
        String tenantId = getTenantId();

        Page<Feed> ret = inventory.tenants().get(tenantId).environments().get(environmentId).feeds().getAll()
                .entities(extractPaging(uriInfo));

        return pagedResponse(Response.ok(), uriInfo, ret).build();
    }

    @GET
    @Path("/{environmentId}/feeds/{feedId}")
    @ApiOperation("Return a single feed by its ID.")
    @ApiResponses({
            @ApiResponse(code = 200, message = "OK", response = Set.class),
            @ApiResponse(code = 400, message = "Invalid inputs", response = ApiError.class),
            @ApiResponse(code = 401, message = "Unauthorized access"),
            @ApiResponse(code = 404, message = "Environment or feed doesn't exist", response = ApiError.class),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Response get(@PathParam("environmentId") String environmentId, @PathParam("feedId") String feedId) {

        String tenantId = getTenantId();

        return Response.ok(inventory.tenants().get(tenantId).environments().get(environmentId).feeds().get(feedId)
                .entity()).build();
    }

    @PUT
    @Path("/{environmentId}/feeds/{feedId}")
    @ApiOperation("Updates a feed")
    @ApiResponses({
            @ApiResponse(code = 204, message = "OK"),
            @ApiResponse(code = 401, message = "Unauthorized access"),
            @ApiResponse(code = 404, message = "Environment or the feed doesn't exist",
                    response = ApiError.class),
            @ApiResponse(code = 400, message = "The update failed because of invalid data"),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Response update(@PathParam("environmentId") String environmentId, @PathParam("feedId") String feedId,
            Feed.Update update) {

        String tenantId = getTenantId();

        CanonicalPath env = CanonicalPath.of().tenant(tenantId).environment(environmentId).get();

        if (!security.canUpdate(env.extend(Feed.class, feedId).get())) {
            return Response.status(FORBIDDEN).build();
        }

        inventory.inspect(env, Environments.Single.class).feeds().update(feedId, update);
        return Response.noContent().build();
    }

    @DELETE
    @Path("/{environmentId}/feeds/{feedId}")
    @ApiOperation("Deletes a feed")
    @ApiResponses({
            @ApiResponse(code = 204, message = "OK"),
            @ApiResponse(code = 401, message = "Unauthorized access"),
            @ApiResponse(code = 404, message = "Environment or the feed doesn't exist",
                    response = ApiError.class),
            @ApiResponse(code = 400, message = "The delete failed because it would make inventory invalid"),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Response delete(@PathParam("environmentId") String environmentId, @PathParam("feedId") String feedId) {

        String tenantId = getTenantId();

        CanonicalPath env = CanonicalPath.of().tenant(tenantId).environment(environmentId).get();

        if (!security.canDelete(env.extend(Feed.class, feedId).get())) {
            return Response.status(FORBIDDEN).build();
        }

        inventory.inspect(env, Environments.Single.class).feeds().delete(feedId);
        return Response.noContent().build();
    }
}
