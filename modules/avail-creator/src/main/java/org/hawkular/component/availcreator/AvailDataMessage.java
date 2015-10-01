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
package org.hawkular.component.availcreator;

import java.util.List;

import org.hawkular.bus.common.AbstractMessage;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * @author Lucas Ponce
 */
public class AvailDataMessage extends AbstractMessage {

    @JsonInclude
    private AvailData availData;

    protected AvailDataMessage() {
    }

    public AvailDataMessage(AvailData metricData) {
        this.availData = metricData;
    }

    public AvailData getAvailData() {
        return availData;
    }

    public void setAvailData(AvailData availData) {
        this.availData = availData;
    }

    public static class AvailData {
        @JsonInclude
        List<SingleAvail> data;

        public AvailData() {
        }

        public List<SingleAvail> getData() {
            return data;
        }

        public void setData(List<SingleAvail> data) {
            this.data = data;
        }

        @Override
        public String toString() {
            return "AvailData [data=" + data + "]";
        }
    }
}
