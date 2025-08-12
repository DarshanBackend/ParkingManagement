import mongoose from "mongoose";
import vehicalModel from "../models/vehicleModel.js";
import Level from "../models/levelModel.js"
import { ThrowError } from "../utils/Errorutils.js";
import parkingDetailsModel from "../models/parkingDetailsModel.js";
import vehicleModel from "../models/vehicleModel.js";

// Add Vehicle Details
export const addVehicleDetails = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { slotId } = req.body;

        // 1. First check if slot exists at all
        const levelWithSlot = await Level.findOne({ "slots._id": slotId }).session(session);
        if (!levelWithSlot) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Slot not found." });
        }

        // 2. Then check if it's available
        const slot = levelWithSlot.slots.find(s => s._id.equals(slotId));
        if (!slot.isAvailable) {
            await session.abortTransaction();
            session.endSession();
            return res.status(409).json({
                message: "Slot is not available for booking.",
                details: {
                    slotId,
                    currentStatus: slot.isAvailable ? "available" : "occupied",
                    currentBookingId: slot.currentBookingId || null
                }
            });
        }

        // Rest of your vehicle creation logic...
        const vehicle = new vehicleModel(req.body);
        await vehicle.save({ session });

        // Update slot status
        const updated = await Level.updateOne(
            { "slots._id": slotId },
            {
                $set: {
                    "slots.$.isAvailable": false,
                    "slots.$.currentBookingId": vehicle._id
                }
            }
        ).session(session);

        if (updated.modifiedCount === 0) {
            throw new Error("Failed to update slot status");
        }

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            message: "Vehicle registered and slot booked successfully",
            vehicle,
            slotId
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get All Vehicle Details
export const getVehicleDetails = async (req, res) => {
    try {
        const { id } = req.params
        const vehicles = await vehicalModel.findById(id).sort({ createdAt: -1 });

        if (!vehicles) {
            return res.status(409).json({ message: "Id not found!!" });
        }

        if (vehicles.length === 0) {
            return res.status(200).json({ message: "No vehicle details found.", data: [] });
        }

        res.status(200).json(vehicles);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

//getAll Vegicle Details
export const getAllVehicleDetails = async (req, res) => {
    try {
        const vehicles = await vehicalModel.find()

        if (vehicles.length === 0) {
            return res.status(200).json({ message: "No vehicle details found.", data: [] });
        }

        res.status(200).json(vehicles);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
}

// Update Vehicle Details
export const updateVehicleDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { mobile, vehicleNumber, slotId } = req.body;

        // Check if the vehicle ID is valid
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid vehicle ID." });
        }

        // Check if the vehicle exists
        const existingVehicle = await vehicalModel.findById(id);
        if (!existingVehicle) {
            return res.status(404).json({ message: "Vehicle not found." });
        }

        // Validate slotId if it is being updated
        if (slotId) {
            if (!mongoose.Types.ObjectId.isValid(slotId)) {
                return res.status(400).json({ message: "Invalid slotId." });
            }

            const levelWithSlot = await Level.findOne({
                "slots._id": new mongoose.Types.ObjectId(slotId)
            });

            if (!levelWithSlot) {
                return res.status(404).json({ message: "Slot not found in any level." });
            }

            // Check if the slot is already booked by another vehicle
            const isSlotBooked = await vehicalModel.findOne({
                slotId: slotId,
                _id: { $ne: id },
            });

            if (isSlotBooked) {
                return res.status(409).json({ message: "This slot is already booked." });
            }
        }

        // Validate mobile
        if (mobile) {
            const existingMobile = await vehicalModel.findOne({
                mobile: mobile,
                _id: { $ne: id },
            });
            if (existingMobile) {
                return res.status(409).json({ message: "Mobile number already in use." });
            }
        }

        // Validate vehicle number
        if (vehicleNumber) {
            const existingVehicleNumber = await vehicalModel.findOne({
                vehicleNumber: vehicleNumber,
                _id: { $ne: id },
            });
            if (existingVehicleNumber) {
                return res.status(409).json({ message: "Vehicle number already exists." });
            }
        }

        // Update vehicle
        const updatedVehicle = await vehicalModel.findByIdAndUpdate(id, req.body, {
            new: true,
        });

        return res.status(200).json({
            message: "Vehicle details updated",
            vehicle: updatedVehicle,
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Delete Vehicle Details
export const deleteVehicleDetails = async (req, res) => {
    try {
        const vehicle = await vehicalModel.findByIdAndDelete(req.params.id);
        if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
        res.status(200).json({ message: "Vehicle details deleted" });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};
