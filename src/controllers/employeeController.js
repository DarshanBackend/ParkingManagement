import employeeModel from "../models/employeeModel.js";
import { ThrowError } from "../utils/Errorutils.js";
import EmployeeServices from "../services/employeeServices.js";
import sharp from "sharp";
import fs from "fs"
import path from "path";
import dayjs from 'dayjs';

const employeeServices = new EmployeeServices();

//add employee
export const addEmployee = async (req, res) => {
  try {
    const {
      Name,
      Email,
      aadharcardNo,
      mobileNo,
      joingDate,
      gender,
      shift,
      address,
    } = req.body;

    // ✅ Get uploaded image filename
    const employeeImageFilename = req.file?.filename;

    const parsedDate = dayjs(joingDate, 'DD/MM/YYYY', true);
    if (!parsedDate.isValid()) {
      return ThrowError(res, 400, 'Invalid joining date format. Use DD/MM/YYYY');
    }

    const checkEmployee = await employeeServices.getEmployee({
      $or: [{ Email }, { Name }]
    });

    if (checkEmployee) {
      return ThrowError(res, 400, 'Employee with same name or email already exists');
    }

    const newEmployee = new employeeModel({
      Name,
      Email,
      aadharcardNo,
      mobileNo,
      joingDate: parsedDate.toDate(),
      gender,
      shift,
      address,
      emp_image: employeeImageFilename,
    });

    await newEmployee.save();

    return res.status(201).json({
      message: 'Employee added successfully',
      data: {
        ...newEmployee.toObject(),
        imageUrl: employeeImageFilename ? `/employeeimage/${employeeImageFilename}` : null
      }
    });

  } catch (error) {
    return ThrowError(res, 500, error.message);
  }
};



//get employee
export const getEmployees = async (req, res) => {
    try {
        const { id } = req.params;

        const employee = await employeeModel.findById(id);
        if (!employee) {
            return ThrowError(res, 404, "Employee not found");
        }

        return res.status(200).json({
            message: "Employees fetched successfully",
            data: employee
        });

    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};
