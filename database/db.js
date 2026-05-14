const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(`${process.env.MONGO_URI}`);
  } catch (error) {
    process.exit(1); // stop app if DB fails
  }
};

module.exports = connectDB; // ✅ correct export