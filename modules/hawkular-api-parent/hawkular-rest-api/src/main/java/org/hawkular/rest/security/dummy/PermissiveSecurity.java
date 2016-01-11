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
package org.hawkular.rest.security.dummy;

import javax.inject.Singleton;

import org.hawkular.rest.security.Security;

/**
 * Dummy permissive implementation.
 *
 * @author Jirka Kremser
 * @since 0.3.4
 */
@Singleton
@AllPermissive
public class PermissiveSecurity implements Security {

    @Override public boolean canCreate(String entityType) {
        return true;
    }

    @Override public boolean canUpdate(String path) {
        return true;
    }

    @Override public boolean canDelete(String path) {
        return true;
    }

    @Override public boolean canAssociateFrom(String path) {
        return true;
    }

    @Override public boolean canCopyEnvironment(String path) {
        return true;
    }
}
