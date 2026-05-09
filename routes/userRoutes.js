const express = require('express');
const router = express.Router();
const {register,verify, reVerify,login, logout, forgotPassword,verifyOTP,changePassword, getUserById,updateUser} = require('../controller/userController.js');
const {auth,isAdmin}=require('../middleware/isAuthenticated.js');
const { allUsers } = require('../controller/adminControl.js');
const { singleUpload } = require('../middleware/multer.js');
console.log("User routes loaded..."); // ✅ keep log here

router.post('/register', register); // ✅ correct handler
router.post('/login', login); // ✅ correct handler
router.post('/logout',auth, logout); // ✅ correct handler
router.post('/verify', verify); // ✅ correct handler
router.post('/reVerify', reVerify); // ✅ correct handler
router.post('/forgot-password',auth, forgotPassword); // ✅ correct handler
router.post('/verify-otp/:email', verifyOTP); // ✅ correct handler
router.post('/change-password/:email', changePassword); // ✅ correct handler
router.get('/get-user/:userId', getUserById); // ✅ correct handler
router.put('/update/:id', auth,singleUpload,updateUser); // ✅ correct handler

// Admin Case  Special
router.get('/all-users',auth,isAdmin, allUsers); // ✅ correct handler

module.exports = router;