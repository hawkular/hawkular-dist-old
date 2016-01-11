/*
 * Copyright 2015-2016 Red Hat, Inc. and/or its affiliates
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
package org.hawkular.rx.cdi;

import java.lang.annotation.Annotation;
import java.util.Arrays;
import java.util.Objects;

import javax.enterprise.util.AnnotationLiteral;

/**
 * @author Jirka Kremser
 */
public class WithValuesLiteral extends AnnotationLiteral<WithValues> implements WithValues {

    private final String[] values;

    public WithValuesLiteral(String... values) {
        this.values = values;
    }

    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        if (!super.equals(o)) return false;
        WithValuesLiteral that = (WithValuesLiteral) o;
        return Objects.equals(values, that.values);
    }

    @Override public int hashCode() {
        return Objects.hash(super.hashCode(), values);
    }

    @Override public String toString() {
        final StringBuilder sb = new StringBuilder("WithValuesLiteral[");
        sb.append("values=").append(Arrays.toString(values));
        sb.append(']');
        return sb.toString();
    }

    @Override public Class<? extends Annotation> annotationType() {
        return WithValues.class;
    }

    @Override public String[] values() {
        return values;
    }
}
