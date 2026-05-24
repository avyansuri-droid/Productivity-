import { useState, useEffect } from 'react';

export const THEMES = [
  {
    id: 'void',
    name: 'VOID',
    description: 'Current dark theme',
    colors: {
      bg: '#131313',
      bg2: '#1f1f1f',
      bg3: '#2a2a2a',
      text: '#e2e2e2',
      'text-variant': '#a0a0a0',
      accent: '#ffffff',
      border: '#444748',
    }
  },
  {
    id: 'arctic',
    name: 'ARCTIC',
    description: 'Blue-tinted dark — like a cold night sky',
    colors: {
      bg: '#0a0f1a',
      bg2: '#111827',
      bg3: '#1e2a3a',
      text: '#e0f0ff',
      'text-variant': '#94a3b8',
      accent: '#60a5fa',
      border: '#1e3a5f',
    }
  },
  {
    id: 'forest',
    name: 'FOREST',
    description: 'Deep green dark theme — calm and focused',
    colors: {
      bg: '#0d1a0f',
      bg2: '#132016',
      bg3: '#1a2e1d',
      text: '#d4edda',
      'text-variant': '#8fb39c',
      accent: '#4ade80',
      border: '#1f4025',
    }
  },
  {
    id: 'warm',
    name: 'WARM',
    description: 'Warm amber dark — cozy and creative',
    colors: {
      bg: '#1a1208',
      bg2: '#231a0c',
      bg3: '#2e2210',
      text: '#f5e6c8',
      'text-variant': '#c3aa82',
      accent: '#f59e0b',
      border: '#3d2e10',
    }
  },
  {
    id: 'slate',
    name: 'SLATE',
    description: 'Purple-slate dark — elegant and modern',
    colors: {
      bg: '#0f1117',
      bg2: '#1a1d27',
      bg3: '#252836',
      text: '#e2e8f0',
      'text-variant': '#94a3b8',
      accent: '#a78bfa',
      border: '#2d3148',
    }
  }
];

export function useTheme() {
  const [activeThemeId, setActiveThemeId] = useState(() => {
    return localStorage.getItem('app-theme') || 'void';
  });

  useEffect(() => {
    const theme = THEMES.find(t => t.id === activeThemeId) || THEMES[0];
    Object.entries(theme.colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--${key}`, value);
    });
    localStorage.setItem('app-theme', activeThemeId);
  }, [activeThemeId]);

  return { activeThemeId, setActiveThemeId, themes: THEMES };
}
