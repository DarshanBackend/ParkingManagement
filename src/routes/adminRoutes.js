import express from 'express';
import { addAdmin, changePassword, deleteAdmin, forgotPassword, getAdminById, loginAdmin, resetPassword, updateAdmin, VerifyEmail } from '../controllers/adminController.js';
import upload, { convertJfifToJpeg } from '../middlewares/imageupload.js';
import { verifyToken } from '../middlewares/auth.js';

const userRoutes = express.Router();

userRoutes.post('/addAdmin', addAdmin);
userRoutes.get('/getAdminById/:id', verifyToken, getAdminById);
userRoutes.put('/updateAdmin/:id', upload.single("image"), convertJfifToJpeg, updateAdmin);
userRoutes.delete('/deleteAdmin/:id', deleteAdmin);
userRoutes.post('/loginAdmin', loginAdmin);

userRoutes.post("/forgotPassword", forgotPassword)
userRoutes.post("/VerifyEmail", verifyToken, VerifyEmail)
userRoutes.post("/resetPassword", verifyToken, resetPassword)
userRoutes.post("/changePassword", verifyToken, changePassword)

export default userRoutes;