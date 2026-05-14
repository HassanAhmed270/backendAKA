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
  updateOrderStatus
} = require("../controller/orderController.js");

const { auth ,isAdmin} = require("../middleware/isAuthenticated.js");


// 🟢 CREATE ORDER
router.post("/create", createOrder);

// 🟢 VERIFY PAYMENT
router.post("/verify", verifyPayment);
router.get("/get-my-order", auth, getMyOrder);
router.put("/update-status/:orderId", auth, isAdmin, updateOrderStatus);
router.get("/user-order/:userId", auth, isAdmin ,getUserOrders);
router.get("/all-orders", auth,isAdmin, getAllOrders);
router.get("/sales",auth,isAdmin,getSalesData)
router.post("/inquire",auth, inquiryOrder);

module.exports = router;