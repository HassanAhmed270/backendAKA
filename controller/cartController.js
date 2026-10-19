const Product = require("../models/productModel");
const Cart = require("../models/cartModel");

// Same limit as orders: max units of one product per order.
const MAX_QTY_PER_PRODUCT = 5;
const MAX_QTY_MESSAGE = `Maximum ${MAX_QTY_PER_PRODUCT} units per product per order`;
const MAX_MERGE_LINES = 50;
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

// 🔥 helper function to calculate total (stored prices)
const calculateTotal = (items) => {
    return items.reduce((acc, item) => {
        return acc + item.price * item.quantity;
    }, 0);
};

// Shape sent to the frontend for a POPULATED cart:
// - items whose product no longer exists are left out (they could never be
//   removed or ordered from the UI)
// - totalPrice is computed from the CURRENT product prices, i.e. the same
//   prices the server uses when the order is created
const toCartResponse = (cart) => {
    const plain = cart.toObject ? cart.toObject() : cart;

    plain.items = (plain.items || []).filter(
        (item) => item.productId && item.productId.productName !== undefined
    );

    plain.totalPrice = plain.items.reduce((acc, item) => {
        const price = Number(item.productId.productPrice ?? item.price);
        return acc + (Number.isFinite(price) ? price : 0) * item.quantity;
    }, 0);

    return plain;
};

const emptyCartResponse = () => ({ items: [], totalPrice: 0 });

// ✅ GET CART
const getCart = async (req, res) => {
    try {
        const userId = req.user._id;

        const cart = await Cart.findOne({ userId }).populate("items.productId");

        if (!cart) {
            return res.json({
                success: true,
                cart: emptyCartResponse()
            });
        }

        return res.status(200).json({
            success: true,
            cart: toCartResponse(cart)
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


        const cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(200).json({
                success: true,
                message: "Cart already empty",
                cart: emptyCartResponse()
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

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};



// ✅ ADD TO CART (optional body.quantity, default 1)
const addToCart = async (req, res) => {
    try {
        const userId = req.user._id;
        const { productId } = req.body;
        const quantity = req.body.quantity === undefined ? 1 : req.body.quantity;

        if (typeof productId !== "string" || !OBJECT_ID_REGEX.test(productId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product id"
            });
        }

        if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_PRODUCT) {
            return res.status(400).json({
                success: false,
                message: MAX_QTY_MESSAGE
            });
        }

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
                        quantity,
                        price: price
                    }
                ],
                totalPrice: price * quantity
            });
        } else {
            // 🔥 check if product already exists
            const itemIndex = cart.items.findIndex(
                (item) => item.productId.toString() === productId.toLowerCase()
            );

            if (itemIndex > -1) {
                if (cart.items[itemIndex].quantity + quantity > MAX_QTY_PER_PRODUCT) {
                    return res.status(400).json({
                        success: false,
                        message: MAX_QTY_MESSAGE
                    });
                }
                // ✅ increase quantity
                cart.items[itemIndex].quantity += quantity;
            } else {
                // ✅ add new item
                cart.items.push({
                    productId,
                    quantity,
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
            cart: toCartResponse(populatedCart)
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ✅ MERGE GUEST CART INTO THE LOGGED-IN USER'S CART
// body: { items: [{ productId, quantity }] }
// Prices always come from the database. Quantities are capped per product,
// lines for products that no longer exist are skipped.
const mergeCart = async (req, res) => {
    try {
        const userId = req.user._id;
        const { items } = req.body;

        if (!Array.isArray(items) || items.length > MAX_MERGE_LINES) {
            return res.status(400).json({
                success: false,
                message: "Invalid cart items"
            });
        }

        // sum valid incoming lines per product
        const incoming = new Map();
        for (const line of items) {
            const id = line && line.productId;
            const qty = line && line.quantity;
            if (typeof id !== "string" || !OBJECT_ID_REGEX.test(id)) continue;
            if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1) continue;
            const key = id.toLowerCase();
            incoming.set(key, (incoming.get(key) || 0) + qty);
        }

        let cart = await Cart.findOne({ userId });

        if (incoming.size > 0) {
            const products = await Product.find({ _id: { $in: [...incoming.keys()] } });

            if (!cart) {
                cart = new Cart({ userId, items: [], totalPrice: 0 });
            }

            for (const product of products) {
                const price = product.productPrice || product.price;
                if (!price) continue;

                const key = product._id.toString();
                const qty = incoming.get(key);
                const existing = cart.items.find(
                    (item) => item.productId.toString() === key
                );

                if (existing) {
                    existing.quantity = Math.max(
                        existing.quantity,
                        Math.min(MAX_QTY_PER_PRODUCT, existing.quantity + qty)
                    );
                } else {
                    cart.items.push({
                        productId: product._id,
                        quantity: Math.min(MAX_QTY_PER_PRODUCT, qty),
                        price
                    });
                }
            }

            cart.totalPrice = calculateTotal(cart.items);
            await cart.save();
        }

        if (!cart) {
            return res.status(200).json({
                success: true,
                cart: emptyCartResponse()
            });
        }

        const populatedCart = await Cart.findById(cart._id)
            .populate("items.productId");

        return res.status(200).json({
            success: true,
            message: "Cart merged",
            cart: toCartResponse(populatedCart)
        });

    } catch (error) {
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

        if (typeof productId !== "string") {
            return res.status(400).json({
                success: false,
                message: "Invalid product id"
            });
        }

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
            if (item.quantity >= MAX_QTY_PER_PRODUCT) {
                return res.status(400).json({
                    success: false,
                    message: MAX_QTY_MESSAGE
                });
            }
            item.quantity += 1;
        } else if (type === "decrease" && item.quantity > 1) {
            item.quantity -= 1;
        }

        // ✅ recalc total
        cart.totalPrice = calculateTotal(cart.items);

        await cart.save();

        cart = await Cart.findById(cart._id).populate("items.productId");

        return res.status(200).json({
            success: true,
            message: "Quantity updated",
            cart: toCartResponse(cart)
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

        // 🔥 if cart is empty, delete it (BEST PRACTICE)
        if (cart.items.length === 0) {
            await Cart.deleteOne({ _id: cart._id });

            return res.status(200).json({
                success: true,
                message: "Cart is now empty",
                cart: emptyCartResponse()
            });
        }

        // 🔥 recalculate the stored total (schema field is totalPrice)
        cart.totalPrice = calculateTotal(cart.items);

        await cart.save();

        // 🔥 return updated populated cart
        const updatedCart = await Cart.findById(cart._id)
            .populate("items.productId");

        return res.status(200).json({
            success: true,
            message: "Item removed successfully",
            cart: toCartResponse(updatedCart)
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getCart,
    addToCart,
    mergeCart,
    updateQuantity,
    removeFromCart,
    emptyCart
};