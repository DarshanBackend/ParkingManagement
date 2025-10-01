import express from "express"
import { getBookingSummary, getCurrentRevenue, getHourlyRevenueToday, getLevelSlotSummaryById, getMonthlyRevenueAnalytics, getParkingOverview, getParkingTypeSummary, getParkingVolumeOverview, getRecentTransactions, getTotalRevenue, getTotalVehicleFixed, getTransactionsByDate, getWeeklyRevenueAnalytics, getYearlyRevenueAnalytics } from "../controllers/dashBoardController.js"

const dashBoardRoutes = express.Router()

//getCheckinSummary Routes
dashBoardRoutes.get("/getLevelSlotSummaryById/:levelId", getLevelSlotSummaryById)
dashBoardRoutes.get("/getTotalVehicleFixed", getTotalVehicleFixed)
dashBoardRoutes.get("/getParkingOverview", getParkingOverview)
dashBoardRoutes.get("/getParkingVolumeOverview", getParkingVolumeOverview)
dashBoardRoutes.get("/getWeeklyRevenueAnalytics", getWeeklyRevenueAnalytics)
dashBoardRoutes.get("/getMonthlyRevenueAnalytics", getMonthlyRevenueAnalytics)
dashBoardRoutes.get("/getYearlyRevenueAnalytics", getYearlyRevenueAnalytics)
dashBoardRoutes.get("/getBookingSummary", getBookingSummary)
dashBoardRoutes.get("/getParkingTypeSummary", getParkingTypeSummary)
dashBoardRoutes.get("/getCurrentRevenue", getCurrentRevenue)

//revenue data
dashBoardRoutes.get("/getTotalRevenue", getTotalRevenue)
dashBoardRoutes.get("/getHourlyRevenueToday", getHourlyRevenueToday)
dashBoardRoutes.get("/getRecentTransactions", getRecentTransactions)
dashBoardRoutes.get("/getTransactionsByDate", getTransactionsByDate)

export default dashBoardRoutes