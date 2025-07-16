import jwt from "jsonwebtoken"
import {sendForbiddenResponse, sendErrorResponse ,sendUnauthorizedResponse,} from "../utils/ResponseUtils.js"

export const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;
        next();
    } catch (err) {
        console.error('Token verification error:', err);
        res.status(401).json({ error: 'Invalid token.' });
    }
};

export const isAdmin = async (req, res, next) => {
    try {
        if (!req.user || !req.user.isAdmin) {
            return sendForbiddenResponse(res, "Access denied. Admin privileges required.");
        }
        next();
    } catch (error) {
        return sendErrorResponse(res, 500, error.message);
    }
};

export const isUser = async (req, res, next) => {
    try {
        if (!req.user) {
            return sendUnauthorizedResponse(res, "Authentication required");
        }
        if (req.user.isAdmin) {
            return sendForbiddenResponse(res, "Access denied. Not a regular user.");
        }
        next();
    } catch (error) {
        return sendErrorResponse(res, 500, error.message);
    }
};
