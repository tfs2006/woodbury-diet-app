import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deals = db.prepare(`
      SELECT * FROM deals 
      WHERE user_id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
      ORDER BY expires_at ASC
    `).all(session.user.id);

    return NextResponse.json({ deals });
  } catch (error) {
    console.error('Get deals error:', error);
    return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { store, item, originalPrice, salePrice, expiresAt, notes } = body;

    if (!store || !item || salePrice == null) {
      return NextResponse.json({ error: 'Store, item, and sale price are required' }, { status: 400 });
    }

    const result = db.prepare(`
      INSERT INTO deals (user_id, store, item, original_price, sale_price, expires_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(session.user.id, store, item, originalPrice || null, salePrice, expiresAt || null, notes || null);

    return NextResponse.json({ success: true, id: result.lastInsertRowid }, { status: 201 });
  } catch (error) {
    console.error('Add deal error:', error);
    return NextResponse.json({ error: 'Failed to add deal' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Deal ID is required' }, { status: 400 });
    }

    db.prepare('DELETE FROM deals WHERE id = ? AND user_id = ?').run(id, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete deal error:', error);
    return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 });
  }
}
