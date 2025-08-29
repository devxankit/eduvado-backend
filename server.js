import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import { aiRouter } from "./routes/aiRoutes.js";
import { authRouter } from "./routes/authRoutes.js";
import { adminRouter } from "./routes/adminRoutes.js";
import { courseRouter } from "./routes/courseRoutes.js";
import contentRouter from "./routes/contentRoutes.js";
import subscriptionRoutes from './routes/subscriptionRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/courses", courseRouter);
app.use("/api/content", contentRouter);
app.use('/api/ai', aiRouter);
app.use('/api/subscriptions', subscriptionRoutes);

// Debug route to test if server is working
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is running and responding to API calls" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
