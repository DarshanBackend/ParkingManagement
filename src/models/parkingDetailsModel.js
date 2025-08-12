// models/ParkingDetail.js
import mongoose from "mongoose";

const parkingDetailSchema = new mongoose.Schema({
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vehicle",
    required: true
  },
  entryTime: {
    type: Date,
    required: true
  },
  exitTime: {
    type: Date,
    required: true
  }
}, { timestamps: true });

export default mongoose.model("ParkingDetail", parkingDetailSchema);
