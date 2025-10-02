import adminModel from "../models/adminModel.js";
import { ThrowError } from "../utils/Errorutils.js"
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import AdminServices from "../services/adminServices.js";
import fs from 'fs';
import path from 'path';
import employeeModel from "../models/employeeModel.js";
import EmployeeServices from "../services/employeeServices.js";

const adminServices = new AdminServices();
const employeeServices = new EmployeeServices();
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

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and Password are required.",
            });
        }

        // Check in Admin model first
        let user = await adminModel.findOne({ email });
        let role = "Admin";

        // If not admin, check in Employee model
        if (!user) {
            user = await employeeModel.findOne({ Email: email }); // use "email" if schema updated
            role = "Employee";
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Email not found. Please check your email address.",
            });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: "Incorrect password. Please try again.",
            });
        }

        const token = jwt.sign(
            { _id: user._id, role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            token,
            role,
            user: {
                _id: user._id,
                email: user.email || user.Email,
                name: user.fullName || user.Name,
            },
        });

    } catch (error) {
        console.error("Login Error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again later.",
            error: error.message,
        });
    }
};

export const adminAndEmployeeForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Provide Email Id" });
        }

        let user = null;
        let role = null;

        // Check if user exists as admin
        const admin = await adminServices.getAdminByEmail(email);
        if (admin) {
            user = admin;
            role = 'admin';
        }
        else {
            const employee = await employeeServices.getEmployeeByEmail(email);
            if (employee) {
                user = employee;
                role = 'employee';
            }
        }

        if (!user) {
            return res.status(400).json({ message: "User Not Found" });
        }

        if (role === 'admin' && !(user instanceof mongoose.Model)) {
            return res.status(500).json({ message: "Invalid admin data" });
        }

        // Generate OTP
        const otp = generateOTP();
        user.resetOTP = otp;
        user.otpExpires = Date.now() + 10 * 60 * 1000;

        await user.save();

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

        const subject = role === 'admin'
            ? "Admin Password Reset OTP"
            : "Employee Password Reset OTP";

        const mailOptions = {
            from: process.env.MY_GMAIL,
            to: email,
            subject: subject,
            text: `Your OTP for password reset is: ${otp}. It is valid for 10 minutes.`,
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({
            message: "OTP sent successfully to your email.",
            role: role
        });

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const adminAndEmployeeVerifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: "Please provide Email and OTP." });
        }

        let user = null;
        let userRole = null;


        const admin = await adminServices.getAdminByEmail(email);
        if (admin) {
            user = admin;
            userRole = admin.role || 'admin';
        }

        else {
            const employee = await employeeServices.getEmployeeByEmail(email);
            if (employee) {
                user = employee;
                userRole = employee.role || 'employee';
            }
        }


        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }


        if (user.resetOTP !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired OTP." });
        }


        user.resetOTP = undefined;
        user.otpExpires = undefined;
        user.isOTPVerified = true;

        await user.save();

        return res.status(200).json({
            message: "OTP verified successfully.",
            role: userRole,
            email: email
        });

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const adminAndEmployeeResetPassword = async (req, res) => {
    try {
        const { email, newPassword, confirmPassword } = req.body;

        if (!email || !newPassword || !confirmPassword) {
            return res.status(400).json({
                message: "Please provide email, new password and confirm password."
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                message: "New password and confirm password do not match."
            });
        }

        let user = null;
        let userRole = null;
        let userModel = null;

        const admin = await adminServices.getAdminByEmail(email);
        if (admin) {
            user = admin;
            userRole = admin.role || 'admin';
            userModel = 'admin';
        }
        else {
            const employee = await employeeServices.getEmployeeByEmail(email);
            if (employee) {
                user = employee;
                userRole = employee.role || 'employee';
                userModel = 'employee';
            }
        }

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;

        user.resetOTP = undefined;
        user.otpExpires = undefined;

        await user.save();

        if (userModel === 'admin') {
            await adminServices.updateAdmin({ password: hashedPassword });
        } else {
            await employeeServices.updateEmployee({ password: hashedPassword });
        }

        const responseData = {
            message: "Password reset successfully.",
            role: userRole,
            email: email,
            id: user._id
        };

        if (userModel === 'admin') {
            responseData.isAdmin = user.isAdmin;
        }

        return res.status(200).json(responseData);

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

export const adminAndEmployeechangePassword = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;

        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Current password, new password and confirm password are required."
            });
        }

        let user = null;
        let userModel = null;

        if (userRole === "Admin") {
            user = await adminModel.findById(userId);
            userModel = adminModel;
        } else if (userRole === "Employee") {
            user = await employeeModel.findById(userId);
            userModel = employeeModel;
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        // Verify current password
        const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: "Current password is incorrect."
            });
        }

        // Check if new password is same as current
        if (newPassword === currentPassword) {
            return res.status(400).json({
                success: false,
                message: "New password cannot be the same as current password."
            });
        }

        // Check if new password matches confirm password
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "New password and confirm password do not match."
            });
        }

        // Hash new password and update
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user password
        await userModel.findByIdAndUpdate(userId, {
            password: hashedPassword,
            updatedAt: Date.now()
        });

        return res.status(200).json({
            success: true,
            message: "Password changed successfully.",
            role: userRole
        });

    } catch (error) {
        console.error("Change Password Error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again later.",
            error: error.message,
        });
    }
};