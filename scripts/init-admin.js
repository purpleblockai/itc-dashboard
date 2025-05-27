// This script will initialize the admin user in MongoDB
// Usage : node scripts/init-admin.js

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

    const db = client.db();
    
    // Check if users collection exists, if not create it
    const collections = await db.listCollections({ name: 'users' }).toArray();
    if (collections.length === 0) {
      await db.createCollection('users');
    }

    // Check if admin user already exists
    const existingAdmin = await db.collection('users').findOne({ userId: 'admin' });
    
    if (existingAdmin) {
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
      
    }

    // Create productData collection if it doesn't exist
    const productCollections = await db.listCollections({ name: 'productData' }).toArray();
    if (productCollections.length === 0) {
      await db.createCollection('productData');
    }

  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await client.close();
  }
}

main().catch(console.error); 
