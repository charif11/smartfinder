const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// เปิดใช้งาน CORS และ body-parser
app.use(cors());
app.use(bodyParser.json());

// เชื่อมต่อกับ MongoDB
const mongoUri = "mongodb://localhost:27017/gps_data"; // เปลี่ยนเป็น URI ของ MongoDB คุณ
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

// สร้าง Schema และ Model สำหรับ GPS Data
const gpsDataSchema = new mongoose.Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  altitude: { type: Number, required: true },
  speed: { type: Number, required: true },
  satellites: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
});

const GPSData = mongoose.model("GPSData", gpsDataSchema);

// สร้าง endpoint เพื่อรับข้อมูล GPS
app.post("/api/gps", async (req, res) => {
  const { latitude, longitude, altitude, speed, satellites } = req.body;

  if (!latitude || !longitude || !altitude || !speed || !satellites) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  console.log({ data: req.body });

  try {
    const newData = new GPSData({
      latitude,
      longitude,
      altitude,
      speed,
      satellites,
    });

    await newData.save();
    res.status(201).json({ message: "Data saved successfully", data: newData });
  } catch (err) {
    console.error("Error saving data:", err.message);
    res.status(500).json({ message: "Failed to save data" });
  }
});

app.get("/api/get", async (req, res) => {
  try {
    // รับค่า page และ limit จาก query parameters
    const page = parseInt(req.query.page) || 1; // หน้าปัจจุบัน (default คือ 1)
    const limit = parseInt(req.query.limit) || 10; // จำนวนข้อมูลต่อหน้า (default คือ 10)

    // คำนวณค่า skip เพื่อข้ามข้อมูลที่ไม่ได้อยู่ในหน้าปัจจุบัน
    const skip = (page - 1) * limit;

    // ดึงข้อมูลจาก MongoDB ด้วย Mongoose
    const data = await GPSData.find()
      .skip(skip) // ข้ามข้อมูล
      .limit(limit); // จำกัดจำนวนข้อมูล

    // นับจำนวนข้อมูลทั้งหมด (เพื่อคำนวณจำนวนหน้าทั้งหมด)
    const total = await GPSData.countDocuments();

    // ส่ง response กลับไปยัง client
    res.json({
      data, // ข้อมูลที่ดึงมา
      page, // หน้าปัจจุบัน
      limit, // จำนวนข้อมูลต่อหน้า
      totalPages: Math.ceil(total / limit), // จำนวนหน้าทั้งหมด
      totalItems: total, // จำนวนข้อมูลทั้งหมด
    });
  } catch (error) {
    console.error({ error });
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.delete("/api/delete-all", async (req, res) => {
  try {
    // ลบข้อมูลทั้งหมดใน collection GPSData
    await GPSData.deleteMany({});
    res.json({ message: "All data deleted successfully" });
  } catch (error) {
    console.error({ error });
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// เริ่มต้นเซิร์ฟเวอร์
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
