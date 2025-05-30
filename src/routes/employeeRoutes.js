import express from 'express';
import { addEmployee, getEmployees } from '../controllers/employeeController.js';
import upload, { convertImage } from '../middlewares/imageupload.js';

const employeeRoutes = express.Router();

employeeRoutes.post("/addEmployee", upload.single("employeeimage"),convertImage , addEmployee)
employeeRoutes.get("/getEmployees/:id", getEmployees)

export default employeeRoutes