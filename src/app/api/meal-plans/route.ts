import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OpenAI from 'openai';
import pool from '@/lib/db';

function getAppBaseUrl() {
  const rawUrl =
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    'http://localhost:3000';

  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }

  return `https://${rawUrl}`;
}

function getOpenAIClient() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': getAppBaseUrl(),
      'X-Title': 'Woodbury Diet App',
    },
  });
}

function extractJsonResponse(responseContent: string) {
  const fencedMatch = responseContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = responseContent.indexOf('{');
  const lastBrace = responseContent.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
    return responseContent.slice(firstBrace, lastBrace + 1);
  }

  return responseContent.trim();
}

function isValidMealPlanResponse(payload: unknown): payload is {
  mealPlan: { days: unknown[] };
  groceryList: Record<string, unknown[]>;
  totalEstimatedCost?: number;
  prepTips?: string[];
  treatSuggestions?: string[];
} {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const candidate = payload as {
    mealPlan?: { days?: unknown[] };
    groceryList?: Record<string, unknown[]>;
  };

  return Array.isArray(candidate.mealPlan?.days) && !!candidate.groceryList;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { budget, weekStartDate, preferences } = body;
    const parsedBudget = typeof budget === 'number' ? budget : Number(budget);
    const normalizedBudget = Number.isFinite(parsedBudget) && parsedBudget > 0 ? parsedBudget : 120;
    const normalizedWeekStartDate =
      typeof weekStartDate === 'string' && weekStartDate.trim().length > 0
        ? weekStartDate
        : new Date().toISOString().slice(0, 10);

    // Get user's diet preferences
    const dietResult = await pool.query('SELECT * FROM diet_preferences WHERE user_id = $1', [session.user.id]);
    const dietPrefs = dietResult.rows[0];

    const healthContext = dietPrefs?.health_conditions 
      ? `IMPORTANT HEALTH CONSIDERATION: User has ${dietPrefs.health_conditions}. Avoid foods that may interfere with immunosuppressant medications or increase inflammation. Focus on anti-inflammatory foods, limit high-sodium items, and ensure adequate calcium and vitamin D sources.`
      : '';

    const prompt = `Create a detailed 7-day meal plan for a couple following a low-carb paleo diet.

DIET REQUIREMENTS:
- Low-carb paleo (<50g net carbs per person per day)
- High protein to preserve muscle
- Anti-inflammatory focus (GPA disease considerations)
- Budget: $${normalizedBudget} per week for two people
- Week starting: ${normalizedWeekStartDate}

${healthContext}

MEAL STRUCTURE:
- Breakfast: ~300-400 kcal per person
- Lunch: ~400-500 kcal per person  
- Dinner: ~400-500 kcal per person
- Optional snacks: Hard-boiled eggs, cucumber, celery

PREFERENCES:
- Simple, batch-preppable meals
- Focus on affordable proteins: eggs, chicken thighs, ground beef/turkey, canned fish
- Heavy on cheap vegetables: cabbage, broccoli, zucchini, cauliflower, spinach
- Minimal food waste
- Salt Lake City area pricing estimates

Please respond with ONLY valid JSON in this exact format:
{
  "mealPlan": {
    "days": [
      {
        "day": 1,
        "breakfast": { "name": "...", "description": "...", "calories": 350, "netCarbs": 5 },
        "lunch": { "name": "...", "description": "...", "calories": 450, "netCarbs": 10 },
        "dinner": { "name": "...", "description": "...", "calories": 480, "netCarbs": 12 }
      }
    ]
  },
  "groceryList": {
    "proteins": [{ "item": "...", "quantity": "...", "estimatedPrice": 0 }],
    "vegetables": [{ "item": "...", "quantity": "...", "estimatedPrice": 0 }],
    "fats": [{ "item": "...", "quantity": "...", "estimatedPrice": 0 }],
    "other": [{ "item": "...", "quantity": "...", "estimatedPrice": 0 }]
  },
  "totalEstimatedCost": 0,
  "prepTips": ["..."],
  "treatSuggestions": ["Low-carb paleo-friendly treats for occasional enjoyment"]
}`;

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'qwen/qwen3.6-plus:free',
      messages: [
        {
          role: 'system',
          content: 'You are a nutritionist and meal planning expert specializing in low-carb paleo diets. You create practical, budget-friendly meal plans with clear grocery lists. Always respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content || '';
    console.log('Raw AI response:', responseContent.substring(0, 500));
    
    // Parse the JSON response
    let parsedResponse;
    try {
      const jsonString = extractJsonResponse(responseContent);
      parsedResponse = JSON.parse(jsonString);

      if (!isValidMealPlanResponse(parsedResponse)) {
        throw new Error('AI response did not match the expected meal plan shape');
      }

      console.log('Parsed response keys:', Object.keys(parsedResponse));
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw content:', responseContent);
      return NextResponse.json(
        { error: 'Meal plan service returned an invalid response. Please try again.' },
        { status: 500 }
      );
    }

    // Save meal plan to database
    await pool.query(
      `INSERT INTO meal_plans (user_id, week_start_date, plan_data, budget) VALUES ($1, $2, $3, $4)`,
      [session.user.id, normalizedWeekStartDate, JSON.stringify(parsedResponse), normalizedBudget]
    );

    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error('Meal plan generation error:', error);

    const message = error instanceof Error ? error.message : 'Failed to generate meal plan';
    if (message === 'OPENROUTER_API_KEY is not configured') {
      return NextResponse.json(
        { error: 'Meal plan generation is not configured on the server.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate meal plan', details: process.env.NODE_ENV !== 'production' ? message : undefined },
      { status: 500 }
    );
  }
}
