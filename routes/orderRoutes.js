const express = require("express");
const router = express.Router();

const {
  createOrder,
  verifyPayment,
  getMyOrder,
  getUserOrders,
  getAllOrders,
  getSalesData
} = require("../controller/orderController.js");

const { auth ,isAdmin} = require("../middleware/isAuthenticated.js");


// 🟢 CREATE ORDER
router.post("/create", auth, createOrder);

// 🟢 VERIFY PAYMENT
router.post("/verify", auth, verifyPayment);
router.get("/get-my-order", auth, getMyOrder);
router.get("/user-order/:userId", auth, isAdmin ,getUserOrders);
router.get("/all-orders", auth,isAdmin, getAllOrders);
router.get("/sales",auth,isAdmin,getSalesData)

module.exports = router;