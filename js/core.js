import {createClient}
from
'https://esm.sh/@supabase/supabase-js@2';

import {CONFIG}
from './config.js';

export const supabase=createClient(
CONFIG.SUPABASE_URL,
CONFIG.SUPABASE_ANON_KEY
);

export const $=(s,p=document)=>p.querySelector(s);

export const $$=(s,p=document)=>
[...p.querySelectorAll(s)];

export function money(v){

return new Intl.NumberFormat(

'az-AZ',

{

minimumFractionDigits:2,

maximumFractionDigits:2,

}

).format(Number(v||0))+' ₼';

}

export function toast(text,type='info'){

const wrap=$('#toast');

if(!wrap)return;

wrap.className='toast show '+type;

wrap.textContent=text;

clearTimeout(wrap.timer);

wrap.timer=setTimeout(()=>{

wrap.className='toast';

},2500);

}

export function saveTheme(theme){

document.documentElement.dataset.theme=theme;

localStorage.setItem(

'skyfit-theme',

theme

);

}

export function loadTheme(){

const theme=

localStorage.getItem(

'skyfit-theme'

)

||

CONFIG.UI.theme;

saveTheme(theme);

}

export function toggleTheme(){

saveTheme(

document.documentElement.dataset.theme==='dark'

?

'light'

:

'dark'

);

}

export async function session(){

const{

data

}=await supabase.auth.getSession();

return data.session;

}

export async function user(){

const s=await session();

if(!s)return null;

return s.user;

}

export async function profile(){

const u=await user();

if(!u)return null;

const{

data

}=await supabase

.from('profiles')

.select('*')

.eq('id',u.id)

.single();

return data;

}
