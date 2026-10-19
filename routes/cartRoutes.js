const express = require('express');
const router = express.Router();
const {getCart,addToCart,mergeCart,emptyCart,removeFromCart,updateQuantity} =require('../controller/cartController.js');
const {auth,isAdmin}=require('../middleware/isAuthenticated.js');

router.post('/add',auth ,addToCart ); // ✅ correct handler
router.post('/merge',auth ,mergeCart ); // guest cart -> account cart after login
router.delete('/remove',auth,removeFromCart);
router.put('/update',auth,updateQuantity);
router.get('/', auth,getCart); // ✅ correct handler
router.put('/clear',auth ,emptyCart)

module.exports = router;