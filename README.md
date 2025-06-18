# Print Order Admin

A modern print order administration system built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui.

## Features

- 🎨 Modern, responsive UI built with shadcn/ui components
- ⚡ Fast and efficient with Next.js App Router
- 🔍 Order search and management
- 📊 Real-time statistics dashboard
- 🎯 Quick action buttons for common tasks
- 📱 Mobile-friendly responsive design

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Deployment**: Ready for Vercel

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
src/
├── app/
│   ├── globals.css          # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── components/
│   └── ui/                 # shadcn/ui components
├── lib/
│   └── utils.ts            # Utility functions
└── hooks/                  # Custom React hooks
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

This project is optimized for deployment on [Vercel](https://vercel.com/). Simply connect your GitHub repository to Vercel for automatic deployments.

## Development

This project uses:
- **shadcn/ui** for beautiful, accessible components
- **Tailwind CSS** for utility-first styling
- **TypeScript** for type safety
- **ESLint** for code quality

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
