require('dotenv').config();
const morgan = require('morgan')
const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const cors = require('cors');

const app = express();


app.use(morgan('dev'))

// Middleware for handling CORS to allow communication between React and Express
app.use(cors({
  origin: 'http://localhost:5173', // Replace with your React app's URL
  credentials: true, // To allow credentials (cookies, headers)
}));

// Session middleware for managing sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret', // Replace with a strong secret
  resave: false,
  saveUninitialized: true,
}));

// Passport middleware for initializing Passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport to use Google OAuth 2.0
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:3000/auth/google/callback', // This must match Google Developer Console settings
}, (accessToken, refreshToken, profile, done) => {
  // This callback function will be called after successful Google login
  // Here you could store user information in your database if needed
  return done(null, profile);
}));

// Serialize user information to be stored in session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user information from session
passport.deserializeUser((user, done) => {
  done(null, user);
});

// Route for initiating Google login
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google callback route
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect(`http://localhost:5173/courses?user=${encodeURIComponent(JSON.stringify(req.user))}`);
  }
);

// Route to get the user's profile
app.get('/profile', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// Route for logging out
app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to log out' });
    }
    res.redirect('http://localhost:5173/');
  });
});

// Middleware to check if the user is Brian
const isBrian = (req, res, next) => {
  if (req.isAuthenticated() && req.user.emails[0].value === 'brianmccune@gmail.com') {
    next(); // Allow the request to proceed
  } else {
    res.status(403).json({ error: 'Access denied' }); // Deny access
  }
};

// Route to create a post, restricted to Brian
app.post('/posts', isBrian, (req, res) => {
  // Create the post in the database
  const newPost = {
    title: req.body.title,
    content: req.body.content,
    author: req.user.displayName, // Use Brian's name or ID
  };

  // Save the post (Assuming you have a database)
  // db.save(newPost);

  res.status(201).json({ message: 'Post created successfully', post: newPost });
});

// Route to delete a post, restricted to Brian
app.delete('/posts/:id', isBrian, (req, res) => {
  const postId = req.params.id;

  // Delete the post from the database (Assuming you have a database)
  // db.delete(postId);

  res.status(200).json({ message: 'Post deleted successfully' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
