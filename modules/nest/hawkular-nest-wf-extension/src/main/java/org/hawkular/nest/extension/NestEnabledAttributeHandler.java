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
package org.hawkular.nest.extension;

import org.jboss.as.controller.AbstractWriteAttributeHandler;
import org.jboss.as.controller.OperationContext;
import org.jboss.as.controller.OperationFailedException;
import org.jboss.dmr.ModelNode;
import org.jboss.logging.Logger;

class NestEnabledAttributeHandler extends AbstractWriteAttributeHandler<Void> {

    public static final NestEnabledAttributeHandler INSTANCE = new NestEnabledAttributeHandler();

    private final Logger log = Logger.getLogger(NestEnabledAttributeHandler.class);

    private NestEnabledAttributeHandler() {
        super(NestSubsystemDefinition.NEST_ENABLED_ATTRIBDEF);
    }

    @Override
    protected boolean applyUpdateToRuntime(OperationContext context, ModelNode operation, String attributeName,
            ModelNode resolvedValue, ModelNode currentValue, HandbackHolder<Void> handbackHolder)
            throws OperationFailedException {
        log.debugf("Nest enabled attribute changed: [%s:%s]", attributeName, resolvedValue);
        // there is nothing for us to do - this only affects us when we are restarted, return true to say we must reload
        return true;
    }

    @Override
    protected void revertUpdateToRuntime(OperationContext context, ModelNode operation, String attributeName,
            ModelNode valueToRestore, ModelNode valueToRevert, Void handback) {
        // no-op
    }
}
