# Woodbury Diet App

A comprehensive meal planning and grocery price comparison app designed for couples following a low-carb paleo diet with health considerations.

## Features

- **AI-Powered Meal Planning**: Generates 7-day meal plans using OpenRouter API (Claude Sonnet)
- **Budget Management**: Set weekly budgets and track estimated costs
- **Grocery List Generation**: Automatic shopping lists organized by category
- **Price Comparison**: Track and compare grocery prices across local stores
- **Health-Aware**: Considers GPA disease with anti-inflammatory food focus
- **Treat Suggestions**: Occasional low-carb paleo-friendly treats
- **User Authentication**: Secure login system with setup on first launch
- **Vercel Ready**: Deploy to Vercel with one click

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite (better-sqlite3)
- **Authentication**: NextAuth.js
- **AI**: OpenRouter API (Claude Sonnet 4)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run database migrations:
```bash
npm run db:migrate
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### First-Time Setup

When you first open the app, you'll be directed to the setup page where you can:
- Create a username and password
- The app will automatically configure default diet preferences (low-carb paleo, ~1400 calories, 50g net carbs, GPA disease considerations)

## Usage

### Generating Meal Plans
1. Go to the "Meal Plans" tab
2. Set your weekly budget (default: $120)
3. Choose the week start date
4. Click "Generate Plan"
5. View expandable daily meals with calories and net carbs

### Tracking Grocery Prices
1. Go to the "Price Comparison" tab
2. Add prices from different stores (Walmart, Smith's, etc.)
3. View best prices highlighted for each item
4. The grocery list will show best available prices

### Viewing Grocery Lists
1. Generate a meal plan first
2. Switch to the "Grocery List" tab
3. See items organized by category (proteins, vegetables, fats, other)
4. Best prices from your tracked stores are shown

## Diet Considerations

The app is configured with:
- **Low-carb paleo**: <50g net carbs per day
- **High protein**: To preserve muscle during weight loss
- **Anti-inflammatory focus**: For GPA disease management
- **Budget-friendly**: Emphasis on affordable proteins and vegetables
- **Treat moderation**: Occasional paleo-friendly treats included

## Deploying to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_NAME`
   - `DB_USER`
   - `DB_PASSWORD`
   - `OPENROUTER_API_KEY`
   - `NEXTAUTH_SECRET` (generate a new one for production)
   - `NEXTAUTH_URL` (your production URL)
5. Deploy!

**Note**: For production, consider using a persistent database solution like Vercel Postgres or Supabase instead of SQLite.

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/    # Authentication
│   │   │   ├── setup/                 # First-time setup
│   │   │   ├── meal-plans/            # AI meal generation
│   │   │   └── grocery-prices/        # Price tracking
│   │   ├── setup/                     # Setup page
│   │   ├── login/                     # Login page
│   │   ├── dashboard/                 # Main dashboard
│   │   └── page.tsx                   # Home redirect
│   └── lib/
│       └── db.ts                      # Database connection
├── scripts/
│   └── migrate.ts                     # Database migrations
├── data/                              # SQLite database (gitignored)
└── .env.local                         # Environment variables
```

## License

Private - For personal use only
