import employeeModel from "../models/employeeModel.js";
import { ThrowError } from "../utils/Errorutils.js";
import shiftModel from "../models/shiftModel.js";
import EmployeeServices from "../services/employeeServices.js";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fs from "fs"

const employeeServices = new EmployeeServices();

const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

//add employee
export const createEmployee = async (req, res) => {
  try {
    const {
      Name,
      Email,
      password,
      aadharcardNo,
      joingDate,
      address,
      status,
      gender,
      mobileNo,
      shift
    } = req.body;

    const emp_image = req.file?.path;

    const existingEmployee = await employeeModel.findOne({
      $or: [{ Email }, { aadharcardNo }]
    });

    if (existingEmployee) {
      if (emp_image && fs.existsSync(emp_image)) {
        fs.unlinkSync(emp_image);
      }
      return ThrowError(res, 400, "Employee already exists with provided email or Aadhar");
    }

    const shiftData = await shiftModel.findById(shift);
    if (!shiftData) {
      return ThrowError(res, 404, "Shift not found");
    }

    const shift_Time = `${shiftData.startTime} to ${shiftData.endTime}`;

    const hashedPassword = await bcrypt.hash(password, 10); // hash password

    const newEmployee = new employeeModel({
      Name,
      Email,
      password: hashedPassword,
      aadharcardNo,
      joingDate,
      address,
      status,
      gender,
      mobileNo,
      shift,
      shift_Time,
      emp_image
    });

    await newEmployee.save();

    return res.status(201).json({
      message: "Employee created successfully",
      data: newEmployee
    });

  } catch (error) {
    console.error("Error in createEmployee:", error);

    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return ThrowError(res, 500, error.message);
  }
};

//get employee
export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await employeeModel
      .findById(id)
      .select("-password")
      .populate("shift");

    if (!employee) {
      return ThrowError(res, 404, "Employee not found");
    }

    return res.status(200).json({
      message: "Employee fetched successfully",
      data: employee
    });
  } catch (error) {
    console.error("Error in getEmployeeById:", error);
    return ThrowError(res, 500, error.message);
  }
};

//getAll employee
export const getAllEmployee = async (req, res) => {
  try {
    const employee = await employeeServices.getAllEmployee()

    if (!employee) {
      return res.status(200).json({ message: "No any employee found!!" })
    }

    return res.status(200).json({
      message: "Employee fetched successfully",
      data: employee
    });

  } catch (error) {
    return ThrowError(res, 500, error.message)
  }
}

//edit employee
export const editEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      Name,
      Email,
      password,
      aadharcardNo,
      joingDate,
      address,
      status,
      gender,
      mobileNo,
      shift
    } = req.body;

    const newImagePath = req.file?.path;

    const employee = await employeeModel.findById(id);
    if (!employee) {
      if (newImagePath && fs.existsSync(newImagePath)) {
        fs.unlinkSync(newImagePath);
      }
      return ThrowError(res, 404, "Employee not found");
    }

    if (newImagePath && employee.emp_image && fs.existsSync(employee.emp_image)) {
      fs.unlinkSync(employee.emp_image);
    }

    // Update fields
    employee.Name = Name ?? employee.Name;
    employee.Email = Email ?? employee.Email;
    employee.aadharcardNo = aadharcardNo ?? employee.aadharcardNo;
    employee.joingDate = joingDate ?? employee.joingDate;
    employee.address = address ?? employee.address;
    employee.status = status ?? employee.status;
    employee.gender = gender ?? employee.gender;
    employee.mobileNo = mobileNo ?? employee.mobileNo;
    employee.shift = shift ?? employee.shift;
    if (newImagePath) employee.emp_image = newImagePath;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      employee.password = hashedPassword;
    }

    await employee.save();

    return res.status(200).json({
      message: "Employee updated successfully",
      data: employee
    });

  } catch (error) {
    console.error("Error in editEmployee:", error);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return ThrowError(res, 500, error.message);
  }
};

