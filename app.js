
/**
 * Module dependencies.
 */
var prismic = require('express-prismic');
var app = require('./config');
var configuration = require('./prismic-configuration');
var PORT = app.get('port');

function handleError(err, req, res) {
  if (err.status == 404) {
    res.status(404).send("404 not found");
  } else {
    console.log(err);
    res.status(500).send("Error 500: " + err.message);
  }
}

function api() {
  return prismic.api(configuration.apiEndpoint, configuration.accessToken);
}

// Parse the menu and resolve the links
function parseMenu(navdoc) {
  return navdoc.getSliceZone('nav.items').slices.map(function(item) {
    switch (item.sliceType) {
    case 'top-level':
      var label = item.value.getFirstTitle().text;
      var link = item.value.value[0].getLink('link');
      return {
        dropdown: false,
        label: label,
        url: configuration.linkResolver(link)
      };
    default:
      var subitems = item.value.toArray().map(function(item) {
        var label = item.getFirstTitle().text;
        var link = item.getLink('link');
        return {
          dropdown: false,
          label: label,
          url: configuration.linkResolver(link)
        };
      });
      return {
        dropdown: true,
        subitems: subitems
      };
    };
  });
}

function withMenu(req, res) {
  return api().then(function(api) {
    console.log('api', api);
    return api.getByUID('nav', 'main-menu').then(function(navdoc) {
      if (navdoc) {
        res.locals.menu = parseMenu(navdoc);
      } else {
        Promise.reject({
          status: 500,
          message: "Missing navigation document"
        });
      }
      return api;
     });
    return api;
  });
}

app.listen(PORT, function() {
  console.log('Express server listening on port ' + PORT);
});

app.route('/').get(function(req, res){
  withMenu(req, res).then(function(api) {
    res.render('index.jade');
  }).catch(function(err) {
    handleError(err, req, res);
  });
});

app.route('/preview').get(prismic.preview);
