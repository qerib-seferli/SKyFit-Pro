import{

$,

toggleTheme

}

from './core.js';

export function initLayout(){

$('#themeBtn')

?.addEventListener(

'click',

toggleTheme

);

$('#menuBtn')

?.addEventListener(

'click',

()=>{

document.body

.classList.toggle(

'drawer-open'

);

});

$('#drawerClose')

?.addEventListener(

'click',

()=>{

document.body

.classList.remove(

'drawer-open'

);

});

}
