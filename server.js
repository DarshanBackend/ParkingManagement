
import dotenv from "dotenv";
import express from "express";
import { connectDB } from "./src/config/db.js";
import cookieParser from "cookie-parser";
import userRoutes from "./src/routes/adminRoutes.js";
import employeeRoutes from "./src/routes/employeeRoutes.js";

dotenv.config();

const port = process.env.PORT;
const app = express();
app.use(cookieParser());

app.use(express.json());


//user Route
app.use("/api/Admin", userRoutes);

//employee Route
app.use("/api/employee",employeeRoutes)

// Connect to Database
connectDB();

// Server Connection
app.listen(port, () => {
  console.log(`Server Start At Port http://localhost:${port}`);
});
