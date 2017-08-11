var _ = require('lodash');
var babel = require('gulp-babel');
var cleanCSS = require('gulp-clean-css');
var concat = require('gulp-concat');
var ghPages = require('gulp-gh-pages');
var gulp = require('gulp');
var nodemon = require('gulp-nodemon');
var rename = require('gulp-rename');
var rimraf = require('rimraf');
var uglify = require('gulp-uglify');
var watch = require('gulp-watch');

gulp.task('default', ['serve']);
gulp.task('build', ['js', 'css']);


gulp.task('serve', ['build'], function() {
	var monitor = nodemon({
		script: './demo/server.js',
		ext: 'js css',
		ignore: ['**/*.js', '**/.css'], // Ignore everything else as its watched seperately
	})
		.on('start', function() {
			console.log('Server started');
		})
		.on('restart', function() {
			console.log('Server restarted');
		});

	watch(['./index.js', 'demo/**/*.js', 'src/**/*.js'], function() {
		console.log('Rebuild client-side JS files...');
		gulp.start('js');
	});

	watch(['demo/**/*.css', 'src/**/*.css'], function() {
		console.log('Rebuild client-side CSS files...');
		gulp.start('css');
	});
});


gulp.task('js', ()=>
	gulp.src([
		'./src/macgyver.js',
		'./src/components/*.js',
	])
		.pipe(concat('macgyver.js'))
		.pipe(babel({
			presets: ['es2015'],
			plugins: ['angularjs-annotate'],
		}))
		.pipe(gulp.dest('./dist'))
		.pipe(rename('macgyver.min.js'))
		.pipe(uglify({mangle: false}))
		.pipe(gulp.dest('./dist'))
);

gulp.task('css', ()=>
	gulp.src('./src/**/*.css')
		.pipe(concat('macgyver.css'))
		.pipe(gulp.dest('./dist'))
		.pipe(rename('macgyver.min.css'))
		.pipe(cleanCSS())
		.pipe(gulp.dest('./dist'))
);
