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

import org.jboss.as.controller.AttributeDefinition;
import org.jboss.as.controller.ReloadRequiredWriteAttributeHandler;
import org.jboss.as.controller.SimpleAttributeDefinition;
import org.jboss.as.controller.SimpleAttributeDefinitionBuilder;
import org.jboss.as.controller.SimpleOperationDefinitionBuilder;
import org.jboss.as.controller.SimpleResourceDefinition;
import org.jboss.as.controller.operations.common.GenericSubsystemDescribeHandler;
import org.jboss.as.controller.registry.AttributeAccess;
import org.jboss.as.controller.registry.ManagementResourceRegistration;
import org.jboss.dmr.ModelNode;
import org.jboss.dmr.ModelType;

public class NestSubsystemDefinition extends SimpleResourceDefinition {

    public static final NestSubsystemDefinition INSTANCE = new NestSubsystemDefinition();

    protected static final SimpleAttributeDefinition NEST_ENABLED_ATTRIBDEF = new SimpleAttributeDefinitionBuilder(
            NestSubsystemExtension.NEST_ENABLED_ATTR,
            ModelType.BOOLEAN).setAllowExpression(true).setXmlName(NestSubsystemExtension.NEST_ENABLED_ATTR)
            .setFlags(AttributeAccess.Flag.RESTART_RESOURCE_SERVICES)
            .setDefaultValue(new ModelNode(NestSubsystemExtension.NEST_ENABLED_DEFAULT))
            .setAllowNull(false).build();

    protected static final SimpleAttributeDefinition NEST_NAME_ATTRIBDEF = new SimpleAttributeDefinitionBuilder(
            NestSubsystemExtension.NEST_NAME_ELEMENT,
            ModelType.STRING).setAllowExpression(true).setFlags(AttributeAccess.Flag.RESTART_RESOURCE_SERVICES)
            .setDefaultValue(new ModelNode(NestSubsystemExtension.NEST_NAME_DEFAULT)).setAllowNull(true).build();

    protected static final CustomConfigAttributeDefinition CUSTOM_CONFIG_ATTRIBDEF =
            new CustomConfigAttributeDefinition();

    // operation parameters
    protected static final SimpleAttributeDefinition START_OP_PARAM_RESTART = new SimpleAttributeDefinitionBuilder(
            "restart", ModelType.BOOLEAN)
            .setAllowExpression(true).setDefaultValue(new ModelNode(false)).build();

    private NestSubsystemDefinition() {
        super(NestSubsystemExtension.SUBSYSTEM_PATH, NestSubsystemExtension.getResourceDescriptionResolver(null),
                NestSubsystemAdd.INSTANCE,
                NestSubsystemRemove.INSTANCE);
    }

    @Override
    public void registerAttributes(ManagementResourceRegistration rr) {
        rr.registerReadWriteAttribute(NEST_ENABLED_ATTRIBDEF, null, NestEnabledAttributeHandler.INSTANCE);
        registerReloadRequiredWriteAttributeHandler(rr, NEST_NAME_ATTRIBDEF);
        registerReloadRequiredWriteAttributeHandler(rr, CUSTOM_CONFIG_ATTRIBDEF);
    }

    private void registerReloadRequiredWriteAttributeHandler(ManagementResourceRegistration rr,
            AttributeDefinition def) {
        rr.registerReadWriteAttribute(def, null, new ReloadRequiredWriteAttributeHandler(def));
    }

    @Override
    public void registerOperations(ManagementResourceRegistration rr) {
        super.registerOperations(rr);

        // We always need to add a 'describe' operation
        rr.registerOperationHandler(GenericSubsystemDescribeHandler.DEFINITION,
                GenericSubsystemDescribeHandler.INSTANCE);

        rr.registerOperationHandler(
                new SimpleOperationDefinitionBuilder(NestSubsystemExtension.NEST_START_OP, NestSubsystemExtension
                        .getResourceDescriptionResolver(null))
                        .addParameter(START_OP_PARAM_RESTART).build(), NestSubsystemStart.INSTANCE);

        rr.registerOperationHandler(
                new SimpleOperationDefinitionBuilder(NestSubsystemExtension.NEST_STOP_OP, NestSubsystemExtension
                        .getResourceDescriptionResolver(null))
                        .build(), NestSubsystemStop.INSTANCE);

        rr.registerOperationHandler(
                new SimpleOperationDefinitionBuilder(NestSubsystemExtension.NEST_STATUS_OP, NestSubsystemExtension
                        .getResourceDescriptionResolver(null))
                        .build(), NestSubsystemStatus.INSTANCE);

        return;
    }
}
