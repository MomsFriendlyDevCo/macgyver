#!/usr/bin/env node
/**
* Extremely simple static website serving script
* This is provided in case you need to deploy a quick demo
*
* Install + run:
*
* 		# from parent directory
*
*		cd demo
*		npm install
*		node server
*
*/

var express = require('express');
var fs = require('fs');

var root = __dirname + '/..';
var app = express();
app.use('/node_modules', express.static(root + '/node_modules'));
app.use('/examples', express.static(root + '/examples'));

app.get('/', function(req, res) {
	res.sendFile('index.html', {root: __dirname});
});

app.get('/index.html', function(req, res) {
	res.sendFile('index.html', {root: __dirname});
});

app.get('/editor.html', function(req, res) {
	res.sendFile('editor.html', {root: __dirname});
});

app.get('/app.js', function(req, res) {
	res.sendFile('app.js', {root: root + '/demo'});
});

app.get('/app.css', function(req, res) {
	res.sendFile('app.css', {root: root + '/demo'});
});

app.get('/dist/macgyver.js', function(req, res) {
	res.sendFile('macgyver.js', {root: root + '/dist'});
});

app.get('/dist/macgyver.css', function(req, res) {
	res.sendFile('macgyver.css', {root: root + '/dist'});
});

app.use(function(err, req, res, next){
	console.error(err.stack);
	res.send(500, 'Something broke!').end();
});

var port = process.env.PORT || process.env.VMC_APP_PORT || 8080;
var server = app.listen(port, function() {
	console.log('HTTP interface listening on port', port);
});

var fs = require('fs');
var https = require('https');
var portS = process.env.PORTS || 8081;
var serverS = https.createServer({
		cert: fs.readFileSync(`${__dirname}/cert/cert.pem`, 'utf-8'),
		key: fs.readFileSync(`${__dirname}/cert/private.pem`, 'utf-8'),
	}, app)
	.listen(portS, function() {
		console.log('HTTPS interface listening on port', portS);
	});
