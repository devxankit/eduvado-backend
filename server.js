import express from "express";
import cors from "cors";
import dotenv from "dotenv";
// import { connectDB } from "./config/db.js";
import { aiRouter } from "./routes/aiRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
// connectDB();

app.use(cors());
app.use(express.json());

// AI Routes
app.use("/api/ai", aiRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
