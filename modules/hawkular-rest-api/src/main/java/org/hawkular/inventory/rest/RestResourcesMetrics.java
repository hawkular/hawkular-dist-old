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

import java.util.Collection;

import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.Encoded;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriInfo;

import org.hawkular.inventory.api.Metrics;
import org.hawkular.inventory.api.Resources;
import org.hawkular.inventory.api.model.CanonicalPath;
import org.hawkular.inventory.api.model.Metric;
import org.hawkular.inventory.api.model.Path;
import org.hawkular.inventory.api.paging.Page;
import org.hawkular.inventory.rest.json.ApiError;
import org.hawkular.inventory.rest.security.EntityIdUtils;

import com.wordnik.swagger.annotations.Api;
import com.wordnik.swagger.annotations.ApiOperation;
import com.wordnik.swagger.annotations.ApiParam;
import com.wordnik.swagger.annotations.ApiResponse;
import com.wordnik.swagger.annotations.ApiResponses;

/**
 * @author Lukas Krejci
 * @since 1.0
 */
@javax.ws.rs.Path("/")
@Produces(APPLICATION_JSON)
@Consumes(APPLICATION_JSON)
@Api(value = "/", description = "Resource Metrics CRUD")
public class RestResourcesMetrics extends RestResources {

    @POST
    @javax.ws.rs.Path("/{environmentId}/resources/{resourcePath:.+}/metrics")
    @ApiOperation("Associates a pre-existing metric with a resource")
    @ApiResponses({
            @ApiResponse(code = 204, message = "OK"),
            @ApiResponse(code = 404, message = "Tenant, environment, resource or metric doesn't exist",
                    response = ApiError.class),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Response associateMetrics(@PathParam("environmentId") String environmentId,
            @Encoded @PathParam("resourcePath") String resourcePath,
            @ApiParam("A list of paths to metrics to be associated with the resource. They can either be canonical or" +
                    " relative to the resource.") Collection<String> metricPaths) {

        String tenantId = getTenantId();

        CanonicalPath tenant = CanonicalPath.of().tenant(tenantId).get();

        CanonicalPath resource = composeCanonicalPath(tenantId, environmentId, null, resourcePath);

        if (!security.canAssociateFrom(resource)) {
            return Response.status(FORBIDDEN).build();
        }

        Metrics.ReadAssociate metricDao = inventory.inspect(resource, Resources.Single.class).metrics();

        metricPaths.stream().map((p) -> Path.fromPartiallyUntypedString(p, tenant, resource, Metric.class))
                .forEach(metricDao::associate);

        return Response.noContent().build();
    }

    @POST
    @javax.ws.rs.Path("/{environmentId}/{feedId}/resources/{resourcePath:.+}/metrics")
    @ApiOperation("Associates a pre-existing metric with a resource")
    @ApiResponses({
            @ApiResponse(code = 204, message = "OK"),
            @ApiResponse(code = 404, message = "Tenant, environment, resource or metric doesn't exist",
                    response = ApiError.class),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Response associateMetrics(@PathParam("environmentId") String environmentId,
            @PathParam("feedId") String feedId, @Encoded @PathParam("resourcePath") String resourcePath,
            Collection<String> metricPaths) {

        String tenantId = getTenantId();

        CanonicalPath tenant = CanonicalPath.of().tenant(tenantId).get();

        CanonicalPath resource = composeCanonicalPath(tenantId, environmentId, feedId, resourcePath);

        if (!security.canAssociateFrom(resource)) {
            return Response.status(FORBIDDEN).build();
        }

        Metrics.ReadAssociate metricDao = inventory.inspect(resource, Resources.Single.class).metrics();

        metricPaths.stream().map((p) -> Path.fromPartiallyUntypedString(p, tenant, resource, Metric.class))
                .forEach(metricDao::associate);

        return Response.noContent().build();
    }

    @GET
    @javax.ws.rs.Path("/{environmentId}/resources/{resourcePath:.+}/metrics")
    @ApiOperation("Retrieves all metrics associated with a resource. Accepts paging query parameters.")
    @ApiResponses({
            @ApiResponse(code = 200, message = "The list of metrics"),
            @ApiResponse(code = 404, message = "Tenant, environment or resource doesn't exist",
                    response = ApiError.class),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Response getAssociatedMetrics(@PathParam("environmentId") String environmentID,
            @Encoded @PathParam("resourcePath") String resourcePath, @Context UriInfo uriInfo) {
        CanonicalPath resource = composeCanonicalPath(getTenantId(), environmentID, null, resourcePath);
        Page<Metric> ms = inventory.inspect(resource, Resources.Single.class).metrics().getAll().entities(
                extractPaging(uriInfo));

        return pagedResponse(Response.ok(), uriInfo, ms).build();
    }

    @GET
    @javax.ws.rs.Path("/{environmentId}/{feedId}/resources/{resourcePath:.+}/metrics")
    @ApiOperation("Retrieves all metrics associated with a resource. Accepts paging query parameters.")
    @ApiResponses({
            @ApiResponse(code = 200, message = "The list of metrics"),
            @ApiResponse(code = 404, message = "Tenant, environment, feed or resource doesn't exist",
                    response = ApiError.class),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Response getAssociatedMetrics(@PathParam("environmentId") String environmentId,
            @PathParam("feedId") String feedId, @Encoded @PathParam("resourcePath") String resourcePath,
            @Context UriInfo uriInfo) {
        CanonicalPath resource = composeCanonicalPath(getTenantId(), environmentId, feedId, resourcePath);
        Page<Metric> ms = inventory.inspect(resource, Resources.Single.class).metrics().getAll().entities(
                extractPaging(uriInfo));

        return pagedResponse(Response.ok(), uriInfo, ms).build();
    }

    @GET
    @javax.ws.rs.Path("/{environmentId}/resources/{resourcePath:.+}/metrics/{metricPath:.+}")
    @ApiOperation("Retrieves a single metric associated with a resource")
    @ApiResponses({
            @ApiResponse(code = 200, message = "The resource"),
            @ApiResponse(code = 404,
                    message = "Tenant, environment, resource or metric does not exist or the metric is not " +
                            "associated with the resource", response = ApiError.class),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Response getAssociatedMetric(@PathParam("environmentId") String environmentId,
            @Encoded @PathParam("resourcePath") String resourcePath,
            @Encoded @PathParam("metricPath") String metricPath, @QueryParam("canonical") @DefaultValue("false")
    @ApiParam("True if metric path should be considered canonical, false by default.") boolean isCanonical) {

        String tenantId = getTenantId();

        CanonicalPath tenant = CanonicalPath.of().tenant(tenantId).get();
        CanonicalPath rp = composeCanonicalPath(tenantId, environmentId, null, resourcePath);

        if (isCanonical) {
            metricPath = "/" + metricPath;
        }

        Path mp = Path.fromPartiallyUntypedString(metricPath, tenant, rp, Metric.class);

        if (EntityIdUtils.isTenantEscapeAttempt(rp, mp)) {
            Response.status(FORBIDDEN).build();
        }

        Metric m = inventory.inspect(rp, Resources.Single.class).metrics().get(mp).entity();

        return Response.ok(m).build();
    }

    @GET
    @javax.ws.rs.Path("/{environmentId}/{feedId}/resources/{resourcePath:.+}/metrics/{metricPath:.+}")
    @ApiOperation("Retrieves a single resource")
    @ApiResponses({
            @ApiResponse(code = 200, message = "The resource"),
            @ApiResponse(code = 404,
                    message = "Tenant, environment, feed, resource or metric doesn't exist or if the metric is not " +
                            "associated with the resource", response = ApiError.class),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Response getAssociatedMetric(@PathParam("environmentId") String environmentId,
            @PathParam("feedId") String feedId, @Encoded @PathParam("resourcePath") String resourcePath,
            @Encoded @PathParam("metricPath") String metricPath, @QueryParam("canonical") @DefaultValue("false")
    @ApiParam("True if metric path should be considered canonical, false by default.") boolean isCanonical) {

        String tenantId = getTenantId();

        CanonicalPath tenant = CanonicalPath.of().tenant(tenantId).get();
        CanonicalPath rp = composeCanonicalPath(tenantId, environmentId, feedId, resourcePath);

        if (isCanonical) {
            metricPath = "/" + metricPath;
        }

        Path mp = Path.fromPartiallyUntypedString(metricPath, tenant, rp, Metric.class);

        if (EntityIdUtils.isTenantEscapeAttempt(rp, mp)) {
            Response.status(FORBIDDEN).build();
        }

        Metric m = inventory.inspect(rp, Resources.Single.class).metrics().get(mp).entity();
        return Response.ok(m).build();
    }

    @DELETE
    @javax.ws.rs.Path("/{environmentId}/resources/{resourcePath:.+}/metrics/{metricPath:.+}")
    @ApiOperation("Disassociates the given resource from the given metric")
    @ApiResponses({
            @ApiResponse(code = 204, message = "OK"),
            @ApiResponse(code = 404,
                    message = "Tenant, environment, resource or metric does not exist or the metric is not " +
                            "associated with the resource", response = ApiError.class),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Response disassociateMetric(@PathParam("environmentId") String environmentId,
            @Encoded @PathParam("resourcePath") String resourcePath,
            @Encoded @PathParam("metricPath") String metricPath, @QueryParam("canonical") @DefaultValue("false")
            @ApiParam("True if metric path should be considered canonical, false by default.") boolean isCanonical) {

        String tenantId = getTenantId();

        CanonicalPath tenant = CanonicalPath.of().tenant(tenantId).get();
        CanonicalPath rp = composeCanonicalPath(tenantId, environmentId, null, resourcePath);

        if (!security.canAssociateFrom(rp)) {
            return Response.status(FORBIDDEN).build();
        }

        if (isCanonical) {
            metricPath = "/" + metricPath;
        }

        Path mp = Path.fromPartiallyUntypedString(metricPath, tenant, rp, Metric.class);

        if (EntityIdUtils.isTenantEscapeAttempt(rp, mp)) {
            Response.status(FORBIDDEN).build();
        }

        inventory.inspect(rp, Resources.Single.class).metrics().disassociate(mp);

        return Response.noContent().build();
    }

    @DELETE
    @javax.ws.rs.Path("/{environmentId}/{feedId}/resources/{resourcePath:.+}/metrics/{metricPath:.+}")
    @ApiOperation("Disassociates the given resource from the given metric")
    @ApiResponses({
            @ApiResponse(code = 204, message = "OK"),
            @ApiResponse(code = 404,
                    message = "Tenant, environment, feed, resource or metric does not exist or the metric is not " +
                            "associated with the resource", response = ApiError.class),
            @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
    })
    public Response disassociateMetric(@PathParam("environmentId") String environmentId,
            @PathParam("feedId") String feedId, @Encoded @PathParam("resourcePath") String resourcePath,
            @Encoded @PathParam("metricPath") String metricPath, @QueryParam("canonical") @DefaultValue("false")
    @ApiParam("True if metric path should be considered canonical, false by default.") boolean isCanonical) {

        String tenantId = getTenantId();

        CanonicalPath tenant = CanonicalPath.of().tenant(tenantId).get();
        CanonicalPath rp = composeCanonicalPath(tenantId, environmentId, feedId, resourcePath);

        if (!security.canAssociateFrom(rp)) {
            return Response.status(FORBIDDEN).build();
        }

        if (isCanonical) {
            metricPath = "/" + metricPath;
        }

        Path mp = Path.fromPartiallyUntypedString(metricPath, tenant, rp, Metric.class);

        if (EntityIdUtils.isTenantEscapeAttempt(rp, mp)) {
            Response.status(FORBIDDEN).build();
        }

        inventory.inspect(rp, Resources.Single.class).metrics().disassociate(mp);

        return Response.noContent().build();
    }
}
