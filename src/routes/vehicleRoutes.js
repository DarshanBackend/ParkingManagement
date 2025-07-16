import express from 'express';
import { addVehicleDetails, getVehicleDetails, updateVehicleDetails, deleteVehicleDetails, getAllVehicleDetails } from '../controllers/vehicleController.js';
import { isUser, verifyToken } from '../middlewares/auth.js';

const vehicleRoutes = express.Router();

vehicleRoutes.post("/addVehicleDetails", verifyToken, isUser, addVehicleDetails);
vehicleRoutes.get("/getVehicleDetails/:id", verifyToken, isUser, getVehicleDetails);
vehicleRoutes.get("/getAllVehicleDetails", verifyToken, isUser, getAllVehicleDetails);
vehicleRoutes.put("/updateVehicleDetails/:id", verifyToken, isUser, updateVehicleDetails);
vehicleRoutes.delete("/deleteVehicleDetails/:id", verifyToken, isUser, deleteVehicleDetails);

export default vehicleRoutes