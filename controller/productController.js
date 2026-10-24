const getDataUri = require("../utils/dataUri");
const cloudinary = require("../utils/cloudinary");
const Product = require('../models/productModel.js');

const MAX_PRODUCT_PRICE = 10000;

const parseWholeNumber = (value) => {
    if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
        return 0;
    }

    const number = Number(value);
    return Number.isInteger(number) ? number : null;
};

const addNewProduct = async (req, res) => {
    try {
        const { productName, productDescription, productPrice, category, brand } = req.body;
        const userId = req.user._id;
        if (!productName || !productDescription || !category || !brand) {
            return res.status(400).json({
                success: false,
                message: "All Fields are Required"
            })
        }

        const quantity = parseWholeNumber(req.body.quantity);
        if (quantity === null || quantity < 0) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be a whole number of 0 or more"
            });
        }

        const parsedProductPrice = Number(productPrice);
        if (!Number.isFinite(parsedProductPrice) || parsedProductPrice < 1 || parsedProductPrice > MAX_PRODUCT_PRICE) {
            return res.status(400).json({
                success: false,
                message: "Price must be between 1 and 10000 PKR"
            });
        }

        if (!Array.isArray(req.files) || req.files.length < 1 || req.files.length > 5) {
            return res.status(400).json({
                success: false,
                message: "1 to 5 images are required"
            });
        }

        let productImg = [];
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

        const newProduct = await Product.create({
            userId,
            productName,
            productDescription,
            productPrice: parsedProductPrice,
            category,
            brand,
            productImg,
            stock: quantity
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
        const { productName, productDescription, productPrice, category, brand } = req.body;

        let keepIds;
        const hasExistingImages = Object.prototype.hasOwnProperty.call(req.body, "existingImages");
        if (hasExistingImages) {
            try {
                keepIds = JSON.parse(req.body.existingImages);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: "existingImages must be a valid JSON array"
                });
            }

            if (!Array.isArray(keepIds)) {
                return res.status(400).json({
                    success: false,
                    message: "existingImages must be a valid JSON array"
                });
            }
        }

        const quantityDelta = parseWholeNumber(req.body.quantity);
        if (quantityDelta === null) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be a whole number"
            });
        }

        let parsedProductPrice;
        if (Object.prototype.hasOwnProperty.call(req.body, "productPrice")) {
            parsedProductPrice = Number(productPrice);
            if (!Number.isFinite(parsedProductPrice) || parsedProductPrice < 1 || parsedProductPrice > MAX_PRODUCT_PRICE) {
                return res.status(400).json({
                    success: false,
                    message: "Price must be between 1 and 10000 PKR"
                });
            }
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "No Product"
            });
        }

        const currentImages = product.productImg || [];
        const keptImages = hasExistingImages
            ? currentImages.filter((img) => keepIds.includes(img.public_id))
            : currentImages;
        const removedImages = hasExistingImages
            ? currentImages.filter((img) => !keepIds.includes(img.public_id))
            : [];
        const newFiles = req.files || [];

        if (keptImages.length + newFiles.length < 1 || keptImages.length + newFiles.length > 5) {
            return res.status(400).json({
                success: false,
                message: "1 to 5 images are required"
            });
        }

        const currentStock = product.stock || 0;
        if (currentStock + quantityDelta < 0) {
            return res.status(400).json({
                success: false,
                message: "Stock cannot go below 0"
            });
        }

        const uploadedImages = [];
        for (const file of newFiles) {
            const fileUri = getDataUri(file);
            const result = await cloudinary.uploader.upload(fileUri, {
                folder: "ekart_products"
            });

            uploadedImages.push({
                url: result.secure_url,
                public_id: result.public_id
            });
        }

        // update fields
        product.productName = productName || product.productName;
        product.productDescription = productDescription || product.productDescription;
        if (parsedProductPrice !== undefined) {
            product.productPrice = parsedProductPrice;
        }
        product.category = category || product.category;
        product.brand = brand || product.brand;
        product.productImg = [...keptImages, ...uploadedImages];
        product.stock = currentStock + quantityDelta;

        await product.save();

        for (const img of removedImages) {
            try {
                await cloudinary.uploader.destroy(img.public_id);
            } catch (error) {
                console.error("Failed to delete removed product image from Cloudinary:", error);
            }
        }

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