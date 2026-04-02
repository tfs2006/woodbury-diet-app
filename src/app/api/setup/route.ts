import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
      [username, hashedPassword]
    );

    // Create default diet preferences
    await pool.query(
      `INSERT INTO diet_preferences (user_id, diet_type, daily_calorie_target, daily_carb_limit, budget_weekly, health_conditions)
       VALUES ($1, 'low-carb-paleo', 1400, 50, 120, 'GPA disease')`,
      [result.rows[0].id]
    );

    return NextResponse.json(
      { success: true, message: 'Account created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const result = await pool.query('SELECT COUNT(*) as count FROM users');
  return NextResponse.json({ hasUsers: parseInt(result.rows[0].count) > 0 });
}
