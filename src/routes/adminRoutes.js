import express from 'express';
import { addAdmin, changePassword, deleteAdmin, forgotPassword, getAdminById, login, loginAdmin, resetPassword, updateAdmin, VerifyEmail } from '../controllers/adminController.js';
import upload, { convertJfifToJpeg } from '../middlewares/imageupload.js';
import { verifyToken } from '../middlewares/auth.js';

const userRoutes = express.Router();

userRoutes.post('/addAdmin', addAdmin);
userRoutes.get('/getAdminById/:id', verifyToken, getAdminById);
userRoutes.put('/updateAdmin/:id', upload.single("image"), convertJfifToJpeg, updateAdmin);
userRoutes.delete('/deleteAdmin/:id', deleteAdmin);
userRoutes.post('/loginAdmin', loginAdmin);
userRoutes.post('/login', login);

userRoutes.post("/forgotPassword", forgotPassword)
userRoutes.post("/VerifyEmail",  VerifyEmail)
userRoutes.post("/resetPassword", resetPassword)
userRoutes.post("/changePassword", verifyToken, changePassword)

export default userRoutes;