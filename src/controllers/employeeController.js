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

    if (shift) {
      const shiftDoc = await shiftModel.findById(shift);
      if (shiftDoc) {
        employee.shift_Time = `${shiftDoc.startTime} to ${shiftDoc.endTime}`;
      }
      employee.shift = shift;
    }

    employee.Name = Name ?? employee.Name;
    employee.Email = Email ?? employee.Email;
    employee.aadharcardNo = aadharcardNo ?? employee.aadharcardNo;
    employee.joingDate = joingDate ?? employee.joingDate;
    employee.address = address ?? employee.address;
    employee.status = status ?? employee.status;
    employee.gender = gender ?? employee.gender;
    employee.mobileNo = mobileNo ?? employee.mobileNo;
    if (newImagePath) employee.emp_image = newImagePath;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      employee.password = hashedPassword;
    }

    await employee.save();

    const updatedEmployee = await employeeModel.findById(id).populate('shift');

    return res.status(200).json({
      message: "Employee updated successfully",
      data: updatedEmployee
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