import express from 'express';
import { addAdmin, changePassword, deleteAdmin, forgotPassword, getAdminById, loginAdmin, resetPassword, updateAdmin, VerifyEmail } from '../controllers/adminController.js';
import upload, { convertImage } from '../middlewares/imageupload.js';

const userRoutes = express.Router();

userRoutes.post('/addAdmin', addAdmin);
userRoutes.get('/getAdminById/:id', getAdminById);
userRoutes.put('/updateAdmin/:id', upload.single("image"), convertImage, updateAdmin);
userRoutes.delete('/deleteAdmin/:id', deleteAdmin);
userRoutes.post('/loginAdmin', loginAdmin);

userRoutes.post("/forgotPassword", forgotPassword)
userRoutes.post("/VerifyEmail", VerifyEmail)
userRoutes.post("/resetPassword", resetPassword)
userRoutes.post("/changePassword", changePassword)

export default userRoutes;