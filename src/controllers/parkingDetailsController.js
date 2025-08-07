import { ThrowError } from "../utils/Errorutils.js";
import parkingDetailsModel from "../models/parkingDetailsModel.js";
import vehicalModel from "../models/vehicleModel.js";
import moment from "moment";

//addParkingDetails
export const addParkingDetail = async (req, res) => {
    try {
        const { vehicleId, entryTime, exitTime } = req.body;

        // 🔍 Basic validation
        if (!vehicleId || !entryTime || !exitTime) {
            return res.status(400).json({
                message: "vehicleId, entryTime, and exitTime are required."
            });
        }

        // 🔍 Ensure vehicle exists
        const vehicle = await vehicalModel.findById(vehicleId);
        if (!vehicle) {
            return res.status(404).json({ message: "Vehicle not found." });
        }

        // 🕐 Format today's date with entry/exit times
        const today = moment().format("YYYY-MM-DD");

        const entryDateTime = moment(
            `${today} ${entryTime}`,
            "YYYY-MM-DD hh:mm A"
        ).toDate();

        const exitDateTime = moment(
            `${today} ${exitTime}`,
            "YYYY-MM-DD hh:mm A"
        ).toDate();

        // ❗ Validation: Entry must be before exit
        if (entryDateTime >= exitDateTime) {
            return res.status(400).json({
                message: "Entry time must be before exit time."
            });
        }

        // 🔄 Check for existing entry (loose duplicate check)
        const exists = await parkingDetailsModel.findOne({
            vehicleId,
            entryTime: entryDateTime
        });

        if (exists) {
            return res.status(409).json({
                message: "Duplicate entry. Parking detail already exists for this time."
            });
        }

        // ✅ Save to DB
        const newDetail = new parkingDetailsModel({
            vehicleId,
            entryTime: entryDateTime,
            exitTime: exitDateTime
        });

        await newDetail.save();

        // ⏱️ Calculate parking duration
        const duration = moment(exitDateTime).diff(moment(entryDateTime), 'minutes');

        // 📦 Send response
        res.status(201).json({
            message: "Parking detail added successfully.",
            data: {
                _id: newDetail._id,
                vehicleId: newDetail.vehicleId,
                entryTime: {
                    date: moment(entryDateTime).format("DD-MMM-YYYY"),
                    time: moment(entryDateTime).format("hh:mm A")
                },
                exitTime: {
                    date: moment(exitDateTime).format("DD-MMM-YYYY"),
                    time: moment(exitDateTime).format("hh:mm A")
                },
                duration: `${duration} Mins`,
                createdAt: newDetail.createdAt,
                updatedAt: newDetail.updatedAt
            }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//updateParkingDetails
export const updateParkingDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const { entryTime, exitTime } = req.body;

        if (!entryTime || !exitTime) {
            return res.status(400).json({ message: "Both entryTime and exitTime are required." });
        }

        const today = moment().format("YYYY-MM-DD");
        const entryDateTime = moment(`${today} ${entryTime}`, "YYYY-MM-DD hh:mm A").toDate();
        const exitDateTime = moment(`${today} ${exitTime}`, "YYYY-MM-DD hh:mm A").toDate();

        const updated = await parkingDetailsModel.findByIdAndUpdate(
            id,
            { entryTime: entryDateTime, exitTime: exitDateTime },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ message: "Parking detail not found." });
        }

        res.status(200).json({
            message: "Parking detail updated successfully.",
            data: {
                _id: updated._id,
                vehicleId: updated.vehicleId,
                entryTime: {
                    date: moment(updated.entryTime).format("DD-MMM-YYYY"),
                    time: moment(updated.entryTime).format("hh:mm A")
                },
                exitTime: {
                    date: moment(updated.exitTime).format("DD-MMM-YYYY"),
                    time: moment(updated.exitTime).format("hh:mm A")
                },
                createdAt: updated.createdAt,
                updatedAt: updated.updatedAt
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
        const deleted = await parkingDetailsModel.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ message: "Parking detail not found." });
        }

        res.status(200).json({ message: "Parking detail deleted successfully." });
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
        const report = await parkingDetailsModel.find()
            .populate("vehicleId")
            .sort({ entryTime: 1 });

        const formatted = report.map((item, index) => {
            const vehicle = item.vehicleId;
            const entry = moment(item.entryTime);
            const exit = moment(item.exitTime);
            const durationMins = exit.diff(entry, "minutes");

            const hours = Math.floor(durationMins / 60);
            const mins = durationMins % 60;
            let totalTime = "";
            if (hours > 0) totalTime += `${hours} hr${hours > 1 ? "s" : ""}`;
            if (mins > 0) totalTime += (totalTime ? " " : "") + `${mins} Min${mins > 1 ? "s" : ""}`;
            if (!totalTime) totalTime = "0 Min";

            return {
                no: (index + 1).toString().padStart(2, '0'),
                date: moment(item.entryTime).format("DD MMMM YYYY"),
                vehicleNumber: vehicle.vehicleNumber,
                vehicleType: vehicle.category,
                slotNo: vehicle.slotNo,
                inTime: entry.format("hh:mm A"),
                outTime: exit.format("hh:mm A"),
                totalTime: totalTime
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