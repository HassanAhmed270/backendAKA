const express = require("express");
const router = express.Router();

// STEP 1: Create Payment Session
router.post("/create", async (req, res) => {
  try {
    const { amount, userId } = req.body;

    const transactionId = "JC" + Date.now();

    // fake session (use DB in real project)
    global.jazzcashSession = {
      transactionId,
      userId,
      amount,
      status: "pending",
    };

    res.json({
      success: true,
      transactionId,
      message: "JazzCash session created (FAKE)",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// STEP 2: Verify Payment (OTP simulation)
router.post("/verify", async (req, res) => {
  try {
    const { transactionId, otp } = req.body;

    const session = global.jazzcashSession;

    if (!session || session.transactionId !== transactionId) {
      return res.status(400).json({
        success: false,
        message: "Invalid session",
      });
    }

    // fake OTP check
    if (otp !== "123456") {
      return res.json({
        success: false,
        message: "Invalid OTP",
      });
    }

    session.status = "success";

    res.json({
      success: true,
      message: "Payment Successful (Simulated)",
      transactionId,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;