const jwt = require('jsonwebtoken');
const User = require('../models/userModel.js');

const auth = async (req, res, next) => {
    console.log("HEADERS:", req.headers);
console.log("BODY:", req.body);
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
 
        req.user = user;
        next();

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const isAdmin = async (req, res, next) => {
    try {
        console.log(req.user);
        if(req.user && req.user.role==='admin'){
            next();
        }else{
            console.log("HEHE",req.user.role);
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
module.exports = {auth,isAdmin}