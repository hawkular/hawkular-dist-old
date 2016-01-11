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
package org.hawkular.rest.security;

import javax.enterprise.context.RequestScoped;
import javax.enterprise.inject.Default;
import javax.enterprise.inject.Instance;
import javax.enterprise.inject.Produces;
import javax.inject.Inject;

import org.hawkular.accounts.api.model.Persona;

/**
 * @author Jirka Kremser
 * @since 0.0.1
 */
@RequestScoped
@Default
public class DefaultTenantIdProducer implements TenantIdProducer {

    @Inject Instance<Persona> personaInstance;

    @Override
    @Produces
    @Default
    public TenantId getTenantId() {
        return new TenantId(personaInstance.get().getId());
    }
}

