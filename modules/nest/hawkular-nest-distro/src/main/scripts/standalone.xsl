<?xml version="1.0" encoding="UTF-8"?>
<!--

    Copyright 2015 Red Hat, Inc. and/or its affiliates
    and other contributors as indicated by the @author tags.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.

-->

<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xalan="http://xml.apache.org/xalan"
                xmlns:ds="urn:jboss:domain:datasources:3.0"
                xmlns:ra="urn:jboss:domain:resource-adapters:3.0"
                xmlns:ejb3="urn:jboss:domain:ejb3:3.0"
                version="2.0"
                exclude-result-prefixes="xalan ds ra ejb3">

  <!-- will indicate if this is a "dev" build or "production" build -->
  <xsl:param name="nest.build.type"/>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="yes" xalan:indent-amount="4" standalone="no"/>
  <xsl:strip-space elements="*"/>

  <!-- enable/disable deployment scanner -->
  <xsl:template name="deployment-scanner">
    <xsl:if test="$nest.build.type='dev'">
      <xsl:attribute name="scan-enabled">true</xsl:attribute>
    </xsl:if>
    <xsl:if test="$nest.build.type='production'">
      <xsl:attribute name="scan-enabled">false</xsl:attribute>
    </xsl:if>
  </xsl:template>

  <xsl:template match="node()[name(.)='deployment-scanner']">
    <xsl:copy>
      <xsl:call-template name="deployment-scanner"/>
      <xsl:apply-templates select="node()|@*"/>
    </xsl:copy>
  </xsl:template>

  <!-- add some logger categories -->
  <xsl:template name="loggers">
    <logger category="org.hawkular.bus">
      <level>
        <xsl:attribute name="name"><xsl:text disable-output-escaping="yes">${hawkular.log.bus:INFO}</xsl:text></xsl:attribute>
      </level>
    </logger>
    <logger category="org.hawkular.nest">
      <level>
        <xsl:attribute name="name"><xsl:text disable-output-escaping="yes">${hawkular.log.nest:INFO}</xsl:text></xsl:attribute>
      </level>
    </logger>
  </xsl:template>

  <xsl:template match="node()[name(.)='periodic-rotating-file-handler']">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>
    </xsl:copy>
    <xsl:call-template name="loggers"/>
  </xsl:template>

  <!-- add bus resource adapter -->
  <xsl:template name="resource-adapters">
    <resource-adapters>
      <resource-adapter id="activemq-rar" statistics-enabled="true">
        <module slot="main" id="org.apache.activemq.ra" />
        <transaction-support>XATransaction</transaction-support>
        <config-property name="UseInboundSession">false</config-property>
        <xsl:comment><![CDATA[
          <config-property name="Password">
            defaultPassword
          </config-property>
          <config-property name="UserName">
            defaultUser
          </config-property>
        ]]></xsl:comment>
        <config-property name="ServerUrl">vm://org.hawkular.bus.broker.${jboss.node.name}?create=false&amp;jms.blobTransferPolicy.uploadUrl=file:${org.hawkular.data.dir:${jboss.server.data.dir}}/hawkular-bus-blobs</config-property>
        <connection-definitions>
          <connection-definition class-name="org.apache.activemq.ra.ActiveMQManagedConnectionFactory"
                                 jndi-name="java:/HawkularBusConnectionFactory"
                                 enabled="true"
                                 use-java-context="true"
                                 pool-name="HawkularBusConnectionFactory">
            <xa-pool>
              <min-pool-size>1</min-pool-size>
              <max-pool-size>20</max-pool-size>
              <prefill>false</prefill>
              <is-same-rm-override>false</is-same-rm-override>
            </xa-pool>
          </connection-definition>
        </connection-definitions>
        <admin-objects>
          <admin-object use-java-context="true" enabled="true" class-name="org.apache.activemq.command.ActiveMQTopic" jndi-name="java:/topic/HawkularInventoryChanges" pool-name="HawkularInventoryChanges">
            <config-property name="PhysicalName">HawkularInventoryChanges</config-property>
          </admin-object>
          <admin-object use-java-context="true" enabled="true" class-name="org.apache.activemq.command.ActiveMQTopic" jndi-name="java:/topic/HawkularMetricData" pool-name="HawkularMetricData">
            <config-property name="PhysicalName">HawkularMetricData</config-property>
          </admin-object>
          <admin-object use-java-context="true" enabled="true" class-name="org.apache.activemq.command.ActiveMQTopic" jndi-name="java:/topic/HawkularAvailData" pool-name="HawkularAvailData">
            <config-property name="PhysicalName">HawkularAvailData</config-property>
          </admin-object>
          <admin-object use-java-context="true" enabled="true" class-name="org.apache.activemq.command.ActiveMQTopic" jndi-name="java:/topic/HawkularAccountsEvents" pool-name="HawkularAccountsEvents">
            <config-property name="PhysicalName">HawkularAccountsEvents</config-property>
          </admin-object>
        </admin-objects>
      </resource-adapter>
    </resource-adapters>
  </xsl:template>

  <xsl:template match="ra:subsystem">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>
      <xsl:call-template name="resource-adapters"/>
    </xsl:copy>
  </xsl:template>

  <!-- add MDB definition -->
  <xsl:template name="mdb">
    <mdb>
      <resource-adapter-ref resource-adapter-name="activemq-rar"/>
      <bean-instance-pool-ref pool-name="mdb-strict-max-pool"/>
    </mdb>
  </xsl:template>

  <xsl:template match="ejb3:subsystem">
    <xsl:copy>
      <xsl:call-template name="mdb"/>
      <statistics enabled="true"/>
      <xsl:apply-templates select="node()|@*"/>
    </xsl:copy>
  </xsl:template>

  <!-- Tweak EE bindings -->
  <xsl:template match="@jms-connection-factory[.='java:jboss/DefaultJMSConnectionFactory']">
    <xsl:attribute name="jms-connection-factory">java:/HawkularBusConnectionFactory</xsl:attribute>
  </xsl:template>

  <!-- copy everything else as-is -->
  <xsl:template match="node()|@*">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*" />
    </xsl:copy>
  </xsl:template>

</xsl:stylesheet>
