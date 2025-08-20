import parkingDetailsModel from "../models/parkingDetailsModel.js";
import vehicalModel from "../models/vehicleModel.js";
import moment from "moment";
import mongoose from "mongoose";
import levelModel from "../models/levelModel.js";

//addParkingDetails
export const addParkingDetail = async (req, res) => {
    try {
        const { vehicleId, entryTime, exitTime } = req.body;

        // 1. Basic validation
        if (!vehicleId || !entryTime) {
            return res.status(400).json({
                message: "vehicleId and entryTime are required",
                received: { vehicleId, entryTime, exitTime }
            });
        }

        // 2. Parse dates
        const parseDate = (dateString) => {
            if (!dateString) return null;
            if (moment(dateString, moment.ISO_8601, true).isValid()) {
                return new Date(dateString);
            }
            const formats = [
                "YYYY-MM-DD HH:mm:ss",
                "YYYY-MM-DD hh:mm A",
                "DD-MM-YYYY HH:mm:ss",
                "MM/DD/YYYY HH:mm:ss",
                "hh:mm A"
            ];
            const parsed = moment(dateString, formats, true);
            if (!parsed.isValid()) {
                throw new Error(`Invalid date format: ${dateString}`);
            }
            return parsed.toDate();
        };

        const entryDateTime = parseDate(entryTime);
        const exitDateTime = exitTime ? parseDate(exitTime) : null;

        // 3. Get vehicle and its assigned slot
        const vehicle = await vehicalModel.findById(vehicleId);
        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found" });
        }

        const slotId = vehicle.slotId;
        if (!slotId) {
            return res.status(400).json({ message: "Vehicle has no assigned slot" });
        }

        // 🚫 4. Check if vehicle already exists in parking model (any record)
        const duplicateParking = await parkingDetailsModel.findOne({ vehicleId });
        if (duplicateParking) {
            return res.status(400).json({
                message: "This vehicle already has a parking record",
                duplicateParking
            });
        }

        // 5. Check if slot is available
        const slot = await levelModel.findOne({
            "slots._id": slotId,
            "slots.isAvailable": true
        });
        if (!slot) {
            return res.status(400).json({
                message: "Assigned slot is not available",
                slotId
            });
        }

        // 6. Create parking record
        const parking = await parkingDetailsModel.create({
            vehicleId,
            levelId: slot._id,
            slotId,
            entryTime: entryDateTime,
            exitTime: exitDateTime,
            status: exitDateTime ? "completed" : "active"
        });

        // 7. Update slot status
        await levelModel.updateOne(
            { "slots._id": slotId },
            {
                $set: {
                    "slots.$.isAvailable": false,
                    "slots.$.currentBookingId": parking._id
                }
            }
        );

        res.status(201).json({
            message: "Parking added successfully",
            data: {
                parkingId: parking._id,
                vehicleId,
                slotId,
                entryTime: entryDateTime.toISOString(),
                exitTime: exitDateTime ? exitDateTime.toISOString() : null
            }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//updateParkingDetails
export const updateParkingDetail = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const { entryTime, exitTime } = req.body;

        // Validate parking record exists
        const parking = await parkingDetailsModel.findById(id).session(session);
        if (!parking) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Parking detail not found." });
        }

        // Helper to parse date/time strings
        const parseDate = (dateString) => {
            if (!dateString) return null;
            if (moment(dateString, moment.ISO_8601, true).isValid()) {
                return new Date(dateString);
            }
            const formats = [
                "YYYY-MM-DD HH:mm:ss",
                "YYYY-MM-DD hh:mm A",
                "DD-MM-YYYY HH:mm:ss",
                "MM/DD/YYYY HH:mm:ss",
                "hh:mm A"
            ];
            const parsed = moment(dateString, formats, true);
            if (!parsed.isValid()) throw new Error(`Invalid date format: ${dateString}`);
            return parsed.toDate();
        };

        let entryDateTime, exitDateTime;
        try {
            entryDateTime = entryTime ? parseDate(entryTime) : parking.entryTime;
            exitDateTime = exitTime ? parseDate(exitTime) : parking.exitTime;
        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: err.message });
        }

        // Validate entryTime <= exitTime if both present
        if (entryDateTime && exitDateTime && entryDateTime > exitDateTime) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "entryTime cannot be after exitTime." });
        }

        // Get vehicle & slot info
        const vehicle = await vehicalModel.findById(parking.vehicleId).session(session);
        if (!vehicle) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Associated vehicle not found." });
        }
        const slotId = vehicle.slotId;
        if (!slotId) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Vehicle has no assigned slot." });
        }

        // Determine if exitTime changed states
        const exitTimeChangedFromNullToValue = !parking.exitTime && exitDateTime;
        const exitTimeChangedFromValueToNull = parking.exitTime && !exitDateTime;

        if (exitTimeChangedFromNullToValue) {
            // Vehicle exited → free the slot
            await levelModel.updateOne(
                { "slots._id": slotId },
                {
                    $set: {
                        "slots.$.isAvailable": true,
                        "slots.$.currentBookingId": null
                    }
                }
            ).session(session);
        } else if (exitTimeChangedFromValueToNull) {
            // Vehicle re-entered or exit canceled → occupy the slot
            await levelModel.updateOne(
                { "slots._id": slotId },
                {
                    $set: {
                        "slots.$.isAvailable": false,
                        "slots.$.currentBookingId": parking._id
                    }
                }
            ).session(session);
        }
        // else no change to exitTime state → don't update slot availability

        // Update parking record with new times and status
        const status = exitDateTime ? "completed" : "active";
        const updatedParking = await parkingDetailsModel.findByIdAndUpdate(
            id,
            {
                entryTime: entryDateTime,
                exitTime: exitDateTime,
                status
            },
            { new: true, session }
        );

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            message: "Parking detail updated successfully.",
            data: {
                _id: updatedParking._id,
                vehicleId: updatedParking.vehicleId,
                entryTime: {
                    date: moment(updatedParking.entryTime).format("DD-MMM-YYYY"),
                    time: moment(updatedParking.entryTime).format("hh:mm A")
                },
                exitTime: updatedParking.exitTime ? {
                    date: moment(updatedParking.exitTime).format("DD-MMM-YYYY"),
                    time: moment(updatedParking.exitTime).format("hh:mm A")
                } : null,
                status: updatedParking.status,
                createdAt: updatedParking.createdAt,
                updatedAt: updatedParking.updatedAt
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//deleteParkingDetails
export const deleteParkingDetail = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Find and validate parking detail
        const parkingDetail = await parkingDetailsModel.findById(id);
        if (!parkingDetail) {
            return res.status(404).json({ message: "Parking detail not found." });
        }

        // 2. Free up the slot
        const slotUpdate = await levelModel.updateOne(
            { "slots._id": parkingDetail.slotId },
            {
                $set: {
                    "slots.$.isAvailable": true,
                    "slots.$.currentBookingId": null
                }
            }
        );

        if (slotUpdate.modifiedCount === 0) {
            return res.status(400).json({ message: "Failed to free parking slot." });
        }

        // 3. Delete parking record
        await parkingDetailsModel.findByIdAndDelete(id);

        res.status(200).json({
            message: "Parking exit processed successfully",
            freedSlotId: parkingDetail.slotId
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//getParkingDetails
export const getParkingDetails = async (req, res) => {
    try {
        const { date } = req.query; // format "YYYY-MM-DD"

        const filter = {};

        if (date) {
            const start = moment(date).startOf("day").toDate();
            const end = moment(date).endOf("day").toDate();
            filter.entryTime = { $gte: start, $lte: end };
        }

        const details = await parkingDetailsModel.find(filter)
            .populate("vehicleId");

        const formatted = details.map(detail => ({
            vehicleNumber: detail.vehicleId?.vehicleNumber || "N/A",
            entryTime: moment(detail.entryTime).format("DD-MMM-YYYY hh:mm A"),
            exitTime: moment(detail.exitTime).format("DD-MMM-YYYY hh:mm A"),
            parkingCharges: detail.vehicleId?.parkingCharges || 0
        }));

        res.status(200).json(formatted);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//getCollectionDetails
export const getCollectionDetails = async (req, res) => {
    try {
        const details = await parkingDetailsModel.aggregate([
            {
                $lookup: {
                    from: "vehicles",
                    localField: "vehicleId",
                    foreignField: "_id",
                    as: "vehicle"
                }
            },
            { $unwind: "$vehicle" },
            {
                $project: {
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$entryTime" } },
                    month: { $dateToString: { format: "%b %Y", date: "$entryTime" } },
                    parkingCharges: "$vehicle.parkingCharges",
                    paymentMethod: { $toLower: "$vehicle.paymentMethod" }
                }
            },
            {
                $group: {
                    _id: {
                        month: "$month",
                        date: "$date"
                    },
                    totalAmount: { $sum: "$parkingCharges" },
                    online: {
                        $sum: {
                            $cond: [{ $eq: ["$paymentMethod", "online"] }, "$parkingCharges", 0]
                        }
                    },
                    offline: {
                        $sum: {
                            $cond: [{ $eq: ["$paymentMethod", "offline"] }, "$parkingCharges", 0]
                        }
                    }
                }
            },
            {
                $addFields: {
                    totalAmount: { $add: ["$online", "$offline"] }
                }
            },
            {
                $group: {
                    _id: "$_id.month",
                    total: { $sum: "$totalAmount" },
                    days: {
                        $push: {
                            date: "$_id.date",
                            total: "$totalAmount",
                            details: {
                                Online: "$online",
                                Offline: "$offline"
                            }
                        }
                    }
                }
            },
            { $sort: { _id: -1 } }
        ]);

        const totalCollection = details.reduce((sum, m) => sum + m.total, 0);

        const formatted = details.map(month => ({
            month: month._id,
            total: month.total,
            days: month.days
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map(day => {
                    const showDetails = day.details.Online > 0 || day.details.Offline > 0;
                    return {
                        date: moment(day.date).format("DD MMM YYYY"),
                        total: day.total,
                        ...(showDetails ? { details: day.details } : {})
                    };
                })
        }));

        res.status(200).json({
            totalCollection,
            monthlyCollections: formatted
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//getParkingReport
export const getParkingReport = async (req, res) => {
    try {
        const reports = await parkingDetailsModel.find()
            .populate("vehicleId")
            .populate("levelId");

        const formatted = reports.map((item, index) => {
            const vehicle = item.vehicleId;

            // ✅ Check slot properly using stored slotId
            let slotNo = "N/A";
            if (item.levelId && item.slotId) {
                const slot = item.levelId.slots.id(item.slotId);
                if (slot) {
                    const levelLabel = typeof item.levelId.levelNo !== "undefined" && item.levelId.levelNo !== null
                        ? `Level ${item.levelId.levelNo}`
                        : "Level";
                    slotNo = `${levelLabel} - ${slot.slotNo}`;
                }
            }

            const entry = moment(item.entryTime);
            const exit = item.exitTime ? moment(item.exitTime) : moment();
            const durationMins = exit.diff(entry, "minutes");

            const hours = Math.floor(durationMins / 60);
            const mins = durationMins % 60;

            let totalTime = "";
            if (hours > 0) totalTime += `${hours} hr${hours > 1 ? "s" : ""}`;
            if (mins > 0) totalTime += (totalTime ? " " : "") + `${mins} Min${mins > 1 ? "s" : ""}`;
            if (!totalTime) totalTime = "0 Min";

            return {
                no: (index + 1).toString().padStart(2, "0"),
                date: entry.format("DD MMMM YYYY"),
                vehicleNumber: vehicle?.vehicleNumber || "N/A",
                vehicleType: vehicle?.category || "N/A",
                slotNo,   // ✅ now resolved properly
                inTime: entry.format("hh:mm A"),
                outTime: item.exitTime ? exit.format("hh:mm A") : "Active",
                totalTime
            };
        });

        res.status(200).json(formatted);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//getParkingHistory
export const getParkingHistory = async (req, res) => {
    try {
        const { from, to } = req.query;

        if (!from || !to) {
            return res.status(400).json({ message: "From and To dates are required." });
        }

        const fromDate = new Date(from);
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999); // include full 'to' day

        const history = await parkingDetailsModel.find({
            entryTime: { $gte: fromDate, $lte: toDate }
        })
            .populate("vehicleId", "vehicleNumber") // only fetch vehicleNumber from Vehicle model
            .sort({ entryTime: -1 });

        res.status(200).json({ history });
    } catch (err) {
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};