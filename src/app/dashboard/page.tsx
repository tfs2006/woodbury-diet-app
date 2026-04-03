'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, ShoppingCart, DollarSign, Settings, LogOut, Plus, ChevronDown, ChevronUp, Heart } from 'lucide-react';
import { format, startOfWeek } from 'date-fns';

interface MealPlan {
  mealPlan: {
    days: Array<{
      day: number;
      breakfast: { name: string; description: string; calories: number; netCarbs: number };
      lunch: { name: string; description: string; calories: number; netCarbs: number };
      dinner: { name: string; description: string; calories: number; netCarbs: number };
    }>;
  };
  groceryList: {
    proteins: Array<{ item: string; quantity: string; estimatedPrice: number }>;
    vegetables: Array<{ item: string; quantity: string; estimatedPrice: number }>;
    fats: Array<{ item: string; quantity: string; estimatedPrice: number }>;
    other: Array<{ item: string; quantity: string; estimatedPrice: number }>;
  };
  totalEstimatedCost: number;
  prepTips: string[];
  treatSuggestions: string[];
}

interface GroceryPrice {
  id: number;
  store_name: string;
  item_name: string;
  price: number;
  unit: string | null;
}

interface Deal {
  id: number;
  store: string;
  item: string;
  original_price: number | null;
  sale_price: number;
  expires_at: string | null;
  notes: string | null;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'meal-plans' | 'grocery-list' | 'prices' | 'settings'>('meal-plans');
  const [budget, setBudget] = useState('120');
  const [weekStart, setWeekStart] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [groceryPrices, setGroceryPrices] = useState<GroceryPrice[]>([]);
  const [newPrice, setNewPrice] = useState({ storeName: '', itemName: '', price: '', unit: '' });
  const [priceComparison, setPriceComparison] = useState<Record<string, GroceryPrice[]>>({});
  const [listLayout, setListLayout] = useState<'category' | 'by-store' | 'smart'>('category');
  const [fetchingPrices, setFetchingPrices] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [newDeal, setNewDeal] = useState({ store: '', item: '', originalPrice: '', salePrice: '', expiresAt: '', notes: '' });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    fetchPrices();
    fetchDeals();
  }, [status, router]);

  const fetchDeals = async () => {
    try {
      const res = await fetch('/api/deals');
      const data = await res.json();
      setDeals(data.deals || []);
    } catch (error) {
      console.error('Failed to fetch deals:', error);
    }
  };

  const fetchPrices = async () => {
    try {
      const res = await fetch('/api/grocery-prices');
      const data = await res.json();
      setGroceryPrices(data.prices || []);
      const grouped: Record<string, GroceryPrice[]> = {};
      data.prices?.forEach((p: GroceryPrice) => {
        if (!grouped[p.item_name]) grouped[p.item_name] = [];
        grouped[p.item_name].push(p);
      });
      setPriceComparison(grouped);
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    }
  };

  const generateMealPlan = async () => {
    setLoading(true);
    setGenerationError(null);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch('/api/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ budget: parseFloat(budget), weekStartDate: weekStart }),
      });
      const data = await res.json();
      console.log('API Response:', data);
      if (res.ok && data.mealPlan && data.groceryList) {
        setMealPlan(data);
        setActiveTab('grocery-list');
      } else {
        setGenerationError(data.error || data.details || 'Failed to generate meal plan');
      }
    } catch (error) {
      console.error('Failed to generate meal plan:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        setGenerationError('Meal plan generation timed out. The current AI model is responding too slowly. Please try again.');
      } else {
        setGenerationError('An unexpected error occurred while generating your meal plan.');
      }
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const addPrice = async () => {
    if (!newPrice.storeName || !newPrice.itemName || !newPrice.price) return;
    try {
      await fetch('/api/grocery-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeName: newPrice.storeName, itemName: newPrice.itemName, price: parseFloat(newPrice.price), unit: newPrice.unit || null }),
      });
      setNewPrice({ storeName: '', itemName: '', price: '', unit: '' });
      fetchPrices();
    } catch (error) {
      console.error('Failed to add price:', error);
    }
  };

  const deletePrice = async (id: number) => {
    try {
      await fetch(`/api/grocery-prices?id=${id}`, { method: 'DELETE' });
      fetchPrices();
    } catch (error) {
      console.error('Failed to delete price:', error);
    }
  };

  const autoFetchPrices = async () => {
    if (!mealPlan) return;
    setFetchingPrices(true);
    try {
      const items: Array<{ item: string; quantity: string; category: string }> = [];
      Object.entries(mealPlan.groceryList).forEach(([category, categoryItems]) => {
        (categoryItems as any[]).forEach((item: any) => {
          items.push({ item: item.item, quantity: item.quantity, category });
        });
      });

      const res = await fetch('/api/auto-fetch-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`✅ Added ${data.added} prices! ${data.skipped > 0 ? `${data.skipped} items not found: ${data.skippedItems.join(', ')}` : ''}`);
        fetchPrices();
      } else {
        alert(data.error || 'Failed to fetch prices');
      }
    } catch (error) {
      console.error('Failed to auto-fetch prices:', error);
      alert('Failed to fetch prices');
    } finally {
      setFetchingPrices(false);
    }
  };

  const addDeal = async () => {
    if (!newDeal.store || !newDeal.item || !newDeal.salePrice) return;
    try {
      await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store: newDeal.store,
          item: newDeal.item,
          originalPrice: newDeal.originalPrice ? parseFloat(newDeal.originalPrice) : null,
          salePrice: parseFloat(newDeal.salePrice),
          expiresAt: newDeal.expiresAt || null,
          notes: newDeal.notes || null,
        }),
      });
      setNewDeal({ store: '', item: '', originalPrice: '', salePrice: '', expiresAt: '', notes: '' });
      fetchDeals();
    } catch (error) {
      console.error('Failed to add deal:', error);
    }
  };

  const deleteDeal = async (id: number) => {
    try {
      await fetch(`/api/deals?id=${id}`, { method: 'DELETE' });
      fetchDeals();
    } catch (error) {
      console.error('Failed to delete deal:', error);
    }
  };

  const getBestPrice = (itemName: string) => {
    const prices = priceComparison[itemName] || [];
    if (prices.length === 0) return null;
    return prices.reduce((min, p) => p.price < min.price ? p : min, prices[0]);
  };

  const getSmartGroupedItems = () => {
    if (!mealPlan) return {};
    const allItems: Array<{ item: string; quantity: string; estimatedPrice: number; category: string }> = [];
    Object.entries(mealPlan.groceryList).forEach(([category, items]) => {
      (items as any[]).forEach((item: any) => allItems.push({ ...item, category }));
    });
    const grouped: Record<string, Array<{ item: string; quantity: string; estimatedPrice: number; category: string; bestPrice: GroceryPrice | null }>> = {};
    allItems.forEach((item) => {
      const best = getBestPrice(item.item);
      const store = best ? best.store_name : 'No price data';
      if (!grouped[store]) grouped[store] = [];
      grouped[store].push({ ...item, bestPrice: best });
    });
    const sorted = Object.entries(grouped).sort((a, b) => {
      const totalA = a[1].reduce((sum, i) => sum + i.estimatedPrice, 0);
      const totalB = b[1].reduce((sum, i) => sum + i.estimatedPrice, 0);
      return totalA - totalB;
    });
    return Object.fromEntries(sorted);
  };

  const getItemsWithAllPrices = () => {
    if (!mealPlan) return [];
    const allItems: Array<{ item: string; quantity: string; estimatedPrice: number; category: string; allPrices: GroceryPrice[] }> = [];
    Object.entries(mealPlan.groceryList).forEach(([category, items]) => {
      (items as any[]).forEach((item: any) => allItems.push({ ...item, category, allPrices: priceComparison[item.item] || [] }));
    });
    return allItems;
  };

  const getUniqueStores = () => Array.from(new Set(groceryPrices.map(p => p.store_name)));

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <header className="bg-white shadow-sm border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-8 h-8 text-emerald-600" />
            <h1 className="text-2xl font-bold text-gray-800">Woodbury Diet App</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Welcome, {session?.user?.name}</span>
            <Link href="/api/auth/signout" className="flex items-center gap-1 text-red-500 hover:text-red-600">
              <LogOut className="w-4 h-4" /><span>Logout</span>
            </Link>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {[
              { id: 'meal-plans', label: 'Meal Plans', icon: Calendar },
              { id: 'grocery-list', label: 'Grocery List', icon: ShoppingCart },
              { id: 'prices', label: 'Price Comparison', icon: DollarSign },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === tab.id ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <tab.icon className="w-4 h-4" />{tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Meal Plans Tab */}
        {activeTab === 'meal-plans' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-emerald-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Generate New Meal Plan</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Budget ($)</label>
                  <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Week Starting</label>
                  <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                </div>
                <div className="flex items-end">
                  <button onClick={generateMealPlan} disabled={loading}
                    className="w-full bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? 'Generating...' : (<><Plus className="w-4 h-4" />Generate Plan</>)}
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-500">AI-powered meal plans consider your low-carb paleo diet, GPA disease, and budget. Includes treat suggestions!</p>
              {generationError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {generationError}
                </div>
              )}
            </div>
            {mealPlan && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-emerald-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">7-Day Meal Plan (Est. Cost: ${mealPlan.totalEstimatedCost})</h3>
                <div className="space-y-3">
                  {mealPlan.mealPlan.days.map((day) => (
                    <div key={day.day} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button onClick={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100">
                        <span className="font-medium text-gray-800">Day {day.day}</span>
                        {expandedDay === day.day ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                      {expandedDay === day.day && (
                        <div className="p-4 space-y-4">
                          {[{ meal: 'Breakfast', data: day.breakfast }, { meal: 'Lunch', data: day.lunch }, { meal: 'Dinner', data: day.dinner }].map(({ meal, data }) => (
                            <div key={meal} className="bg-emerald-50 p-3 rounded-lg">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-sm font-medium text-emerald-600">{meal}</span>
                                  <h4 className="font-semibold text-gray-800">{data.name}</h4>
                                  <p className="text-sm text-gray-600">{data.description}</p>
                                </div>
                                <div className="text-right text-sm text-gray-500">
                                  <div>{data.calories} kcal</div><div>{data.netCarbs}g net carbs</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {mealPlan.treatSuggestions && mealPlan.treatSuggestions.length > 0 && (
                  <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <h4 className="font-semibold text-amber-800 mb-2">🍪 Treat Suggestions (Enjoy in Moderation!)</h4>
                    <ul className="list-disc list-inside text-sm text-amber-700">
                      {mealPlan.treatSuggestions.map((treat, i) => (<li key={i}>{treat}</li>))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Grocery List Tab */}
        {activeTab === 'grocery-list' && mealPlan && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-4 border border-emerald-100">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-xl font-semibold text-gray-800">Grocery List</h2>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={autoFetchPrices} disabled={fetchingPrices || !mealPlan}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                    title="Auto-populate prices from SLC area averages">
                    {fetchingPrices ? '⏳ Fetching...' : '⚡ Auto-Fetch Prices'}
                  </button>
                  {[
                    { id: 'category', label: '📋 By Category', desc: 'Grouped by proteins, veggies, etc.' },
                    { id: 'by-store', label: '🏪 By Store', desc: 'All prices side-by-side per item' },
                    { id: 'smart', label: '🧠 Smart Shopping', desc: 'Grouped by cheapest store' },
                  ].map((layout) => (
                    <button key={layout.id} onClick={() => setListLayout(layout.id as any)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${listLayout === layout.id ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      title={layout.desc}>{layout.label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Category Layout */}
            {listLayout === 'category' && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-emerald-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(mealPlan.groceryList).map(([category, items]) => (
                    <div key={category}>
                      <h3 className="font-medium text-emerald-600 capitalize mb-2">{category}</h3>
                      <ul className="space-y-2">
                        {(items as any[]).map((item: any, i: number) => {
                          const bestPrice = getBestPrice(item.item);
                          return (
                            <li key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div><span className="font-medium">{item.item}</span><span className="text-sm text-gray-500 ml-2">{item.quantity}</span></div>
                              <div className="text-right">
                                <span className="text-gray-600">${item.estimatedPrice}</span>
                                {bestPrice && <div className="text-xs text-emerald-600">Best: ${bestPrice.price} at {bestPrice.store_name}</div>}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* By Store Layout */}
            {listLayout === 'by-store' && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-emerald-100">
                <h3 className="font-medium text-gray-700 mb-4">Price Comparison for Each Item</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-2 px-3 text-gray-600">Item</th>
                        <th className="text-left py-2 px-3 text-gray-600">Qty</th>
                        {getUniqueStores().map(store => (<th key={store} className="text-center py-2 px-3 text-gray-600">{store}</th>))}
                        <th className="text-center py-2 px-3 text-emerald-600">Best</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getItemsWithAllPrices().map((item, i) => {
                        const best = getBestPrice(item.item);
                        return (
                          <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 px-3 font-medium">{item.item}</td>
                            <td className="py-2 px-3 text-gray-500">{item.quantity}</td>
                            {getUniqueStores().map(store => {
                              const storePrice = item.allPrices.find(p => p.store_name === store);
                              const isBest = storePrice && best && storePrice.id === best.id;
                              return (<td key={store} className={`py-2 px-3 text-center ${isBest ? 'bg-emerald-50 font-semibold text-emerald-700' : 'text-gray-500'}`}>{storePrice ? `$${storePrice.price.toFixed(2)}` : '—'}</td>);
                            })}
                            <td className="py-2 px-3 text-center font-semibold text-emerald-600">{best ? `$${best.price.toFixed(2)} @ ${best.store_name}` : 'N/A'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Smart Shopping Layout */}
            {listLayout === 'smart' && (
              <div className="space-y-4">
                {Object.entries(getSmartGroupedItems()).map(([store, items]) => {
                  const storeTotal = items.reduce((sum, i) => sum + i.estimatedPrice, 0);
                  return (
                    <div key={store} className="bg-white rounded-xl shadow-sm border border-emerald-100 overflow-hidden">
                      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 flex items-center justify-between">
                        <h3 className="font-semibold text-white text-lg">🏪 {store}</h3>
                        <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">Est. ${storeTotal.toFixed(2)}</span>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <span className="font-medium text-gray-800">{item.item}</span>
                                <span className="text-sm text-gray-500 ml-2">{item.quantity}</span>
                                <span className="text-xs text-gray-400 ml-1">({item.category})</span>
                              </div>
                              <div className="text-right">
                                <span className="font-semibold text-gray-700">${item.estimatedPrice}</span>
                                {item.bestPrice && <div className="text-xs text-emerald-600">${item.bestPrice.price.toFixed(2)} at {item.bestPrice.store_name}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {Object.keys(getSmartGroupedItems()).length === 0 && (
                  <div className="bg-white rounded-xl shadow-sm p-8 border border-emerald-100 text-center">
                    <p className="text-gray-500 mb-2">No store prices recorded yet.</p>
                    <p className="text-sm text-gray-400">Click "⚡ Auto-Fetch Prices" above or add prices in the Price Comparison tab!</p>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm p-6 border border-emerald-100">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="font-semibold text-gray-800 text-lg">Total Estimated Cost: ${mealPlan.totalEstimatedCost}</p>
                  <p className={`text-sm ${mealPlan.totalEstimatedCost <= parseFloat(budget) ? 'text-emerald-600' : 'text-red-500'}`}>
                    Budget: ${budget} | {mealPlan.totalEstimatedCost <= parseFloat(budget) ? '✓ Within budget!' : '⚠ Over budget by $' + (mealPlan.totalEstimatedCost - parseFloat(budget)).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Price Comparison Tab */}
        {activeTab === 'prices' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-emerald-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Add Grocery Price</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <input type="text" placeholder="Store (e.g., Walmart)" value={newPrice.storeName} onChange={(e) => setNewPrice({ ...newPrice, storeName: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" />
                <input type="text" placeholder="Item name" value={newPrice.itemName} onChange={(e) => setNewPrice({ ...newPrice, itemName: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" />
                <input type="number" step="0.01" placeholder="Price" value={newPrice.price} onChange={(e) => setNewPrice({ ...newPrice, price: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" />
                <input type="text" placeholder="Unit (optional)" value={newPrice.unit} onChange={(e) => setNewPrice({ ...newPrice, unit: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" />
                <button onClick={addPrice} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">Add Price</button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-emerald-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Price Comparison by Item</h2>
              {Object.keys(priceComparison).length === 0 ? (
                <p className="text-gray-500">No prices recorded yet. Click "⚡ Auto-Fetch Prices" in the Grocery List tab to get started!</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(priceComparison).map(([item, prices]) => {
                    const best = prices.reduce((min, p) => p.price < min.price ? p : min, prices[0]);
                    return (
                      <div key={item} className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-800 mb-2">{item}</h3>
                        <div className="space-y-1">
                          {prices.map((p) => (
                            <div key={p.id} className={`flex items-center justify-between p-2 rounded ${p.id === best.id ? 'bg-emerald-50' : ''}`}>
                              <div className="flex items-center gap-2">
                                {p.id === best.id && <span className="text-emerald-600 text-sm">✓ Best</span>}
                                <span>{p.store_name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-medium">${p.price.toFixed(2)}{p.unit ? `/${p.unit}` : ''}</span>
                                <button onClick={() => deletePrice(p.id)} className="text-red-400 hover:text-red-600">×</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Deals & Coupons Section */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-emerald-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">🏷️ Deals & Coupons</h2>
              <p className="text-sm text-gray-500 mb-4">Track sales from weekly ads. Check Smith's, Walmart, and Harmons ads every Wednesday!</p>
              
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-6">
                <input type="text" placeholder="Store" value={newDeal.store} onChange={(e) => setNewDeal({ ...newDeal, store: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" />
                <input type="text" placeholder="Item on sale" value={newDeal.item} onChange={(e) => setNewDeal({ ...newDeal, item: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" />
                <input type="number" step="0.01" placeholder="Original $" value={newDeal.originalPrice} onChange={(e) => setNewDeal({ ...newDeal, originalPrice: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" />
                <input type="number" step="0.01" placeholder="Sale $" value={newDeal.salePrice} onChange={(e) => setNewDeal({ ...newDeal, salePrice: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" />
                <input type="date" value={newDeal.expiresAt} onChange={(e) => setNewDeal({ ...newDeal, expiresAt: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" />
                <button onClick={addDeal} className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600">Add Deal</button>
              </div>

              {deals.length === 0 ? (
                <p className="text-gray-400 text-sm">No active deals. Add sales you find in weekly ads!</p>
              ) : (
                <div className="space-y-2">
                  {deals.map((deal) => (
                    <div key={deal.id} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-amber-600 font-semibold">{deal.store}</span>
                        <span className="font-medium">{deal.item}</span>
                        {deal.original_price && (
                          <span className="text-gray-400 line-through">${deal.original_price.toFixed(2)}</span>
                        )}
                        <span className="text-green-600 font-bold">${deal.sale_price.toFixed(2)}</span>
                        {deal.expires_at && (
                          <span className="text-xs text-gray-500">Expires: {new Date(deal.expires_at).toLocaleDateString()}</span>
                        )}
                        {deal.notes && <span className="text-xs text-gray-400">({deal.notes})</span>}
                      </div>
                      <button onClick={() => deleteDeal(deal.id)} className="text-red-400 hover:text-red-600">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-emerald-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Settings</h2>
            <p className="text-gray-600">Diet preferences and account settings coming soon!</p>
          </div>
        )}
      </main>
    </div>
  );
}
