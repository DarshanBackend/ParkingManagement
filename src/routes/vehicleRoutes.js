import express from 'express';
import { addVehicleDetails, getVehicleDetails, updateVehicleDetails, deleteVehicleDetails, getAllVehicleDetails } from '../controllers/vehicleController.js';

const vehicleRoutes = express.Router();

vehicleRoutes.post("/addVehicleDetails", addVehicleDetails);
vehicleRoutes.get("/getVehicleDetails/:id", getVehicleDetails);
vehicleRoutes.get("/getAllVehicleDetails", getAllVehicleDetails);
vehicleRoutes.put("/updateVehicleDetails/:id", updateVehicleDetails);
vehicleRoutes.delete("/deleteVehicleDetails/:id", deleteVehicleDetails);

export default vehicleRoutes