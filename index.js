const express = require('express');
const path = require('path');
const logger = require('morgan');
const hbs = require('hbs');
const bodyParser = require('body-parser');
const validator = require('express-validator');

const mysql = require('mysql');
const connectionDetails = require('./config/mysql-connection');
const passport = require('./config/passport');

const app = express();
const hostname = '127.0.0.1';
const port = 3000;

global.connection = mysql.createConnection({
    host: connectionDetails.host,
    port: connectionDetails.port,
    user: connectionDetails.user,
    password: connectionDetails.password,
    database: connectionDetails.database
});

global.connection.connect(function(err) {
  if (err) throw err;
  console.log('You are now connected to MySQL...');
});

app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(validator());
app.use(bodyParser.json(), bodyParser.urlencoded({ extended: true }));

passport.applyTo(app);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

hbs.registerPartials(path.join(__dirname, 'partials'));
hbs.registerHelper('isUserOfType', function(type, options) {
    if(options.data.root.user && 
    options.data.root.user.type === type) {
        return options.fn(this);
    }
    return options.inverse(this);
});

app.use('/api/v1/users', require('./routes/api/users'));

app.get('/', function(req, res) {
    res.render('index');
});

app.get('/users', global.redirectIfNotLogged(), function(req, res) {
    res.render('users');
});

app.listen(port, function(){
    console.log(`Server running at http://${hostname}:${port}/`);
});