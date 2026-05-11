const verifyEmail = require('../emailVerify/verifyEmail.js');
const sendOTPMail = require('../emailVerify/sentOTPMail.js');
const User = require('../models/userModel.js');
const Session = require('../models/sessionModel.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cloudinary = require("../utils/cloudinary");

// Get frontend URL from environment
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.PREVIEW_URL || "http://localhost:5173";
// ================= IMPORTS =================

// ================= REGISTER =================
const register = async (req, res) => {
    console.log("Register API HIT");
    
    const { firstName, lastName, email, password, role } = req.body;
    // 🔒 default role
    let finalRole = "user";
    
    // ✅ agar role pass ho aur logged-in user admin ho
    if (role){
       finalRole = role;
       console.log("FInalrole", finalRole);
    };

    if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "All fields required!"
        });
    }

    try {
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            if (!existingUser.isVerified) {
                return res.status(400).json({
                    success: false,
                    message: "Account already exists but is not verified. Please verify your account."
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: "User Already Exists"
                });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role: finalRole // ✅ use this
        });

        const token = jwt.sign(
            { id: newUser._id },
            process.env.SECRET_KEY,
            { expiresIn: '10m' }
        );

        newUser.token = token;
        await newUser.save();

        await verifyEmail(token, email, FRONTEND_URL);

        return res.status(201).json({
            success: true,
            message: "User Created Successfully. Please verify your email.",
            user: newUser
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ================= VERIFY EMAIL =================
const verify = async (req, res) => {
  try {
    let token;

    // ✅ OPTION 1: from Authorization header (current frontend)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // ✅ OPTION 2: from URL param (email click fallback)
    if (!token && req.params.token) {
      token = req.params.token;
    }

    // ❌ No token found
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is missing"
      });
    }

    // ================= VERIFY TOKEN =================
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SECRET_KEY);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(400).json({
          success: false,
          message: "Token has expired"
        });
      }

      return res.status(400).json({
        success: false,
        message: "Invalid token"
      });
    }

    // ================= FIND USER =================
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // ================= ALREADY VERIFIED =================
    if (user.isVerified) {
      return res.status(200).json({
        success: true,
        message: "Email already verified"
      });
    }

    // ================= UPDATE USER =================
    user.token = null;
    user.isVerified = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verification successful"
    });

  } catch (error) {
    console.error("Verify error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

module.exports = verify;

// ================= VERIFY EMAIL =================
const reVerify = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User Not Found"
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "User already verified"
            });
        }

        const token = jwt.sign(
            { id: user._id },
            process.env.SECRET_KEY,
            { expiresIn: '10m' }
        );

        await verifyEmail(token, email, FRONTEND_URL);

        user.token = token;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Verification Email Sent Again"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "All fields required!"
        });
    }

    try {
        const existingUser = await User.findOne({ email });

        if (!existingUser) {
            return res.status(400).json({
                success: false,
                message: "User Not Exists"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, existingUser.password);

        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: "Invalid Credential"
            });
        }

        if (!existingUser.isVerified) {
            return res.status(400).json({
                success: false,
                message: "Verify Your Account First"
            });
        }

        // Increment session version to invalidate previous sessions
        existingUser.sessionVersion += 1;
        existingUser.isLoggedIn = true;
        await existingUser.save();

        const accessToken = jwt.sign(
            { id: existingUser._id, sessionVersion: existingUser.sessionVersion },
            process.env.SECRET_KEY,
            { expiresIn: '10d' }
        );

        const existingSession = await Session.findOne({ user: existingUser._id });

        if (existingSession) {
            await Session.deleteOne({ user: existingUser._id });
        }

        await Session.create({
            user: existingUser._id
        });

        return res.status(200).json({
            success: true,
            message: `Login Successful, Welcome Back ${existingUser.firstName}`,
            user: existingUser,
            accessToken
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const logout = async (req, res) => {
    try {
        const userId = req.user.id; // comes from auth middleware

        const user = await User.findById(userId);

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User Not Found"
            });
        }

        user.isLoggedIn = false;
        user.sessionVersion += 1; // Invalidate current session
        await user.save();

        await Session.deleteMany({ user: userId });

        return res.status(200).json({
            success: true,
            message: "Logout Successful"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User Not Found"
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        user.otp = otp;
        user.otpExpiry = otpExpiry;

        await user.save();

        await sendOTPMail(otp, email);

        return res.status(200).json({
            success: true,
            message: "Check your email to reset your password!"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const verifyOTP = async (req, res) => {
    try {
        const { otp } = req.body;
        const { email } = req.params;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required"
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User Not Found"
            });
        }

        if (!user.otp || !user.otpExpiry) {
            return res.status(400).json({
                success: false,
                message: "OTP Not Generated or Already Verified"
            });
        }

        if (user.otpExpiry < new Date()) {
            return res.status(400).json({
                success: false,
                message: "OTP has Expired, Please Request a new One"
            });
        }

        if (otp !== user.otp) {
            return res.status(400).json({
                success: false,
                message: "OTP is Invalid"
            });
        }

        user.otp = null;
        user.otpExpiry = null;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "OTP Verified Successfully!"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const changePassword = async (req, res) => {
    try {
        const { newPassword, confirmPassword } = req.body;
        const { email } = req.params;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User Not Found"
            });
        }
        if (!newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Password is required"
            });
        }
        if (newPassword != confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Password Donot Match"
            });
        }
        // Hash password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password change Successfully!"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId).select("-password,-otp, -otpExpiry -token");
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User Not Found"
            });
        }

        return res.status(200).json({
            success: true,
            user
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


const updateUser = async (req, res) => {
    try {
        const userIdToUpdate = req.params.id;
        const loggedInUser = req.user;

        const { firstName, lastName, address, city, zipCode, phoneNo, role } = req.body;

        // Authorization check
        if (
            loggedInUser._id.toString() !== userIdToUpdate &&
            loggedInUser.role !== "admin"
        ) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to update this profile"
            });
        }

        let user = await User.findById(userIdToUpdate);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User does not exist"
            });
        }

        let profilePicUrl = user.profilePic;
        let profilePicPublicId = user.profilePicPublicId;

        // Upload new image
        if (req.file) {
            // delete old image
            if (profilePicPublicId) {
                await cloudinary.uploader.destroy(profilePicPublicId);
            }

            const uploadResult = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: "profiles" },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );

                stream.end(req.file.buffer);
            });

            profilePicUrl = uploadResult.secure_url;
            profilePicPublicId = uploadResult.public_id;
        }

        // Update fields
        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
        user.address = address || user.address;
        user.city = city || user.city;
        user.zipCode = zipCode || user.zipCode;
        user.phoneNo = phoneNo || user.phoneNo;
        user.role = role || user.role;

        user.profilePic = profilePicUrl;
        user.profilePicPublicId = profilePicPublicId;

        const updatedUser = await user.save();

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ✅ Export BOTH functions
module.exports = { register, verify, reVerify, login, logout, forgotPassword, verifyOTP, changePassword, getUserById,updateUser }