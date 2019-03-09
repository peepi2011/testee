const passport = require('passport');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const getUserData = function(username, callback) {
  let sql = "SELECT * FROM users WHERE username=?";
  global.connection.query(sql, [username], function(error, rows, fields) {
    if (error) throw error;
    if (rows.length > 0) {
      callback(rows[0]);	
    }else{
      callback(null);
    }		
  });	  
}

const checkCredentials = function(username, password, callback) {
  getUserData(username, function(data) {
    callback(data != null && data.password === password);   
  });
}

const addLoginGETRoute = function(app) {
  app.get('/login', function(req, res) {
    if (req.isAuthenticated()) {
      res.redirect('/');
    }else{
      res.render('login');
    }
  });
}

const addLoginPOSTRoute = function(app) { 
  app.post('/login', function(req, res) { 
    let username = req.body.username;
    let password = req.body.password;
    let target = (req.query.t ? req.query.t : '/');

    req.checkBody('username', 'Username should have between 5 and 10 chars').isLength({min: 5, max: 10});
    
    req.checkBody('password', 'Password should have between 8 and 15 chars').isLength({min: 8, max: 15});

    let validationErrors = req.validationErrors();   

    if (validationErrors) {
      res.render('login', {
        errors: validationErrors,
        username: username
      });
      return;
    }

    checkCredentials(username, password, function(valid) {
      if (valid === true) {
        req.login(username, function(err) {
				  res.redirect(target);
			  });		
      }else{
        res.render('login', {         
          errors: [{msg: 'Invalid credentials provided'}],
          username: username
        });
      }
    })
  });
}

const addLogoutRoute = function(app) {
  app.get('/logout', function(req, res) {
    if (req.isAuthenticated()) {
      req.logout();
      req.session.destroy();
    }
    res.redirect('/');
  });
}

const addSessions = function(app) {
  app.use(cookieParser());
  app.use(session({
	  secret: 'someRandomSecretKey',
	  resave: false,
	  saveUninitialized: false
  }));
  app.use(passport.initialize());
  app.use(passport.session());
}

const addUsersDataToViews = function(app) {
  app.use(function(request, response, next) {
	  response.locals.user = request.user;
	  response.locals.isAuthenticated = request.isAuthenticated();
	  next();
  });
}

const authenticationdMiddleware = function(type, onFailure) {
  return function (req, res, next) {
    let hasAccess = req.isAuthenticated() && (type ? type === req.user.type : true);

    if (hasAccess) {
      next();
    }else{
      onFailure(res);
    }    
}} 

const addSecureOptions = function() {  
  global.redirectIfNotLogged = function(type) {
    return function (req, res, next) {
      let hasAccess = req.isAuthenticated() && (type ? type === req.user.type : true);
      if (hasAccess) {
        next();
      }else{
        res.redirect(`/login?t=${req.originalUrl}`);
      }    
    }  
  }
  global.forbidIfNotLogged = function(type) {
    return function (req, res, next) {
      let errorMsg = `Access to ${req.originalUrl} was forbidden.`;
      let hasAccess = req.isAuthenticated() && (type ? type === req.user.type : true);
      if (hasAccess) {
        next();
      }else{
        res.status(403).json({error: {msg: errorMsg}, response: null}); 
      }    
    }  
  }
}

module.exports = {  
  applyTo: function(app) {

    addSecureOptions();
    addSessions(app);
    addLoginGETRoute(app);  
    addLoginPOSTRoute(app);
    addLogoutRoute(app);
    addUsersDataToViews(app);

    passport.serializeUser(function(username, callback) {
	    callback(null, username);
    });   

    passport.deserializeUser(function(username, callback) {  
      getUserData(username, function(data) {
        callback(null, data);
      });
    });  


  }  
}