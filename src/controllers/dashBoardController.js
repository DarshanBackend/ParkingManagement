import { ThrowError } from "../utils/Errorutils.js";
import parkingDetailModel from "../models/parkingDetailsModel.js";
import vehicleModel from "../models/vehicleModel.js";
import moment from "moment";

//getCheckingSummary
export const getCheckinSummary = async (req, res) => {
    try {
        const summary = await parkingDetailsModel.aggregate([
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
                $group: {
                    _id: "$vehicle.category",
                    count: { $sum: 1 }
                }
            }
        ]);

        const formatted = {
            car: summary.find(v => v._id === "Car")?.count || 0,
            bike: summary.find(v => v._id === "Bike")?.count || 0,
            truck: summary.find(v => v._id === "Truck")?.count || 0
        };

        res.status(200).json(formatted);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get Parking Overview
export const getParkingOverview = async (req, res) => {
    try {
        const totalSlotsPerLevel = {
            "Level 1": 20,
            "Level 2": 20,
            "Level 3": 20,
            "Level 4": 20,
            "Level 5": 20
        };

        const usedSlots = await vehicleModel.aggregate([
            {
                $match: {
                    slotNo: { $regex: /^Level \d+/i } // Match any Level with number
                }
            },
            {
                $addFields: {
                    level: {
                        $regexFind: {
                            input: "$slotNo",
                            regex: /Level \d+/i
                        }
                    }
                }
            },
            {
                $addFields: {
                    level: "$level.match"
                }
            },
            {
                $group: {
                    _id: "$level",
                    usedCount: { $sum: 1 }
                }
            }
        ]);

        const result = Object.entries(totalSlotsPerLevel).map(([level, total]) => {
            const match = usedSlots.find(l => l._id?.toLowerCase() === level.toLowerCase());
            const used = match ? match.usedCount : 0;
            const percent = Math.round((used / total) * 100);

            return {
                level,
                usedSlots: used,
                totalSlots: total,
                percentUsed: percent
            };
        });

        res.status(200).json(result);
    } catch (error) {
       return ThrowError(res, 500, error.message);
    }
};

//getVehicleVolume
export const getParkingVolumeOverview = async (req, res) => {
    try {
        const maxCapacity = 10000; // Total possible slots in all levels

        const currentVolume = await vehicleModel.countDocuments(); // Total used slots

        res.status(200).json({
            currentVolume,
            maxCapacity,
        });
    } catch (error) {
       return ThrowError(res, 500, error.message);
    }
};

// Get Revenue Analytics 

export const getRevenueAnalytics = async (req, res) => {
    try {
        const today = moment().startOf('day');
        const series = [];

        for (let i = 6; i >= 0; i--) {
            const date = moment(today).subtract(i, 'days');
            const nextDate = moment(date).add(1, 'day');

            const revenueData = await vehicleModel.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: date.toDate(),
                            $lt: nextDate.toDate()
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: "$parkingCharges" }
                    }
                }
            ]);

            const revenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

            series.push({
                date: date.format("YYYY-MM-DD"),
                revenue
            });
        }

        const todayRevenue = series[6].revenue;
        const yesterdayRevenue = series[5].revenue;

        res.status(200).json({
            today: todayRevenue,
            yesterday: yesterdayRevenue,
            series
        });
    } catch (error) {
       return ThrowError(res, 500, error.message);
    }
};

// Get Booking Summary
export const getBookingSummary = async (req, res) => {
    try {
        const today = moment().startOf('day').toDate();
        const tomorrow = moment().endOf('day').toDate();

        const todayCount = await parkingDetailsModel.countDocuments({ entryTime: { $gte: today, $lte: tomorrow } });
        const yesterdayCount = await parkingDetailsModel.countDocuments({ entryTime: { $gte: moment(today).subtract(1, 'day').toDate(), $lt: today } });

        const percentChange = yesterdayCount > 0 ? (((todayCount - yesterdayCount) / yesterdayCount) * 100).toFixed(2) : 100;

        res.status(200).json({
            bookedToday: todayCount,
            percentChange: Math.abs(percentChange),
            direction: todayCount >= yesterdayCount ? "increase" : "decrease"
        });
    } catch (error) {
       return ThrowError(res, 500, error.message);
    }
};

