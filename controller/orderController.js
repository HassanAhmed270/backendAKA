const crypto = require("crypto");
const Order = require("../models/orderModel");
const Cart = require("../models/cartModel");
const User = require("../models/userModel");
const Product = require("../models/productModel");

// ================= ORDER POLICY (single source of truth) =================
// Max units of one product in one order.
const MAX_QTY_PER_PRODUCT = 5;
// Technical safety limit on distinct product lines in one request.
const MAX_ORDER_LINES = 50;
// Shipping is negotiated with the buyer over WhatsApp before the order is
// confirmed, so NO shipping fee is calculated or added automatically.
const SHIPPING_POLICY = {
  autoCharge: 0, // PKR
};
// Only these customer-detail fields are stored, as trimmed strings.
const DETAIL_FIELDS = ["fullName", "phone", "email", "address", "city", "state", "zip", "country"];
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const sanitizeDetails = (details) => {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return {};
  }
  const clean = {};
  for (const key of DETAIL_FIELDS) {
    const value = details[key];
    if (typeof value === "string") {
      clean[key] = value.trim().slice(0, 200);
    }
  }
  return clean;
};

// Returns { qtyById } or { error }
const parseOrderLines = (products) => {
  if (!Array.isArray(products) || products.length === 0) {
    return { error: "Order must contain at least one product" };
  }
  if (products.length > MAX_ORDER_LINES) {
    return { error: "Too many products in one order" };
  }

  const qtyById = new Map();

  for (const line of products) {
    const id = line && line.productId;
    const qty = line && line.quantity;

    if (typeof id !== "string" || !OBJECT_ID_REGEX.test(id)) {
      return { error: "Invalid product id" };
    }
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_PRODUCT) {
      return { error: `Quantity must be a whole number between 1 and ${MAX_QTY_PER_PRODUCT}` };
    }

    const key = id.toLowerCase();
    qtyById.set(key, (qtyById.get(key) || 0) + qty);
  }

  for (const total of qtyById.values()) {
    if (total > MAX_QTY_PER_PRODUCT) {
      return { error: `Maximum ${MAX_QTY_PER_PRODUCT} units per product per order` };
    }
  }

  return { qtyById };
};

// 🟢 CREATE ORDER
// Prices and totals are computed here from the database. Any amount,
// shipping, currency or paymentMethod sent by the client is ignored.
const createOrder = async (req, res) => {
  try {
    const { products, Details } = req.body;

    const parsed = parseOrderLines(products);
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    const ids = [...parsed.qtyById.keys()];
    const dbProducts = await Product.find({ _id: { $in: ids } }).select("productPrice");

    if (dbProducts.length !== ids.length) {
      return res.status(400).json({
        success: false,
        message: "One or more products are no longer available",
      });
    }

    let subtotal = 0;
    const orderProducts = [];

    for (const product of dbProducts) {
      const price = Number(product.productPrice);
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({
          success: false,
          message: "One or more products have an invalid price",
        });
      }
      const quantity = parsed.qtyById.get(product._id.toString());
      subtotal += price * quantity;
      orderProducts.push({ productId: product._id, quantity });
    }

    const amount = subtotal;
    const shipping = SHIPPING_POLICY.autoCharge;
    const currency = "PKR";
    const details = sanitizeDetails(Details);

    // Random, unguessable order reference
    const paymentOrderId = "ORD_" + crypto.randomBytes(12).toString("hex");

    const paymentOrder = {
      id: paymentOrderId,
      amount: Math.round(amount * 100),
      currency,
      status: "created",
    };

    const newOrder = new Order({
      user: req.user ? req.user._id : null,
      guestDetails: req.user ? null : details,
      products: orderProducts,
      amount,
      shipping,
      currency,
      status: "Pending",
      paymentMethod: "COD",
      paymentOrderId,
      Details: details,
    });

    await newOrder.save();

    res.json({
      success: true,
      message: "Order created",
      order: paymentOrder,
      dbOrder: newOrder,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to place order. Please try again.",
    });
  }
};


