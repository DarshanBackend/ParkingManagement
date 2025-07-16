import express from 'express';
import { createShift, getAllShifts, updateShift, deleteShift } from '../controllers/shiftCnontroller.js';
import { isUser, verifyToken } from '../middlewares/auth.js';

const shiftRoutes = express.Router();

shiftRoutes.post("/createShift", verifyToken, isUser, createShift);
shiftRoutes.get("/getAllShifts", verifyToken, isUser, getAllShifts);
shiftRoutes.put("/updateShift/:id", verifyToken, isUser, updateShift);
shiftRoutes.delete("/deleteShift/:id", verifyToken, isUser, deleteShift);

export default shiftRoutes