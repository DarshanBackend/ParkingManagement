import mongoose from "mongoose";

const levelSchema = mongoose.Schema({
    levelNo: {
        type: Number,
        required: true,
        unique: true,
    },
    slots: [
        {
            slotNo: {
                type: String,
                required: true
            }
        }
    ]
}, { timestamps: true })

export default mongoose.model("Level", levelSchema)

