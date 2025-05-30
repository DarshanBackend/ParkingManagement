import Admin from "../models/adminModel.js";

class AdminServices {
    // Add Admin
    async addNewAdmin(body) {
        try {
            return await Admin.create(body);
        } catch (error) {
            return error.message;
        }
    }

    // Get Single Admin
    async getAdmin(body) {
        try {
            return await Admin.findOne(body);
        } catch (error) {
            return error.message;
        }
    }

    // Get Single Admin By Id
    async getAdminById(id) {
        try {
            return await Admin.findById(id);
        } catch (error) {
            return error.message;
        }
    }

    // Update Admin
    async updateAdmin(id, body) {
        try {
            return await Admin.findByIdAndUpdate(id, { $set: body }, { new: true });
        } catch (error) {
            return error.message;
        }
    }

    // Delete Admin
    async deleteAdmin(id) {
        try {
            return await Admin.findByIdAndDelete(id);
        }
        catch (error) {
            return error.message;
        }
    }

    // Get Admin By Email
    async getAdminByEmail(email) {
        try {
            return await Admin.findOne({ email }).exec();
        } catch (error) {
            return error.message;
        }
    }
}

export default AdminServices;