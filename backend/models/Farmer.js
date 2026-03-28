import mongoose from 'mongoose';

const farmerSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  preferredLanguage: { type: String, required: true },
  mobile: { type: String, required: true, unique: true },
  age: { type: Number, required: true },
  qualification: { type: String, required: true },
  gender: { type: String, required: true },
  
  country: { type: String, required: true },
  state: { type: String, required: true },
  district: { type: String, required: true },
  landSize: { type: Number, required: true },
  landUnit: { type: String, required: true },
  soilType: { type: String, required: true },
  
  regularCrop: { type: String, required: true },
  livestock: {
    hasLivestock: { type: Boolean, default: false },
    cows: { type: Number, default: 0 },
    goats: { type: Number, default: 0 },
    hens: { type: Number, default: 0 }
  },
  waterDependency: { type: String, required: true },
  
  previousProfit: { type: Number },
  previousInvestment: { type: Number },
  fertilizer: { type: String },
  pesticide: { type: String },
  subsidy: { type: String },
  additionalBusiness: { type: String },
  feedback: { type: String }
}, {
  timestamps: true
});

const Farmer = mongoose.model('Farmer', farmerSchema);
export default Farmer;
