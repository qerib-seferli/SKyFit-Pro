import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  THEME_KEY,
} from './config.js';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

export const $ = (s, p = document) => p.querySelector(s);
export const $$ = (s, p = document) => [...p.querySelectorAll(s)];

export function money(v = 0) {
  return Number(v).toFixed(2) + ' ₼';
}

export function toast(text) {
  const box = $('#toast');

  if (!box) return;

  box.textContent = text;
  box.classList.add('show');

  clearTimeout(box.timer);

  box.timer = setTimeout(() => {
    box.classList.remove('show');
  }, 2500);
}

export function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
}

export function loadTheme() {
  const t =
    localStorage.getItem(THEME_KEY) || 'dark';

  setTheme(t);
}

export function toggleTheme() {
  const next =
    document.documentElement.dataset.theme === 'dark'
      ? 'light'
      : 'dark';

  setTheme(next);
}
