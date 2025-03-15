const express = require('express');
const bcrypt = require("bcrypt");
const { ObjectId } = require('mongodb');
const dbs = require('../data/database');

const router = express.Router();

// Welcome Page
router.get('/', (req, res) => res.render("welcome"));

// Signup Page
router.get('/signup', (req, res) => {
  let inputdata = req.session.sign_up || { email: "", confirm_email: "", password: "", hasError: "" };
  req.session.sign_up = null;
  res.render('signup', { inputdata });
});

// Login Page
router.get('/login', (req, res) => {
  let data = req.session.login_error || { email: "", password: "", hasError: "" };
  req.session.login_error = null;
  res.render('login', { data });
});

// Handle Signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    const confirm_email = req.body["confirm-email"];
    
    const existingUser = await dbs.getDb().collection("user_auth_data").findOne({ email });

    if (existingUser || password.trim().length < 6) {
      req.session.sign_up = { email, confirm_email, hasError: true };
      return req.session.save(() => res.redirect("/signup"));
    }

    const password_hashed = await bcrypt.hash(password, 12);
    await dbs.getDb().collection("user_auth_data").insertOne({ email, confirm_email, password: password_hashed });

    res.redirect("/login");
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Handle Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    req.session.login_error = { email, password, hasError: true };

    const user = await dbs.getDb().collection("user_auth_data").findOne({ email });

    if (!user) {
      req.session.login_error.message = "Invalid email.";
      return req.session.save(() => res.redirect("/login"));
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      req.session.login_error.message = "Incorrect password.";
      return req.session.save(() => res.redirect("/login"));
    }

    req.session.user = true;
    req.session.isAuthenticated = true;

    req.session.save((err) => {
      if (err) {
        return res.status(500).send("Session error, please try again.");
      }
      res.redirect("/admin");
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Admin Page
router.get('/admin', (req, res) => {
  if (!req.session.isAuthenticated) {
    return res.render("401");
  }
  res.render('admin');
});

// Profile Page (Admin Only)
router.get('/profile', async (req, res) => {
  if (!req.session.isAuthenticated) {
    return res.render("401");
  }

  const id = new ObjectId(req.session.user.id);
  const user = await dbs.getDb().collection("user_auth_data").findOne({ _id: id });

  if (!user || !user.isAdmin) {
    return res.status(403).render("403");
  }

  res.render('profile');
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Error logging out.");
    }
    res.redirect("/");
  });
});

module.exports = router;
