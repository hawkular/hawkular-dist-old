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
package org.hawkular.accesportal.backend.boundary;

import java.io.File;

import javax.inject.Inject;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

import org.hawkular.accesportal.backend.control.JDRLocalReport;
import org.hawkular.accesportal.backend.control.RedHatAccessConfiguration;
import org.hawkular.accesportal.backend.entity.SelectedFileForUpload;

import com.redhat.gss.redhat_support_lib.api.API;

/**
 * @author Juraci Paixão Kröhling
 */
@Path("/attachments")
public class AttachmentEndpoint {
    private static final String SERVER_REPORT = "Hawkular Server JDR Report";

    @Inject
    RedHatAccessConfiguration configuration;

    @GET
    @Consumes({MediaType.APPLICATION_JSON})
    @Produces({MediaType.TEXT_PLAIN})
    public Response getAvailableAttachments() {
        // for now, the only possible option is Hawkular's own JDR report.
        return Response.ok(SERVER_REPORT + "?checked=true\n").build();
    }

    @POST
    @Consumes({MediaType.APPLICATION_JSON})
    @Produces({MediaType.APPLICATION_JSON})
    public Response uploadFilesToCase(SelectedFileForUpload selectedFileForUpload) throws Exception {
        API api = new API(
                selectedFileForUpload.getUsername(),
                selectedFileForUpload.getPassword(),
                configuration.getUrl(),
                configuration.getProxyUser(),
                configuration.getProxyPassword(),
                configuration.getProxyUrl(),
                configuration.getProxyPort(),
                configuration.getUserAgent(),
                configuration.isDevel()
        );

        // tests the connectivity first... if it breaks here, we don't even need to generate the JDR (which is
        // expensive).
        api.getProblems().diagnoseStr("test");

        if (SERVER_REPORT.equalsIgnoreCase(selectedFileForUpload.getAttachment())) {
            String report = new JDRLocalReport().getReportLocation();

            try {
                api.getAttachments().add(
                        selectedFileForUpload.getCaseNum(), // to which case should we attach this report?
                        true, // public visibility
                        report,  // the location of the report on the local file system
                        selectedFileForUpload.getAttachment() // the name of the report
                );
            } catch (Exception e) {
                // we cannot recover from this
                e.printStackTrace();
            }

            boolean deleted = new File(report).delete();
        }

        return null;
    }

}
