import mongoose from "mongoose";

const parkingDetailSchema = new mongoose.Schema({
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
  slotId: { type: mongoose.Schema.Types.ObjectId, ref: "Slot", required: true },
  entryTime: { type: Date, required: true },
  exitTime: { type: Date, default: null },
  status: { type: String, enum: ["active", "completed"], default: "active" }
}, { timestamps: true });

export default mongoose.models.ParkingDetail || mongoose.model("ParkingDetail", parkingDetailSchema);
