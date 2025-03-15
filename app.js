const path = require('path');
const express = require('express');
const sessions = require('express-session');
const mongo_connect = require("connect-mongodb-session");
const dbs = require('./data/database');
const demoRoutes = require('./routes/demo');

const app = express();
const connect = mongo_connect(sessions);

const session_store = new connect({
  uri: "mongodb://localhost:27017",
  databaseName: "auth_demo",
  collection: "sessions"
});

// Configure sessions
app.use(sessions({
  secret: "super-secret",
  resave: false,
  saveUninitialized: false,
  store: session_store
}));

// Custom middleware for authentication
app.use(async function (req, res, next) {
  const userdata = req.session.user;
  if (!userdata) {
    return next();
  }
  let admin = await dbs.getDb().collection("user_auth_data").findOne({ id: userdata.id });
  res.locals.isAuthenticated = userdata;
  res.locals.userdata = userdata;
  
  next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

app.use(demoRoutes);

// Error handling middleware
app.use(function (error, req, res, next) {
  console.log(error.message);
  res.status(500).render('500');
});

// Start the server
dbs.connectToDatabase().then(function () {
  app.listen(5000);
});
