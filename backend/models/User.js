import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  role: { type: String, enum: ['farmer', 'buyer', 'admin'], required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // Farmer specific fields
  village: { type: String },
  cropType: { type: String },

  // Buyer specific fields
  company: { type: String },
  buyerType: { type: String }
}, { timestamps: true });

export default mongoose.model('User', UserSchema);
