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
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriInfo;

import org.hawkular.inventory.api.Resources;
import org.hawkular.inventory.api.model.CanonicalPath;
import org.hawkular.inventory.api.model.DataEntity;
import org.hawkular.inventory.rest.json.ApiError;

import com.wordnik.swagger.annotations.Api;
import com.wordnik.swagger.annotations.ApiOperation;
import com.wordnik.swagger.annotations.ApiParam;
import com.wordnik.swagger.annotations.ApiResponse;
import com.wordnik.swagger.annotations.ApiResponses;

/**
 * @author Jirka Kremser
 * @since 0.2.1
 */
@javax.ws.rs.Path("/")
@Produces(APPLICATION_JSON)
@Consumes(APPLICATION_JSON)
@Api(value = "/", description = "Resource Data CRUD")
public class RestResourcesData extends RestResources {

    @POST
    @javax.ws.rs.Path("/{environmentId}/{feedId}/resources/{resourcePath:.+}/data")
    @ApiOperation("Creates the configuration for pre-existing resource")
    @ApiResponses({
                          @ApiResponse(code = 204, message = "OK Created"),
                          @ApiResponse(code = 404, message = "Tenant, environment, resource or feed doesn't exist",
                                       response = ApiError.class),
                          @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
                  })
    public Response createConfiguration(@PathParam("environmentId") String environmentId,
            @PathParam("feedId") String feedId, @PathParam("resourcePath") String resourcePath,
            @ApiParam(required = true) DataEntity.Blueprint<Resources.DataRole> configuration,
            @Context UriInfo uriInfo) {

        return createConfigurationHelper(environmentId, feedId, resourcePath, configuration, uriInfo);
    }

    @POST
    @javax.ws.rs.Path("/{environmentId}/resources/{resourcePath:.+}/data")
    @ApiOperation("Creates the configuration for pre-existing resource")
    @ApiResponses({
                          @ApiResponse(code = 204, message = "OK Created"),
                          @ApiResponse(code = 404, message = "Tenant, environment or resource doesn't exist",
                                       response = ApiError.class),
                          @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
                  })
    public Response createConfiguration(@PathParam("environmentId") String environmentId,
            @PathParam("resourcePath") String resourcePath,
            @ApiParam(required = true) DataEntity.Blueprint<Resources.DataRole> configuration,
            @Context UriInfo uriInfo) {

        return createConfigurationHelper(environmentId, null, resourcePath, configuration, uriInfo);
    }

    private Response createConfigurationHelper(String environmentId, String feedId, String resourcePath,
            DataEntity.Blueprint<Resources.DataRole> configuration, UriInfo uriInfo) {
        String tenantId = getTenantId();
        CanonicalPath resource = composeCanonicalPath(tenantId, environmentId, feedId, resourcePath);

        if (!security.canUpdate(resource)) {
            return Response.status(FORBIDDEN).build();
        }
        inventory.inspect(resource, Resources.Single.class).data().create(configuration);

        return ResponseUtil.created(uriInfo, configuration.getRole().name()).build();
    }

    @GET
    @javax.ws.rs.Path("/{environmentId}/{feedId}/resources/{resourcePath:.+}/data")
    @ApiOperation("Retrieves the configuration of a resource")
    @ApiResponses({
                          @ApiResponse(code = 204, message = "OK"),
                          @ApiResponse(code = 404, message = "Tenant, environment, resource or feed doesn't exist",
                                       response = ApiError.class),
                          @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
                  })
    public Response getConfiguration(@PathParam("environmentId") String environmentId,
                                     @PathParam("feedId") String feedId,
                                     @PathParam("resourcePath") String resourcePath,
            @DefaultValue("configuration") @QueryParam("dataType") Resources.DataRole dataType) {

        return getConfigurationHelper(environmentId, feedId, resourcePath, dataType);
    }

    @GET
    @javax.ws.rs.Path("/{environmentId}/resources/{resourcePath:.+}/data")
    @ApiOperation("Retrieves the configuration of a resource")
    @ApiResponses({
                          @ApiResponse(code = 204, message = "OK"),
                          @ApiResponse(code = 404, message = "Tenant, environment or resource doesn't exist",
                                       response = ApiError.class),
                          @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
                  })
    public Response getConfiguration(@PathParam("environmentId") String environmentId,
                                     @PathParam("resourcePath") String resourcePath,
            @DefaultValue("configuration") @QueryParam("dataType") Resources.DataRole dataType) {

        return getConfigurationHelper(environmentId, null, resourcePath, dataType);
    }

