const jwt = require('jsonwebtoken');
const User = require('../models/userModel.js');

const auth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const token = authHeader.split(" ")[1];

        let decoded;

        try {
            decoded = jwt.verify(token, process.env.SECRET_KEY);
        } catch (error) {

            if (error.name === "TokenExpiredError") {
                return res.status(401).json({
                    success: false,
                    message: "Token Expired"
                });
            }

            return res.status(401).json({
                success: false,
                message: "Invalid Token"
            });
        }

        if (!decoded || !decoded.id) {
            return res.status(401).json({
                success: false,
                message: "Invalid Token Payload"
            });
        }

        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User Not Found"
            });
        }

        // Session Version Check
        if (
            !decoded.sessionVersion ||
            decoded.sessionVersion !== user.sessionVersion
        ) {
            return res.status(401).json({
                success: false,
                message: "Session Expired"
            });
        }

        req.user = user;

        next();

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Optional authentication: used where guests are allowed (e.g. checkout).
// - valid token  -> req.user is set (order is linked to the account)
// - no token / invalid / expired token -> request continues as a guest
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next();
        }

        const token = authHeader.split(" ")[1];

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.SECRET_KEY);
        } catch {
            return next();
        }

        if (!decoded || !decoded.id) {
            return next();
        }

        const user = await User.findById(decoded.id);

        if (
            user &&
            decoded.sessionVersion &&
            decoded.sessionVersion === user.sessionVersion
        ) {
            req.user = user;
        }

        return next();

    } catch {
        return next();
    }
};

const isAdmin = async (req, res, next) => {
    try {

        if (req.user && req.user.role === 'admin') {
            next();
        } else {
            return res.status(403).json({
                success: false,
                message: "Unauthorized"
            });
        }

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const isAdminOrWorker = async (req, res, next) => {
    try {

        if (
            req.user &&
            (req.user.role === 'admin' || req.user.role === 'worker')
        ) {
            next();
        } else {
            return res.status(403).json({
                success: false,
                message: "Unauthorized"
            });
        }

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    auth,
    optionalAuth,
    isAdmin,
    isAdminOrWorker
};