const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 🟢 PRODUCTS ARRAY (ONLY PRODUCT DATA)
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
      },
    ],

    // 🟢 ORDER LEVEL DATA (FIXED)
    amount: {
      type: Number,
      required: true,
    },

    tax: {
      type: Number,
      default: 0,
    },

    shipping: {
      type: Number,
      default: 0,
    },

    currency: {
      type: String,
      default: "PKR",
    },

    status: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },

    // 🟢 PAYMENT INFO (JazzCash simulation)
    paymentMethod: {
      type: String,
      default: "JazzCash",
    },

    paymentOrderId: String,
    paymentTransactionId: String,
    paymentSignature: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);