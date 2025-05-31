import express from 'express';
import { addVehicleDetails, getVehicleDetails, updateVehicleDetails, deleteVehicleDetails } from '../controllers/vehicleContoller.js';

const vehicleRoutes = express.Router();

vehicleRoutes.post("/addVehicleDetails", addVehicleDetails);
vehicleRoutes.get("/getVehicleDetails/:id", getVehicleDetails);
vehicleRoutes.put("/updateVehicleDetails/:id", updateVehicleDetails);
vehicleRoutes.delete("/deleteVehicleDetails/:id", deleteVehicleDetails);

export default vehicleRoutes