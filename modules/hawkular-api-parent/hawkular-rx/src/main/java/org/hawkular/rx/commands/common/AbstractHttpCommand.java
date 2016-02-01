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
package org.hawkular.rx.commands.common;

import java.lang.annotation.Annotation;
import java.util.List;
import java.util.function.Consumer;

import javax.enterprise.inject.spi.InjectionPoint;

import org.apache.commons.lang3.tuple.ImmutablePair;
import org.hawkular.rx.cdi.WithValues;

import com.netflix.hystrix.HystrixCommandGroupKey;
import com.netflix.hystrix.HystrixObservableCommand;

/**
 * @author Jirka Kremser
 */
public abstract class AbstractHttpCommand<R> extends HystrixObservableCommand<R> {

    private AbstractHttpCommand() {
        super(Setter.withGroupKey(HystrixCommandGroupKey.Factory.asKey("Other")));
    }

    protected AbstractHttpCommand(HystrixCommandGroupKey group) {
        super(Setter.withGroupKey(group));
    }

    protected AbstractHttpCommand(Setter setter) {
        super(setter);
    }

    protected abstract List<ImmutablePair<Class, Consumer>> getSetters();

    protected void initialize(InjectionPoint ip) {
        boolean annotationFound = false;
        for (Annotation annotation : ip.getQualifiers()) {
            if (annotation.annotationType().equals(WithValues.class)) {
                annotationFound = true;
                String[] values = ((WithValues) annotation).values();
                List<ImmutablePair<Class, Consumer>> setters = getSetters();
                if (values.length != setters.size()) {
                    throw new IllegalStateException("@WithValues has different number of parameters than it's needed");
                }
                int index = 0;
                for (ImmutablePair<Class, Consumer> setter : setters) {
                    if (values[index] == null) {
                        setter.getRight().accept(null);
                    }
                    if (setter.getLeft().equals(String.class)) {
                        setter.getRight().accept(values[index]);
                    } else if (setter.getLeft().equals(int.class) || setter.getLeft().equals(Integer.class)) {
                        setter.getRight().accept(Integer.parseInt(values[index]));
                    } else if (setter.getLeft().equals(boolean.class) || setter.getLeft().equals(Boolean.class)) {
                        setter.getRight().accept(Boolean.parseBoolean(values[index]));
                    } else if (setter.getLeft().equals(long.class) || setter.getLeft().equals(Long.class)) {
                        setter.getRight().accept(Boolean.parseBoolean(values[index]));
                    } else if (setter.getLeft().equals(double.class) || setter.getLeft().equals(Double.class)) {
                        setter.getRight().accept(Double.parseDouble(values[index]));
                    }
                    index++;
                }
                break;
            }
        }
        if (!annotationFound) {
            throw new IllegalStateException("No @WithValues on InjectionPoint");
        }
    }

    protected String nullOrStr(Object input) {
        return input == null ? null : String.valueOf(input);
    }
}
