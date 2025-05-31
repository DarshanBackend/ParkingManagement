import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema({
    category: {
        type: String,
        required: true,
        enum: ["Car", "Bike", "Truck"]
    },
    vehicleNumber: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    mobile: {
        type: Number,
        required: true
    },
    parkingLocation: {
        type: String,
        required: true
    },
    parkingCharges: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ["Online", "Offline"],
        required: true
    },
}, { timestamps: true });

export default mongoose.model("Vehicle", vehicleSchema);
