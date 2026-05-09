const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(`${process.env.MONGO_URI}`);
    console.log("Connected Successfully");
  } catch (error) {
    console.log("MongoDB Connection Failed", error);
    process.exit(1); // stop app if DB fails
  }
};

module.exports = connectDB; // ✅ correct export