    private Response getConfigurationHelper(String environmentId, String feedId, String resourcePath,
            Resources.DataRole dataType) {
        String tenantId = getTenantId();
        CanonicalPath resource = composeCanonicalPath(tenantId, environmentId, feedId, resourcePath);

        DataEntity data = inventory.inspect(resource, Resources.Single.class).data().get(dataType).entity();

        return Response.ok(data).build();
    }

    @PUT
    @javax.ws.rs.Path("/{environmentId}/{feedId}/resources/{resourcePath:.+}/data")
    @ApiOperation("Updates the configuration of a resource")
    @ApiResponses({
                          @ApiResponse(code = 204, message = "OK"),
                          @ApiResponse(code = 404, message = "Tenant, environment, resource or feed doesn't exist",
                                       response = ApiError.class),
                          @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
                  })
    public Response updateConfiguration(@PathParam("environmentId") String environmentId,
            @PathParam("feedId") String feedId, @PathParam("resourcePath") String resourcePath,
            @DefaultValue("configuration") @QueryParam("dataType") Resources.DataRole dataType,
            @ApiParam(required = true) DataEntity.Update configuration) {

        return updateConfigurationHelper(environmentId, feedId, resourcePath, dataType, configuration);
    }

    @PUT
    @javax.ws.rs.Path("/{environmentId}/resources/{resourcePath:.+}/data")
    @ApiOperation("Updates the configuration of a resource")
    @ApiResponses({
                          @ApiResponse(code = 204, message = "OK"),
                          @ApiResponse(code = 404, message = "Tenant, environment or resource doesn't exist",
                                       response = ApiError.class),
                          @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
                  })
    public Response updateConfiguration(@PathParam("environmentId") String environmentId,
            @PathParam("resourcePath") String resourcePath,
            @DefaultValue("configuration") @QueryParam("dataType") Resources.DataRole dataType,
            @ApiParam(required = true) DataEntity.Update configuration) {

        return updateConfigurationHelper(environmentId, null, resourcePath, dataType, configuration);
    }

    private Response updateConfigurationHelper(String environmentId, String feedId, String resourcePath,
            Resources.DataRole dataType, DataEntity.Update configuration) {
        String tenantId = getTenantId();
        CanonicalPath resource = composeCanonicalPath(tenantId, environmentId, feedId, resourcePath);

        inventory.inspect(resource, Resources.Single.class).data().get(dataType).update(configuration);

        return Response.noContent().build();
    }

    @DELETE
    @javax.ws.rs.Path("/{environmentId}/{feedId}/resources/{resourcePath:.+}/data")
    @ApiOperation("Deletes the configuration of a resource")
    @ApiResponses({
                          @ApiResponse(code = 204, message = "OK"),
                          @ApiResponse(code = 404, message = "Tenant, environment, resource or feed doesn't exist",
                                       response = ApiError.class),
                          @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
                  })
    public Response deleteConfiguration(@PathParam("environmentId") String environmentId,
                                        @PathParam("feedId") String feedId,
                                        @PathParam("resourcePath") String resourcePath,
                                        @DefaultValue("configuration") @QueryParam("dataType")
                                        Resources.DataRole dataType) {

        return deleteConfigurationHelper(environmentId, feedId, resourcePath, dataType);
    }

    @DELETE
    @javax.ws.rs.Path("/{environmentId}/resources/{resourcePath:.+}/data")
    @ApiOperation("Deletes the configuration of a resource")
    @ApiResponses({
                          @ApiResponse(code = 204, message = "OK"),
                          @ApiResponse(code = 404, message = "Tenant, environment or resource doesn't exist",
                                       response = ApiError.class),
                          @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
                  })
    public Response deleteConfiguration(@PathParam("environmentId") String environmentId,
                                        @PathParam("resourcePath") String resourcePath,
                                        @DefaultValue("configuration") @QueryParam("dataType")
                                        Resources.DataRole dataType) {

        return deleteConfigurationHelper(environmentId, null, resourcePath, dataType);
    }

    private Response deleteConfigurationHelper(String environmentId, String feedId, String resourcePath,
            Resources.DataRole dataType) {
        String tenantId = getTenantId();
        CanonicalPath resource = composeCanonicalPath(tenantId, environmentId, feedId, resourcePath);

        inventory.inspect(resource, Resources.Single.class).data().delete(dataType);

        return Response.noContent().build();
    }
}
