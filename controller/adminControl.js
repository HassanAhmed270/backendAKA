const User = require('../models/userModel.js');
const allUsers= async (req, res) => {
    try {
        const users = await User.find();
        if (!users) {
            return res.status(400).json({
                success: false,
                message: "No User Found"
            });
        }
        return res.status(200).json({
            success: true,
            users
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
module.exports = { allUsers};