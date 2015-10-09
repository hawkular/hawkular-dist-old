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

import org.hawkular.inventory.api.Environments;
import org.hawkular.inventory.api.Feeds;
import org.hawkular.inventory.api.Metrics;
import org.hawkular.inventory.api.model.CanonicalPath;
import org.hawkular.inventory.api.model.Metric;
import org.hawkular.inventory.api.paging.Page;
import org.hawkular.inventory.rest.json.ApiError;

import com.wordnik.swagger.annotations.Api;
import com.wordnik.swagger.annotations.ApiOperation;
import com.wordnik.swagger.annotations.ApiParam;
import com.wordnik.swagger.annotations.ApiResponse;
import com.wordnik.swagger.annotations.ApiResponses;

/**
 * @author Lukas Krejci
 * @since 1.0
 */
@Path("/")
@Produces(value = APPLICATION_JSON)
@Consumes(value = APPLICATION_JSON)
@Api(value = "/", description = "Metrics CRUD")
public class RestMetrics extends RestBase {

    @POST
    @Path("/{environmentId}/metrics")
    @ApiOperation("Creates a new metric in given environment")
    @ApiResponses({
            @ApiResponse(code = 201, message = "Metric created"),
            @ApiResponse(code = 400, message = "Invalid inputs", response = ApiError.class),
            @ApiResponse(code = 401, message = "Unauthorized access"),
            @ApiResponse(code = 409, message = "Metric already exists", response = ApiError.class),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Response createMetric(@PathParam("environmentId") String environmentId,
            @ApiParam(required = true) Metric.Blueprint metric, @Context UriInfo uriInfo) {

        String tenantId = getTenantId();

        CanonicalPath env = CanonicalPath.of().tenant(tenantId).environment(environmentId).get();

        if (!security.canCreate(Metric.class).under(env)) {
            return Response.status(FORBIDDEN).build();
        }

        createMetric(inventory.inspect(env, Environments.Single.class).feedlessMetrics(), metric);
        return ResponseUtil.created(uriInfo, metric.getId()).build();
    }

    @POST
    @Path("/{environmentId}/{feedId}/metrics")
    @ApiOperation("Creates a new metric in given feed")
    @ApiResponses({
            @ApiResponse(code = 201, message = "Metric created"),
            @ApiResponse(code = 400, message = "Invalid inputs", response = ApiError.class),
            @ApiResponse(code = 401, message = "Unauthorized access"),
            @ApiResponse(code = 409, message = "Metric already exists", response = ApiError.class),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Response createMetric(@PathParam("environmentId") String environmentId, @PathParam("feedId") String feedId,
            @ApiParam(required = true) Metric.Blueprint metric, @Context UriInfo uriInfo) {

        String tenantId = getTenantId();

        CanonicalPath feed = CanonicalPath.of().tenant(tenantId).environment(environmentId).feed(feedId).get();

        if (!security.canCreate(Metric.class).under(feed)) {
            return Response.status(FORBIDDEN).build();
        }

        createMetric(inventory.inspect(feed, Feeds.Single.class).metrics(), metric);

        return ResponseUtil.created(uriInfo, metric.getId()).build();
    }

    private void createMetric(Metrics.ReadWrite accessInterface, Metric.Blueprint metric) {
        if (metric == null) {
            throw new IllegalArgumentException("metric to create not specified");
        }

        if (metric.getId() == null) {
            throw new IllegalArgumentException("metric id not specified");
        }

        if (metric.getMetricTypePath() == null) {
            throw new IllegalArgumentException("metric type id not specified");
        }

        accessInterface.create(metric);
    }

    @GET
    @Path("/{environmentId}/metrics/{metricId}")
    @ApiOperation("Retrieves a single metric")
    @ApiResponses({
            @ApiResponse(code = 200, message = "OK"),
            @ApiResponse(code = 401, message = "Unauthorized access"),
            @ApiResponse(code = 404, message = "Rnvironment or metrics doesn't exist",
                    response = ApiError.class),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Metric getMetric(@PathParam("environmentId") String environmentId,
            @PathParam("metricId") String metricId) {

        return inventory.tenants().get(getTenantId()).environments().get(environmentId).feedlessMetrics().get(metricId)
                .entity();
    }

    @GET
    @Path("/{environmentId}/{feedId}/metrics/{metricId}")
    @ApiOperation("Retrieves a single metric")
    @ApiResponses({
            @ApiResponse(code = 200, message = "OK"),
            @ApiResponse(code = 401, message = "Unauthorized access"),
            @ApiResponse(code = 404, message = "Environment, feed or metric doesn't exist",
                    response = ApiError.class),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Metric getMetric(@PathParam("environmentId") String environmentId, @PathParam("feedId") String feedId,
            @PathParam("metricId") String metricId) {

        return inventory.tenants().get(getTenantId()).environments().get(environmentId).feeds().get(feedId).metrics()
                .get(metricId).entity();
    }

    @GET
    @Path("/{environmentId}/metrics")
    @ApiOperation("Retrieves all metrics in an environment. Accepts paging query parameters.")
    @ApiResponses({
            @ApiResponse(code = 200, message = "OK"),
            @ApiResponse(code = 401, message = "Unauthorized access"),
            @ApiResponse(code = 404, message = "Tenant or environment doesn't exist",
                    response = ApiError.class),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Response getMetrics(@PathParam("environmentId") String environmentId,
            @QueryParam("feedless") @DefaultValue("false") boolean feedless, @Context UriInfo uriInfo) {

        String tenantId = getTenantId();

        Environments.Single envs = inventory.tenants().get(tenantId).environments().get(environmentId);

        Page<Metric> ret = (feedless ? envs.feedlessMetrics() : envs.allMetrics())
                .getAll().entities(RequestUtil.extractPaging(uriInfo));

        return pagedResponse(Response.ok(), uriInfo, ret).build();
    }

    @GET
    @Path("/{environmentId}/{feedId}/metrics")
    @ApiOperation("Retrieves all metrics in a feed")
    @ApiResponses({
            @ApiResponse(code = 200, message = "OK"),
            @ApiResponse(code = 401, message = "Unauthorized access"),
            @ApiResponse(code = 404, message = "Tenant, environment or feed doesn't exist",
                    response = ApiError.class),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Response getMetrics(@PathParam("environmentId") String environmentId, @PathParam("feedId") String feedId,
            @Context UriInfo uriInfo) {

        Page<Metric> ret = inventory.tenants().get(getTenantId()).environments().get(environmentId).feeds()
                .get(feedId).metrics().getAll().entities(RequestUtil.extractPaging(uriInfo));
        return pagedResponse(Response.ok(), uriInfo, ret).build();
    }

    @PUT
    @Path("/{environmentId}/metrics/{metricId}")
    @ApiOperation("Updates a metric")
    @ApiResponses({
            @ApiResponse(code = 204, message = "OK"),
            @ApiResponse(code = 401, message = "Unauthorized access"),
            @ApiResponse(code = 404, message = "Tenant, environment or the metric doesn't exist",
                    response = ApiError.class),
            @ApiResponse(code = 400, message = "The update failed because of invalid data"),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Response updateMetric(@PathParam("environmentId") String environmentId,
            @PathParam("metricId") String metricId, Metric.Update update) {

        String tenantId = getTenantId();

        CanonicalPath env = CanonicalPath.of().tenant(tenantId).environment(environmentId).get();

        if (!security.canUpdate(env.extend(Metric.class, metricId).get())) {
            return Response.status(FORBIDDEN).build();
        }

        inventory.inspect(env, Environments.Single.class).feedlessMetrics().update(metricId, update);
        return Response.noContent().build();
    }


    @PUT
    @Path("/{environmentId}/{feedId}/metrics/{metricId}")
    @ApiOperation("Updates a metric")
    @ApiResponses({
            @ApiResponse(code = 204, message = "OK"),
            @ApiResponse(code = 401, message = "Unauthorized access"),
            @ApiResponse(code = 404, message = "Tenant, environment, feed or the metric doesn't exist",
                    response = ApiError.class),
            @ApiResponse(code = 400, message = "The update failed because of invalid data"),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Response updateMetric(@PathParam("environmentId") String environmentId, @PathParam("feedId") String feedId,
            @PathParam("metricId") String metricId, Metric.Update update) {

        String tenantId = getTenantId();

        CanonicalPath feed = CanonicalPath.of().tenant(tenantId).environment(environmentId).feed(feedId).get();

        if (!security.canUpdate(feed.extend(Metric.class, metricId).get())) {
            return Response.status(FORBIDDEN).build();
        }

        inventory.inspect(feed, Feeds.Single.class).metrics().update(metricId, update);
        return Response.noContent().build();
    }

    @DELETE
    @Path("/{environmentId}/metrics/{metricId}")
    @ApiOperation("Deletes a metric")
    @ApiResponses({
            @ApiResponse(code = 204, message = "OK"),
            @ApiResponse(code = 401, message = "Unauthorized access"),
            @ApiResponse(code = 404, message = "Tenant, environment or the metric doesn't exist",
                    response = ApiError.class),
            @ApiResponse(code = 400, message = "The delete failed because it would make inventory invalid"),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Response deleteMetric(@PathParam("environmentId") String environmentId,
            @PathParam("metricId") String metricId) {

        String tenantId = getTenantId();

        CanonicalPath env = CanonicalPath.of().tenant(tenantId).environment(environmentId).get();

        if (!security.canDelete(env.extend(Metric.class, metricId).get())) {
            return Response.status(FORBIDDEN).build();
        }

        inventory.inspect(env, Environments.Single.class).feedlessMetrics().delete(metricId);
        return Response.noContent().build();
    }

    @DELETE
    @Path("/{environmentId}/{feedId}/metrics/{metricId}")
    @ApiOperation("Deletes a metric")
    @ApiResponses({
            @ApiResponse(code = 204, message = "OK"),
            @ApiResponse(code = 404, message = "Tenant, environment, feed or the metric doesn't exist",
                    response = ApiError.class),
            @ApiResponse(code = 400, message = "The delete failed because it would make inventory invalid"),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Response deleteMetric(@PathParam("environmentId") String environmentId, @PathParam("feedId") String feedId,
            @PathParam("metricId") String metricId) {

        String tenantId = getTenantId();

        CanonicalPath feed = CanonicalPath.of().tenant(tenantId).environment(environmentId).feed(feedId).get();

        if (!security.canDelete(feed.extend(Metric.class, metricId).get())) {
            return Response.status(FORBIDDEN).build();
        }

        inventory.inspect(feed, Feeds.Single.class).metrics().delete(metricId);
        return Response.noContent().build();
    }
}
