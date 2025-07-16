import express from 'express';
import { changeEmployeePassword, createEmployee, deleteEmployee, editEmployee, forgotEmployeePassword, getAllEmployee, getEmployeeById, loginEmployee, resetPassword, VerifyEmail } from '../controllers/employeeController.js';
import upload, { convertJfifToJpeg } from '../middlewares/imageupload.js';
import { verifyToken } from '../middlewares/auth.js';

const employeeRoutes = express.Router();

employeeRoutes.post("/createEmployee", upload.single("emp_image"), convertJfifToJpeg, createEmployee)
employeeRoutes.get("/getEmployeeById/:id", getEmployeeById)
employeeRoutes.get("/getAllEmployee", getAllEmployee)
employeeRoutes.put("/editEmployee/:id", upload.single("emp_image"), convertJfifToJpeg, editEmployee)
employeeRoutes.delete("/deleteEmployee/:id", deleteEmployee)


employeeRoutes.post("/loginEmployee", loginEmployee)
employeeRoutes.post("/forgotEmployeePassword", forgotEmployeePassword)
employeeRoutes.post("/VerifyEmail", verifyToken, VerifyEmail)
employeeRoutes.post("/resetPassword", verifyToken, resetPassword)
employeeRoutes.post("/changeEmployeePassword/:id", verifyToken, changeEmployeePassword)

export default employeeRoutes