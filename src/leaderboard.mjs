export const validName=(name)=>typeof name==='string'&&/^[A-Za-z0-9_]{3,12}$/.test(name);
export function validateEntry(entry){
  if(!entry||!validName(entry.name)||!Number.isSafeInteger(entry.score)||entry.score<0||!Number.isInteger(entry.nights_won)||entry.nights_won<0||entry.nights_won>3||!Number.isSafeInteger(entry.seed)||typeof entry.achieved_at!=='string'||!/(Z|[+-]\d\d:\d\d)$/.test(entry.achieved_at)||!Number.isFinite(Date.parse(entry.achieved_at)))throw new Error('Tên cần 3–12 ký tự A–Z, a–z, 0–9 hoặc _. Điểm và thông tin lượt chơi phải hợp lệ.');
  return {name:entry.name,score:entry.score,nights_won:entry.nights_won,achieved_at:entry.achieved_at,seed:entry.seed};
}
export function rankEntries(entries){return entries.map(validateEntry).sort((a,b)=>b.score-a.score||Date.parse(a.achieved_at)-Date.parse(b.achieved_at)).slice(0,10);}
