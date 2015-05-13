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
    var cacheBuster = Date.now();

    gulp.src('index.html')
        .pipe(wiredep({
          fileTypes: {
            html: {
              replace: {
                js: '<script src="{{filePath}}?v=' + cacheBuster + '"></script>',
                css: '<link rel="stylesheet" href="{{filePath}}?v=' + cacheBuster + '" />'
              }
            }
          }
        }))
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

gulp.task('git-sha', function(cb) {
  plugins.git.exec({args : 'log -n 1 --oneline'}, function (err, stdout) {
    if (err) throw err;
    var versionFile = 'version.js';
    var gitSha = stdout.slice(0, -1);
    var jsString = 'var HawkularVersion = \'' + gitSha + '\';';
    fs.writeFileSync(versionFile, jsString);
    cb();
  });
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

gulp.task('template', ['tsc', 'less'], function () {
    return gulp.src(config.templates)
        .pipe(plugins.angularTemplatecache({
            filename: 'templates.js',
            root: '',
            base: function(file){
              var filename = /[^/]*$/.exec( file.relative).input;
              var prefixIndex = filename.indexOf('/') + 1;
              return filename.substring(prefixIndex, filename.length);
            },
            standalone: true,
            module: config.templateModule,
            templateFooter: '}]); hawtioPluginLoader.addModule("' + config.templateModule + '");'
        }))
        .pipe(gulp.dest('.'));
});

gulp.task('less', function(){
  return gulp.src(['plugins/**/*.less'])
    .pipe(plugins.less())
    .pipe(plugins.concat('console-style.css'))
    .pipe(gulp.dest(config.dist));
});

gulp.task('concat', ['template', 'git-sha'], function () {
    var gZipSize = size(gZippedSizeOptions);

    return gulp.src(['compiled.js', 'templates.js', 'version.js'])
        .pipe(plugins.concat(config.js))
        .pipe(gulp.dest(config.dist))
        .pipe(size(normalSizeOptions))
        .pipe(gZipSize);
});

gulp.task('clean', ['concat'], function () {
    del(['templates.js', 'compiled.js']);
});

gulp.task('watch', ['build'], function () {
    plugins.watch(['libs/**/*.js', 'libs/**/*.css', config.dist + '/**/*'], function () {
        gulp.start('reload');
    });
    plugins.watch(['index.html'], function () {
        gulp.start('bower', 'reload');
    });
    plugins.watch(['libs/**/*.d.ts', config.ts, config.templates], function () {
        gulp.start(['tslint-watch', 'tsc', 'template', 'concat', 'clean']);
    });

    /* If something in the src folder changes, just copy it and let the handlers above handle the situation */
    plugins.watch(['../../src/main/scripts/**/*'], function () {
        gulp.src('../../src/main/scripts/**/*')
        .pipe(gulp.dest('.'));
    });

    plugins.watch(['../../src/main/webapp/resources/**/*'], function () {
        gulp.src('../../src/main/webapp/resources/**/*')
        .pipe(gulp.dest('./resources/'));
    });

    plugins.watch(['../../src/main/webapp/index.html'], function () {
        gulp.src('../../src/main/webapp/index.html')
        .pipe(plugins.replace('${hawkular.console.index.html.base.href}', '/'))
        .pipe(gulp.dest('.'));
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



