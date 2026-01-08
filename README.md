# Limitless Me 🚀

A Next.js spinning wheel game that discovers your limitless potential! Spin the wheel and find out which creator or builder you're most aligned with.

## Features

- 🎰 **Animated Carousel**: Smooth, continuous spinning reel with avatar tiles
- 🎉 **Confetti Animation**: Fullscreen confetti celebration on win
- 🔊 **Sound Effects**: Desktop-only audio feedback
- 📱 **Mobile Responsive**: Optimized for all screen sizes
- 🐦 **Social Sharing**: Share your result on X/Twitter with custom OG images
- 🖼️ **Dynamic OG Images**: Auto-generated social media preview cards
- ⚡ **Next.js 14**: Built with App Router and TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd limitless-me
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Customization

### Update Participants

Edit `app/participants.ts` to add or modify the list of people in the wheel:

```typescript
export const RAW_PARTICIPANTS: Person[] = [
  { 
    handle: "@username", 
    image: "https://...", // Optional: URL to avatar image
    bio: "Your bio here" // Optional: Description
  },
  // Add more participants...
];
```

### Avatar Images

Place avatar images in `public/avatars/` directory:
- Format: `{handle-slug}.png` (e.g., `brianarmstrong.png`)
- Fallback: `default.png` is used if specific avatar not found
- The handle slug is generated automatically (removes @, lowercase, removes special chars)

### Branding

Update the following files to customize branding:
- `app/page.tsx` - Main page content and styling
- `app/layout.tsx` - Site metadata
- `app/r/page.tsx` - Share page metadata
- `app/og/route.tsx` - OG image generation

### Environment Variables

For production deployment, set:
- `NEXT_PUBLIC_SITE_URL` - Your production URL (e.g., `https://limitless-me.vercel.app`)

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com)
3. Vercel will automatically detect Next.js and deploy
4. Set `NEXT_PUBLIC_SITE_URL` environment variable in Vercel dashboard

The app is optimized for Vercel deployment with:
- Edge runtime for OG image generation
- Automatic static optimization
- Image optimization

## Project Structure

```
limitless-me/
├── app/
│   ├── page.tsx          # Main spinning wheel page
│   ├── layout.tsx        # Root layout with metadata
│   ├── participants.ts   # List of participants
│   ├── r/
│   │   └── page.tsx      # Share/results page
│   └── og/
│       └── route.tsx     # OG image generation API
├── public/
│   ├── avatars/          # Avatar images
│   └── sfx/              # Sound effects
├── package.json
└── README.md
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Technologies

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **React 18** - UI library
- **CSS-in-JS** - Styled with JSX styles

## License

MIT

## Credits

Built with [Next.js Boilerplate](https://github.com/vitdobatovkin/nextjs-boilerplate)
