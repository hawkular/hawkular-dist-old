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
package org.hawkular.inventory.rest.security;

import org.hawkular.inventory.api.model.CanonicalPath;

/**
 * CDI bean that provides inventory-focused abstractions over Hawkular accounts.
 * It defines all the operations available in inventory and implements permission checking methods.
 *
 * @author Lukas Krejci
 * @since 0.0.2
 */
public interface Security {

    CreatePermissionCheckerFinisher canCreate(Class<?> entityType);

    boolean canUpdate(CanonicalPath path);

    boolean canDelete(CanonicalPath path);

    boolean canAssociateFrom(CanonicalPath path);

    boolean canCopyEnvironment(CanonicalPath path);

    interface CreatePermissionCheckerFinisher {
        boolean under(CanonicalPath path);
    }

}
