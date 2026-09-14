'use client';

import { CalendarDays, Gamepad2, Swords } from 'lucide-react';
import { useEffect, useState } from 'react';

const links = [
  { href: './', label: 'Battles', icon: Swords, path: '' },
  { href: './plan.html', label: 'Plan', icon: CalendarDays, path: 'plan' },
  { href: './practice.html', label: 'Games', icon: Gamepad2, path: 'practice' },
];

export function MobileNav() {
  const [path, setPath] = useState('');
  useEffect(() => {
    const page = window.location.pathname.split('/').pop()?.replace(/\.html$/, '') ?? '';
    setPath(page === 'index' ? '' : page === 'contest' ? '' : page);
  }, []);
  return <nav className="mobile-nav" aria-label="Mobile navigation">
    {links.map(({ href, label, icon: Icon, path: target }) =>
      <a key={label} href={href} aria-current={path === target ? 'page' : undefined}>
        <Icon size={19} aria-hidden="true" /><span>{label}</span>
      </a>)}
  </nav>;
}
