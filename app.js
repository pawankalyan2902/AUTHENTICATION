const path = require('path');

const express = require('express');

const dbs = require('./data/database');
const demoRoutes = require('./routes/demo');

const app = express();

//we require sessions apckage to handle sessions
const sessions = require('express-session');

//mongodb to store sessions
const mongo_connect = require("connect-mongodb-session");
const connect = mongo_connect(sessions);

const session_store = new connect({
  uri: "mongodb://localhost:27017",
  databaseName: "auth_demo",
  collection: "sessions"
})

//IT CREATES A SESSION AND STORES IT IN DATABASE IF AND ONLY IF IT SATISFIES THE CONDITIONS BELOW
app.use(sessions(
  {
    secret: "super-secret",
    resave: false,
    saveUninitialized: false,
    store: session_store//CONNECT-MONGO is package which is used to configure the storing of these sessions created
  }
));

//custom middleware
app.use(async function(req,res,next)
{
  const userdata=req.session.user;
  if(!userdata)
  {
   return next();
  }
  let admin=await dbs.getDb().collection("user_auth_data").find({id:userdata.id})
   const Authenticated=userdata.isAuthenticated;
  //The locals property in res object helps the variable to act as  global variable
  res.locals.isAuthenticated=Authenticated;
  res.locals.userdata=userdata;
  res.locals.admin=admin
})

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

app.use(demoRoutes);

app.use(function (error, req, res, next) {
  console.log(error.message)
  res.status(500).render('500');
})

dbs.connectToDatabase().then(function () {
  app.listen(3000);
});
