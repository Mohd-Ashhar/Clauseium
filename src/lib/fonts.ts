import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600','700','800'],
  variable: '--font-display',
});

export const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});