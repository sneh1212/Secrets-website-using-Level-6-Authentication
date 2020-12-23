//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth2").Strategy;
const findOrCreate = require("mongoose-findorcreate");





const app = express();
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(session({

  secret: "my secrets",
  resave: false,
  saveUninitialized: true

}));

app.use(passport.initialize());
app.use(passport.session());
mongoose.set('useCreateIndex', true);
mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId:String,
  secret:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("user", userSchema);



passport.use(User.createStrategy());




passport.use(new GoogleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:"http://localhost:3000/auth/google/secrets",
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});




app.get("/", function(req, res) {

  res.render("home");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/logout",function(req,res){

req.logout();
res.redirect("/");

});

app.get("/auth/google",passport.authenticate('google', { scope:
      [ 'email', 'profile' ] }
));

app.get("/auth/google/secrets", passport.authenticate( 'google', {failureRedirect: "/login"}),

function(req,res)
{
  res.redirect("/secret");
}
);

app.get("/secret",function(req,res){

User.find({"secret":{$ne:null}},function(err,foundUser){

  if(!err)
  {
    res.render("secrets",{userWithSecrets:foundUser});
  }

});

});
app.post("/register", function(req, res) {

  User.register({
    username: req.body.username,active:true
  }, req.body.password, function(err, user) {
    if (err)
    {
      res.redirect("/register");
    }
    else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secret");
      });
    }

  });


});

app.get("/login", function(req, res) {

  res.render("login");

});

app.get("/submit",function(req,res){

if(req.isAuthenticated())
{
  res.render("submit");
}
else
{
   res.render("login");
}
});

app.post("/submit",function(req,res){
  console.log(req.user);

User.findById(req.user.id,function(err,foundUser){

if(!err)
{
  foundUser.secret=req.body.secret;
  foundUser.save();
  res.redirect("/secret");
}

});
});

app.post("/login", function(req, res) {

const user = new User({
  username:req.body.username,
  password:req.body.password
});

req.login(user,function(err){

if(err)
{
  res.redirect("/login");
}
else
{
  passport.authenticate("local")(req,res,function(){
    res.redirect("/secret");
  });
}

});


});









app.listen(3000, function() {
  console.log("Server running on 3000 port");
});