//delete employee
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await employeeModel.findById(id);
    if (!employee) {
      return ThrowError(res, 404, "Employee not found");
    }

    if (employee.emp_image && fs.existsSync(employee.emp_image)) {
      fs.unlinkSync(employee.emp_image);
    }

    await employeeModel.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Employee deleted successfully"
    });
  } catch (error) {
    console.error("Error in deleteEmployee:", error);
    return ThrowError(res, 500, error.message);
  }
};

//login employee
export const loginEmployee = async (req, res) => {
  try {
    const { Email, password } = req.body;

    const employee = await employeeServices.getEmployeeByEmail(Email);
    if (!employee) {
      return res.status(400).json({
        message: "Email not found. Please check your Email.",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, employee.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Incorrect password. Please enter the correct password.",
      });
    }

    const token = jwt.sign({ _id: employee._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(200).json({
      token,
      message: "Login Successfully.",
      employee: {
        _id: employee._id,
        Name: employee.Name,
        Email: employee.Email,
        status: employee.status,
        shift: employee.shift,
      },
    });
  } catch (error) {
    return ThrowError(res, 500, error.message);
  }
};

//forgot password
export const forgotEmployeePassword = async (req, res) => {
  try {
    const { Email } = req.body;
    if (!Email) {
      return res.status(400).json({ message: "Provide Email Id" });
    }

    const employee = await employeeServices.getEmployeeByEmail(Email);
    if (!employee) {
      return res.status(400).json({ message: "Employee Not Found" });
    }

    const otp = generateOTP();
    employee.resetOTP = otp;
    employee.otpExpires = Date.now() + 10 * 60 * 1000; // valid 10 minutes
    await employee.save();

    // Nodemailer setup
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MY_GMAIL,
        pass: process.env.MY_PASSWORD,
      },
      tls: { rejectUnauthorized: false },
    });

    const mailOptions = {
      from: process.env.MY_GMAIL,
      to: Email,
      subject: "Employee Password Reset OTP",
      text: `Your OTP for password reset is: ${otp}. It is valid for 10 minutes.`,
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: "OTP sent successfully to your email." });

  } catch (error) {
    return ThrowError(res, 500, error.message);
  }
};

//Verify Email
export const VerifyEmail = async (req, res) => {
  try {
    const { Email, otp } = req.body;

    if (!Email || !otp) {
      return res
        .status(400)
        .json({ message: "Please provide Email and OTP." });
    }

    const employee = await employeeServices.getEmployeeByEmail(Email);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found." });
    }

    // Validate OTP
    if (employee.resetOTP !== otp || employee.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    await employee.save();

    return res.status(200).json({
      message: "OTP Submitted successfully."
    });

  } catch (error) {
    return ThrowError(res, 500, error.message);
  }
};

// Reset Password using OTP
export const resetPassword = async (req, res) => {
  try {
    const { Email, newPassword, confirmPassword } = req.body;
    if (!newPassword || !confirmPassword) {
      return res
        .status(400)
        .json({ message: "Please provide email , newpassword and confirmpassword." });
    }

    const employee = await employeeModel.findOne({ Email: Email });
    if (!employee) {
      return res.status(400).json({ message: "employee Not Found" });
    }

    if (!(newPassword === confirmPassword)) {
      return res
        .status(400)
        .json({ message: "Please check newpassword and confirmpassword." });
    }

    // Hash new password
    await employeeServices.updateEmployee({ password: newPassword });
    employee.password = await bcrypt.hash(newPassword, 10);
    employee.resetOTP = undefined;
    employee.otpExpires = undefined;
    await employee.save();

    return res.status(200).json({
      message: "Password reset successfully.",
      employee: { id: employee._id, email: employee.email },
    });
  } catch (error) {
    return ThrowError(res, 500, error.message);
  }
};

// Change Password for Employee
export const changeEmployeePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: "currentPassword, newPassword, and confirmPassword are required."
      });
    }

    const employee = await employeeServices.getEmployeeById(id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, employee.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({
        message: "New password cannot be the same as current password."
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "New password and confirm password do not match."
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    employee.password = hashedPassword;
    await employee.save();

    return res.status(200).json({ message: "Password changed successfully." });

  } catch (error) {
    return ThrowError(res, 500, error.message);
  }
};
