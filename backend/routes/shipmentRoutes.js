import express from "express";
import {
  getShipments,
  getShipmentById,
  createShipment,
  updateShipment,
  deleteShipment,
} from "../controllers/shipmentController.js";

const router = express.Router();

router.route("/").get(getShipments).post(createShipment);
router
  .route("/:id")
  .get(getShipmentById)
  .put(updateShipment)
  .delete(deleteShipment);

export default router;
