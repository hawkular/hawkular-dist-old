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
package org.hawkular.feedcomm.api;

import java.io.ByteArrayOutputStream;
import java.io.PrintWriter;

public class GenericErrorResponseBuilder {
    private final GenericErrorResponse response = new GenericErrorResponse();

    public static GenericErrorResponse buildWithThrowable(Throwable t) {
        return new GenericErrorResponseBuilder().setThrowable(t).build();
    }

    public GenericErrorResponseBuilder() {
    }

    public GenericErrorResponse build() {
        return this.response;
    }

    public GenericErrorResponseBuilder setErrorMessage(String errorMessage) {
        this.response.setErrorMessage(errorMessage);
        return this;
    }

    public GenericErrorResponseBuilder setStackTrace(String stackTrace) {
        this.response.setStackTrace(stackTrace);
        return this;
    }

    public GenericErrorResponseBuilder setThrowable(Throwable t) {
        setErrorMessage(t.getMessage());

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (PrintWriter pw = new PrintWriter(baos)) {
            t.printStackTrace(pw);
        }
        setStackTrace(baos.toString());
        return this;
    }
}
