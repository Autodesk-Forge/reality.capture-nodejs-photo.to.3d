/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

var express	= require('express');
var bodyParser	= require('body-parser');
var favicon	= require('serve-favicon');
var async	= require('async');
var unirest	= require('unirest');
var ejs		= require('ejs');

var app = express();
app.use(bodyParser.json ());
app.use(express.static (__dirname + '/www'));
app.use(favicon (__dirname + '/www/images/favicon.ico'));
app.set('view engine', 'ejs');

var client_id		= '<REPLACE_WITH_FORGE_CLIENT_ID>';
var client_secret	= '<REPLACE_WITH_FORGE_CLIENT_SECRET>';
var access_token	= '';
var redirect_uri	= 'http://localhost.autodesk.com/callback';

var scope			= ['data:read', 'data:write'];
var BASE_ENDPOINT	= 'https://developer.api.autodesk.com/photo-to-3d/v1';

var ClientOAuth2 = require('client-oauth2');

var recapAuth = new ClientOAuth2 ({
    clientId			: client_id,
    clientSecret		: client_secret,
    accessTokenUri		: 'https://developer.api.autodesk.com/authentication/v1/gettoken',
    authorizationUri	: 'https://developer.api.autodesk.com/authentication/v1/authorize',
    authorizationGrants	: [ 'code' ],
    redirectUri			: redirect_uri,
    scopes				: scope
});

app.get('/auth', function (req, res) {
    var uri = recapAuth.code.getUri ()
    console.log ('redirection: ' + uri);
    res.redirect(uri);
});

app.get('/callback', function (req, res) {
    recapAuth.code.getToken (req.url)
    	.then (function (token) {
	    console.log ('token: ');
	    console.log (token);
	    access_token = token.accessToken;
	    res.redirect ('/app');
	});
});

app.get ('/app', function (req, res) {
    var self = this;
    var endpoint = BASE_ENDPOINT + '/service/date';
    unirest.get (endpoint)
        .header ('Accept', 'application/json')
        .header ('Content-Type', 'application/json')
        .header ('Authorization', 'Bearer ' + access_token)
        .end (function (response) {
            try {
                if ( response.statusCode != 200 )
                    throw response;

                var json = JSON.parse (response.body.toString().trim());
		var obj = {
                    'dt': json.date
                };
                res.render ('explore', obj);

            } catch ( err ) {
		console.log(err);
		console.log (response.code + ' - ' + response.body);
                res.status (500).end ();
            }
	});
});

app.post ('/app/createscene', function (req, res) {
	     var self = this;
	     var sceneName = req.body.name;
	     var endpoint = BASE_ENDPOINT + '/photoscene';
	     unirest.post (endpoint)
		 .header ('Accept', 'application/json')
		 .header ('Authorization', 'Bearer ' + access_token)
		 .send ({
		     'scenename': sceneName,
		     'format': 'rcm'
		 })
		 .end (function (response) {
		     try {
			 if ( response.statusCode != 200 )
			     throw response;

			 var json = JSON.parse (response.body.toString().trim());
			 var obj = {
			     'id': json.Photoscene.photosceneid
			 };
			 res.json (obj);
		     } catch ( err ) {
			 console.log (response.code + ' - ' + response.body);
			 res.status (500).end ();
		     }
		 });
});

app.post ('/app/post', function (req, res) {
    var self = this;
    var sceneId = req.body.id;

    var urlArray = [
		'https://s3.amazonaws.com/adsk-recap-public/forge/lion/DSC_1158.JPG',
		'https://s3.amazonaws.com/adsk-recap-public/forge/lion/DSC_1159.JPG',
		'https://s3.amazonaws.com/adsk-recap-public/forge/lion/DSC_1160.JPG',
		'https://s3.amazonaws.com/adsk-recap-public/forge/lion/DSC_1162.JPG',
		'https://s3.amazonaws.com/adsk-recap-public/forge/lion/DSC_1163.JPG',
		'https://s3.amazonaws.com/adsk-recap-public/forge/lion/DSC_1164.JPG',
		'https://s3.amazonaws.com/adsk-recap-public/forge/lion/DSC_1165.JPG'
    ];

    console.log("Posting photos...")

    var endpoint = BASE_ENDPOINT + '/file';
    unirest.post (endpoint)
	.header ('Accept', 'application/json')
	.header ('Authorization', 'Bearer ' + access_token)
	.send ({
	    'photosceneid': sceneId,
	    'type': 'image',
	    'file[0]': urlArray [0],
	    'file[1]': urlArray [1],
	    'file[2]': urlArray [2],
	    'file[3]': urlArray [3],
	    'file[4]': urlArray [4],
	    'file[5]': urlArray [5],
	    'file[6]': urlArray [6]
	})
	.end (function (response) {
	    try {
		if ( response.statusCode != 200 )
		    throw response;

		var json = JSON.parse (response.body.toString().trim());
		var obj = {
		    'count': json.Files.file.length
		};
		res.json (obj);
	    } catch ( err ) {
		console.log (response.code + ' - ' + response.body);
		res.status (500).end ();
	    }
	});
});

app.post ('/app/launch', function (req, res) {
    var self = this;
    var sceneId = req.body.id;

    var endpoint = BASE_ENDPOINT + '/photoscene/' + sceneId;
    unirest.post (endpoint)
	.header ('Accept', 'application/json')
	.header ('Authorization', 'Bearer ' + access_token)
	.send ()
	.end (function (response) {
	    try {
		if ( response.statusCode != 200 )
		    throw response;

		var obj = {
		    'ok': 'launched'
		};
		res.json (obj);
	    } catch ( err ) {
		console.log (response.code + ' - ' + response.body);
		res.status (500).end ();
	    }
	});
});

app.post ('/app/results', function (req, res) {
    var self = this;
    var sceneId = req.body.id;

    var endpoint = BASE_ENDPOINT + '/photoscene/' + sceneId + '?format=rcm';
    unirest.get (endpoint)
	.header ('Accept', 'application/json')
	.header ('Authorization', 'Bearer ' + access_token)
	.send ()
	.end (function (response) {
	    try {
		if ( response.statusCode != 200 )
		    throw response;

		var json = JSON.parse (response.body.toString().trim());
		res.json (json);
	    } catch ( err ) {
		console.log (response.code + ' - ' + response.body);
		res.status(500).end();
	    }
	});
});

app.set ('port', process.env.PORT || 80);
var server = app.listen (app.get ('port'), function () {
    console.log ('Server listening on port ' + server.address ().port);
});
