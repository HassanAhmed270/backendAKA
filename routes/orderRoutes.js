const express = require("express");
const router = express.Router();

const {
  createOrder,
  verifyPayment,
  getMyOrder,
  getUserOrders,
  getAllOrders,
  getSalesData,
  inquiryOrder,
  updateOrderStatus,
} = require("../controller/orderController.js");

const { auth, optionalAuth, isAdmin, isAdminOrWorker } = require("../middleware/isAuthenticated.js");


// 🟢 CREATE ORDER (guests allowed; logged-in customers get the order linked to their account)
router.post("/create", optionalAuth, createOrder);

// 🟢 VERIFY PAYMENT (admin only; COD is the only live payment method)
router.post("/verify", auth, isAdmin, verifyPayment);
router.get("/get-my-order", auth, getMyOrder);
router.put("/update-status/:orderId", auth, isAdminOrWorker, updateOrderStatus);
router.get("/user-order/:userId", auth, isAdminOrWorker ,getUserOrders);
router.get("/all-orders", auth,isAdminOrWorker, getAllOrders);
router.get("/sales",auth,isAdminOrWorker,getSalesData)
router.post("/inquire",auth, inquiryOrder);

module.exports = router;