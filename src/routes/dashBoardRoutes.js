import express from "express"
import { getBookingSummary, getCurrentRevenue, getHourlyRevenueToday, getLevelSlotSummaryById, getMonthlyRevenueAnalytics, getParkingOverview, getParkingTypeSummary, getParkingVolumeOverview, getRecentTransactions, getTotalRevenue, getTotalVehicleFixed, getTransactionsByDate, getWeeklyRevenueAnalytics, getYearlyRevenueAnalytics } from "../controllers/dashBoardController.js"
import { verifyToken } from "../middlewares/auth.js"

const dashBoardRoutes = express.Router()

//getCheckinSummary Routes
dashBoardRoutes.get("/getLevelSlotSummaryById/:levelId", verifyToken, getLevelSlotSummaryById)
dashBoardRoutes.get("/getTotalVehicleFixed", verifyToken, getTotalVehicleFixed)
dashBoardRoutes.get("/getParkingOverview", verifyToken, getParkingOverview)
dashBoardRoutes.get("/getParkingVolumeOverview", verifyToken, getParkingVolumeOverview)
dashBoardRoutes.get("/getWeeklyRevenueAnalytics", verifyToken, getWeeklyRevenueAnalytics)
dashBoardRoutes.get("/getMonthlyRevenueAnalytics", verifyToken, getMonthlyRevenueAnalytics)
dashBoardRoutes.get("/getYearlyRevenueAnalytics", verifyToken, getYearlyRevenueAnalytics)
dashBoardRoutes.get("/getBookingSummary", verifyToken, getBookingSummary)
dashBoardRoutes.get("/getParkingTypeSummary", verifyToken, getParkingTypeSummary)
dashBoardRoutes.get("/getCurrentRevenue", verifyToken, getCurrentRevenue)

//revenue data
dashBoardRoutes.get("/getTotalRevenue", verifyToken, getTotalRevenue)
dashBoardRoutes.get("/getHourlyRevenueToday", verifyToken, getHourlyRevenueToday)
dashBoardRoutes.get("/getRecentTransactions", verifyToken, getRecentTransactions)
dashBoardRoutes.get("/getTransactionsByDate", verifyToken, getTransactionsByDate)

export default dashBoardRoutes