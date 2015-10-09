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
package org.hawkular.inventory.rest.security.dummy;

import javax.enterprise.inject.Produces;
import javax.inject.Singleton;

import org.hawkular.inventory.rest.security.TenantId;
import org.hawkular.inventory.rest.security.TenantIdProducer;

/**
 * @author Jirka Kremser
 * @since 0.3.4
 */
@Singleton
@AllPermissive
public class DummyTenantIdProducer implements TenantIdProducer {

    @Override
    @Produces
    @AllPermissive
    public TenantId getTenantId() {
        return new TenantId("28026b36-8fe4-4332-84c8-524e173a68bf");
    }
}
