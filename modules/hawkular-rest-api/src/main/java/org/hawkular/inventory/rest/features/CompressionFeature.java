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
package org.hawkular.inventory.rest.features;

/**
 * @author Jirka Kremser
 * @since 0.2.0
 */

import static java.util.Arrays.asList;

import java.util.HashSet;

import javax.ws.rs.ConstrainedTo;
import javax.ws.rs.RuntimeType;
import javax.ws.rs.container.DynamicFeature;
import javax.ws.rs.container.ResourceInfo;
import javax.ws.rs.core.FeatureContext;
import javax.ws.rs.ext.Provider;
import javax.ws.rs.ext.WriterInterceptor;

import org.jboss.resteasy.plugins.interceptors.encoding.ServerContentEncodingAnnotationFilter;

@Provider
@ConstrainedTo(RuntimeType.SERVER)
public class CompressionFeature implements DynamicFeature {

    private WriterInterceptor compressionFilter =
            new ServerContentEncodingAnnotationFilter(new HashSet<>(asList("gzip")));

    @Override
    public void configure(ResourceInfo resourceInfo, FeatureContext context) {
        context.register(compressionFilter);
    }
}
