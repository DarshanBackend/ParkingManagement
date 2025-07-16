import express from "express"
import { getBookingSummary, getCheckinSummary, getCurrentRevenue, getHourlyRevenueToday, getParkingOverview, getParkingTypeSummary, getParkingVolumeOverview, getRecentTransactions, getRevenueAnalytics, getTotalRevenue } from "../controllers/dashBoardController.js"
import { verifyToken } from "../middlewares/auth.js"

const dashBoardRoutes = express.Router()

//getCheckinSummary Routes
dashBoardRoutes.get("/getCheckinSummary", verifyToken, getCheckinSummary)
dashBoardRoutes.get("/getParkingOverview", verifyToken, getParkingOverview)
dashBoardRoutes.get("/getParkingVolumeOverview", verifyToken, getParkingVolumeOverview)
dashBoardRoutes.get("/getRevenueAnalytics", verifyToken, getRevenueAnalytics)
dashBoardRoutes.get("/getBookingSummary", verifyToken, getBookingSummary)
dashBoardRoutes.get("/getParkingTypeSummary", verifyToken, getParkingTypeSummary)
dashBoardRoutes.get("/getCurrentRevenue", verifyToken, getCurrentRevenue)

//revenue data
dashBoardRoutes.get("/getTotalRevenue", verifyToken, getTotalRevenue)
dashBoardRoutes.get("/getHourlyRevenueToday", verifyToken, getHourlyRevenueToday)
dashBoardRoutes.get("/getRecentTransactions", verifyToken, getRecentTransactions)

export default dashBoardRoutes