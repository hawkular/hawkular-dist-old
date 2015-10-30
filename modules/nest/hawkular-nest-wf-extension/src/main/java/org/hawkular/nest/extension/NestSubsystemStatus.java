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

import org.jboss.as.controller.OperationContext;
import org.jboss.as.controller.OperationFailedException;
import org.jboss.as.controller.OperationStepHandler;
import org.jboss.dmr.ModelNode;
import org.jboss.msc.service.ServiceName;
import org.jboss.msc.service.ServiceNotFoundException;

class NestSubsystemStatus implements OperationStepHandler {

    static final NestSubsystemStatus INSTANCE = new NestSubsystemStatus();

    private NestSubsystemStatus() {
    }

    @Override
    public void execute(OperationContext opContext, ModelNode model) throws OperationFailedException {
        boolean isStarted = false;
        try {
            ServiceName name = NestService.SERVICE_NAME;
            NestService service = (NestService) opContext.getServiceRegistry(true).getRequiredService(name).getValue();
            isStarted = service.isStarted();
        } catch (ServiceNotFoundException snfe) {
            // the nest just isn't deployed, so obviously, it isn't started
            isStarted = false;
        }
        opContext.getResult().set(isStarted ? "STARTED" : "STOPPED");
        opContext.stepCompleted();
    }
}
