const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null
    },

    guestDetails: {
      type: Object,
      default: null
    },

    // 🟢 PRODUCTS ARRAY
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

    // 🟢 ORDER LEVEL DATA
    amount: {
      type: Number,
      required: true,
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
      enum: ["Pending", "Confirmed", "Out for Delivery", "Completed", "Paid", "Failed"],
      default: "Pending",
    },

    // 🟢 PAYMENT INFO
    paymentMethod: {
      type: String,
      default: "JazzCash",
    },

    paymentOrderId: String,
    paymentTransactionId: String,
    paymentSignature: String,

    // 🔥 NEW: DETAILS OBJECT (Pickup OR Delivery)
    Details: {
      type: Object,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);