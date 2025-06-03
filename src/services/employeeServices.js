import employee from "../models/employeeModel.js";

class EmployeeServices {
    // Add employee
    async addNewemployee(body) {
        try {
            return await employee.create(body);
        } catch (error) {
            return error.message;
        }
    }

    // Get Single employee
    async getEmployee(body) {
        try {
            return await employee.findOne(body);
        } catch (error) {
            return error.message;
        }
    }

    //Get All employee
    async getAllEmployee() {
        try {
            return await employee.find();
        } catch (error) {
            return error.message
        }
    }

    // Get Single employee By Id
    async getEmployeeById(id) {
        try {
            return await employee.findById(id);
        } catch (error) {
            return error.message;
        }
    }

    // Update employee
    async updateEmployee(id, body) {
        try {
            return await employee.findByIdAndUpdate(id, { $set: body }, { new: true });
        } catch (error) {
            return error.message;
        }
    }

    // Delete employee
    async deleteEmployee(id) {
        try {
            return await employee.findByIdAndDelete(id);
        }
        catch (error) {
            return error.message;
        }
    }

    // Get employee By Email
    async getEmployeeByEmail(Email) {
        try {
            return await employee.findOne({ Email }).exec();
        } catch (error) {
            return error.message;
        }
    }
}

export default EmployeeServices;