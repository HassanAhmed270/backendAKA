const express = require('express');
const router = express.Router();
const {register, reVerify,login, logout, forgotPassword,verifyOTP,changePassword, getUserById,convertToWorker, removeWorkerRole, updateUser} = require('../controller/userController.js');
const {auth,isAdmin}=require('../middleware/isAuthenticated.js');
const { allUsers } = require('../controller/adminControl.js');
const { singleUpload } = require('../middleware/multer.js');
console.log("User routes loaded...");

router.post('/register', register);
router.post('/login', login);
router.post('/logout',auth, logout);
router.post('/reVerify', reVerify);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp/:email', verifyOTP);          // now returns a one-time resetToken
router.post('/change-password/:email', changePassword); // now REQUIRES that resetToken
router.put('/update/:id', auth,singleUpload,updateUser);

// B1 (AB-004): was public. Only used by the admin UserInfo page, so admin-only.
router.get('/get-user/:userId', auth, isAdmin, getUserById);

// Admin Case  Special
router.get('/all-users',auth,isAdmin, allUsers);

router.put('/convert-to-worker/:userId', auth, isAdmin, convertToWorker);
router.put('/remove-worker-role/:userId', auth, isAdmin, removeWorkerRole);

module.exports = router;