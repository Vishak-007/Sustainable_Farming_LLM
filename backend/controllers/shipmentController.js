import Shipment from "../models/shipmentModel.js";

// @desc    Fetch all shipments
// @route   GET /api/shipments
// @access  Public
export const getShipments = async (req, res) => {
  try {
    const shipments = await Shipment.find({});
    res.json(shipments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching shipments", error: error.message });
  }
};

// @desc    Fetch single shipment
// @route   GET /api/shipments/:id
// @access  Public
export const getShipmentById = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (shipment) {
      res.json(shipment);
    } else {
      res.status(404).json({ message: "Shipment not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error fetching the shipment", error: error.message });
  }
};

// @desc    Create a new shipment
// @route   POST /api/shipments
// @access  Public
export const createShipment = async (req, res) => {
  try {
    const { shipmentId, route, crop, qty, eta, status } = req.body;

    const shipmentExists = await Shipment.findOne({ shipmentId });

    if (shipmentExists) {
      return res.status(400).json({ message: "Shipment already exists" });
    }

    const shipment = await Shipment.create({
      shipmentId,
      route,
      crop,
      qty,
      eta,
      status,
    });

    res.status(201).json(shipment);
  } catch (error) {
    res.status(500).json({ message: "Error creating shipment", error: error.message });
  }
};

// @desc    Update a shipment
// @route   PUT /api/shipments/:id
// @access  Public
export const updateShipment = async (req, res) => {
  try {
    const { route, crop, qty, eta, status } = req.body;

    const shipment = await Shipment.findById(req.params.id);

    if (shipment) {
      shipment.route = route || shipment.route;
      shipment.crop = crop || shipment.crop;
      shipment.qty = qty !== undefined ? qty : shipment.qty;
      shipment.eta = eta || shipment.eta;
      shipment.status = status || shipment.status;

      const updatedShipment = await shipment.save();
      res.json(updatedShipment);
    } else {
      res.status(404).json({ message: "Shipment not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error updating shipment", error: error.message });
  }
};

// @desc    Delete a shipment
// @route   DELETE /api/shipments/:id
// @access  Public
export const deleteShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);

    if (shipment) {
      await Shipment.deleteOne({ _id: shipment._id });
      res.json({ message: "Shipment removed" });
    } else {
      res.status(404).json({ message: "Shipment not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error deleting shipment", error: error.message });
  }
};
