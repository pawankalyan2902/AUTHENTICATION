const express = require('express');

const dbs = require('../data/database');

//authentication bycrpt
const bcrypt = require("bcrypt");
const session = require('express-session');

const router = express.Router();

router.get('/', function (req, res) {
  res.render('welcome');
});

router.get('/signup', function (req, res) {
  let inputdata=req.session.sign_up;
  if(!inputdata)
  {
    inputdata={
      email:"" ,
      confirm_email:"",
      password:"",
      hasError:"" 
    }
  }
  req.session.sign_up=null;
  res.render('signup',{inputdata:inputdata});
});

router.get('/login', function (req, res) {
  let data=req.session.login_error;
  if(!data)
  {
    data={
    email:"",
    password:"",
    hasError:""
  }
  }
  req.session.login_error=null;
  res.render('login',{data:data});
});


router.post('/signup', async function (req, res) {
  const password_hashed = await bcrypt.hash(req.body.password, 12);//the data is hashed by a string of 12 character 
  const data = {
    email: req.body.email,
    confirm_email: req.body["confirm-email"],
    password: password_hashed
  };
  const result = await dbs.getDb().collection("user_auth_data").findOne({ email: data.email });
  console.log(result)
  if (result ||data.email==data || data.password.trim() < 6) {
    console.log("There is already an email registered with this id");
    //we store dta in session
    req.session.sign_up={
      email: req.body.email,
      confirm_email: req.body["confirm-email"],
      hasError:true
    };
    req.session.save(function()
    {
      res.redirect("/signup")
    })
    return ;
  }
  await dbs.getDb().collection("user_auth_data").insertOne(data);
  res.redirect("/login")
});

//login post data
router.post('/login', async function (req, res) {
  data = req.body;
  req.session.login_error={email:data.email,password:data.password,hasError:true};
  const result =await dbs.getDb().collection("user_auth_data").findOne({ email: data.email });
  //If the email given is not exsisting in database,then the above result ="0"
  if (!result) {
    console.log("The email is invalid");
    return res.redirect("/login");

  }
  //check with password
  let password;
  console.log(data.password + " and " + result.password)
  try {
    password = await bcrypt.compare(data.password, result.password);
  } catch (error) {
    console.log(error)
  }

  if (!password) {
    console.log("password is incorrect");
    return res.redirect("/login");
  }
  req.session.user={email:result.email,id:result._id};//storing the data takes some time hence the save property tells the js to execute after it is saved
  req.session.isAuthenticated=true;
  req.session.save(function()
    {
      res.redirect("/admin");
    }
  );
  

});

router.get('/admin', function (req, res) {
  if(!req.session.isAuthenticated)
  {
   return res.render("401")
  }
  res.render('admin');
});

router.get('/profile', async function (req, res) {
  if(!req.session.isAuthenticated)
  {
   return res.render("401")
  }
  const id=req.session.user.id;
  console.log(id)
  const authorised= await dbs.getDb().collection("user_auth_data").findOne({_id:id});
  console.log(authorised)
  if(!authorised.isAdmin)
  {
    return res.status(403).render("403");
  }
  res.render('profile');
});

router.post('/logout', function (req, res) {
  req.session=null;
  console.log(req.session)
  res.redirect("/");
 });

module.exports = router;
