import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';
import Shipment from './models/shipmentModel.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/agrofarmers';

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Seed Admin User
    const existingAdmin = await User.findOne({ email: 'admin123' });
    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('HyperHackers...', salt);
      
      const adminUser = new User({
        role: 'admin',
        name: 'System Admin',
        email: 'admin123',
        phone: '0000000000',
        password: hashedPassword
      });
      await adminUser.save();
      console.log('Admin user seeded successfully!');
    } else {
        const salt = await bcrypt.genSalt(10);
        existingAdmin.password = await bcrypt.hash('HyperHackers...', salt);
        await existingAdmin.save();
        console.log('Admin user already exists, updated password!');
    }

    // Seed dummy shipments if none exist
    const shipmentCount = await Shipment.countDocuments();
    if (shipmentCount === 0) {
      await Shipment.insertMany([
        { shipmentId: '#TRX-9901', route: 'Local', crop: 'Wheat (500kg)', qty: 500, eta: 'Tomorrow', farmer: 'Ramesh Singh', buyer: 'Kisan Traders', amount: '₹21,000', status: 'delivered' },
        { shipmentId: '#TRX-9902', route: 'Local', crop: 'Tomato (200kg)', qty: 200, eta: 'Today', farmer: 'Aarti Patil', buyer: 'FreshMart', amount: '₹5,600', status: 'in-transit' },
        { shipmentId: '#TRX-9903', route: 'Inter-state', crop: 'Onion (1000kg)', qty: 1000, eta: 'Next Week', farmer: 'Vijay Kumar', buyer: 'Metro Retail', amount: '₹35,000', status: 'loading' }
      ]);
      console.log('Dummy shipments seeded successfully!');
    }

    console.log('Seeding completed. Exiting...');
    process.exit(0);

  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
};

seed();
