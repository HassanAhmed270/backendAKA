const express = require('express');
const router = express.Router();
const {getAllProduct,addNewProduct,deleteProduct,updateProduct} =require('../controller/productController.js');
const {auth,isAdmin,isAdminOrWorker}=require('../middleware/isAuthenticated.js');
const { multipleUpload } = require('../middleware/multer.js');

const uploadProductImages = (req, res, next) => {
    multipleUpload(req, res, (error) => {
        if (error) {
            const message = error.code === 'LIMIT_FILE_SIZE'
                ? "Each image must be 5 MB or less"
                : error.message === 'Only image files are allowed'
                    ? "Only image files are allowed"
                    : "Maximum 5 images allowed";
            return res.status(400).json({
                success: false,
                message
            });
        }

        next();
    });
};

router.post('/add',auth ,isAdminOrWorker, uploadProductImages, addNewProduct ); // ✅ correct handler
router.post('/delete/:productId',auth,isAdminOrWorker,deleteProduct);
router.put('/update/:productId',auth,isAdminOrWorker,uploadProductImages,updateProduct);
router.get('/get-all-products', getAllProduct); // ✅ correct handler

module.exports = router;