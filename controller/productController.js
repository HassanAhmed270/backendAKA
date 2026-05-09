const getDataUri = require("../utils/dataUri");
const cloudinary = require("../utils/cloudinary");
const Product = require('../models/productModel.js');
const addNewProduct = async (req, res) => {
    try {
        const { productName, productDescription, productPrice, category, brand } = req.body;
        const userId = req.id;
        if (!productName || !productDescription || !productPrice || !category || !brand) {
            return res.status(400).json({
                success: false,
                message: "All Fields are Required"
            })
        }
        let productImg = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const fileUri = getDataUri(file);
                const result = await cloudinary.uploader.upload(fileUri, {
                    folder: "ekart_products"
                });

                productImg.push({
                    url: result.secure_url,
                    public_id: result.public_id
                })
            }
        }

        const newProduct = await Product.create({
            userId,
            productName,
            productDescription,
            productPrice,
            category,
            brand,
            productImg,
        })
        return res.status(200).json({
            success: true,
            message: "Product Added Successfully",
            product: newProduct
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}
const deleteProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        console.log(productId);
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "No Product"
            });
        }
        //Delete images from Cloudinary
        if (product.productImg && product.productImg.length > 0) {
            for (let img of product.productImg) {
                const result = await cloudinary.uploader.destroy(img.public_id);
            }
        }
        //From Mongo db
        await Product.findByIdAndDelete(productId);

        return res.status(200).json({
            success: true,
            message: "Deletion Successful"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
const getAllProduct = async (req, res) => {
    try {
        const products = await Product.find();

        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No Products Available",
                products: []
            });
        }

        return res.status(200).json({
            success: true,
            products
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
const updateProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const { productName, productDescription, productPrice, category, brand, existingImages } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "No Product"
            });
        }

        let updatedImages = [];

        if (existingImages) {
            const keepIds = JSON.parse(existingImages);

            // keep selected images
            updatedImages = product.productImg.filter((img) =>
                keepIds.includes(img.public_id)
            );

            // remove unselected images
            const removedImages = product.productImg.filter((img) =>
                !keepIds.includes(img.public_id)
            );

            for (const img of removedImages) {
                await cloudinary.uploader.destroy(img.public_id);
            }

        } else {
            updatedImages = product.productImg;
        }

        // upload new images
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const fileUri = getDataUri(file);
                const result = await cloudinary.uploader.upload(fileUri, {
                    folder: "ekart_products"
                });

                updatedImages.push({
                    url: result.secure_url,
                    public_id: result.public_id
                });
            }
        }

        // update fields
        product.productName = productName || product.productName;
        product.productDescription = productDescription || product.productDescription;
        product.productPrice = productPrice || product.productPrice;
        product.category = category || product.category;
        product.brand = brand || product.brand;
        product.productImg = updatedImages;

        await product.save();

        return res.status(200).json({
            success: true,
            message: "Product Updated Successfully",
            product
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
module.exports = { getAllProduct, addNewProduct, deleteProduct, updateProduct };