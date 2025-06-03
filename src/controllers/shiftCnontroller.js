import shiftModel from "../models/shiftModel.js";
import { ThrowError } from "../utils/Errorutils.js";

export const createShift = async (req, res) => {
    try {
        const { shiftName, startTime, endTime } = req.body;

        const existing = await shiftModel.findOne({ shiftName });
        if (existing) {
            return ThrowError(res, 400, "Shift name already exists");
        }

        const newShift = new shiftModel({ shiftName, startTime, endTime });
        await newShift.save();

        return res.status(201).json({
            message: "Shift created successfully",
            data: newShift
        });
    } catch (error) {
        console.error("Error in createShift:", error);
        return ThrowError(res, 500, error.message);
    }
};

export const getAllShifts = async (req, res) => {
    try {
        const shifts = await shiftModel.find();

        if (shifts.length === 0) {
            return res.status(200).json({ message: "No shifts found." });
        }

        return res.status(200).json({
            message: "Shifts fetched successfully",
            data: shifts
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const updateShift = async (req, res) => {
    try {
        const { id } = req.params;
        const { shiftName, startTime, endTime } = req.body;

        const updated = await shiftModel.findByIdAndUpdate(
            id,
            { shiftName, startTime, endTime },
            { new: true }
        );

        if (!updated) {
            return ThrowError(res, 404, "Shift not found");
        }

        return res.status(200).json({
            message: "Shift updated successfully",
            data: updated
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const deleteShift = async (req, res) => {
    try {
        const { id } = req.params;

        const shift = await shiftModel.findByIdAndDelete(id);

        if (!shift) return ThrowError(res, 404, "Shift not found");

        return res.status(200).json({ message: "Shift deleted successfully" });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

