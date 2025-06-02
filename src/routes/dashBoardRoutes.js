import express from "express"
import { getBookingSummary, getCheckinSummary, getCurrentRevenue, getHourlyRevenueToday, getParkingOverview, getParkingTypeSummary, getParkingVolumeOverview, getRecentTransactions, getRevenueAnalytics, getTotalRevenue } from "../controllers/dashBoardController.js"

const dashBoardRoutes = express.Router()

//getCheckinSummary Routes
dashBoardRoutes.get("/getCheckinSummary", getCheckinSummary)
dashBoardRoutes.get("/getParkingOverview", getParkingOverview)
dashBoardRoutes.get("/getParkingVolumeOverview", getParkingVolumeOverview)
dashBoardRoutes.get("/getRevenueAnalytics", getRevenueAnalytics)
dashBoardRoutes.get("/getBookingSummary", getBookingSummary)
dashBoardRoutes.get("/getParkingTypeSummary", getParkingTypeSummary)
dashBoardRoutes.get("/getCurrentRevenue", getCurrentRevenue)

//revenue data
dashBoardRoutes.get("/getTotalRevenue", getTotalRevenue)
dashBoardRoutes.get("/getHourlyRevenueToday", getHourlyRevenueToday)
dashBoardRoutes.get("/getRecentTransactions", getRecentTransactions)

export default dashBoardRoutes