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

    const { searchParams } = new URL(request.url);
    const item = searchParams.get('item');

    let result;
    if (item) {
      result = await pool.query(
        `SELECT * FROM grocery_prices WHERE user_id = $1 AND item_name ILIKE $2 ORDER BY price ASC`,
        [session.user.id, `%${item}%`]
      );
    } else {
      result = await pool.query(
        `SELECT * FROM grocery_prices WHERE user_id = $1 ORDER BY item_name, price ASC`,
        [session.user.id]
      );
    }

    return NextResponse.json({ prices: result.rows });
  } catch (error) {
    console.error('Get prices error:', error);
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { storeName, itemName, price, unit } = body;

    if (!storeName || !itemName || price == null) {
      return NextResponse.json(
        { error: 'Store name, item name, and price are required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO grocery_prices (user_id, store_name, item_name, price, unit) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [session.user.id, storeName, itemName, price, unit || null]
    );

    return NextResponse.json({ success: true, id: result.rows[0].id }, { status: 201 });
  } catch (error) {
    console.error('Add price error:', error);
    return NextResponse.json({ error: 'Failed to add price' }, { status: 500 });
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
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
    }

    await pool.query('DELETE FROM grocery_prices WHERE id = $1 AND user_id = $2', [id, session.user.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete price error:', error);
    return NextResponse.json({ error: 'Failed to delete price' }, { status: 500 });
  }
}
