// This script will initialize the admin user in MongoDB
// Usage: node scripts/init-admin.js

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');
const { hash } = require('bcryptjs');

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI is not defined in .env.local');
    process.exit(1);
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    
    // Check if users collection exists, if not create it
    const collections = await db.listCollections({ name: 'users' }).toArray();
    if (collections.length === 0) {
      console.log('Creating users collection...');
      await db.createCollection('users');
    }

    // Check if admin user already exists
    const existingAdmin = await db.collection('users').findOne({ userId: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
    } else {
      // Create admin user
      const hashedPassword = await hash('admin123', 12);
      
      await db.collection('users').insertOne({
        userId: 'admin',
        password: hashedPassword,
        clientName: 'Admin',
        role: 'admin',
        createdAt: new Date()
      });
      
      console.log('Admin user created successfully');
    }

    // Create productData collection if it doesn't exist
    const productCollections = await db.listCollections({ name: 'productData' }).toArray();
    if (productCollections.length === 0) {
      console.log('Creating productData collection...');
      await db.createCollection('productData');
      console.log('ProductData collection created successfully');
    }

    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

main().catch(console.error); 