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
package org.hawkular.inventory.rest.filters;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * @author <a href="https://github.com/ppalaga">Peter Palaga</a>
 */
public class ParamProperties implements Map<String, List<String>> {
    static class Parser {
        private static final int INVALID = -1;
        private int pos = 0;
        private final Map<String, List<String>> result;
        private final String input;
        public Parser(String serialized) {
            super();
            this.input = serialized;
            this.result = new LinkedHashMap<>();
        }

        private int consumeNext() {
            if (pos < input.length()) {
                int result = input.charAt(pos++);
                if (result == BACKSLASH) {
                    if (pos < input.length()) {
                        result = input.charAt(pos++);
                    } else {
                        return INVALID;
                    }
                }
                return result;
            }
            return INVALID;
        }

        public Map<String, List<String>> parse() {
            String key;
            while (pos < input.length()) {
                key = token();
                String value = null;
                if (pos < input.length() && input.charAt(pos) == COLON) {
                    pos++;
                    value = token();
                }
                put(key, value);
                if (pos < input.length() && input.charAt(pos) == COMMA) {
                    pos++;
                }
            }
            return Collections.unmodifiableMap(result);
        }

        private void put(String key, String value) {
            List<String> oldList = result.get(key);
            if (oldList == null) {
                if (value == null) {
                    result.put(key, null);
                } else {
                    List<String> newList = new ArrayList<String>(1);
                    newList.add(value);
                    result.put(key, Collections.unmodifiableList(newList));
                }
            } else {
                /* oldList != null */
                if (value == null) {
                    /* ignore a value-less key rather than adding
                     * null to the list or throwing an exception */
                } else {
                    List<String> newList = new ArrayList<String>(oldList.size() + 1);
                    newList.addAll(oldList);
                    newList.add(value);
                    result.put(key, Collections.unmodifiableList(newList));
                }
            }
        }

        private String token() {
            StringBuilder sb = new StringBuilder();
            LOOP: while (pos < input.length()) {
                int ch = input.charAt(pos);
                switch (ch) {
                case COLON:
                case COMMA:
                    break LOOP;
                default:
                    ch = consumeNext();
                    if (ch != INVALID) {
                        sb.append((char) ch);
                    }
                    break;
                }
            }
            return sb.toString();
        }
    }

    public static final char BACKSLASH = '\\';
    public static final char COMMA = ',';
    public static final char COLON = ':';

    private final Map<String, List<String>> store;

    public ParamProperties(String serialized) {
        this.store = new Parser(serialized).parse();
    }

    @Override
    public int size() {
        return store.size();
    }

    @Override
    public boolean isEmpty() {
        return store.isEmpty();
    }

    @Override
    public boolean containsKey(Object key) {
        return store.containsKey(key);
    }

    @Override
    public boolean containsValue(Object value) {
        return store.containsValue(value);
    }

    @Override
    public List<String> get(Object key) {
        return store.get(key);
    }

    @Override
    public List<String> put(String key, List<String> value) {
        throw new UnsupportedOperationException(getClass().getName() + " is immutable");
    }

    @Override
    public List<String> remove(Object key) {
        throw new UnsupportedOperationException(getClass().getName() + " is immutable");
    }

    @Override
    public void putAll(Map<? extends String, ? extends List<String>> m) {
        throw new UnsupportedOperationException(getClass().getName() + " is immutable");
    }

    @Override
    public void clear() {
        throw new UnsupportedOperationException(getClass().getName() + " is immutable");
    }

    @Override
    public Set<String> keySet() {
        return store.keySet();
    }

    @Override
    public Collection<List<String>> values() {
        return store.values();
    }

    @Override
    public Set<java.util.Map.Entry<String, List<String>>> entrySet() {
        return store.entrySet();
    }

    @Override
    public boolean equals(Object o) {
        return store.equals(o);
    }

    @Override
    public int hashCode() {
        return store.hashCode();
    }

}
