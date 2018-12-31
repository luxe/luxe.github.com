var gulp = require('gulp');
var gulputil = require('gulp-util');
var sass = require('gulp-sass')
var prefix = require('gulp-autoprefixer');
var haml = require('gulp-haml');

gulp.task('css', function () {
    gulp.src('./*.scss')
    	.pipe(sass())
        .pipe(gulp.dest('./'))
});

gulp.task('html', function () {
    gulp.src('./*.haml')
    	.pipe(haml())
        .pipe(gulp.dest('./'))
});
