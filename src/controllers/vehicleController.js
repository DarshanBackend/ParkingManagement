import mongoose from "mongoose";
import vehicalModel from "../models/vehicleModel.js";
import Level from "../models/levelModel.js"
import { ThrowError } from "../utils/Errorutils.js";

// Add Vehicle Details
export const addVehicleDetails = async (req, res) => {
    try {
        const { mobile, vehicleNumber, slotId } = req.body;

        if (!mobile || !vehicleNumber || !slotId) {
            return res.status(400).json({ message: "Mobile, vehicleNumber, and slotId are required." });
        }

        // Validate slotId
        if (!mongoose.Types.ObjectId.isValid(slotId)) {
            return res.status(400).json({ message: "Invalid slotId." });
        }

        // Find if slot exists in any level
        const levelWithSlot = await Level.findOne({ "slots._id": slotId });
        if (!levelWithSlot) {
            return res.status(404).json({ message: "Slot not found in any level." });
        }

        // Check for duplicate mobile
        const existingMobile = await vehicalModel.findOne({ mobile });
        if (existingMobile) {
            return res.status(409).json({ message: "Vehicle with this mobile number already exists." });
        }

        // Check for duplicate vehicleNumber
        const existingVehicleNumber = await vehicalModel.findOne({ vehicleNumber });
        if (existingVehicleNumber) {
            return res.status(409).json({ message: "Vehicle number already exists." });
        }

        // Check if slot is already booked
        const isSlotBooked = await vehicalModel.findOne({ slotId });
        if (isSlotBooked) {
            return res.status(409).json({ message: "This slot is already booked." });
        }

        const vehicle = new vehicalModel(req.body);
        await vehicle.save();

        res.status(201).json({ message: "Vehicle details added", vehicle });
    } catch (error) {
        return ThrowError(res, 500, error.message);
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
