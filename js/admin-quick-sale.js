// SKy Fit Pro — legacy admin quick-sale compatibility shim
// Ayrı admin FAB yaratmır. Bütün staff səhifələri layout.js -> quick-sale.js istifadə edir.

export function createAdminQuickSale() {
  async function bind() {
    const legacy = document.getElementById('admin-quick-sale-fab');
    if (legacy && !legacy.classList.contains('global-quick-sale-fab')) legacy.remove();

    const module = await import('./quick-sale.js');
    await module.initGlobalQuickSale();
  }

  async function open(trigger = null) {
    await bind();
    document.getElementById('global-quick-sale-fab')?.click();
    return trigger;
  }

  function render() {}

  return { bind, open, render };
}
