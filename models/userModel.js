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
        enum: ["user", "admin","worker"]
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
    sessionVersion: {
        type: Number,
        default: 0
    },
    otp: {
        type: String,
        default: null
    },
    otpExpiry: {
        type: Date,
        default: null
    },
    // B1 (AB-003): wrong-OTP counter + single-use reset token (stored hashed)
    otpAttempts: {
        type: Number,
        default: 0
    },
    resetTokenHash: {
        type: String,
        default: null
    },
    resetTokenExpiry: {
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
    {
        timestamps: true,
        // B1 (AB-004/005): never serialize secrets, in ANY res.json(user / users)
        toJSON: {
            transform: (doc, ret) => {
                delete ret.password;
                delete ret.otp;
                delete ret.otpExpiry;
                delete ret.otpAttempts;
                delete ret.token;
                delete ret.resetTokenHash;
                delete ret.resetTokenExpiry;
                return ret;
            }
        }
    }
);

const User = mongoose.model('User', userSchema);

module.exports = User;