const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());


// Connect MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/agriAdvisorDB")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));


// Farmer Schema
const farmerSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  preferredLanguage: String,
  mobile: { type: Number, unique: true },

  age: Number,
  qualification: String,
  gender: String,

  country: String,
  state: String,
  district: String,

  landSize: Number,
  landUnit: String,
  soilType: String,

  regularCrop: String,

  livestock: {
    hasLivestock: Boolean,
    cows: Number,
    goats: Number,
    hens: Number,
    other: String
  },

  waterDependency: String,

  previousProfit: Number,
  previousInvestment: Number,
  fertilizer: String,
  pesticide: String,
  subsidy: String,
  additionalBusiness: String,
  feedback: String,

  createdAt: { type: Date, default: Date.now }
});

const Farmer = mongoose.model("Farmer", farmerSchema);


// REGISTER API
app.post("/register", async (req, res) => {
  try {

    const farmer = new Farmer(req.body);
    await farmer.save();

    res.status(201).json({ message: "Farmer registered successfully" });

  } catch (error) {

    res.status(400).json({ error: error.message });

  }
});


// LOGIN API
app.post("/login", async (req, res) => {

  try {

    const { firstName, lastName, mobile } = req.body;

    const farmer = await Farmer.findOne({
      firstName,
      lastName,
      mobile: Number(mobile)
    });

    if (!farmer) {
      return res.status(404).json({ message: "Farmer not found" });
    }

    res.json({
      message: "Login successful",
      farmer
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});


// FETCH FARMER DATA FOR DASHBOARD
app.get("/farmer/:mobile", async (req, res) => {

  try {

    const farmer = await Farmer.findOne({
      mobile: Number(req.params.mobile)
    });

    if (!farmer) {
      return res.status(404).json({ message: "Farmer not found" });
    }

    res.json(farmer);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});


// Start Server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});