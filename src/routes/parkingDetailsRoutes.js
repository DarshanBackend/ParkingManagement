import express from "express"
import { addParkingDetail, deleteParkingDetail, getCollectionDetails, getParkingDetails, getParkingHistory, getParkingReport, searchVehicleReport, updateParkingDetail } from "../controllers/parkingDetailsController.js"
import { verifyToken, isUser } from "../middlewares/auth.js"


const parkingRoutes = express.Router()


parkingRoutes.post("/addParkingDetail", verifyToken, isUser, addParkingDetail)
parkingRoutes.put("/updateParkingDetail/:id", verifyToken, isUser, updateParkingDetail)
parkingRoutes.delete("/deleteParkingDetail/:id", verifyToken, isUser, deleteParkingDetail)
parkingRoutes.get("/getParkingDetails", verifyToken, isUser, getParkingDetails)
parkingRoutes.get("/getCollectionDetails", verifyToken, isUser, getCollectionDetails)


parkingRoutes.get("/getParkingReport", verifyToken, isUser, getParkingReport)
parkingRoutes.get("/searchVehicleReport", verifyToken, isUser, searchVehicleReport)
parkingRoutes.get("/getParkingHistory", verifyToken, isUser, getParkingHistory)


export default parkingRoutes