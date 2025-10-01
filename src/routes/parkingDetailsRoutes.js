import express from "express"
import { addParkingDetail, deleteParkingDetail, getCollectionDetails, getParkingDetails, getParkingHistory, getParkingReport, searchVehicleReport, updateParkingDetail } from "../controllers/parkingDetailsController.js"


const parkingRoutes = express.Router()


parkingRoutes.post("/addParkingDetail", addParkingDetail)
parkingRoutes.put("/updateParkingDetail/:id", updateParkingDetail)
parkingRoutes.delete("/deleteParkingDetail/:id", deleteParkingDetail)
parkingRoutes.get("/getParkingDetails", getParkingDetails)
parkingRoutes.get("/getCollectionDetails", getCollectionDetails)


parkingRoutes.get("/getParkingReport", getParkingReport)
parkingRoutes.get("/searchVehicleReport", searchVehicleReport)
parkingRoutes.get("/getParkingHistory", getParkingHistory)


export default parkingRoutes