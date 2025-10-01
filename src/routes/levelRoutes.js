import express from 'express';
import { addLevelWithSlot, deleteLevel, deleteSlotFromLevel, editSlot, getAllLevel, getAllSlots, getLevelById, updateLevel } from '../controllers/levelController.js';

const levelRoutes = express.Router();

levelRoutes.post("/addLevelWithSlot", addLevelWithSlot);
levelRoutes.get("/getAllLevel", getAllLevel);
levelRoutes.get("/getLevelById/:id", getLevelById);
levelRoutes.put("/updateLevel/:id", updateLevel);
levelRoutes.put("/editSlot/:levelId/slots/:slotId", editSlot);
levelRoutes.get("/getAllSlots", getAllSlots);
levelRoutes.delete("/deleteLevel/:id", deleteLevel);
levelRoutes.delete("/deleteSlotFromLevel/:levelId/slot/:slotNo", deleteSlotFromLevel);

export default levelRoutes  