// Get Parking Type Summary
export const getParkingTypeSummary = async (req, res) => {
    try {
        const shortTime = await parkingDetailsModel.countDocuments({
            $expr: {
                $lte: [
                    { $subtract: ["$exitTime", "$entryTime"] },
                    1000 * 60 * 60 * 2
                ]
            }
        });

        const longTime = await parkingDetailsModel.countDocuments({
            $expr: {
                $gt: [
                    { $subtract: ["$exitTime", "$entryTime"] },
                    1000 * 60 * 60 * 2
                ]
            }
        });

        res.status(200).json({ shortTime, longTime });
    } catch (error) {
       return ThrowError(res, 500, error.message);
    }
};

// Get Current Revenue
export const getCurrentRevenue = async (req, res) => {
    try {
        const total = await parkingDetailsModel.aggregate([
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
                $group: {
                    _id: null,
                    total: { $sum: "$vehicle.parkingCharges" }
                }
            }
        ]);

        res.status(200).json({ revenue: total[0]?.total || 0 });
    } catch (error) {
       return ThrowError(res, 500, error.message);
    }
};

// getTotalRevenue
export const getTotalRevenue = async (req, res) => {
    try {
        const [totalResult, onlineResult, offlineResult] = await Promise.all([
            vehicleModel.aggregate([
                { $group: { _id: null, total: { $sum: "$parkingCharges" } } }
            ]),
            vehicleModel.aggregate([
                { $match: { paymentMethod: "Online" } },
                { $group: { _id: null, total: { $sum: "$parkingCharges" } } }
            ]),
            vehicleModel.aggregate([
                { $match: { paymentMethod: "Offline" } },
                { $group: { _id: null, total: { $sum: "$parkingCharges" } } }
            ])
        ]);

        res.status(200).json({
            totalRevenue: totalResult[0]?.total || 0,
            online: onlineResult[0]?.total || 0,
            offline: offlineResult[0]?.total || 0,
        });
    } catch (error) {
       return ThrowError(res, 500, error.message);
    }
};

// getHourlyRevenueToday
export const getHourlyRevenueToday = async (req, res) => {
    try {
        const start = moment().startOf("day");
        const end = moment().endOf("day");

        const hourly = await vehicleModel.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: start.toDate(),
                        $lte: end.toDate()
                    }
                }
            },
            {
                $project: {
                    hour: { $hour: "$createdAt" },
                    parkingCharges: 1
                }
            },
            {
                $group: {
                    _id: "$hour",
                    total: { $sum: "$parkingCharges" }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        const series = [];
        for (let h = 0; h < 24; h++) {
            const entry = hourly.find(e => e._id === h);
            series.push({
                hour: `${h}:00`,
                revenue: entry ? entry.total : 0
            });
        }

        res.status(200).json(series);
    } catch (error) {
       return ThrowError(res, 500, error.message);
    }
};

//getRecentTransactions
export const getRecentTransactions = async (req, res) => {
    try {
        // Get latest 5 vehicle entries
        const vehicles = await vehicleModel
            .find({})
            .sort({ createdAt: -1 })
            .limit(5);

        const formatted = await Promise.all(vehicles.map(async (vehicle) => {
            // Find corresponding parking detail
            const parkingDetail = await parkingDetailModel.findOne({ vehicleId: vehicle._id });

            let duration = "Time Missing";

            if (parkingDetail && parkingDetail.entryTime && parkingDetail.exitTime) {
                const inTime = moment(parkingDetail.entryTime);
                const outTime = moment(parkingDetail.exitTime);

                if (inTime.isValid() && outTime.isValid()) {
                    const diffMinutes = outTime.diff(inTime, "minutes");

                    if (diffMinutes >= 0) {
                        if (diffMinutes >= 60) {
                            const hours = Math.floor(diffMinutes / 60);
                            const mins = diffMinutes % 60;
                            duration = mins > 0
                                ? `${hours} hr ${mins} min Duration`
                                : `${hours} hr Duration`;
                        } else {
                            duration = `${diffMinutes} min Duration`;
                        }
                    } else {
                        duration = "Invalid Duration";
                    }
                } else {
                    duration = "Invalid Time";
                }
            }

            return {
                vehicleNumber: vehicle.vehicleNumber?.trim(),
                vehicleType: vehicle.category,
                amount: vehicle.parkingCharges,
                duration,
                createdAt: vehicle.createdAt
            };
        }));

        res.status(200).json(formatted);
    } catch (error) {
        console.error("getRecentTransactions error:", error);
       return ThrowError(res, 500, error.message);
    }
};