import {normalizeBindings} from './bindings.mjs';
const defaults={volume:0.35,sensitivity:0.35,creative:true,colorblind:false,reduceMotion:false,largeText:false,bindings:normalizeBindings()};
const key='dao-den-long.settings.v1';
export function normalizeSettings(value={}){if(!value||typeof value!=='object')value={};return{
  volume:typeof value.volume==='number'&&Number.isFinite(value.volume)?Math.max(0,Math.min(1,value.volume)):defaults.volume,
  sensitivity:typeof value.sensitivity==='number'&&Number.isFinite(value.sensitivity)?Math.max(0.1,Math.min(1,value.sensitivity)):defaults.sensitivity,
  creative:typeof value.creative==='boolean'?value.creative:defaults.creative,
  colorblind:typeof value.colorblind==='boolean'?value.colorblind:defaults.colorblind,
  reduceMotion:typeof value.reduceMotion==='boolean'?value.reduceMotion:false,
  largeText:typeof value.largeText==='boolean'?value.largeText:false,
  bindings:normalizeBindings(value.bindings),
};}
export function loadSettings(storage){try{return normalizeSettings(JSON.parse(storage.getItem(key)??'{}'));}catch{return{...defaults};}}
export function saveSettings(storage,value){const result=normalizeSettings(value);try{storage.setItem(key,JSON.stringify(result));}catch{}return result;}
