const express = require('express');
const connectDB = require('./database/db');
const userRoutes = require('./routes/userRoutes.js');
const productRoutes = require('./routes/productRoutes.js');
const cartRoutes = require('./routes/cartRoutes.js');
const orderRoutes=require('./routes/orderRoutes.js');
const cors = require('cors')
const jwt = require('jsonwebtoken');
const User = require('./models/userModel.js');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const FRONTEND_URL="https://aka-wmart.vercel.app"||process.env.FRONTEND_URL||process.env.PREVIEW_URL
const BACKEND_URL = "https://backendaka.onrender.com/"

app.use(cors({
  origin: FRONTEND_URL, credentials:true
}))

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDB();

// Email verification route
app.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Verify the token
    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    // Find the user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Email Verification Failed</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #dc3545; }
            p { color: #666; font-size: 16px; }
            .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .btn:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Verification Failed</h1>
            <p>User not found. Please try registering again.</p>
            <a href="${FRONTEND_URL}" class="btn">Go to Website</a>
          </div>
        </body>
        </html>
      `);
    }

    // Check if already verified
    if (user.isVerified) {
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Email Already Verified</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #28a745; }
            p { color: #666; font-size: 16px; }
            .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .btn:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Email Already Verified</h1>
            <p>Your email has already been verified. You can now log in to your account.</p>
            <a href="${FRONTEND_URL}" class="btn">Go to Login</a>
          </div>
        </body>
        </html>
      `);
    }

    // Verify the user
    user.isVerified = true;
    user.token = undefined; // Clear the verification token
    await user.save();

    // Return success HTML page
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Email Verified Successfully</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #28a745; }
          p { color: #666; font-size: 16px; }
          .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .btn:hover { background: #0056b3; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Email Verified Successfully!</h1>
          <p>Your email has been verified. You can now log in to your account.</p>
          <a href="${FRONTEND_URL}" class="btn">Go to Login</a>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Verification Failed</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #dc3545; }
          p { color: #666; font-size: 16px; }
          .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .btn:hover { background: #0056b3; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Verification Failed</h1>
          <p>The verification link is invalid or has expired. Please try registering again or request a new verification email.</p>
          <a href="${FRONTEND_URL}" class="btn">Go to Website</a>
        </div>
      </body>
      </html>
    `);
  }
});

// ROUTES
const jazzcashRoutes = require("./routes/jazzcashRoutes");
app.use("/api/jazzcash", jazzcashRoutes);

app.use('/api/v1/user', userRoutes);
app.use('/api/v1/product', productRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/orders', orderRoutes);
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
});