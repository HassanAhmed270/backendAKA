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

const { auth ,isAdmin,isAdminOrWorker} = require("../middleware/isAuthenticated.js");


// 🟢 CREATE ORDER
router.post("/create", createOrder);

// 🟢 VERIFY PAYMENT
router.post("/verify", verifyPayment);
router.get("/get-my-order", auth, getMyOrder);
router.put("/update-status/:orderId", auth, isAdminOrWorker, updateOrderStatus);
router.get("/user-order/:userId", auth, isAdminOrWorker ,getUserOrders);
router.get("/all-orders", auth,isAdminOrWorker, getAllOrders);
router.get("/sales",auth,isAdminOrWorker,getSalesData)
router.post("/inquire",auth, inquiryOrder);

module.exports = router;