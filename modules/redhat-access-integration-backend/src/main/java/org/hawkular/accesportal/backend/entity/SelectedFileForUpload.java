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
package org.hawkular.accesportal.backend.entity;

import java.util.Base64;

/**
 * @author Juraci Paixão Kröhling
 */
public class SelectedFileForUpload {

    private String authToken;
    private String attachment;
    private String caseNum;

    private String username;
    private String password;

    public String getAuthToken() {
        return authToken;
    }

    public void setAuthToken(String authToken) {
        this.authToken = authToken;

        if (authToken == null || authToken.isEmpty()) {
            // auth token is null, we will not be able to login to the API...
            return;
        }

        String decodedCredentials = new String(Base64.getDecoder().decode(authToken));
        String[] splitCredentials = decodedCredentials.split(":");

        if (splitCredentials.length != 2) {
            throw new IllegalStateException("Credentials could not be decoded.");
        }

        if (splitCredentials[0] != null) {
            username = splitCredentials[0];
        }

        if (splitCredentials[1] != null) {
            password = splitCredentials[1];
        }
    }

    public String getAttachment() {
        return attachment;
    }

    public void setAttachment(String attachment) {
        this.attachment = attachment;
    }

    public String getCaseNum() {
        return caseNum;
    }

    public void setCaseNum(String caseNum) {
        this.caseNum = caseNum;
    }

    public String getUsername() {
        return username;
    }

    public String getPassword() {
        return password;
    }
}
