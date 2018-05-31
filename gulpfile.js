var gulp = require('gulp'),
    sass = require('gulp-sass'),
    concat = require('gulp-concat'),
    cleanCSS = require('gulp-clean-css');
    exec = require('gulp-exec'),
    rename = require('gulp-rename'),
    autoprefixer = require('gulp-autoprefixer'),
    del = require('del');


gulp.task('pygments', function() {
    var options = {
        continueOnError: false,
        pipeStdout: false
    };
});

gulp.task('clean', function() {
    del([
        'themes/okta/static/dist/js/**/*.min.js'
    ]);
});

gulp.task('minify-sass', function() {
    gulp.src([
        './themes/okta/static/css/*.scss',
        './themes/okta/static/css/font-awesome/font-awesome.scss'])
        .pipe(sass().on('error', sass.logError))
        .pipe(concat('okta.css'))
        .pipe(gulp.dest('./themes/okta/static/dist/'));
});

gulp.task('copy-fonts', function() {
    gulp.src([
        './themes/okta/static/fonts/*'])
        .pipe(gulp.dest('./themes/okta/static/dist/fonts/'));
});

gulp.task('animate.css', function() {
    gulp.src([
        './themes/okta/static/css/animate.css'])
        .pipe(gulp.dest('./themes/okta/static/dist/'));
});

gulp.task('master.js', function() {
    gulp.src([
        './themes/okta/static/js/vendor/jquery-2.2.4.min.js',
        './themes/okta/static/js/vendor/jquery.ba-hashchange.min.js',
        './themes/okta/static/js/vendor/jquery.swiftype.autocomplete.js',
        './themes/okta/static/js/vendor/jquery.swiftype.search.js',
        './themes/okta/static/js/vendor/master.js'
    ])
        .pipe(concat('master.js'))
        .pipe(gulp.dest('./themes/okta/static/js/dist'));
});

gulp.task('myOkta.js', function() {
    gulp.src([
        './themes/okta/static/js/vendor/jquery-2.2.4.min.js',
        './themes/okta/static/js/myOkta.js'
    ])
        .pipe(concat('myOkta.js'))
        .pipe(gulp.dest('./themes/okta/static/js/dist'));
});

gulp.task('default', ['master.js', 'myOkta.js', 'minify-sass', 'copy-fonts']);
