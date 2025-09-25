import mongoose from "mongoose";
import { ThrowError } from "../utils/Errorutils.js";
import { sendSuccessResponse, sendBadRequestResponse, sendNotFoundResponse } from "../utils/ResponseUtils.js"
import Level from "../models/levelModel.js";
import Vehicle from "../models/vehicleModel.js";
import ParkingDetail from "../models/parkingDetailsModel.js";

export const addLevelWithSlot = async (req, res) => {
    try {
        const { levelNo, columns, rows } = req.body;

        // Validate inputs
        if (!levelNo || !columns || !rows) {
            return sendBadRequestResponse(res, "levelNo, columns, and rows are required!");
        }

        if (columns > 26) {
            return sendBadRequestResponse(res, "Maximum 26 columns allowed (A-Z)");
        }

        // Generate slots
        const generatedSlots = [];
        for (let col = 0; col < columns; col++) {
            const colLetter = String.fromCharCode(65 + col); // 65 = 'A'
            for (let row = 1; row <= rows; row++) {
                generatedSlots.push({
                    _id: new mongoose.Types.ObjectId(),
                    slotNo: `${colLetter}${row}`,
                    isAvailable: true,
                    currentBookingId: null
                });
            }
        }

        // Check for existing level
        let level = await Level.findOne({ levelNo });

        if (!level) {
            level = new Level({ levelNo, slots: generatedSlots });
            await level.save();
            return sendSuccessResponse(res, "Level and slots created successfully!", { level });
        }

        // Add only unique slots
        const existingSlotNos = level.slots.map(s => s.slotNo);
        const newUniqueSlots = generatedSlots.filter(slot => !existingSlotNos.includes(slot.slotNo));

        if (newUniqueSlots.length === 0) {
            return sendBadRequestResponse(res, "All generated slots already exist in this level.");
        }

        level.slots.push(...newUniqueSlots);
        await level.save();

        return sendSuccessResponse(res, "New slots added to existing level.", { level });

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const getAllLevel = async (req, res) => {
    try {
        const level = await Level.find()

        if (!level || level.length === 0) {
            return sendNotFoundResponse(res, "No any Level found...")
        }

        return sendSuccessResponse(res, "Level fetched Successfully...", level)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const getLevelById = async (req, res) => {
    try {
        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid level Id...")
        }

        const level = await Level.findById(id)
        if (!level) {
            return sendNotFoundResponse(res, "Level not found...")
        }

        return sendSuccessResponse(res, "Level fetched Successfully...", level)

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const updateLevel = async (req, res) => {
    try {
        const { id } = req.params;
        const { levelNo, columns, rows } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid level ID...");
        }

        if (!levelNo || !columns || !rows) {
            return sendBadRequestResponse(res, "levelNo, columns, and rows are required!");
        }

        if (columns > 26) {
            return sendBadRequestResponse(res, "Maximum 26 columns allowed (A-Z)");
        }

        const level = await Level.findById(id);
        if (!level) {
            return sendNotFoundResponse(res, "Level not found...");
        }

        if (level.levelNo !== levelNo) {
            const existingLevel = await Level.findOne({ levelNo });
            if (existingLevel) {
                return sendBadRequestResponse(res, "This levelNo already exists...");
            }
            level.levelNo = levelNo;
        }

        // Generate new slots
        const generatedSlots = [];
        for (let col = 0; col < columns; col++) {
            const colLetter = String.fromCharCode(65 + col);
            for (let row = 1; row <= rows; row++) {
                generatedSlots.push({ slotNo: `${colLetter}${row}` });
            }
        }

        // 🆕 Replace all slots with new grid
        level.slots = generatedSlots;

        const updatedLevel = await level.save();

        return sendSuccessResponse(res, "Level updated with new slots successfully!", { level: updatedLevel });

    } catch (error) {
        return ThrowError(res, 500, error.message)
    }
}

export const deleteLevel = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid level Id...")
        }

        const level = await Level.findById(id)
        if (!level) {
            return sendNotFoundResponse(res, "Level not found...")
        }

        await Level.findByIdAndDelete(id);

        return sendSuccessResponse(res, "Level Deleted successfully...")

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const deleteSlotFromLevel = async (req, res) => {
    try {
        const { levelId, slotNo } = req.params;

        if (!mongoose.Types.ObjectId.isValid(levelId)) {
            return sendBadRequestResponse(res, "Invalid level ID...");
        }

        if (!slotNo) {
            return sendBadRequestResponse(res, "slotNo is required...");
        }

        const level = await Level.findById(levelId);
        if (!level) {
            return sendNotFoundResponse(res, "Level not found...");
        }

        const initialLength = level.slots.length;

        // Filter out the slot to delete
        level.slots = level.slots.filter(slot => slot.slotNo !== slotNo);

        if (level.slots.length === initialLength) {
            return sendNotFoundResponse(res, "Slot not found in this level...");
        }

        await level.save();

        return sendSuccessResponse(res, "Slot deleted successfully.", { level });

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const getAllSlots = async (req, res) => {
    try {
        const levels = await Level.find({}, { levelNo: 1, slots: 1 });
        // const levels = await Level.find({});

        const slots = levels.flatMap(level =>
            level.slots.map(slot => ({
                levelNo: level.levelNo,
                slotId: slot._id,
                slotNo: slot.slotNo
            }))
        );

        return sendSuccessResponse(res, "Slots fetched", { slots });
    } catch (err) {
        return ThrowError(res, 500, err.message);
    }
};

export const editSlot = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { levelId, slotId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(levelId)) {
            await session.abortTransaction();
            session.endSession();
            return sendBadRequestResponse(res, "Invalid level ID...");
        }
        if (!mongoose.Types.ObjectId.isValid(slotId)) {
            await session.abortTransaction();
            session.endSession();
            return sendBadRequestResponse(res, "Invalid slot ID...");
        }

        const level = await Level.findById(levelId).session(session);
        if (!level) {
            await session.abortTransaction();
            session.endSession();
            return sendNotFoundResponse(res, "Level not found...");
        }

        // Find slot inside level.slots array
        const slot = level.slots.id(slotId);
        if (!slot) {
            await session.abortTransaction();
            session.endSession();
            return sendNotFoundResponse(res, "Slot not found...");
        }

        // Check if slot already free
        if (slot.isAvailable === true && slot.currentBookingId === null) {
            await session.abortTransaction();
            session.endSession();
            return sendBadRequestResponse(res, "Slot is already empty!");
        }

        // ✅ Find active parking record for this slot
        const activeParking = await ParkingDetail.findOne({
            slotId: slotId,
            status: "active"
        }).session(session);

        let updatedParking = null;

        // ✅ If active parking exists, update it (exitTime સેટ કરો)
        if (activeParking) {
            const exitDateTime = new Date();

            updatedParking = await ParkingDetail.findByIdAndUpdate(
                activeParking._id,
                {
                    exitTime: exitDateTime,
                    status: "completed"
                },
                { new: true, session }
            );
        }

        // ✅ Reset slot availability (માત્ર slot free કરો)
        slot.isAvailable = true;
        slot.currentBookingId = null;
        await level.save({ session });

        // ❌ NO DELETE OPERATIONS - data રહેશે

        await session.commitTransaction();
        session.endSession();

        return sendSuccessResponse(
            res,
            "Slot reset successfully! Parking record updated.",
            {
                slot: {
                    _id: slot._id,
                    isAvailable: slot.isAvailable,
                    currentBookingId: slot.currentBookingId
                },
                parkingUpdated: updatedParking ? {
                    _id: updatedParking._id,
                    vehicleId: updatedParking.vehicleId,
                    entryTime: updatedParking.entryTime,
                    exitTime: updatedParking.exitTime,
                    status: updatedParking.status
                } : "No active parking found"
            }
        );

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return ThrowError(res, 500, error.message);
    }
};