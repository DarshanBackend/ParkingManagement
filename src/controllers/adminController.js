import adminModel from "../models/adminModel.js";
import { ThrowError } from "../utils/Errorutils.js"
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import AdminServices from "../services/adminServices.js";
import fs from 'fs';
import path from 'path';

const adminServices = new AdminServices();

// Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000);
}

// Add admin
export const addAdmin = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const admin = await adminServices.getAdmin({ email });
        if (admin) {
            return await ThrowError(res, 400, "Admin already exists");
        }
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        // Create a new admin
        const newAdmin = {
            email,
            password: hashedPassword,
            role
        };

        const addAdmin = new adminModel(newAdmin);
        await addAdmin.save();

        return res.status(201).json({
            message: "Admin added successfully",
            adminId: addAdmin._id,
            data: newAdmin,
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
}

// Get admin by ID
export const getAdminById = async (req, res) => {
    try {
        const adminId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(adminId)) {
            return await ThrowError(res, 400, "Invalid admin ID");
        }
        const admin = await adminServices.getAdminById(adminId);
        if (!admin) {
            return await ThrowError(res, 404, "Admin not found");
        }
        return res.status(200).json({
            message: "Admin fetched successfully",
            data: admin,
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
}

// Update admin
export const updateAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName } = req.body;
        const { mobileNo } = req.body;
        const newImagePath = req.file?.path;

        const existingAdmin = await adminServices.getAdminById(id);
        if (!existingAdmin) {
            return ThrowError(res, 404, "Admin not found");
        }

        if (fullName) {
            existingAdmin.fullName = fullName;
        }
        if (mobileNo) {
            existingAdmin.mobileNo = mobileNo
        }

        if (newImagePath) {
            if (existingAdmin.image && fs.existsSync(existingAdmin.image)) {
                fs.unlinkSync(existingAdmin.image);
            }
            existingAdmin.image = newImagePath;
        }

        await existingAdmin.save();

        return res.status(200).json({
            message: "Admin updated successfully",
            data: existingAdmin
        });

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Delete admin
export const deleteAdmin = async (req, res) => {
    try {
        const id = req.params.id;

        const deleteAdmin = await adminServices.getAdminById(id);
        if (!deleteAdmin) {
            return await ThrowError(res, 404, "Admin not found");
        }

        if (deleteAdmin.image) {
            const imagePath = path.resolve(deleteAdmin.image);

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await adminServices.deleteAdmin(id);

        return res.status(200).json({
            message: "Admin deleted successfully",
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
}

//login admin
export const loginAdmin = async (req, res) => {
    try {
        let admin = await adminServices.getAdmin({
            email: req.body.email,
        });
        if (!admin) {
            return res.status(400).json({
                message: ` Email Not Found..Please Check Your Email Address.`,
            });
        }
        let chekPassword = await bcrypt.compare(req.body.password, admin.password);
        if (!chekPassword) {
            return res.status(401).json({
                message: ` Password is Not Match Please Enter Correct Password..`,
            });
        }

        let token = await jwt.sign({ _id: admin._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.status(200).json({ token, message: `Login SuccesFully..` });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
}

// Forgot Password (Send OTP)
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Provide Email Id" });
        }

        const admin = await adminServices.getAdminByEmail(email);
        if (!admin) {
            return res.status(400).json({ message: "admin Not Found" });
        }

        // Ensure admin is a valid Mongoose document
        if (!(admin instanceof mongoose.Model)) {
            return res.status(500).json({ message: "Invalid admin data" });
        }

        // Generate OTP
        const otp = generateOTP();
        admin.resetOTP = otp;
        admin.otpExpires = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes

        await admin.save(); // Save OTP in the database

        // Configure Nodemailer
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.MY_GMAIL,
                pass: process.env.MY_PASSWORD,
            },
            tls: {
                rejectUnauthorized: false,
            },
        });

        const mailOptions = {
            from: process.env.MY_GMAIL,
            to: email,
            subject: "Password Reset OTP",
            text: `Your OTP for password reset is: ${otp}. It is valid for 10 minutes.`,
        };

        await transporter.sendMail(mailOptions);
        return res
            .status(200)
            .json({ message: "OTP sent successfully to your email." });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

//Verify Email
export const VerifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res
                .status(400)
                .json({ message: "Please provide Email and OTP." });
        }

        const admin = await adminServices.getAdminByEmail(email);
        if (!admin) {
            return res.status(404).json({ message: "admin not found." });
        }

        // Validate OTP
        if (admin.resetOTP !== otp || admin.otpExpires < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired OTP." });
        }

        await admin.save();

        return res.status(200).json({
            message: "OTP Submited."
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
}

// Reset Password using OTP
export const resetPassword = async (req, res) => {
    try {
        const { email, newPassword, confirmPassword } = req.body;
        if (!newPassword || !confirmPassword) {
            return res
                .status(400)
                .json({ message: "Please provide email , newpassword and confirmpassword." });
        }

        const admin = await adminServices.getAdminByEmail(email);
        if (!admin) {
            return res.status(400).json({ message: "admin Not Found" });
        }

        if (!(newPassword === confirmPassword)) {
            return res
                .status(400)
                .json({ message: "Please check newpassword and confirmpassword." });
        }

        // Hash new password
        await adminServices.updateAdmin({ password: newPassword });
        admin.password = await bcrypt.hash(newPassword, 10);
        admin.resetOTP = undefined;
        admin.otpExpires = undefined;
        await admin.save();

        return res.status(200).json({
            message: "Password reset successfully.",
            admin: { id: admin._id, email: admin.email, isAdmin: admin.isAdmin },
        });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Change Password
export const changePassword = async (req, res) => {
    try {
        const { adminId } = req.query;
        const { currentPassword, newPassword, confirmPassword } = req.body;
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res
                .status(400)
                .json({ message: "currentPassword , newPassword and currentPassword are required." });
        }
        let admin = await adminServices.getAdminById(adminId);
        if (!admin) {
            return res.status(404).json({ message: "admin not found." });
        }
        const isMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!isMatch) {
            return res.status(400).json({ message: "currentPassword is incorrect." });
        }
        if (newPassword === currentPassword) {
            return res
                .status(400)
                .json({ message: "Newpassword can not be the same as currentPassword." });
        }

        if (newPassword !== confirmPassword) {
            return res
                .status(400)
                .json({ message: "Newpassword and confirmPassword do not match." });
        }

        const hashPassword = await bcrypt.hash(newPassword, 10);
        await adminServices.updateAdmin(adminId, { password: hashPassword });

        return res.status(200).json({ message: "Password changed successfully." });
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

