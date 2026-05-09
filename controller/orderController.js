const Order = require("../models/orderModel");
const Cart = require("../models/cartModel");
const User = require("../models/userModel");
const Product = require("../models/productModel");

// 🟢 CREATE ORDER
const createOrder = async (req, res) => {
  try {
    const { products, amount, tax, shipping, currency } = req.body;

    const paymentOrderId = "JC_" + Date.now();

    const jazzcashOrder = {
      id: paymentOrderId,
      amount: Math.round(Number(amount) * 100),
      currency: currency || "PKR",
      status: "created",
    };

    const newOrder = new Order({
      user: req.user._id,
      products,
      amount,
      tax,
      shipping,
      currency,
      status: "Pending",
      paymentMethod: "JazzCash",
      paymentOrderId,
    });

    await newOrder.save();

    res.json({
      success: true,
      message: "Order created",
      order: jazzcashOrder,
      dbOrder: newOrder,
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Failed to create order",
    });
  }
};


// 🟢 VERIFY PAYMENT
const verifyPayment = async (req, res) => {
  try {
    console.log("🔥 VERIFY PAYMENT HIT");

    const userId = req.user._id;

    const {
      paymentOrderId,
      paymentTransactionId,
      paymentSignature,
      paymentFailed,
      paymentMethod // 👈 ADD THIS (COD / ONLINE)
    } = req.body;

    console.log("📦 Request Body:", req.body);

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
          status: "Pending (COD)",
        },
        { new: true }
      );

      console.log("💰 COD ORDER UPDATED:", order);

      // clear cart
      await Cart.findOneAndUpdate(
        { user: userId },
        { $set: { items: [], totalPrice: 0 } }
      );

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

      console.log("❌ PAYMENT FAILED:", order);

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

    console.log("✅ PAYMENT SUCCESS:", order);

    // 🧹 clear cart
    await Cart.findOneAndUpdate(
      { user: userId },
      { $set: { items: [], totalPrice: 0 } }
    );

    return res.status(200).json({
      success: true,
      message: "Payment Successful",
      order,
    });

  } catch (error) {
    console.log("❌ VERIFY ERROR:", error);

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
    console.log(error);
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
    console.log(error);
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
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};

const getSalesData = async (req, res) => {
  try {
    console.log("🔥 getSalesData API HIT");

    // 👤 USERS
    const totalUsers = await User.countDocuments({});
    console.log("👤 totalUsers:", totalUsers);

    // 📦 PRODUCTS
    const totalProducts = await Product.countDocuments({});
    console.log("📦 totalProducts:", totalProducts);

    // 🧾 ORDERS (PAID)
    const totalOrders = await Order.countDocuments({ status: "Paid" });
    console.log("🧾 totalPaidOrders:", totalOrders);

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

    console.log("📊 totalSaleAgg:", totalSaleAgg);

    const totalSales = totalSaleAgg[0]?.total || 0;
    console.log("💰 totalSales:", totalSales);

    // 📅 LAST 30 DAYS
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    console.log("📅 thirtyDaysAgo:", thirtyDaysAgo);

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

    console.log("📊 raw salesByDate:", salesByDate);

    // 🔄 FORMAT DATA
    const formattedSales = salesByDate.map((item) => {
      const formatted = {
        date: item._id,
        amount: item.amount
      };

      console.log("➡️ formatted item:", formatted);
      return formatted;
    });

    console.log("✅ FINAL formattedSales:", formattedSales);

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
    console.log("❌ ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch sales data",
      error: error.message
    });
  }
};
module.exports = { getSalesData, createOrder, verifyPayment, getMyOrder, getUserOrders,getAllOrders };