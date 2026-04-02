import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await pool.query(`
      SELECT * FROM deals 
      WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY expires_at ASC
    `, [session.user.id]);

    return NextResponse.json({ deals: result.rows });
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

    const result = await pool.query(`
      INSERT INTO deals (user_id, store, item, original_price, sale_price, expires_at, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
    `, [session.user.id, store, item, originalPrice || null, salePrice, expiresAt || null, notes || null]);

    return NextResponse.json({ success: true, id: result.rows[0].id }, { status: 201 });
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

    await pool.query('DELETE FROM deals WHERE id = $1 AND user_id = $2', [id, session.user.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete deal error:', error);
    return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 });
  }
}
