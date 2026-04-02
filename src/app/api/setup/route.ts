import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';

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
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashedPassword);

    // Create default diet preferences
    db.prepare(`
      INSERT INTO diet_preferences (user_id, diet_type, daily_calorie_target, daily_carb_limit, budget_weekly, health_conditions)
      VALUES (?, 'low-carb-paleo', 1400, 50, 120, 'GPA disease')
    `).run(result.lastInsertRowid);

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
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  return NextResponse.json({ hasUsers: userCount.count > 0 });
}
