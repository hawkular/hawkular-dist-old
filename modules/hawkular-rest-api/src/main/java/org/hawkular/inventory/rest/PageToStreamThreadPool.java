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
package org.hawkular.inventory.rest;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import javax.annotation.PostConstruct;
import javax.enterprise.inject.Produces;
import javax.inject.Singleton;

/**
 * @author Jirka Kremser
 * @since 0.3.4
 */
@Singleton
public class PageToStreamThreadPool {

    private static PageToStreamThreadPool instance;
    private ExecutorService executor;

    @Produces
    @Singleton
    public static PageToStreamThreadPool getInstance() {
        if (instance == null) {
            instance = new PageToStreamThreadPool();
            instance.init();
        }
        return instance;
    }

    @PostConstruct
    public void init() {
        this.executor = Executors.newCachedThreadPool();
    }

    public void submit(Runnable work) {
        executor.execute(work);
    }
}
