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
    xml2js = require('xml2js'),
    map = require('vinyl-map'),
    fs = require('fs'),
    path = require('path'),
    size = require('gulp-size'),
    s = require('underscore.string'),
    tslint = require('gulp-tslint'),
    jsString;

// CONSTANTS

var POM_MAIN_PATH = '../../../pom.xml';
var DIST_TARGET_PATH = '../../../dist/target/';
var WF_CONSOLE_PATH = 'modules/org/hawkular/nest/main/deployments/hawkular-console.war/dist/';

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
    }),
    srcPrefix: '../../src/main/scripts/',
    serverPath: DIST_TARGET_PATH + 'hawkular-1.0.0-SNAPSHOT/' + WF_CONSOLE_PATH
};

gulp.task('set-server-path', function(done) {
  var parser = new xml2js.Parser();
  parser.addListener('end', function(result) {
    config.serverPath = DIST_TARGET_PATH + 'hawkular-' + result.project.version + '/hawkular-' + result.project.version + '/' + WF_CONSOLE_PATH;
    done();
  });

  fs.readFile(POM_MAIN_PATH, 'utf8', function (err, xmlString) {
    if (err) throw err;
    parser.parseString(xmlString);
  });
});

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
  var versionFile = 'version.js';

  if(!jsString) {
    plugins.git.exec({args: "log -n 1 --pretty='%h'"}, function (err, stdout) {
      if (err) throw err;
      var gitSha = stdout.slice(0, -1);
      jsString = 'var HawkularVersion = \'' + gitSha + '\';';
      fs.writeFileSync(versionFile, jsString);
      cb();
    });
  } else {
    fs.writeFileSync(versionFile, jsString);
    cb();
  }
});

var gulpTsc = function(done) {
  var cwd = process.cwd();
  var tsResult = gulp.src(config.ts)
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.typescript(config.tsProject))
    .on('error', plugins.notify.onError({
      message: '<%= error.message %>',
      title: 'Typescript compilation error'
    }));

  return eventStream.merge(
    tsResult.js
      .pipe(plugins.concat('compiled.js'))
      .pipe(plugins.sourcemaps.write())
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
    })).on('end', function(){
      done && done();
    });
};

gulp.task('tsc', ['clean-defs'], function (done) {
  gulpTsc(done);
});

gulp.task('tsc-live', ['copy-sources','clean-defs'], function (done) {
  gulpTsc(done);
});

gulp.task('tslint', function () {
    gulp.src(config.ts)
        .pipe(tslint())
        .pipe(tslint.report('verbose'));
});

gulp.task('tslint-watch', ['copy-sources'], function () {
    gulp.src(config.ts)
        .pipe(tslint())
        .pipe(tslint.report('prose', {
            emitError: false
        }));
});

var gulpTemplate = function(){
  return gulp.src(config.templates)
    .pipe(plugins.angularTemplatecache({
      filename: 'templates.js',
      root: '',
      base: function(file){
        var filename = /[^/]*$/.exec( file.relative).input;
        return 'plugins/' + filename;
      },
      standalone: true,
      module: config.templateModule,
      templateFooter: '}]); hawtioPluginLoader.addModule("' + config.templateModule + '");'
    }))
    .pipe(gulp.dest('.'));
};

gulp.task('template', ['tsc'], function () {
  return gulpTemplate();
});

gulp.task('template-live', ['tsc-live', 'copy-sources'], function () {
  return gulpTemplate();
});

var gulpLess = function(done) {
  gulp.src(['plugins/**/*.less'])
    .pipe(plugins.less())
    .pipe(plugins.concat('hawkular-console.css'))
    .pipe(gulp.dest(config.dist))
    .on('end', function(){
      done && done();
    });
};

gulp.task('less', function(){
  gulpLess();
});

gulp.task('less-live', ['copy-sources'], function(done){
  gulpLess(done);
});

var gulpConcat = function() {
  var gZipSize = size(gZippedSizeOptions);

  return gulp.src(['compiled.js', 'templates.js', 'version.js'])
    .pipe(plugins.sourcemaps.init({loadMaps: true}))
    .pipe(plugins.concat(config.js))
    .pipe(plugins.sourcemaps.write())
    .pipe(gulp.dest(config.dist))
    .pipe(size(normalSizeOptions))
    .pipe(gZipSize);
};

gulp.task('concat', ['template', 'tsc', 'git-sha'], function () {
  return gulpConcat();
});

gulp.task('concat-live', ['template-live', 'tsc-live', 'git-sha'], function () {
  return gulpConcat();
});

gulp.task('clean', ['concat'], function () {
    del(['templates.js', 'compiled.js']);
});

gulp.task('watch-server', ['build-live', 'copy-kettle-js', 'copy-kettle-css'], function () {
    plugins.watch([config.srcPrefix + 'plugins/**/*.ts', config.srcPrefix + '/plugins/**/*.html'], function () {
        gulp.start('copy-kettle-js');
    });

    plugins.watch([config.srcPrefix + '/plugins/**/*.less'], function () {
      gulp.start('copy-kettle-css');
    });
});

gulp.task('copy-sources', function(done) {
  var src = [config.srcPrefix + 'plugins/**/*'];

  gulp.src(src)
    .pipe(gulp.dest('./plugins')).on('end', function(){
      done();
    });
});

gulp.task('copy-kettle-js', ['build-live','set-server-path'] , function() {
  gulp.src(['dist/hawkular-console.js'])
    .pipe(gulp.dest(config.serverPath));
});

gulp.task('copy-kettle-css', ['less-live','set-server-path'] , function() {
  gulp.src(['dist/hawkular-console.css'])
    .pipe(gulp.dest(config.serverPath));
});

gulp.task('build', ['bower', 'path-adjust', 'tslint', 'tsc', 'less', 'template', 'concat', 'clean']);
gulp.task('build-live', ['copy-sources', 'bower', 'path-adjust', 'tslint-watch', 'tsc-live', 'less-live', 'template-live', 'concat-live']);
