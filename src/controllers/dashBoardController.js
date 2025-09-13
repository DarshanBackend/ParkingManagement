import { ThrowError } from "../utils/Errorutils.js";
import parkingDetailModel from "../models/parkingDetailsModel.js";
import vehicleModel from "../models/vehicleModel.js";
import moment from "moment";
import levelModel from "../models/levelModel.js";

export const getLevelSlotSummaryById = async (req, res) => {
    try {
        const { levelId } = req.params;

        const level = await levelModel.findById(levelId).lean();
        if (!level) return res.status(404).json({ message: "Level not found" });

        const totalSlots = level.slots.length;
        const availableSlots = level.slots.filter(s => s.isAvailable).length;

        let totalCar = 0;
        let totalBike = 0;
        let totalTruck = 0;

        for (const slot of level.slots) {
            if (!slot.isAvailable) {
                // Find vehicle parked here
                const vehicle = await vehicleModel.findOne({ slotId: slot._id }).lean();
                if (vehicle) {
                    const cat = vehicle.category?.toLowerCase();
                    if (cat === "car") totalCar++;
                    else if (cat === "bike") totalBike++;
                    else if (cat === "truck") totalTruck++;
                }
            } else {
                // Available slot: we can't know category unless predefined in slot
                const cat = slot.category?.toLowerCase();
                if (cat === "car") { totalCar++; }
                else if (cat === "bike") { totalBike++; }
                else if (cat === "truck") { totalTruck++; }
            }
        }

        res.status(200).json({
            levelNo: level.levelNo,
            totalSlots,
            availableSlots,
            car: totalCar,
            bike: totalBike,
            truck: totalTruck
        });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export const getTotalVehicleFixed = async (req, res) => {
    try {
        const { type } = req.query;
        let matchCondition = type === "checkOut" ? { exitTime: { $ne: null } } : { exitTime: null };

        // Try multiple possible collection names
        const possibleCollectionNames = ["vehicles", "vehicle", "Vehicle", "Vehicles"];
        let totals = [];

        for (const collectionName of possibleCollectionNames) {
            try {
                totals = await parkingDetailModel.aggregate([
                    { $match: matchCondition },
                    {
                        $lookup: {
                            from: collectionName,
                            localField: "vehicleId",
                            foreignField: "_id",
                            as: "vehicle"
                        }
                    },
                    { $unwind: { path: "$vehicle", preserveNullAndEmptyArrays: true } },
                    {
                        $group: {
                            _id: "$vehicle.category",
                            total: { $sum: 1 }
                        }
                    }
                ]);

                if (totals.some(item => item._id !== null)) {
                    console.log(`Found data using collection name: ${collectionName}`);
                    break;
                }
            } catch (err) {
                continue;
            }
        }

        const response = { Car: 0, Truck: 0, Bike: 0 };
        totals.forEach(item => {
            if (item._id) response[item._id] = item.total;
        });

        return res.status(200).json({
            success: true,
            message: `${type || 'checkIn'} vehicles fetched successfully`,
            result: response
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
}

// Get Parking Overview
export const getParkingOverview = async (req, res) => {
    try {
        // 1. Get all levels with their slots from the database
        const levels = await levelModel.aggregate([
            {
                $project: {
                    levelNo: 1,
                    totalSlots: { $size: "$slots" },
                    usedSlots: {
                        $size: {
                            $filter: {
                                input: "$slots",
                                as: "slot",
                                cond: { $eq: ["$$slot.isAvailable", false] }
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    levelName: { $concat: ["Level ", { $toString: "$levelNo" }] },
                    availableSlots: { $subtract: ["$totalSlots", "$usedSlots"] },
                    percentageUsed: {
                        $cond: [
                            { $eq: ["$totalSlots", 0] },
                            0,
                            { $round: [{ $multiply: [{ $divide: ["$usedSlots", "$totalSlots"] }, 100] }, 0] }
                        ]
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    level: "$levelName",
                    totalSlots: 1,
                    usedSlots: 1,
                    availableSlots: 1,
                    percentageUsed: { $concat: [{ $toString: "$percentageUsed" }, "%"] }
                }
            }
        ]);

        res.status(200).json(levels);
    } catch (error) {
        console.error("Error in getParkingOverview:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

//getVehicleVolume
export const getParkingVolumeOverview = async (req, res) => {
    try {
        const maxCapacity = (await levelModel.aggregate([
            { $project: { slotCount: { $size: "$slots" } } },
            { $group: { _id: null, total: { $sum: "$slotCount" } } }
        ]))[0]?.total || 0;

        // 2. Get current volume (vehicles in occupied slots)
        const currentVolume = await levelModel.aggregate([
            { $unwind: "$slots" },
            { $match: { "slots.isAvailable": false } },
            { $count: "occupiedSlots" }
        ]);

        res.status(200).json({
            currentVolume: currentVolume[0]?.occupiedSlots || 0,
            maxCapacity
        });
    } catch (error) {
        console.error("Error in getParkingVolumeOverview:", error);
        return ThrowError(res, 500, error.message);
    }
};

// Get Revenue Analytics Weekly
export const getWeeklyRevenueAnalytics = async (req, res) => {
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

// Get Revenue Analytics Monthly
export const getMonthlyRevenueAnalytics = async (req, res) => {
    try {
        const today = moment().startOf('day');
        const series = [];

        for (let i = 29; i >= 0; i--) {
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

        const todayRevenue = series[29].revenue;
        const yesterdayRevenue = series[28].revenue;

        res.status(200).json({
            today: todayRevenue,
            yesterday: yesterdayRevenue,
            series
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get Revenue Analytics Yearly
export const getYearlyRevenueAnalytics = async (req, res) => {
    try {
        const currentMonth = moment().startOf('month');
        const series = [];

        for (let i = 11; i >= 0; i--) {
            const startOfMonth = moment(currentMonth).subtract(i, 'months').startOf('month');
            const endOfMonth = moment(startOfMonth).endOf('month');

            const revenueData = await vehicleModel.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: startOfMonth.toDate(),
                            $lte: endOfMonth.toDate()
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
                month: startOfMonth.format("YYYY-MM"),
                revenue
            });
        }

        const thisMonthRevenue = series[11].revenue;
        const lastMonthRevenue = series[10].revenue;

        res.status(200).json({
            thisMonth: thisMonthRevenue,
            lastMonth: lastMonthRevenue,
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
        const todayStart = moment().startOf('day').toDate();
        const todayEnd = moment().endOf('day').toDate();
        const yesterdayStart = moment().subtract(1, 'day').startOf('day').toDate();
        const yesterdayEnd = moment().subtract(1, 'day').endOf('day').toDate();

        const result = await vehicleModel.aggregate([
            {
                $project: {
                    parkingCharges: 1,
                    paymentMethod: { $toLower: "$paymentMethod" },
                    createdAt: 1
                }
            },
            {
                $facet: {
                    overall: [
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
                    ],
                    today: [
                        {
                            $match: {
                                createdAt: { $gte: todayStart, $lte: todayEnd }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                todayRevenue: { $sum: "$parkingCharges" }
                            }
                        }
                    ],
                    yesterday: [
                        {
                            $match: {
                                createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                yesterdayRevenue: { $sum: "$parkingCharges" }
                            }
                        }
                    ]
                }
            }
        ]);

        const overall = result[0]?.overall[0] || { totalRevenue: 0, online: 0, offline: 0 };
        const todayRevenue = result[0]?.today[0]?.todayRevenue || 0;
        const yesterdayRevenue = result[0]?.yesterday[0]?.yesterdayRevenue || 0;

        let percentChange = 0;
        let direction = "no change";

        if (yesterdayRevenue === 0 && todayRevenue > 0) {
            percentChange = 100;
            direction = "increase";
        } else if (yesterdayRevenue > 0) {
            percentChange = Math.abs(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100).toFixed(2);
            direction = todayRevenue > yesterdayRevenue ? "increase" : todayRevenue < yesterdayRevenue ? "decrease" : "no change";
        }

        res.status(200).json({
            totalRevenue: overall.totalRevenue,
            online: overall.online,
            offline: overall.offline,
            percentChange: parseFloat(percentChange),
            direction
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
        const now = new Date();

        const transactions = await parkingDetailModel.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('vehicleId');

        const result = transactions.map(detail => {
            const vehicle = detail.vehicleId;

            // ⏱️ Duration calculation
            const durationInMinutes = Math.round(
                (now - new Date(detail.createdAt)) / (1000 * 60)
            );

            const hours = Math.floor(durationInMinutes / 60);
            const minutes = durationInMinutes % 60;

            const durationText =
                `${hours} hr${hours !== 1 ? 's' : ''} ` +
                `${minutes} min${minutes !== 1 ? 's' : ''} Duration`;

            return {
                vehicleType: vehicle?.category || 'Unknown',
                vehicleNumber: vehicle?.vehicleNumber || 'Unknown',
                duration: durationText,
                amount: vehicle?.parkingCharges || 0,
            };
        });

        res.status(200).json({ recentTransactions: result });
    } catch (error) {
        console.error("getRecentTransactions error:", error);
        return ThrowError(res, 500, error.message);
    }
};
