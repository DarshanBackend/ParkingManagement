import express from 'express';
import { createEmployee, deleteEmployee, editEmployee, getAllEmployee, getEmployeeById } from '../controllers/employeeController.js';
import upload, { convertJfifToJpeg } from '../middlewares/imageupload.js';

const employeeRoutes = express.Router();

employeeRoutes.post("/createEmployee", upload.single("emp_image"), convertJfifToJpeg, createEmployee)
employeeRoutes.get("/getEmployeeById/:id", getEmployeeById)
employeeRoutes.get("/getAllEmployee", getAllEmployee)
employeeRoutes.put("/editEmployee/:id", upload.single("emp_image"), convertJfifToJpeg, editEmployee)
employeeRoutes.delete("/deleteEmployee/:id", deleteEmployee)

export default employeeRoutes