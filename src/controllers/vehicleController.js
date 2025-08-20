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

        // // Rest of your vehicle creation logic...
        const vehicle = new vehicleModel(req.body);
        await vehicle.save({ session });

        // // Update slot status
        // const updated = await Level.updateOne(
        //     { "slots._id": slotId },
        //     {
        //         $set: {
        //             "slots.$.isAvailable": false,
        //             "slots.$.currentBookingId": vehicle._id
        //         }
        //     }
        // ).session(session);

        // if (updated.modifiedCount === 0) {
        //     throw new Error("Failed to update slot status");
        // }

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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const { mobile, vehicleNumber, slotId } = req.body;

        // Validate vehicle ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Invalid vehicle ID." });
        }

        // Check if vehicle exists
        const existingVehicle = await vehicalModel.findById(id).session(session);
        if (!existingVehicle) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Vehicle not found." });
        }

        // If slotId is provided, validate and check availability
        if (slotId) {
            if (!mongoose.Types.ObjectId.isValid(slotId)) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: "Invalid slotId." });
            }

            // Find level containing the slot
            const levelWithSlot = await Level.findOne({ "slots._id": slotId }).session(session);
            if (!levelWithSlot) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({ message: "Slot not found in any level." });
            }

            const slot = levelWithSlot.slots.find(s => s._id.equals(slotId));

            // If slot is occupied by another vehicle (not this vehicle), return conflict
            if (!slot.isAvailable && (!slot.currentBookingId || !slot.currentBookingId.equals(id))) {
                await session.abortTransaction();
                session.endSession();
                return res.status(409).json({ message: "This slot is already booked." });
            }
        }

        // Validate mobile uniqueness
        if (mobile) {
            const existingMobile = await vehicalModel.findOne({
                mobile: mobile,
                _id: { $ne: id }
            }).session(session);
            if (existingMobile) {
                await session.abortTransaction();
                session.endSession();
                return res.status(409).json({ message: "Mobile number already in use." });
            }
        }

        // Validate vehicleNumber uniqueness
        if (vehicleNumber) {
            const existingVehicleNumber = await vehicalModel.findOne({
                vehicleNumber: vehicleNumber,
                _id: { $ne: id }
            }).session(session);
            if (existingVehicleNumber) {
                await session.abortTransaction();
                session.endSession();
                return res.status(409).json({ message: "Vehicle number already exists." });
            }
        }

        // If slotId is changing, update old slot to available and new slot to occupied
        if (slotId && (!existingVehicle.slotId || !existingVehicle.slotId.equals(slotId))) {
            // 1. Free old slot if exists
            if (existingVehicle.slotId) {
                await Level.updateOne(
                    { "slots._id": existingVehicle.slotId },
                    {
                        $set: {
                            "slots.$.isAvailable": true,
                            "slots.$.currentBookingId": null
                        }
                    }
                ).session(session);
            }

            // 2. Occupy new slot
            const updateResult = await Level.updateOne(
                { "slots._id": slotId },
                {
                    $set: {
                        "slots.$.isAvailable": false,
                        "slots.$.currentBookingId": id
                    }
                }
            ).session(session);

            if (updateResult.modifiedCount === 0) {
                throw new Error("Failed to update new slot status");
            }
        }

        // Update vehicle details
        const updatedVehicle = await vehicalModel.findByIdAndUpdate(
            id,
            req.body,
            { new: true, session }
        );

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            message: "Vehicle details updated",
            vehicle: updatedVehicle
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Delete Vehicle Details
export const deleteVehicleDetails = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;

        // Find vehicle with session
        const vehicle = await vehicalModel.findById(id).session(session);
        if (!vehicle) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Vehicle not found" });
        }

        // Delete vehicle
        await vehicalModel.findByIdAndDelete(id).session(session);

        // If vehicle had a slot assigned, free the slot
        if (vehicle.slotId) {
            const updateResult = await Level.updateOne(
                { "slots._id": vehicle.slotId },
                {
                    $set: {
                        "slots.$.isAvailable": true,
                        "slots.$.currentBookingId": null,
                    }
                }
            ).session(session);

            if (updateResult.modifiedCount === 0) {
                throw new Error("Failed to free the slot");
            }
        }

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: "Vehicle details deleted and slot freed" });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};
