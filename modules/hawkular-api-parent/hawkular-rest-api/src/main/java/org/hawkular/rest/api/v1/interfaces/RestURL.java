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
package org.hawkular.rest.api.v1.interfaces;

import static javax.ws.rs.core.MediaType.APPLICATION_JSON;

import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.HeaderParam;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.container.AsyncResponse;
import javax.ws.rs.container.Suspended;

import org.hawkular.rest.api.v1.entities.URL;
import org.hawkular.rest.json.ApiError;

import com.wordnik.swagger.annotations.Api;
import com.wordnik.swagger.annotations.ApiOperation;
import com.wordnik.swagger.annotations.ApiParam;
import com.wordnik.swagger.annotations.ApiResponse;
import com.wordnik.swagger.annotations.ApiResponses;

/**
 * @author Jirka Kremser
 */
@Path("/urls")
@Produces("application/hawkular.1.0.0+json")
@Consumes(APPLICATION_JSON)
@Api(value = "/urls", description = "Work with the URLs of the current persona")
public interface RestURL {

    @GET
    @Path("{urlId}")
    @ApiOperation("Retrieves the URL of the currently logged in persona")
    @ApiResponses({
                          @ApiResponse(code = 200, message = "OK"),
                          @ApiResponse(code = 401, message = "Unauthorized access"),
                          @ApiResponse(code = 404, message = "Tenant doesn't exist", response = ApiError.class),
                          @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
                  }) void getUrl(@Suspended AsyncResponse asyncResponse,
                                 @PathParam("urlId") String id,
                                 @HeaderParam("Authorization") String authToken);

    @GET
    @ApiOperation("Retrieves all URLs of the currently logged in persona")
    @ApiResponses({
                          @ApiResponse(code = 200, message = "OK"),
                          @ApiResponse(code = 401, message = "Unauthorized access"),
                          @ApiResponse(code = 404, message = "Tenant doesn't exist", response = ApiError.class),
                          @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
                  }) void getAll(@Suspended AsyncResponse asyncResponse,
                                 @HeaderParam("Authorization") String authToken);

    @POST
    @Path("/")
    @ApiOperation("Creates the URL of the currently logged in persona")
    @ApiResponses({
                          @ApiResponse(code = 200, message = "OK"),
                          @ApiResponse(code = 401, message = "Unauthorized access"),
                          @ApiResponse(code = 404, message = "Tenant doesn't exist", response = ApiError.class),
                          @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
                  }) void createUrl(@Suspended AsyncResponse asyncResponse,
                                    @ApiParam(required = true) URL url,
                                    @HeaderParam("Authorization") String authToken);

    @PUT
    @Path("/")
    @ApiOperation("Updates properties of the URL")
    @ApiResponses({
                          @ApiResponse(code = 204, message = "OK"),
                          @ApiResponse(code = 400, message = "Invalid input data", response = ApiError.class),
                          @ApiResponse(code = 401, message = "Unauthorized access"),
                          @ApiResponse(code = 404, message = "Tenant doesn't exist", response = ApiError.class),
                          @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
                  }) void updateUrl(@Suspended AsyncResponse asyncResponse,
                                    @PathParam("urlId") String id,
                                    @ApiParam(required = true) URL url,
                                    @HeaderParam("Authorization") String authToken);

    @DELETE
    @Path("/")
    @ApiOperation("Deletes the URL and all its data")
    @ApiResponses({
                          @ApiResponse(code = 204, message = "OK"),
                          @ApiResponse(code = 401, message = "Unauthorized access"),
                          @ApiResponse(code = 404, message = "Tenant doesn't exist", response = ApiError.class),
                          @ApiResponse(code = 500, message = "Server error", response = ApiError.class)
                  }) void deleteUrl(@Suspended AsyncResponse asyncResponse,
                                    @PathParam("urlId") String id,
                                    @HeaderParam("Authorization") String authToken);
}
