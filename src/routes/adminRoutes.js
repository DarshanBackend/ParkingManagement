import express from 'express';
import { addAdmin, adminAndEmployeechangePassword, adminAndEmployeeForgotPassword, adminAndEmployeeResetPassword, adminAndEmployeeVerifyEmail, deleteAdmin, getAdminById, login, loginAdmin, updateAdmin } from '../controllers/adminController.js';
import upload, { convertJfifToJpeg } from '../middlewares/imageupload.js';
import { verifyToken } from '../middlewares/auth.js';

const userRoutes = express.Router();

userRoutes.post('/addAdmin', addAdmin);
userRoutes.get('/getAdminById/:id', verifyToken, getAdminById);
userRoutes.put('/updateAdmin/:id', upload.single("image"), convertJfifToJpeg, updateAdmin);
userRoutes.delete('/deleteAdmin/:id', deleteAdmin);
userRoutes.post('/loginAdmin', loginAdmin);
userRoutes.post('/login', login);
userRoutes.post('/adminAndemployeeForgotPassword', adminAndEmployeeForgotPassword);
userRoutes.post('/adminAndEmployeeVerifyEmail', adminAndEmployeeVerifyEmail);
userRoutes.post('/adminAndEmployeeResetPassword', adminAndEmployeeResetPassword);
userRoutes.post('/adminAndEmployeechangePassword',verifyToken, adminAndEmployeechangePassword);

export default userRoutes;