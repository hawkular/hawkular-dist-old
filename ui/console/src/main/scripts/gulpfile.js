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
var gulp = require('gulp'),
    del = require('del'),
    wiredep = require('wiredep').stream,
    eventStream = require('event-stream'),
    gulpLoadPlugins = require('gulp-load-plugins'),
    map = require('vinyl-map'),
    fs = require('fs'),
    path = require('path'),
    size = require('gulp-size'),
    s = require('underscore.string'),
    tslint = require('gulp-tslint');

var plugins = gulpLoadPlugins({});
var pkg = require('./package.json');
var normalSizeOptions = {
    showFiles: true
}, gZippedSizeOptions = {
    showFiles: true,
    gzip: true
};

var config = {
    main: '.',
    ts: ['plugins/**/*.ts'],
    templates: ['plugins/**/*.html'],
    templateModule: pkg.name + '-templates',
    dist: './dist/',
    js: pkg.name + '.js',
    tsProject: plugins.typescript.createProject({
        target: 'ES5',
        module: 'commonjs',
        declarationFiles: true,
        noExternalResolve: false
    })
};

gulp.task('bower', function () {
    gulp.src('index.html')
        .pipe(wiredep({}))
        .pipe(gulp.dest('.'));
});

/** Adjust the reference path of any typescript-built plugin this project depends on */
gulp.task('path-adjust', function () {
    gulp.src('libs/**/includes.d.ts')
        .pipe(map(function (buf, filename) {
            var textContent = buf.toString();
            var newTextContent = textContent.replace(/"\.\.\/libs/gm, '"../../../libs');
            // console.log("Filename: ", filename, " old: ", textContent, " new:", newTextContent);
            return newTextContent;
        }))
        .pipe(gulp.dest('libs'));
});

gulp.task('clean-defs', function () {
    del(['defs.d.ts/**']);
});

gulp.task('tsc', ['clean-defs'], function () {
    var cwd = process.cwd();
    var tsResult = gulp.src(config.ts)
        .pipe(plugins.typescript(config.tsProject))
        .on('error', plugins.notify.onError({
            message: '#{ error.message }',
            title: 'Typescript compilation error'
        }));

    return eventStream.merge(
        tsResult.js
            .pipe(plugins.concat('compiled.js'))
            .pipe(gulp.dest('.')),
        tsResult.dts
            .pipe(gulp.dest('d.ts')))
        .pipe(map(function (buf, filename) {
            if (!s.endsWith(filename, 'd.ts')) {
                return buf;
            }
            var relative = path.relative(cwd, filename);
            fs.appendFileSync('defs.d.ts', '/// <reference path="' + relative + '"/>\n');
            return buf;
        }));
});

gulp.task('tslint', function () {
    gulp.src(config.ts)
        .pipe(tslint())
        .pipe(tslint.report('verbose'));
});

gulp.task('tslint-watch', function () {
    gulp.src(config.ts)
        .pipe(tslint())
        .pipe(tslint.report('prose', {
            emitError: false
        }));
});

gulp.task('template', ['tsc'], function () {
    return gulp.src(config.templates)
        .pipe(plugins.angularTemplatecache({
            filename: 'templates.js',
            root: 'plugins/',
            standalone: true,
            module: config.templateModule,
            templateFooter: '}]); hawtioPluginLoader.addModule("' + config.templateModule + '");'
        }))
        .pipe(gulp.dest('.'));
});

gulp.task('concat', ['template'], function () {
    var gZipSize = size(gZippedSizeOptions);

    return gulp.src(['compiled.js', 'templates.js'])
        .pipe(plugins.concat(config.js))
        .pipe(gulp.dest(config.dist))
        .pipe(size(normalSizeOptions))
        .pipe(gZipSize);
});

gulp.task('clean', ['concat'], function () {
    del(['templates.js', 'compiled.js']);
});

gulp.task('watch', ['build'], function () {
    plugins.watch(['libs/**/*.js', 'libs/**/*.css', 'index.html', config.dist + '/' + config.js], function () {
        gulp.start('reload');
    });
    plugins.watch(['libs/**/*.d.ts', config.ts, config.templates], function () {
        gulp.start(['tslint-watch', 'tsc', 'template', 'concat', 'clean']);
    });
});

gulp.task('connect', ['watch'], function () {
    plugins.connect.server({
        root: '.',
        livereload: true,
        port: 2772,
        fallback: 'index.html'
    });
});

gulp.task('reload', function () {
    gulp.src('.')
        .pipe(plugins.connect.reload());
});

gulp.task('build', ['bower', 'path-adjust', 'tslint', 'tsc', 'template', 'concat', 'clean']);

gulp.task('default', ['connect']);



