const express = require('express');
const router = express.Router();
const {getAllProduct,addNewProduct,deleteProduct,updateProduct} =require('../controller/productController.js');
const {auth,isAdmin,isAdminOrWorker}=require('../middleware/isAuthenticated.js');
const { multipleUpload } = require('../middleware/multer.js');

router.post('/add',auth ,isAdminOrWorker, multipleUpload, addNewProduct ); // ✅ correct handler
router.post('/delete/:productId',auth,isAdminOrWorker,deleteProduct);
router.put('/update/:productId',auth,isAdminOrWorker,multipleUpload,updateProduct);
router.get('/get-all-products', getAllProduct); // ✅ correct handler

module.exports = router;