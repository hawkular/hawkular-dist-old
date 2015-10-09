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
package org.hawkular.inventory.rest.json;

import javax.ws.rs.Produces;
import javax.xml.bind.annotation.XmlAttribute;
import javax.xml.bind.annotation.XmlRootElement;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.wordnik.swagger.annotations.ApiModel;
import com.wordnik.swagger.annotations.ApiModelProperty;

/**
 * A link between two resources
 *
 * @author Heiko W. Rupp
 * @since 0.0.1
 */
@ApiModel("Link between two resources")
@XmlRootElement
@JsonSerialize(using = LinkSerializer.class)
@JsonDeserialize(using = LinkDeserializer.class)
@Produces({"application/json", "application/xml"})
public class Link {

    private String rel;
    private String href;

    public Link() {
    }

    public Link(String rel, String href) {
        this.rel = rel;
        this.href = href;
    }


    @ApiModelProperty("Name of the relation")
    @XmlAttribute
    public String getRel() {
        return rel;
    }

    public void setRel(String rel) {
        this.rel = rel;
    }

    @ApiModelProperty("Target of the relation")
    @XmlAttribute
    public String getHref() {
        return href;
    }

    public void setHref(String href) {
        this.href = href;
    }

    @Override
    public String toString() {
        return
                href + "; " +
                        "rel='" + rel + '\'';
    }

    /**
     * Return the link in the format of RFC 5988 Web Linking.
     *
     * See <a href="http://tools.ietf.org/html/rfc5988#page-7">RFC 5988 Web Linking</a>
     *
     * @return String that contains the link with href and rel
     */
    public String rfc5988String() {
        StringBuilder builder = new StringBuilder();
        builder.append("<")
                .append(href)
                .append(">; rel=\"")
                .append(rel)
                .append("\"");
        return builder.toString();
    }
}
