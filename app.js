
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
  var menu = [];
  navdoc.getSliceZone('nav.items').slices.forEach(function(item) {
    switch (item.sliceType) {
    case 'top-level':
      var label = item.value.getFirstTitle().text;
      var link = item.value.value[0].getLink('link');
      menu.push({
        label: label,
        url: configuration.linkResolver(link)
      });
      break;
    default:
      var subitems = item.value.toArray().map(function(item) {
        var label = item.getFirstTitle().text;
        var link = item.getLink('link');
        return {
          label: label,
          url: configuration.linkResolver(link)
        };
      });
      var last = menu.pop() || {};
      menu.push(Object.assign(last, {
        dropdown: true,
        subitems: subitems
      }));
    };
  });
  console.log("Got: " + JSON.stringify(menu));
  return menu;
}

function withMenu(req, res) {
  res.locals.path = req.path; // We need the path to set the "active" class
  res.locals.linkResolver = configuration.linkResolver;
  return api().then(function(api) {
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

app.route('/doc/:id').get(function(req, res) {
  withMenu(req, res).then(function(api) {
    return api.getByID(req.params.id);
  }).then(function(doc) {
    if (doc) {
      res.render('doc.jade', {doc: doc});
    } else {
      res.status(404).send('Not found');
    }
  });
});

app.route('/preview').get(prismic.preview);
