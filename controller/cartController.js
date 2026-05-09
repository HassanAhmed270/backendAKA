const Product = require("../models/productModel");
const Cart = require("../models/cartModel");

// 🔥 helper function to calculate total
const calculateTotal = (items) => {
    return items.reduce((acc, item) => {
        return acc + item.price * item.quantity;
    }, 0);
};
// ✅ GET CART
const getCart = async (req, res) => {
    try {
        console.log(req.user._id);
        const userId = req.user._id;

        const cart = await Cart.findOne({ userId }).populate("items.productId");

        if (!cart) {
            return res.json({
                success: true,
                cart: { items: [], totalPrice: 0 }
            });
        }

        return res.status(200).json({
            success: true,
            cart
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
// ✅ EMPTY CART
const emptyCart = async (req, res) => {
    try {
        const userId = req.user._id;

        console.log("🧹 EMPTY CART USER:", userId);

        const cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(200).json({
                success: true,
                message: "Cart already empty",
                cart: { items: [], totalPrice: 0 }
            });
        }

        // 🔥 Option 1 (BEST): just clear items
        cart.items = [];
        cart.totalPrice = 0;

        await cart.save();

        return res.status(200).json({
            success: true,
            message: "Cart emptied successfully",
            cart
        });

        /*
        // 🔥 Option 2 (Alternative): delete whole cart
        await Cart.deleteOne({ userId });

        return res.status(200).json({
            success: true,
            message: "Cart deleted successfully",
            cart: null
        });
        */

    } catch (error) {
        console.log("❌ EMPTY CART ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};



// ✅ ADD TO CART
const addToCart = async (req, res) => {
    try {
        const userId = req.user._id;
        const { productId } = req.body;

        console.log("USER ID:", userId);
        console.log("PRODUCT ID:", productId);

        // 🔥 get product
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        // ⚠️ IMPORTANT: make sure correct field name
        const price = product.productPrice || product.price;

        if (!price) {
            return res.status(400).json({
                success: false,
                message: "Product price is missing"
            });
        }

        // 🔥 find cart
        let cart = await Cart.findOne({ userId });

        // 🆕 if no cart, create new
        if (!cart) {
            cart = new Cart({
                userId,
                items: [
                    {
                        productId,
                        quantity: 1,
                        price: price
                    }
                ],
                totalPrice: price
            });
        } else {
            // 🔥 check if product already exists
            const itemIndex = cart.items.findIndex(
                (item) => item.productId.toString() === productId
            );

            if (itemIndex > -1) {
                // ✅ increase quantity
                cart.items[itemIndex].quantity += 1;
            } else {
                // ✅ add new item
                cart.items.push({
                    productId,
                    quantity: 1,
                    price: price
                });
            }

            // 🔥 ALWAYS recalculate total
            cart.totalPrice = calculateTotal(cart.items);
        }

        await cart.save();

        // 🔥 return populated cart
        const populatedCart = await Cart.findById(cart._id)
            .populate("items.productId");

        return res.status(200).json({
            success: true,
            message: "Product added to cart successfully",
            cart: populatedCart
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ✅ UPDATE QUANTITY
const updateQuantity = async (req, res) => {
    try {
        const userId = req.user._id;
        const { productId, type } = req.body;

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found"
            });
        }

        const item = cart.items.find(
            (item) => item.productId.toString() === productId
        );

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Item not in cart"
            });
        }

        if (type === "increase") {
            item.quantity += 1;
        } else if (type === "decrease" && item.quantity > 1) {
            item.quantity -= 1;
        }

        // ✅ recalc total
        cart.totalPrice = cart.items.reduce(
            (acc, item) => acc + item.price * item.quantity,
            0
        );

        await cart.save();

        cart = await Cart.findById(cart._id).populate("items.productId");

        return res.status(200).json({
            success: true,
            message: "Quantity updated",
            cart
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
const removeFromCart = async (req, res) => {
    try {
        const userId = req.user._id;
        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "productId is required"
            });
        }

        console.log("USER ID:", userId);
        console.log("PRODUCT ID:", productId);

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found"
            });
        }

        // 🔥 remove item
        cart.items = cart.items.filter(
            (item) => item.productId.toString() !== productId
        );

        // 🔥 recalculate totalAmount ONLY
        cart.totalAmount = cart.items.reduce(
            (acc, item) => acc + item.price * item.quantity,
            0
        );

        // 🔥 if cart is empty, optionally delete it (BEST PRACTICE)
        if (cart.items.length === 0) {
            await Cart.deleteOne({ _id: cart._id });

            return res.status(200).json({
                success: true,
                message: "Cart is now empty",
                cart: null
            });
        }

        await cart.save();

        // 🔥 return updated populated cart
        const updatedCart = await Cart.findById(cart._id)
            .populate("items.productId");

        return res.status(200).json({
            success: true,
            message: "Item removed successfully",
            cart: updatedCart
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    emptyCart
};