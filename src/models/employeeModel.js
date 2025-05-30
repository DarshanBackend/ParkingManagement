import mongoose from "mongoose";

const empSchema = mongoose.Schema({
    Name: {
        type: String
    },
    Email: {
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
        type: String,
        default: "Shift 01"
    }
})

export default mongoose.model("employee", empSchema);
