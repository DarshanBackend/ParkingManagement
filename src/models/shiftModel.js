import mongoose from "mongoose";

const shiftSchema = mongoose.Schema({
    shiftName: {
        type: String,
        required: true,
        unique: true
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

export default mongoose.model("Shift", shiftSchema);
