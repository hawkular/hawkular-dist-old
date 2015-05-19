#
# Copyright 2015 Red Hat, Inc. and/or its affiliates
# and other contributors as indicated by the @author tags.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

# Dockerfile for hawkular-kettle

FROM jboss/base-jdk:8

MAINTAINER Viet Nguyen <vnguyen@redhat.com>

ADD hawkular-*.zip /opt/hawkular.zip

USER root

RUN unzip -qq -d /opt /opt/hawkular.zip;\
    rm /opt/hawkular.zip;\
    /opt/wildfly-8.2.0.Final/bin/add-user.sh hawkularadmin hawkularadmin --silent

EXPOSE 8080 9990

CMD ["/opt/wildfly-8.2.0.Final/bin/standalone.sh","-b","0.0.0.0","-bmanagement","0.0.0.0"]
