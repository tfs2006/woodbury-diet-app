import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import db from '@/lib/db';

// Pre-loaded average prices for Salt Lake City area (grocery store averages)
const DEFAULT_PRICES: Record<string, { price: number; unit: string; stores: string[] }> = {
  // Proteins
  'eggs': { price: 3.49, unit: 'dozen', stores: ['Walmart', "Smith's", 'Harmons'] },
  'chicken thighs': { price: 2.99, unit: 'lb', stores: ['Walmart', "Smith's"] },
  'chicken legs': { price: 1.99, unit: 'lb', stores: ['Walmart', "Smith's"] },
  'ground beef': { price: 5.49, unit: 'lb', stores: ['Walmart', "Smith's", 'Harmons'] },
  'ground turkey': { price: 4.99, unit: 'lb', stores: ['Walmart', "Smith's"] },
  'canned tuna': { price: 1.29, unit: 'can', stores: ['Walmart', "Smith's"] },
  'canned salmon': { price: 2.49, unit: 'can', stores: ['Walmart', "Smith's"] },
  'canned sardines': { price: 1.99, unit: 'can', stores: ['Walmart', "Smith's"] },
  
  // Vegetables
  'cabbage': { price: 1.49, unit: 'head', stores: ['Walmart', "Smith's"] },
  'spinach': { price: 3.99, unit: 'bag', stores: ['Walmart', "Smith's", 'Harmons'] },
  'mixed greens': { price: 4.49, unit: 'bag', stores: ["Smith's", 'Harmons'] },
  'broccoli': { price: 2.49, unit: 'lb', stores: ['Walmart', "Smith's"] },
  'zucchini': { price: 1.99, unit: 'lb', stores: ['Walmart', "Smith's"] },
  'cauliflower': { price: 2.99, unit: 'head', stores: ['Walmart', "Smith's"] },
  'cucumber': { price: 1.29, unit: 'each', stores: ['Walmart', "Smith's"] },
  'mushrooms': { price: 2.99, unit: 'pack', stores: ['Walmart', "Smith's", 'Harmons'] },
  'onions': { price: 1.49, unit: 'lb', stores: ['Walmart', "Smith's"] },
  'garlic': { price: 0.99, unit: 'head', stores: ['Walmart', "Smith's"] },
  'bell peppers': { price: 1.99, unit: 'each', stores: ['Walmart', "Smith's"] },
  'celery': { price: 1.99, unit: 'bunch', stores: ['Walmart', "Smith's"] },
  'asparagus': { price: 3.99, unit: 'bunch', stores: ["Smith's", 'Harmons'] },
  
  // Fats
  'olive oil': { price: 7.99, unit: 'bottle', stores: ['Walmart', "Smith's", 'Harmons'] },
  'coconut oil': { price: 6.99, unit: 'jar', stores: ['Walmart', "Smith's"] },
  'avocado': { price: 1.49, unit: 'each', stores: ['Walmart', "Smith's", 'Harmons'] },
  'lemons': { price: 0.79, unit: 'each', stores: ['Walmart', "Smith's"] },
  
  // Other
  'herbs': { price: 2.49, unit: 'pack', stores: ['Walmart', "Smith's"] },
  'spices': { price: 3.99, unit: 'jar', stores: ['Walmart', "Smith's"] },
  'herbal tea': { price: 3.49, unit: 'box', stores: ['Walmart', "Smith's", 'Harmons'] },
  'walnuts': { price: 5.99, unit: 'bag', stores: ['Walmart', "Smith's"] },
  'pumpkin seeds': { price: 4.49, unit: 'bag', stores: ['Walmart', "Smith's"] },
};

// Store price variations (Walmart is baseline, others vary)
const STORE_MULTIPLIERS: Record<string, number> = {
  'Walmart': 1.0,
  "Smith's": 1.08,
  'Harmons': 1.22,
};

function findMatchingDefault(itemName: string) {
  const normalized = itemName.toLowerCase().trim();
  
  // Direct match
  if (DEFAULT_PRICES[normalized]) return { name: normalized, ...DEFAULT_PRICES[normalized] };
  
  // Partial match
  for (const [key, value] of Object.entries(DEFAULT_PRICES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return { name: key, ...value };
    }
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { items } = body; // Array of { item, quantity, category }

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Items array is required' }, { status: 400 });
    }

    const added: Array<{ item: string; store: string; price: number; unit: string }> = [];
    const skipped: string[] = [];

    for (const itemData of items) {
      const itemName = itemData.item || itemData.name;
      if (!itemName) continue;

      const match = findMatchingDefault(itemName);
      
      if (match) {
        // Add prices for each store with variation
        for (const store of match.stores) {
          const multiplier = STORE_MULTIPLIERS[store] || 1.0;
          // Add some randomness (±10%) to simulate real price variation
          const variation = 0.9 + Math.random() * 0.2;
          const price = Math.round(match.price * multiplier * variation * 100) / 100;

          // Check if price already exists for this item+store
          const existing = db.prepare(
            'SELECT id FROM grocery_prices WHERE user_id = ? AND item_name = ? AND store_name = ?'
          ).get(session.user.id, itemName, store);

          if (!existing) {
            db.prepare(
              'INSERT INTO grocery_prices (user_id, store_name, item_name, price, unit) VALUES (?, ?, ?, ?, ?)'
            ).run(session.user.id, store, itemName, price, match.unit);
            added.push({ item: itemName, store, price, unit: match.unit });
          }
        }
      } else {
        skipped.push(itemName);
      }
    }

    return NextResponse.json({
      success: true,
      added: added.length,
      skipped: skipped.length,
      skippedItems: skipped,
      details: added,
    });
  } catch (error) {
    console.error('Auto-fetch prices error:', error);
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}
