// A simple API endpoint to promote a user to admin
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function POST(request) {
  try {
    // Check if current user is authenticated (optional extra security)
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'You must be signed in to use this API' },
        { status: 401 }
      );
    }
    
    // Parse the request body
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Connect to the database
    const client = await clientPromise;
    const db = client.db();
    
    // Update the user's role to admin
    const result = await db.collection('users').updateOne(
      { userId },
      { $set: { role: 'admin' } }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `User ${userId} has been promoted to admin` 
    });
  } catch (error) {
    console.error('Error promoting user to admin:', error);
    return NextResponse.json(
      { error: 'An error occurred while promoting the user' },
      { status: 500 }
    );
  }
} 