// 🟢 VERIFY PAYMENT (route is admin-only)
const verifyPayment = async (req, res) => {
  try {

    const {
      paymentOrderId,
      paymentTransactionId,
      paymentSignature,
      paymentFailed,
      paymentMethod // 👈 ADD THIS (COD / ONLINE)
    } = req.body;

    const userId = req.user?._id;


    // ❌ missing order id
    if (!paymentOrderId) {
      return res.status(400).json({
        success: false,
        message: "paymentOrderId is required",
      });
    }

    // 🟠 COD FLOW (NO PAYMENT REQUIRED)
    if (paymentMethod === "COD") {
      const order = await Order.findOneAndUpdate(
        { paymentOrderId },
        {
          status: "Pending",
        },
        { new: true }
      );


      if (userId) {
        await Cart.findOneAndUpdate(
          { userId },
          { $set: { items: [], totalPrice: 0 } }
        );
      }

      return res.status(200).json({
        success: true,
        message: "Order placed as COD (Pending)",
        order,
      });
    }

    // ❌ PAYMENT FAILED CASE
    if (paymentFailed) {
      const order = await Order.findOneAndUpdate(
        { paymentOrderId },
        { status: "Failed" },
        { new: true }
      );


      return res.status(200).json({
        success: false,
        message: "Payment Failed",
        order,
      });
    }

    // ❌ validation for online payment
    if (!paymentTransactionId) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment data",
      });
    }

    // 🟢 SUCCESS PAYMENT FLOW (JAZZCASH OTP VERIFIED FRONTEND)
    const order = await Order.findOneAndUpdate(
      { paymentOrderId },
      {
        status: "Paid",
        paymentTransactionId,
        paymentSignature,
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }


    if (userId) {
      await Cart.findOneAndUpdate(
        { userId },
        { $set: { items: [], totalPrice: 0 } }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Payment Successful",
      order,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: error.message,
    });
  }
};


// 🟢 GET USER ORDERS
const getMyOrder = async (req, res) => {
  try {
    const userId = req.user._id;

    const orders = await Order.find({ user: userId })
      .populate({
        path: "products.productId",
        select: "productName productPrice productImg"
      })
      .populate({
        path: "user",
        select: "firstName lastName email"
      });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};
const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.find({ user: userId })
      .populate({
        path: "products.productId",
        select: "productName productPrice productImg"
      })
      .populate({
        path: "user",
        select: "firstName lastName email"
      });
    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
        .populate("user", "firstName lastName email profilePic")
      .populate("products.productId", "productName productPrice")

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};

// 🟢 WHATSAPP INQUIRY
// Behaviour is unchanged (returns a WhatsApp URL), but only the order's owner
// or an admin/worker may use it. Everyone else gets "Order not found" so
// order ids cannot be probed.
const inquiryOrder = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (typeof orderId !== "string" || !OBJECT_ID_REGEX.test(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id"
      });
    }

    const order = await Order.findById(orderId)
      .populate("user", "firstName lastName email")
      .populate("products.productId", "productName");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const isStaff = req.user.role === "admin" || req.user.role === "worker";
    const ownerId = order.user?._id?.toString();
    const requesterId = req.user._id.toString();

    if (!isStaff && ownerId !== requesterId) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const user = order.user;

    const message =
      `🛒 *Order Inquiry*\n\n` +
      `Customer: ${user?.firstName} ${user?.lastName}\n` +
      `Email: ${user?.email}\n\n` +
      `Order ID: ${order._id}\n\n` +
      `Status: ${order.status}\n\n` +
      `Products:\n` +
      order.products
        .map(p => `• ${p.productId?.productName} x ${p.quantity}`)
        .join("\n") +
      `\n\n👉 What is the latest update on this order?`;

    const phone = "923357428542"; // Replace with your WhatsApp number

    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;

    return res.json({
      success: true,
      url
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Inquiry failed"
    });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const allowed = [
      "Pending",
      "Confirmed",
      "Out for Delivery",
      "Completed",
      "Paid",
      "Failed"
    ];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status"
      });
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    return res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update order status"
    });
  }
};

const getSalesData = async (req, res) => {
  try {

    // 👤 USERS
    const totalUsers = await User.countDocuments({});

    // 📦 PRODUCTS
    const totalProducts = await Product.countDocuments({});

    // 🧾 ORDERS (COMPLETED OR PAID)
    const totalOrders = await Order.countDocuments({ status: { $in: ["Paid", "Completed"] } });

    // 💰 TOTAL SALES (AGGREGATION) - PKR
    const totalSaleAgg = await Order.aggregate([
      { $match: { status: { $in: ["Paid", "Completed"] } } },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" }
        }
      }
    ]);


    const totalSales = totalSaleAgg[0]?.total || 0;

    // 📅 LAST 30 DAYS
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);


    // 📊 SALES BY DATE - PKR
    const salesByDate = await Order.aggregate([
      {
        $match: {
          status: { $in: ["Paid", "Completed"] },
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt"
            }
          },
          amount: { $sum: "$amount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);


    // 🔄 FORMAT DATA
    const formattedSales = salesByDate.map((item) => {
      const formatted = {
        date: item._id,
        amount: item.amount,
        currency: "PKR"
      };

      return formatted;
    });


    // 📤 RESPONSE
    res.status(200).json({
      success: true,
      totalUsers,
      totalProducts,
      totalOrders,
      totalSales,
      currency: "PKR",
      sales: formattedSales
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Failed to fetch sales data",
      error: error.message
    });
  }
};
module.exports = { getSalesData, createOrder, verifyPayment, getMyOrder, getUserOrders, getAllOrders, inquiryOrder, updateOrderStatus };