export function allocateFefo(batches, requested, today = new Date().toISOString().slice(0,10)) {
  if (!Number.isInteger(requested) || requested <= 0) throw new Error('Quantity must be a positive whole number.');
  let remaining=requested; const allocations=[];
  const day=value=>value instanceof Date?value.toISOString().slice(0,10):String(value).slice(0,10);
  for (const b of [...batches].filter(x=>day(x.expiry_date)>=today && Number(x.quantity)>0).sort((a,b)=>day(a.expiry_date).localeCompare(day(b.expiry_date)))) {
    const take=Math.min(Number(b.quantity),remaining); if(take){allocations.push({batchId:b.id,quantity:take}); remaining-=take;} if(!remaining) break;
  }
  if(remaining) throw new Error('Insufficient unexpired stock for this item.');
  return allocations;
}
export function computeTotals(items){const subtotal=items.reduce((s,x)=>s+x.quantity*x.unitPrice,0);const tax=items.reduce((s,x)=>s+x.quantity*x.unitPrice*x.taxRate/100,0);return {subtotal:Number(subtotal.toFixed(2)),tax:Number(tax.toFixed(2)),total:Number((subtotal+tax).toFixed(2))};}
