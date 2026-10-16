const verifyEmail = require('../emailVerify/verifyEmail.js');
const sendOTPMail = require('../emailVerify/sentOTPMail.js');
const User = require('../models/userModel.js');
const Session = require('../models/sessionModel.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const cloudinary = require("../utils/cloudinary");

// Get frontend URL from environment
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.PREVIEW_URL || "http://localhost:5173";
const BACKEND_URL = "https://backendaka.onrender.com";

// B1 constants
const ALLOWED_ROLES = ["user", "worker", "admin"];
const MAX_OTP_ATTEMPTS = 5;
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;
const sha256 = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

// ================= REGISTER =================
const register = async (req, res) => {

    // B1 (AB-001): `role` from the request body is IGNORED. Public signup is always "user".
    const { firstName, lastName, email, password } = req.body;
    const finalRole = "user";

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
            role: finalRole
        });

        const token = jwt.sign(
            { id: newUser._id },
            process.env.SECRET_KEY,
            { expiresIn: '10m' }
        );

        newUser.token = token;
        await newUser.save();

        // B1 (AB-009): mail failure is now reported instead of silently ignored
        try {
            await verifyEmail(token, email, FRONTEND_URL, BACKEND_URL);
        } catch (mailError) {
            console.error("Verification email failed:", mailError.message);
            return res.status(502).json({
                success: false,
                message: "Account created, but the verification email could not be sent. Press Signup again and use 'Re-verify Your Account'."
            });
        }

        return res.status(201).json({
            success: true,
            message: "User Created Successfully. Please verify your email.",
            user: newUser // password/otp/token stripped by schema toJSON (AB-005)
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ================= RE-VERIFY EMAIL =================
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

        user.token = token;
        await user.save();

        try {
            await verifyEmail(token, email, FRONTEND_URL, BACKEND_URL);
        } catch (mailError) {
            console.error("Re-verification email failed:", mailError.message);
            return res.status(502).json({
                success: false,
                message: "Could not send the verification email. Please try again later."
            });
        }

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
                message: "Username or password incorrect"
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
            user: existingUser, // secrets stripped by schema toJSON (AB-005)
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

// ================= FORGOT PASSWORD (step 1: send OTP) =================
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || typeof email !== "string") {
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
        user.otpAttempts = 0;
        user.resetTokenHash = null;
        user.resetTokenExpiry = null;

        await user.save();

        // B1 (AB-009): await + handle mail errors (no process crash)
        try {
            await sendOTPMail(otp, email);
        } catch (mailError) {
            console.error("OTP email failed:", mailError.message);
            return res.status(502).json({
                success: false,
                message: "Could not send the OTP email. Please try again later."
            });
        }

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

// ================= FORGOT PASSWORD (step 2: verify OTP -> resetToken) =================
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

        if (String(otp) !== user.otp) {
            // B1 (AB-003): limit wrong guesses so the 6-digit OTP can't be brute-forced
            user.otpAttempts = (user.otpAttempts || 0) + 1;

            if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
                user.otp = null;
                user.otpExpiry = null;
                user.otpAttempts = 0;
                await user.save();
                return res.status(400).json({
                    success: false,
                    message: "Too many incorrect attempts. Please request a new OTP"
                });
            }

            await user.save();
            return res.status(400).json({
                success: false,
                message: "OTP is Invalid"
            });
        }

        // OTP correct: consume it and issue a single-use reset token (stored hashed)
        const resetToken = crypto.randomBytes(32).toString("hex");

        user.otp = null;
        user.otpExpiry = null;
        user.otpAttempts = 0;
        user.resetTokenHash = sha256(resetToken);
        user.resetTokenExpiry = new Date(Date.now() + RESET_TOKEN_TTL_MS);

        await user.save();

        return res.status(200).json({
            success: true,
            message: "OTP Verified Successfully!",
            resetToken
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ================= FORGOT PASSWORD (step 3: set new password, needs resetToken) =================
const changePassword = async (req, res) => {
    try {
        const { newPassword, confirmPassword, resetToken } = req.body;
        const { email } = req.params;

        if (!newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Password is required"
            });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Password Donot Match"
            });
        }
        if (String(newPassword).length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters"
            });
        }

        const user = await User.findOne({ email });

        // B1 (AB-003): same generic error for every failure so nothing is revealed
        const invalidSession = () => res.status(400).json({
            success: false,
            message: "Reset session is invalid or expired. Please request a new OTP."
        });

        if (
            !user ||
            !resetToken ||
            !user.resetTokenHash ||
            !user.resetTokenExpiry ||
            user.resetTokenExpiry < new Date() ||
            sha256(resetToken) !== user.resetTokenHash
        ) {
            return invalidSession();
        }

        user.password = await bcrypt.hash(newPassword, 10);

        // single use + sign out everywhere
        user.resetTokenHash = null;
        user.resetTokenExpiry = null;
        user.sessionVersion += 1;
        user.isLoggedIn = false;
        await user.save();
        await Session.deleteMany({ user: user._id });

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
        // B1 (AB-004): fixed select string (was comma-separated, so nothing was excluded)
        const user = await User.findById(userId).select("-password -otp -otpExpiry -otpAttempts -token -resetTokenHash -resetTokenExpiry");
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

const convertToWorker = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        user.role = "worker";
        await user.save();

        return res.status(200).json({
            success: true,
            message: "User converted to worker successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const removeWorkerRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        user.role = "user";
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Worker role removed successfully"
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

        // B1 (AB-002): role may only be changed by an admin, never on yourself.
        // For everyone else the `role` field is silently ignored.
        const isAdmin = loggedInUser.role === "admin";
        const isSelf = loggedInUser._id.toString() === userIdToUpdate;
        if (role && isAdmin && !isSelf && !ALLOWED_ROLES.includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role"
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

        if (role && isAdmin && !isSelf) {
            user.role = role;
        }

        user.profilePic = profilePicUrl;
        user.profilePicPublicId = profilePicPublicId;

        const updatedUser = await user.save();

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser // secrets stripped by schema toJSON (AB-005)
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ✅ Export functions
module.exports = { register, reVerify, login, logout, forgotPassword, verifyOTP, changePassword, getUserById, convertToWorker, removeWorkerRole, updateUser }