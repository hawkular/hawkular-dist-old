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

import static org.jboss.as.controller.descriptions.ModelDescriptionConstants.ADD;
import static org.jboss.as.controller.descriptions.ModelDescriptionConstants.OP;
import static org.jboss.as.controller.descriptions.ModelDescriptionConstants.OP_ADDR;
import static org.jboss.as.controller.descriptions.ModelDescriptionConstants.SUBSYSTEM;

import java.util.List;

import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamException;

import org.hawkular.nest.extension.log.MsgLogger;
import org.jboss.as.controller.Extension;
import org.jboss.as.controller.ExtensionContext;
import org.jboss.as.controller.PathAddress;
import org.jboss.as.controller.PathElement;
import org.jboss.as.controller.SubsystemRegistration;
import org.jboss.as.controller.descriptions.StandardResourceDescriptionResolver;
import org.jboss.as.controller.parsing.Attribute;
import org.jboss.as.controller.parsing.ExtensionParsingContext;
import org.jboss.as.controller.parsing.ParseUtils;
import org.jboss.as.controller.persistence.SubsystemMarshallingContext;
import org.jboss.as.controller.registry.ManagementResourceRegistration;
import org.jboss.dmr.ModelNode;
import org.jboss.dmr.Property;
import org.jboss.dmr.ValueExpression;
import org.jboss.logging.Logger;
import org.jboss.staxmapper.XMLElementReader;
import org.jboss.staxmapper.XMLElementWriter;
import org.jboss.staxmapper.XMLExtendedStreamReader;
import org.jboss.staxmapper.XMLExtendedStreamWriter;

public class NestSubsystemExtension implements Extension {

    private final MsgLogger msglog = MsgLogger.LOGGER;
    private final Logger log = Logger.getLogger(NestSubsystemExtension.class);

    public static final String NAMESPACE = "urn:org.hawkular.nest:nest:1.0";
    public static final String SUBSYSTEM_NAME = "hawkular-nest";

    private final SubsystemParser parser = new SubsystemParser();

    private static final String RESOURCE_NAME = NestSubsystemExtension.class.getPackage().getName()
            + ".LocalDescriptions";

    protected static final String DEPLOYMENTS_DIR_NAME = "deployments";

    // The following define the XML elements and attributes of the extension itself (these appear in WildFly's
    // standalone.xml for this extension).
    protected static final String NEST_ENABLED_ATTR = "enabled";
    protected static final boolean NEST_ENABLED_DEFAULT = false;

    protected static final String NEST_NAME_ELEMENT = "nest-name";
    protected static final String NEST_NAME_AUTOGENERATE = "autogenerate";
    protected static final String NEST_NAME_DEFAULT = NEST_NAME_AUTOGENERATE;

    protected static final String CUSTOM_CONFIG_ELEMENT = "custom-configuration";
    protected static final String PROPERTY_ELEMENT = "property";

    protected static final String NEST_START_OP = "start";
    protected static final String NEST_STOP_OP = "stop";
    protected static final String NEST_STATUS_OP = "status";

    protected static final PathElement SUBSYSTEM_PATH = PathElement.pathElement(SUBSYSTEM, SUBSYSTEM_NAME);

    static StandardResourceDescriptionResolver getResourceDescriptionResolver(final String keyPrefix) {
        String prefix = SUBSYSTEM_NAME + (keyPrefix == null ? "" : "." + keyPrefix);
        return new StandardResourceDescriptionResolver(prefix, RESOURCE_NAME,
                NestSubsystemExtension.class.getClassLoader(), true, false);
    }

    @Override
    public void initializeParsers(ExtensionParsingContext context) {
        context.setSubsystemXmlMapping(SUBSYSTEM_NAME, NAMESPACE, parser);
    }

    @Override
    public void initialize(ExtensionContext context) {
        msglog.infoInitializingNestSubsystem();

        final SubsystemRegistration subsystem = context.registerSubsystem(SUBSYSTEM_NAME, 1, 0);
        final ManagementResourceRegistration registration = subsystem
                .registerSubsystemModel(NestSubsystemDefinition.INSTANCE);

        subsystem.registerXMLElementWriter(parser);
    }

