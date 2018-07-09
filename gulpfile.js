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
var replace = require('gulp-replace');
var rimraf = require('rimraf');
var uglify = require('gulp-uglify');
var vm = require('vm');
var watch = require('gulp-watch');

gulp.task('default', ['serve']);
gulp.task('build', ['js', 'css', 'spec']);


/**
* Create a Nodemon monitored server and serve the demo project
*/
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

	watch(['./index.js', './demo/**/*.js', './src/**/*.js', './src/**/*.html'], function() {
		console.log('Rebuild client-side JS files...');
		gulp.start('js');
	});

	watch(['./demo/**/*.css', './src/**/*.css'], function() {
		console.log('Rebuild client-side CSS files...');
		gulp.start('css');
	});
});


/**
* Compile all JS files (including minified varients)
*/
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


/**
* Compile all CSS (including minified varients)
*/
gulp.task('css', ()=>
	gulp.src('./src/**/*.css')
		.pipe(concat('macgyver.css'))
		.pipe(gulp.dest('./dist'))
		.pipe(rename('macgyver.min.css'))
		.pipe(cleanCSS())
		.pipe(gulp.dest('./dist'))
);


/**
* Extract the specification parts of all mg* components and create dist/widgets.json as a lookup object of data about each by key
* NOTE: Yes I know this is bloody awful in how it works, but it works
*/
gulp.task('spec', ()=> {
	var widgets = {};

	return gulp.src('./src/components/**/*.js')
		.pipe(plumber({
			errorHandler: function(err) {
				gutil.log(gutil.colors.red('ERROR DURING SPEC BUILD'));
				process.stdout.write(err.stack);
				this.emit('end');
			},
		}))
		// Slurp JS config for widgets, eval it into a JS object and dump it out as a translated JSON object {{{
		.pipe(replace(/\$macgyverProvider\.register\((.+?),\s*((.|[\n\r])+?)\t\}\)\)/gm, (all, id, spec) => {
			var sandbox = {widget: {}};
			vm.runInContext('widget = ' + spec + '};', vm.createContext(sandbox));
			// widgets[_.trim(id, "'")] = (new Function('return ' + spec))();

			widgets[_.trim(id, "'")] = _(sandbox.widget)
				.mapValues((v, k) => {
					if (_.isString(v) || _.isNumber(v) || _.isBoolean(v) || _.isObject(v)) {
						return v; // Simple scalar mapping - pass though
					} else if (k == 'toString' && _.isFunction(k)) {
						return true; // Mark that we can conver the value to a string but drop the actual function evaluation
					} else {
						throw new Error(`Unrecognised property type in MacGyver config for key "${k}" type "${typeof v}". All values should be scalars or a translation should be specified in gulpfile.js`);
					}
				})
				.value();
		}))
		// }}}
		.pipe(concat('widgets.json'))
		.pipe(replace(/^(.|[\n\r])+$/m, ()=> JSON.stringify(widgets)))
		.pipe(gulp.dest('./dist'))
});


/**
* Compile the gh-pages branch in GitHub
*/
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
		'./node_modules/@momsfriendlydevco/angular-bs-tooltip/dist/angular-bs-tooltip.min.js',
		'./node_modules/angular-gravatar/build/angular-gravatar.min.js',
		'./node_modules/angular-relative-date/dist/angular-relative-date.min.js',
		'./node_modules/angular-sanitize/angular-sanitize.js',
		'./node_modules/angular-sanitize/angular-sanitize.js',
		'./node_modules/@momsfriendlydevco/angular-ui-scribble/dist/angular-ui-scribble.css',
		'./node_modules/@momsfriendlydevco/angular-ui-scribble/dist/angular-ui-scribble.js',
		'./node_modules/bootstrap/dist/css/bootstrap.min.css',
		'./node_modules/bootstrap/dist/js/bootstrap.min.js',
		'./node_modules/dragular/dist/dragular.min.js',
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
