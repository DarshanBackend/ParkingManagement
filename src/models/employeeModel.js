import mongoose from "mongoose";

const empSchema = mongoose.Schema({
    Name: {
        type: String
    },
    Email: {
        type: String
    },
    password: {
        type: String
    },
    aadharcardNo: {
        type: Number
    },
    joingDate: {
        type: Date
    },
    address: {
        type: String
    },
    status:
    {
        type: String,
        enum: ["On Duty", "Off Duty"],
        default: "Off Duty"
    },
    emp_image: {
        type: String
    },
    gender: {
        type: String,
        enum: ["Male", "Female", "Other"]
    },
    mobileNo: {
        type: Number
    },
    shift: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shift"
    },
    shift_Time: {
        type: String
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
})

export default mongoose.model("employee", empSchema);
