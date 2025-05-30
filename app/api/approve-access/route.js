import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// GET /api/approve-access?token=...
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Connect to DB
    const client = await clientPromise;
    const db = client.db();

    // Find pending request
    const req = await db.collection('access_requests').findOne({ token });
    if (!req) {
      return NextResponse.redirect(new URL('/login?approved=invalid', request.url));
    }

    // Prevent duplicate
    const existing = await db.collection('users').findOne({ userId: req.email });
    if (existing) {
      // Clean up old request
      await db.collection('access_requests').deleteOne({ token });
      return NextResponse.redirect(new URL('/login?approved=already', request.url));
    }

    // Create user
    const firstName = req.name.split(' ')[0];
    await db.collection('users').insertOne({
      userId: req.email,
      username: firstName,
      fullName: req.name,
      email: req.email,
      clientName: req.company,
      category: req.category,
      password: req.hashedPassword,
      role: 'user',
      createdAt: new Date(),
    });

    // Remove request
    await db.collection('access_requests').deleteOne({ token });

    // Redirect to login with success flag
    return NextResponse.redirect(new URL('/login?approved=success', request.url));
  } catch (error) {
    console.error('Approve Access Error:', error);
    // For debugging: return the error message as JSON
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
} 
