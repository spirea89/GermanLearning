import type { Metadata } from 'next';
import './globals.css';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { MobileNav } from '@/components/mobile-nav';

export const metadata: Metadata = {
  metadataBase: new URL('https://spirea89.github.io/GermanLearning/'),
  title: 'Lernzeit · German learning games and plan',
  description: 'Plan focused German learning and practice vocabulary with short games.',
  openGraph: {
    title: 'Lernzeit',
    description: 'German, one day at a time',
    images: [{ url: 'og.png', width: 1200, height: 630, alt: 'Lernzeit — German, one day at a time' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lernzeit',
    description: 'German, one day at a time',
    images: ['og.png'],
  },
};
const themeScript=`(()=>{try{const t=localStorage.getItem('lernzeit-theme')||'arcade';document.documentElement.dataset.theme=t;if(t==='black')document.documentElement.classList.add('dark')}catch{}})()`;
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeScript}} /></head><body><ThemeSwitcher/><MobileNav/>{children}</body></html>; }
