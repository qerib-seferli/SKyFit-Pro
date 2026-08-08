import { $, toggleTheme } from './core.js';

export function initLayout() {

  $('#themeBtn')?.addEventListener(
    'click',
    toggleTheme
  );

  $('#menuBtn')?.addEventListener(
    'click',
    () => {
      $('#mobileMenu').classList.toggle('open');
    }
  );
}
