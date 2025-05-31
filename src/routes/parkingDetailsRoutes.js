import express from "express"
import { addParkingDetail, deleteParkingDetail, getCollectionDetails, getParkingDetails, getParkingReport, updateParkingDetail } from "../controllers/parkingDetailsController.js"

const parkingRoutes = express.Router()


parkingRoutes.post("/addParkingDetail", addParkingDetail)
parkingRoutes.put("/updateParkingDetail/:id", updateParkingDetail)
parkingRoutes.delete("/deleteParkingDetail/:id", deleteParkingDetail)
parkingRoutes.get("/getParkingDetails", getParkingDetails)
parkingRoutes.get("/getCollectionDetails", getCollectionDetails)


parkingRoutes.get("/getParkingReport", getParkingReport)


export default parkingRoutes