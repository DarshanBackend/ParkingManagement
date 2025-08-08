import express from 'express';
import { addLevelWithSlot, deleteLevel, deleteSlotFromLevel, getAllLevel, getAllSlots, getLevelById, updateLevel } from '../controllers/levelController.js';
import { isUser, verifyToken } from '../middlewares/auth.js';

const levelRoutes = express.Router();

levelRoutes.post("/addLevelWithSlot", verifyToken, isUser, addLevelWithSlot);
levelRoutes.get("/getAllLevel", verifyToken, isUser, getAllLevel);
levelRoutes.get("/getLevelById/:id", verifyToken, isUser, getLevelById);
levelRoutes.put("/updateLevel/:id", verifyToken, isUser, updateLevel);
levelRoutes.get("/getAllSlots", verifyToken, isUser, getAllSlots);
levelRoutes.delete("/deleteLevel/:id", verifyToken, isUser, deleteLevel);
levelRoutes.delete("/deleteSlotFromLevel/:levelId/slot/:slotNo", verifyToken, isUser, deleteSlotFromLevel);

export default levelRoutes