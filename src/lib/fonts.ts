import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

// Editorial serif for display headlines — gives the premium legaltech voice
// (Harvey / Spellbook) instead of the geometric-sans dev-tool look.
// Lighter weights read more refined; avoid 800. To A/B a more conservative
// transitional serif, swap `Fraunces` for `Newsreader` or `Source_Serif_4`.
export const display = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
});

export const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});