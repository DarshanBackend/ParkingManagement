import { ThrowError } from "../utils/Errorutils.js";
import parkingDetailModel from "../models/parkingDetailsModel.js";
import vehicleModel from "../models/vehicleModel.js";
import moment from "moment";

//getCheckingSummary
export const getCheckinSummary = async (req, res) => {
    try {
        const summary = await parkingDetailModel.aggregate([
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
// export const getParkingOverview = async (req, res) => {
//     try {
//         const totalSlotsPerLevel = {
//             "Level 1": 600,
//             "Level 2": 600,
//             "Level 3": 600,
//             "Level 4": 600,
//             "Level 5": 600
//         };

//         // Aggregate vehicle count grouped by level and type
//         const bookedVehicles = await vehicleModel.aggregate([
//             {
//                 $match: {
//                     slotNo: { $regex: /^Level \d+/i },
//                     category: { $in: ["Car", "Truck", "Bike"] }
//                 }
//             },
//             {
//                 $addFields: {
//                     level: {
//                         $regexFind: {
//                             input: "$slotNo",
//                             regex: /(Level \d+)/i
//                         }
//                     }
//                 }
//             },
//             {
//                 $match: {
//                     "level.match": { $ne: null }
//                 }
//             },
//             {
//                 $group: {
//                     _id: {
//                         level: "$level.match",
//                         category: "$category"
//                     },
//                     count: { $sum: 1 }
//                 }
//             }
//         ]);

//         // Map results into a structured format
//         const parkingMap = {};

//         bookedVehicles.forEach(({ _id, count }) => {
//             const { level, category } = _id;

//             if (!parkingMap[level]) {
//                 parkingMap[level] = { Car: 0, Truck: 0, Bike: 0 };
//             }

//             parkingMap[level][category] = count;
//         });

//         // Format response
//         const result = Object.entries(totalSlotsPerLevel).map(([level, total]) => {
//             const counts = parkingMap[level] || { Car: 0, Truck: 0, Bike: 0 };
//             const used = counts.Car + counts.Truck + counts.Bike;

//             return {
//                 level,
//                 totalSlots: total,
//                 availableSlots: total - used,
//                 vehicleCount: counts
//             };
//         });

//         res.status(200).json(result);
//     } catch (error) {
//         console.error("Error in getParkingOverview:", error);
//         res.status(500).json({ message: "Internal Server Error" });
//     }
// };
export const getParkingOverview = async (req, res) => {
    try {
        const totalSlotsPerLevel = {
            "Level 1": 600,
            "Level 2": 600,
            "Level 3": 600,
            "Level 4": 600,
            "Level 5": 600
        };

        // Aggregate booked vehicle count by level
        const bookedVehicles = await vehicleModel.aggregate([
            {
                $match: {
                    slotNo: { $regex: /^Level \d+/i },
                    category: { $in: ["Car", "Truck", "Bike"] }
                }
            },
            {
                $addFields: {
                    level: {
                        $regexFind: {
                            input: "$slotNo",
                            regex: /(Level \d+)/i
                        }
                    }
                }
            },
            {
                $match: {
                    "level.match": { $ne: null }
                }
            },
            {
                $group: {
                    _id: "$level.match",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Build result map
        const result = Object.entries(totalSlotsPerLevel).map(([level, total]) => {
            const match = bookedVehicles.find(bv => bv._id === level);
            const used = match ? match.count : 0;
            const percentageUsed = Math.round((used / total) * 100);

            return {
                level,
                totalSlots: total,
                usedSlots: used,
                availableSlots: total - used,
                percentageUsed: percentageUsed + "%"
            };
        });

        res.status(200).json(result);
    } catch (error) {
        console.error("Error in getParkingOverview:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

//getVehicleVolume
export const getParkingVolumeOverview = async (req, res) => {
    try {
        const totalSlotsPerLevel = {
            "Level 1": 600,
            "Level 2": 600,
            "Level 3": 600,
            "Level 4": 600,
            "Level 5": 600
        };

        const maxCapacity = Object.values(totalSlotsPerLevel).reduce((acc, val) => acc + val, 0);
        const currentVolume = await vehicleModel.countDocuments();

        res.status(200).json({
            currentVolume,
            maxCapacity
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

        const todayCount = await parkingDetailModel.countDocuments({ entryTime: { $gte: today, $lte: tomorrow } });
        const yesterdayCount = await parkingDetailModel.countDocuments({ entryTime: { $gte: moment(today).subtract(1, 'day').toDate(), $lt: today } });

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
        const shortTime = await parkingDetailModel.countDocuments({
            $expr: {
                $lte: [
                    { $subtract: ["$exitTime", "$entryTime"] },
                    1000 * 60 * 60 * 2
                ]
            }
        });

        const longTime = await parkingDetailModel.countDocuments({
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
        const total = await parkingDetailModel.aggregate([
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
        const result = await vehicleModel.aggregate([
            {
                $project: {
                    parkingCharges: 1,
                    paymentMethod: { $toLower: "$paymentMethod" }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$parkingCharges" },
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
            }
        ]);

        const data = result[0] || { totalRevenue: 0, online: 0, offline: 0 };

        res.status(200).json({
            totalRevenue: data.totalRevenue,
            online: data.online,
            offline: data.offline
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
