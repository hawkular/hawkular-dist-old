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

  <!-- copy everything else as-is -->
  <xsl:template match="node()|@*">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*" />
    </xsl:copy>
  </xsl:template>

</xsl:stylesheet>
