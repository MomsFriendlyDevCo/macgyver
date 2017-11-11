var _ = require('lodash');
var babel = require('gulp-babel');
var cleanCSS = require('gulp-clean-css');
var concat = require('gulp-concat');
var ghPages = require('gulp-gh-pages');
var gulp = require('gulp');
var gutil = require('gulp-util');
var nodemon = require('gulp-nodemon');
var plumber = require('gulp-plumber');
var preprocess = require('gulp-preprocess');
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

	watch(['./index.js', './demo/**/*.js', './src/**/*.js'], function() {
		console.log('Rebuild client-side JS files...');
		gulp.start('js');
	});

	watch(['./demo/**/*.css', './src/**/*.css'], function() {
		console.log('Rebuild client-side CSS files...');
		gulp.start('css');
	});
});


gulp.task('js', ()=>
	gulp.src([
		'./src/macgyver.js',
		'./src/components/**/*.js',
	])
		.pipe(plumber({
			errorHandler: function(err) {
				gutil.log(gutil.colors.red('ERROR DURING JS BUILD'));
				process.stdout.write(err.stack);
				this.emit('end');
			},
		}))
		.pipe(concat('macgyver.js'))
		.pipe(preprocess({
			context: {
				angular: true,
			},
			includeBase: `${__dirname}/src`,
		}))
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

gulp.task('gh-pages', ['build'], function() {
	rimraf.sync('./gh-pages');

	return gulp.src([
		'./LICENSE',
		'./demo/_config.yml',
		'./demo/app.js',
		'./demo/app.css',
		'./demo/editor.html',
		'./demo/index.html',
		'./demo/style.css',
		'./dist/**/*',
		'./examples/**/*',
		'./node_modules/angular/angular.min.js',
		'./node_modules/angular-gravatar/build/angular-gravatar.min.js',
		'./node_modules/angular-relative-date/dist/angular-relative-date.min.js',
		'./node_modules/angular-sanitize/angular-sanitize.js',
		'./node_modules/angular-sanitize/angular-sanitize.js',
		'./node_modules/@momsfriendlydevco/angular-ui-scribble/dist/angular-ui-scribble.css',
		'./node_modules/@momsfriendlydevco/angular-ui-scribble/dist/angular-ui-scribble.js',
		'./node_modules/bootstrap/dist/css/bootstrap.min.css',
		'./node_modules/bootstrap/dist/js/bootstrap.min.js',
		'./node_modules/filesize/lib/filesize.js',
		'./node_modules/font-awesome/css/font-awesome.min.css',
		'./node_modules/font-awesome/fonts/fontawesome-webfont.ttf',
		'./node_modules/font-awesome/fonts/fontawesome-webfont.woff',
		'./node_modules/font-awesome/fonts/fontawesome-webfont.woff2',
		'./node_modules/jquery/dist/jquery.min.js',
		'./node_modules/lodash/lodash.min.js',
		'./node_modules/signature_pad/dist/signature_pad.min.js',
		'./node_modules/tree-tools/dist/ngTreeTools.js',
		'./node_modules/ui-select/dist/select.css',
		'./node_modules/ui-select/dist/select.js',
	], {base: __dirname})
		.pipe(rename(function(path) {
			if (path.dirname == 'demo') { // Move all demo files into root
				path.dirname = '.';
			}
			return path;
		}))
		.pipe(ghPages({
			cacheDir: 'gh-pages',
			push: true, // Change to false for dryrun (files dumped to cacheDir)
		}))
});
