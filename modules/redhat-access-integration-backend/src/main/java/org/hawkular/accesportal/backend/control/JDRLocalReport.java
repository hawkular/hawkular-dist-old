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
package org.hawkular.accesportal.backend.control;

import java.net.UnknownHostException;

import org.jboss.as.controller.client.ModelControllerClient;
import org.jboss.dmr.ModelNode;

/**
 * @author Juraci Paixão Kröhling
 */
public class JDRLocalReport {
    final ModelControllerClient client;

    public JDRLocalReport() throws UnknownHostException {
        String host = System.getProperty("jboss.bind.address.management", "127.0.0.1");
        int port = Integer.parseInt(System.getProperty("jboss.management.native.port", "9990"));
        client = ModelControllerClient.Factory.create(host, port);
    }

    public String getReportLocation() throws Exception {
        ModelNode op = new ModelNode();
        ModelNode address = op.get("address").setEmptyList();
        address.add("subsystem", "jdr");
        op.get("operation").set("generate-jdr-report");
        ModelNode result = client.execute(op);
        if (isSuccess(result)) {
            return result.get("result").get("report-location").asString();
        } else {
            throw new Exception("Failed to generate JDR report " + result.asString());
        }
    }

    public static boolean isSuccess(ModelNode operationResult) {
        if (operationResult != null) {
            return operationResult.hasDefined("outcome") && operationResult.get("outcome").asString().equals("success");
        }
        return false;
    }
}
