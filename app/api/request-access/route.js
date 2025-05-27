import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import clientPromise from '@/lib/mongodb';
import { hash } from 'bcryptjs';
import crypto from 'crypto';

// POST /api/request-access
export async function POST(request) {
  try {
    const { name, company, category, email, password, confirmPassword } = await request.json();

    // Basic validation
    if (!name || !company || !category || !email || !password || !confirmPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }

    // Hash password and prepare approval token
    const hashedPassword = await hash(password, 12);
    const token = crypto.randomBytes(32).toString('hex');

    // Store request in database
    const client = await clientPromise;
    const db = client.db();
    await db.collection('access_requests').insertOne({ token, name, company, category, email, hashedPassword, createdAt: new Date() });

    // Ensure SMTP variables are set
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !port || !user || !pass) {
      console.error('Missing SMTP configuration');
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    // Create SMTP transporter
    const transporter = nodemailer.createTransport({
      host,
      port,
      auth: { user, pass }
    });

    // Compose email with approval link
    const origin = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const approveLink = `${origin}/api/approve-access?token=${token}`;
    const mailOptions = {
      from: user,
      to: 'pujit@purpleblock.ai',
      subject: `New sign-up request from ${name}`,
      text: `Name: ${name}\nCompany: ${company}\nCategory/Product: ${category}\nEmail: ${email}\nApprove: ${approveLink}`,
      html: `<p>Name: ${name}</p><p>Company: ${company}</p><p>Category/Product: ${category}</p><p>Email: ${email}</p><p><a href="${approveLink}">Click here to approve this request</a></p>`,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Request Access Error:', error);
    return NextResponse.json({ error: 'Failed to send request' }, { status: 500 });
  }
} 
