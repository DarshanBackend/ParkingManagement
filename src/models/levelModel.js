import mongoose from "mongoose";

const levelSchema = new mongoose.Schema({
    levelNo: { type: Number, required: true, unique: true },
    slots: [
        {
            slotNo: { type: String, required: true },
            category: { type: String, enum: ["Car", "Bike", "Truck"], default: null },
            isAvailable: { type: Boolean, default: true },
            currentBookingId: { type: mongoose.Schema.Types.ObjectId, default: null }
        }
    ]
}, { timestamps: true });

export default mongoose.models.Level || mongoose.model("Level", levelSchema);
