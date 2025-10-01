import express from 'express';
import { createShift, getAllShifts, updateShift, deleteShift } from '../controllers/shiftCnontroller.js';

const shiftRoutes = express.Router();

shiftRoutes.post("/createShift", createShift);
shiftRoutes.get("/getAllShifts", getAllShifts);
shiftRoutes.put("/updateShift/:id", updateShift);
shiftRoutes.delete("/deleteShift/:id", deleteShift);

export default shiftRoutes