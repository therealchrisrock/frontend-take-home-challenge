# Checkers Platform - Full-Featured Multiplayer Game (BETA)

A comprehensive multiplayer checkers platform built with the [T3 Stack](https://create.t3.gg/), featuring real-time gameplay, tournament systems, social features, and multiple game variants.

> **🧪 BETA STATUS**: Multiplayer features are currently in beta with known issues. See [Known Issues](#known-issues--limitations) section below.

## ✨ Features

### Core Gameplay

- ✅ **Single-Player vs AI**: Multiple difficulty levels with intelligent move evaluation
- ✅ **Local Multiplayer**: Hot-seat gameplay for two players
- 🧪 **Online Multiplayer (BETA)**: Real-time gameplay with invitation system
- ✅ **Multiple Variants**: American, Brazilian, International, and Canadian rules
- ✅ **Game Analysis**: Move history, notation, and post-game review

### Social & Community

- ✅ **Friend System**: Add friends, send messages, manage relationships
- ✅ **Real-time Notifications**: Server-Sent Events for instant updates
- ✅ **Messaging**: Private conversations between players
- ✅ **User Profiles**: Avatars, statistics, and match history

### Competitive Play

- ✅ **Tournament System**: Swiss and Round Robin formats
- ✅ **Rating System**: ELO-based rankings per variant and play mode
- ✅ **Match History**: Complete game records and statistics
- 🚧 **Spectating (IN PROGRESS)**: Watch live games in real-time

### Accessibility & UX

- ✅ **Guest Accounts**: Play without registration, convert to full account later
- ✅ **Mobile Responsive**: Optimized touch controls and responsive design
- ✅ **Keyboard Navigation**: Full accessibility support
- ✅ **Multiple Themes**: Customizable board skins and piece sets

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database
- (Optional) AWS S3 for avatar uploads

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd checkers

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and other configuration
```

### Environment Configuration

Create a `.env` file with the following variables:

```env
# Database (Required)
DATABASE_URL="postgresql://username:password@localhost:5432/checkers"

# Authentication (Required)
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Discord OAuth (Optional - for Discord login)
DISCORD_CLIENT_ID="your-discord-client-id"
DISCORD_CLIENT_SECRET="your-discord-client-secret"

# AWS S3 (Optional - for avatar uploads)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_S3_BUCKET="your-bucket-name"

# Email (Optional - for notifications)
RESEND_API_KEY="your-resend-api-key"
```

### Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push

# Seed database with sample data (optional)
pnpm db:seed
pnpm db:seed:games
```

### Development

```bash
# Start development server
pnpm dev

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

Visit [http://localhost:3000](http://localhost:3000) to start playing!

## 🛠️ Tech Stack

This application is built with the [T3 Stack](https://create.t3.gg/) and additional tools:

### Core Framework

- **[Next.js 15](https://nextjs.org)** - React framework with App Router
- **[TypeScript](https://typescriptlang.org)** - Type-safe JavaScript
- **[React 19](https://react.dev)** - User interface library

### Backend & Database

- **[tRPC](https://trpc.io)** - End-to-end typesafe APIs
- **[Prisma](https://prisma.io)** - Database ORM
- **[PostgreSQL](https://postgresql.org)** - Production database
- **[NextAuth.js](https://next-auth.js.org)** - Authentication

### UI & Styling

- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first CSS framework
- **[Shadcn/ui](https://ui.shadcn.com)** - Re-usable component library
- **[Framer Motion](https://framer.com/motion)** - Animation library
- **[Lucide React](https://lucide.dev)** - Icon library

### Real-time & Storage

- **Server-Sent Events** - Real-time notifications and updates
- **[AWS S3](https://aws.amazon.com/s3)** - Avatar and file storage
- **[Resend](https://resend.com)** - Email notifications

### Testing & Quality

- **[Comprehensive Testing Documentation](src/test/README-testing.md)** - Detailed guide to all testing aspects
- **[Vitest](https://vitest.dev)** - Unit and integration testing
- **[Playwright](https://playwright.dev)** - End-to-end testing
- **[ESLint](https://eslint.org)** - Code linting
- **[Prettier](https://prettier.io)** - Code formatting

## 🎮 Game Variants

The platform supports multiple official checkers variants:

### American Checkers (English Draughts)

- 8×8 board with 32 dark squares
- 12 pieces per player
- Kings can move and capture backwards
- Flying kings (long-range moves)

### International Checkers (Polish Draughts)

- 10×10 board with 50 dark squares
- 20 pieces per player
- Mandatory capturing with maximum capture rule
- Flying kings with long-range moves

### Brazilian Checkers

- 8×8 board (same as American)
- International rules on smaller board
- Flying kings and maximum capture rule

### Canadian Checkers

- 12×12 board with 72 dark squares
- 30 pieces per player
- International rules on largest board

## 🏆 Tournament System

### Tournament Formats

- **Swiss System**: Players paired by performance, fixed number of rounds
- **Round Robin**: Every player plays every other player
- **Single Elimination**: Traditional bracket tournament (coming soon)
- **Double Elimination**: Losers bracket for second chances (coming soon)

### Rating System

- **ELO-based ratings** separate for each variant and play mode
- **Provisional ratings** for new players (first 20 games)
- **Peak rating tracking** and historical performance
- **Leaderboards** by variant and timeframe

## 🔧 API Documentation

### tRPC Routers

The application uses tRPC for type-safe API communication:

- **`auth`** - Authentication and user management
- **`user`** - User profiles, friends, and social features
- **`game`** - Game creation, moves, and state management
- **`multiplayerGame`** - Real-time multiplayer functionality
- **`gameInvite`** - Game invitations and matchmaking
- **`friendRequest`** - Friend request management
- **`message`** - Private messaging system
- **`notification`** - Real-time notification system
- **`gameNotes`** - Game analysis and notes

### Real-time Endpoints

- **`/api/notifications/stream`** - Server-Sent Events for notifications
- **`/api/game/[id]/mp-stream`** - Real-time game state updates
- **`/api/messages/stream`** - Real-time message delivery

## ⚠️ Known Issues & Limitations

### Multiplayer (Beta)

- **Sync conflicts** may occur with rapid consecutive moves
- **Connection drops** can cause temporary desync (auto-recovery implemented)
- **Move validation** occasionally allows illegal moves under race conditions
- **Spectator permissions** still being refined

### In Development

- **Spectating system** - UI components ready, backend integration in progress
- **Tournament brackets** - Tournament logic complete, visualization pending
- **Push notifications** - Server-side ready, client registration needed
- **Mobile drag optimization** - Touch handling improvements planned

### Performance

- **Large game history** can slow down game loading (pagination planned)
- **Simultaneous tournaments** may impact database performance
- **Real-time scaling** tested up to 50 concurrent games

## 🚀 Deployment

### Environment Requirements

- **Node.js 18+** with pnpm package manager
- **PostgreSQL 13+** database
- **AWS S3** bucket (optional, for avatar uploads)
- **SMTP service** (optional, for email notifications)

### Production Build

```bash
# Build for production
pnpm build

# Start production server
pnpm start

# Or build and preview locally
pnpm preview
```

### Database Migration

```bash
# Run migrations in production
pnpm db:migrate

# Generate Prisma client
pnpm db:generate
```

### Deployment Platforms

This application can be deployed on:

- **[Vercel](https://vercel.com)** - Recommended for Next.js applications
- **[Railway](https://railway.app)** - Easy PostgreSQL hosting
- **[PlanetScale](https://planetscale.com)** - Serverless MySQL alternative
- **[Supabase](https://supabase.com)** - PostgreSQL with additional features
- **[Docker](https://docker.com)** - Containerized deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`pnpm test`)
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Development Guidelines

- Follow the existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Ensure TypeScript strict mode compliance

## 📝 Other Documentation

- **[Social Components Readme](src/components/social/README.md)** - Documentation for social features and components
- **[Multiplayer UI Readme](src/components/game/README-multiplayer-ui.md)** - Documentation for multiplayer game UI components
- **[Notifications Readme](src/components/README-notifications.md)** - Documentation for the notification system
- **[Testing Readme](src/test/README-testing.md)** - Documentation for Testing

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[T3 Stack](https://create.t3.gg/)** for the excellent foundation
- **[Shadcn/ui](https://ui.shadcn.com)** for the beautiful component library
- **Checkers community** for rules clarification and testing
- **Contributors** who helped improve the platform
