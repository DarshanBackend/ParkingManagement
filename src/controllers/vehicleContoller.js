import vehicalModel from "../models/vehicleModel.js";
import { ThrowError } from "../utils/Errorutils.js";

// Add Vehicle Details
export const addVehicleDetails = async (req, res) => {
    try {
        const { mobile, vehicleNumber } = req.body;

        if (!mobile || !vehicleNumber) {
            return res.status(400).json({ message: "Mobile and vehicle number are required." });
        }

        // Check for existing vehicle with same mobile number
        const existingVehicle = await vehicalModel.findOne({ mobile });
        if (existingVehicle) {
            return res.status(409).json({ message: "Vehicle with this mobile number already exists." });
        }

        // Optionally check if vehicleNumber is already used
        const existingVehicleNumber = await vehicalModel.findOne({ vehicleNumber });
        if (existingVehicleNumber) {
            return res.status(409).json({ message: "Vehicle number already exists." });
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
        const vehicles = await vehicalModel.find().sort({ createdAt: -1 });

        if (vehicles.length === 0) {
            return res.status(200).json({ message: "No vehicle details found.", data: [] });
        }

        res.status(200).json(vehicles);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Update Vehicle Details
export const updateVehicleDetails = async (req, res) => {
    try {
        const vehicle = await vehicalModel.findByIdAndUpdate(req.params.id, req.body, {
            new: true
        });
        if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
        res.status(200).json({ message: "Vehicle details updated", vehicle });
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
