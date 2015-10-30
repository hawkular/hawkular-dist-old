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
import org.jboss.logging.Logger;
import org.jboss.msc.service.ServiceName;

class NestSubsystemStop implements OperationStepHandler {

    static final NestSubsystemStop INSTANCE = new NestSubsystemStop();

    private final Logger log = Logger.getLogger(NestSubsystemStop.class);

    private NestSubsystemStop() {
    }

    @Override
    public void execute(OperationContext opContext, ModelNode model) throws OperationFailedException {
        log.debug("Asked to stop the nest");

        NestService service = null;

        try {
            ServiceName name = NestService.SERVICE_NAME;
            service = (NestService) opContext.getServiceRegistry(true).getRequiredService(name).getValue();
        } catch (Exception e) {
            // The nest service just isn't deployed, so obviously, it is already stopped. Just keep going.
        }

        if (service != null) {
            service.stopNest();
        }

        opContext.stepCompleted();
        return;
    }
}
