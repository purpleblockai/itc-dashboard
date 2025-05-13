// API endpoint to set a user's client
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function POST(request) {
  try {
    // Check if current user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'You must be signed in to use this API' },
        { status: 401 }
      );
    }
    
    // Only allow admins to set client names
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can set client names' },
        { status: 403 }
      );
    }
    
    // Parse the request body
    const { userId, clientName } = await request.json();
    
    if (!userId || !clientName) {
      return NextResponse.json(
        { error: 'User ID and client name are required' },
        { status: 400 }
      );
    }
    
    // Connect to the database
    const client = await clientPromise;
    const db = client.db();
    
    // Update the user's client name
    const result = await db.collection('users').updateOne(
      { userId },
      { $set: { clientName } }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Client name for user ${userId} has been set to ${clientName}` 
    });
  } catch (error) {
    console.error('Error setting client name:', error);
    return NextResponse.json(
      { error: 'An error occurred while setting the client name' },
      { status: 500 }
    );
  }
} 