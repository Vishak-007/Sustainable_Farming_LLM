import mongoose from "mongoose";

const shipmentSchema = new mongoose.Schema(
  {
    shipmentId: {
      type: String,
      required: true,
      unique: true,
    },
    route: {
      type: String,
      required: true,
    },
    crop: {
      type: String,
      required: true,
    },
    qty: {
      type: Number,
      required: true,
    },
    eta: {
      type: String,
      required: true,
    },
    farmer: {
      type: String,
      required: true,
    },
    buyer: {
      type: String,
      required: true,
    },
    amount: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["in-transit", "delivered", "loading", "delayed"],
      default: "loading",
    },
  },
  {
    timestamps: true,
  }
);

const Shipment = mongoose.model("Shipment", shipmentSchema);

export default Shipment;
