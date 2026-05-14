const Order = require("../models/orderModel");
const Cart = require("../models/cartModel");
const User = require("../models/userModel");
const Product = require("../models/productModel");

// 🟢 CREATE ORDER
const createOrder = async (req, res) => {
  try {
    const { products, amount, shipping, currency, Details, paymentMethod } = req.body;

    const paymentOrderId = "JC_" + Date.now();

    const jazzcashOrder = {
      id: paymentOrderId,
      amount: Math.round(Number(amount) * 100),
      currency: currency || "PKR",
      status: "created",
    };

    const newOrder = new Order({
      user: req.user ? req.user._id : null,
      guestDetails: req.user ? null : Details || null,
      products,
      amount,
      shipping,
      currency,
      status: "Pending",
      paymentMethod: paymentMethod || "JazzCash",
      paymentOrderId,
      Details: Details || null,
    });

    await newOrder.save();

    res.json({
      success: true,
      message: "Order created",
      order: jazzcashOrder,
      dbOrder: newOrder,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to place order. Please try again.",
    });
  }
};


// 🟢 VERIFY PAYMENT
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
const inquiryOrder = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId)
      .populate("user", "firstName lastName email")
      .populate("products.productId", "productName");

    if (!order) {
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

    // 🧾 ORDERS (PAID)
    const totalOrders = await Order.countDocuments({ status: "Paid" });

    // 💰 TOTAL SALES (AGGREGATION)
    const totalSaleAgg = await Order.aggregate([
      { $match: { status: "Paid" } },
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


    // 📊 SALES BY DATE
    const salesByDate = await Order.aggregate([
      {
        $match: {
          status: "Paid",
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
        amount: item.amount
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