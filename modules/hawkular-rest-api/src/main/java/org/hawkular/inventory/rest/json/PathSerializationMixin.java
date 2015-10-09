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
package org.hawkular.inventory.rest.json;

import org.hawkular.inventory.json.DetypedPathDeserializer;
import org.hawkular.inventory.json.PathSerializer;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;

/**
 * We need to deserialize paths manually in REST API, because we cannot provide the default
 * {@link DetypedPathDeserializer} with enough info in the early stages of request processing.
 *
 * <p>So we need to configure it with a custom mixin that will be used just for serialization. Note that the paths
 * are serialized <b>WITH</b> the tenant ID included, even though REST API can accept paths WITHOUT a tenant ID and
 * automagically modify the paths to include the current tenant ID in them. This is so that the clients that use the
 * paths obtained from the inventory server can use them as opaque identifiers without any requirements on processing
 * them before passing them along further. The paths obtained from inventory are the "true" stuff, but inventory is
 * kind enough to let the clients produce simpler, tenant-less, paths when talking to it.
 *
 * @author Lukas Krejci
 * @see JacksonConfig
 * @since 0.2.0
 */
@JsonSerialize(using = PathSerializer.class)
public final class PathSerializationMixin {
}
