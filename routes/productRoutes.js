const express = require('express');
const router = express.Router();
const {getAllProduct,addNewProduct,deleteProduct,updateProduct} =require('../controller/productController.js');
const {auth,isAdmin}=require('../middleware/isAuthenticated.js');
const { multipleUpload } = require('../middleware/multer.js');

router.post('/add',auth ,isAdmin, multipleUpload, addNewProduct ); // ✅ correct handler
router.post('/delete/:productId',auth,isAdmin,deleteProduct);
router.put('/update/:productId',auth,isAdmin,multipleUpload,updateProduct);
router.get('/get-all-products', getAllProduct); // ✅ correct handler

module.exports = router;