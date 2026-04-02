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

    const { searchParams } = new URL(request.url);
    const item = searchParams.get('item');

    let prices;
    if (item) {
      prices = db.prepare(`
        SELECT * FROM grocery_prices 
        WHERE user_id = ? AND item_name LIKE ?
        ORDER BY price ASC
      `).all(session.user.id, `%${item}%`);
    } else {
      prices = db.prepare(`
        SELECT * FROM grocery_prices 
        WHERE user_id = ?
        ORDER BY item_name, price ASC
      `).all(session.user.id);
    }

    return NextResponse.json({ prices });
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

    const result = db.prepare(`
      INSERT INTO grocery_prices (user_id, store_name, item_name, price, unit)
      VALUES (?, ?, ?, ?, ?)
    `).run(session.user.id, storeName, itemName, price, unit || null);

    return NextResponse.json({ 
      success: true, 
      id: result.lastInsertRowid 
    }, { status: 201 });
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

    db.prepare('DELETE FROM grocery_prices WHERE id = ? AND user_id = ?').run(id, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete price error:', error);
    return NextResponse.json({ error: 'Failed to delete price' }, { status: 500 });
  }
}
