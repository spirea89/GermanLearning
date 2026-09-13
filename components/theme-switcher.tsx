'use client';
import { useEffect, useState } from 'react';
import { BriefcaseBusiness, Gamepad2, Terminal } from 'lucide-react';

type Theme='arcade'|'classic'|'black';
const OPTIONS=[{id:'arcade' as const,label:'Arcade',icon:Gamepad2},{id:'classic' as const,label:'Classic',icon:BriefcaseBusiness},{id:'black' as const,label:'Black',icon:Terminal}];

export function ThemeSwitcher(){
 const[theme,setTheme]=useState<Theme>('arcade');
 useEffect(()=>{const saved=(localStorage.getItem('lernzeit-theme') as Theme|null)??'arcade';setTheme(saved);document.documentElement.dataset.theme=saved;document.documentElement.classList.toggle('dark',saved==='black');},[]);
 function choose(next:Theme){setTheme(next);localStorage.setItem('lernzeit-theme',next);document.documentElement.dataset.theme=next;document.documentElement.classList.toggle('dark',next==='black');}
 return <div className="theme-switcher" role="group" aria-label="Visual theme">{OPTIONS.map(option=>{const Icon=option.icon;return <button key={option.id} type="button" aria-pressed={theme===option.id} onClick={()=>choose(option.id)} title={`${option.label} theme`}><Icon size={14}/><span>{option.label}</span></button>;})}</div>;
}
