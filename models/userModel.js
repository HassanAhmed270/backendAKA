const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        minlength: 2
    },
    lastName: {
        type: String,
        required: true,
        minlength: 2
    },
    profilePic: {
        type: String, default: ""
    },
    profilePicId: {
        type: String, default: ""
    },
    email: {
        type: String,
        required: true,
        unique:true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            "Please fill a valid email address"
        ]
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    role: {
        type: String,
        enum: ["user", "admin"]
    },
    token: {
        type: String,
        default: null
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isLoggedIn: {
        type: Boolean,
        default: false
    },
    otp: {
        type: String,
        default: null
    },
    otpExpiry: {
        type: Date,
        default: null
    },
    address: {
        type: String,
    },
    city: {
        type: String,
    },
    zipCode: {
        type: String,
    },
    phoneNo: {
        type: String,
    }
},
    { timestamps: true }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