    /**
     * The subsystem parser, which uses stax to read and write to and from xml
     */
    private static class SubsystemParser implements XMLStreamConstants, XMLElementReader<List<ModelNode>>,
            XMLElementWriter<SubsystemMarshallingContext> {

        @Override
        public void readElement(XMLExtendedStreamReader reader, List<ModelNode> list) throws XMLStreamException {
            // The "enabled" attribute is required
            ParseUtils.requireAttributes(reader, NEST_ENABLED_ATTR);

            // Add the main subsystem 'add' operation
            final ModelNode opAdd = new ModelNode();
            opAdd.get(OP).set(ADD);
            opAdd.get(OP_ADDR).set(PathAddress.pathAddress(SUBSYSTEM_PATH).toModelNode());
            String brokerEnabledValue = reader.getAttributeValue(null, NEST_ENABLED_ATTR);
            if (brokerEnabledValue != null) {
                opAdd.get(NEST_ENABLED_ATTR).set(new ValueExpression(brokerEnabledValue));
            }

            // Read the children elements
            while (reader.hasNext() && reader.nextTag() != END_ELEMENT) {
                String elementName = reader.getLocalName();
                if (elementName.equals(CUSTOM_CONFIG_ELEMENT)) {
                    ModelNode configAttributeNode = opAdd.get(CUSTOM_CONFIG_ELEMENT);
                    while (reader.hasNext() && reader.nextTag() != END_ELEMENT) {
                        if (reader.isStartElement()) {
                            readCustomConfigurationProperty(reader, configAttributeNode);
                        }
                    }
                } else if (elementName.equals(NEST_NAME_ELEMENT)) {
                    opAdd.get(NEST_NAME_ELEMENT).set(new ValueExpression(reader.getElementText()));
                } else {
                    throw ParseUtils.unexpectedElement(reader);
                }
            }

            list.add(opAdd);
        }

        private void readCustomConfigurationProperty(XMLExtendedStreamReader reader, ModelNode configAttributeNode)
                throws XMLStreamException {
            if (!reader.getLocalName().equals(PROPERTY_ELEMENT)) {
                throw ParseUtils.unexpectedElement(reader);
            }

            ParseUtils.requireAttributes(reader, Attribute.NAME.getLocalName(), Attribute.VALUE.getLocalName());
            String attr = reader.getAttributeValue(null, Attribute.NAME.getLocalName());
            String val = reader.getAttributeValue(null, Attribute.VALUE.getLocalName());
            ParseUtils.requireNoContent(reader);

            configAttributeNode.add(attr, val);
        }

        @Override
        public void writeContent(final XMLExtendedStreamWriter writer, final SubsystemMarshallingContext context)
                throws XMLStreamException {
            ModelNode node = context.getModelNode();

            // <subsystem>
            context.startSubsystemElement(NestSubsystemExtension.NAMESPACE, false);
            writer.writeAttribute(NEST_ENABLED_ATTR, node.get(NEST_ENABLED_ATTR).asString());

            // our config elements
            writeElement(writer, node, NEST_NAME_ELEMENT);

            // <custom-configuration>
            writer.writeStartElement(CUSTOM_CONFIG_ELEMENT);
            ModelNode configNode = node.get(CUSTOM_CONFIG_ELEMENT);
            if (configNode != null && configNode.isDefined()) {
                for (Property property : configNode.asPropertyList()) {
                    // <propery>
                    writer.writeStartElement(PROPERTY_ELEMENT);
                    writer.writeAttribute(Attribute.NAME.getLocalName(), property.getName());
                    writer.writeAttribute(Attribute.VALUE.getLocalName(), property.getValue().asString());
                    // </property>
                    writer.writeEndElement();
                }
            }
            // </custom-configuration>
            writer.writeEndElement();

            // </subsystem>
            writer.writeEndElement();
        }

        private void writeElement(final XMLExtendedStreamWriter writer, ModelNode node, String attribName)
                throws XMLStreamException {
            ModelNode attribNode = node.get(attribName);
            if (attribNode.isDefined()) {
                writer.writeStartElement(attribName);
                writer.writeCharacters(attribNode.asString());
                writer.writeEndElement();
            }
        }
    }
}