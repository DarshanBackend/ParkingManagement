
import dotenv from "dotenv";
import express from "express";
import { connectDB } from "./src/config/db.js";
import cookieParser from "cookie-parser";
import userRoutes from "./src/routes/adminRoutes.js";
import employeeRoutes from "./src/routes/employeeRoutes.js";
import shiftRoutes from "./src/routes/shiftRoutes.js";
import vehicleRoutes from "./src/routes/vehicleRoutes.js";
import parkingRoutes from "./src/routes/parkingDetailsRoutes.js";
import dashBoardRoutes from "./src/routes/dashBoardRoutes.js";
import levelRoutes from "./src/routes/levelRoutes.js";
import cors from "cors";
dotenv.config();

const port = process.env.PORT;
const app = express();
app.use(cookieParser());

app.use(express.json());
app.use(cors());

//user Route
app.use("/api/Admin", userRoutes);

//employee Route
app.use("/api/employee", employeeRoutes)

//shift Route
app.use("/api/shift", shiftRoutes)

//level Routes
app.use("/api/level", levelRoutes)

//vehicle Routes
app.use("/api/vehicle", vehicleRoutes)

//parking Routes
app.use("/api/parkingDetails", parkingRoutes)

//dashBoard Routes
app.use("/api/dashBoard", dashBoardRoutes)

// Connect to Database
connectDB();

// Server Connection
app.listen(port, () => {
  console.log(`Server Start At Port http://localhost:${port}`);
});
