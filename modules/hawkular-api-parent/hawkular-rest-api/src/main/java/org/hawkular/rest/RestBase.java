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
package org.hawkular.rest;

import javax.inject.Inject;

import org.hawkular.rest.security.TenantIdProducer;
import org.jboss.resteasy.annotations.GZIP;

/**
 * @author Jirka Kremser
 * @since 0.0.1
 */
@GZIP
public class RestBase {

//    @Inject
//    @AutoTenant
//    protected Inventory inventory;

    // using the @AllPermissive annotation the access will be always granted
//    @Inject
//    protected Security security;

    @Inject
    // using the @AllPermissive annotation the tenant will be always the same
    private TenantIdProducer tenantIdProducer;

//    @Inject
//    Configuration config;

//    @Inject @Our
//    protected ObjectMapper mapper;

//    protected <T> Response.ResponseBuilder pagedResponse(Response.ResponseBuilder response,
//                                                         UriInfo uriInfo, Page<T> page) {
//        boolean streaming = config.getFlag(RestConfiguration.Keys.STREAMING_SERIALIZATION, RestConfiguration.Keys
//                .STREAMING_SERIALIZATION.getDefaultValue());
//        if (streaming) {
//            return ResponseUtil.pagedResponse(response, uriInfo, mapper, page);
//        } else {
//            return ResponseUtil.pagedResponse(response, uriInfo, page, page.toList());
//        }
//    }


    protected String getTenantId() {
        return tenantIdProducer.getTenantId().get();
    }
}
