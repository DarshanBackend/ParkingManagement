import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
    mobileNo: {
        type: Number
    },
    fullName: {
        type: String
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    image: {
        type: String
    },
    role: {
        type: String,
        enum: ["Admin", "Employee"],
        default: "Employee"
    },
    resetOTP: {
        type: String
    },
    otpExpires: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },

});

export default mongoose.model("Admin", adminSchema);