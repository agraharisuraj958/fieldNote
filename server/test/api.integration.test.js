import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

const databaseUrl=process.env.TEST_DATABASE_URL;
test('HTTP workflows record multi-line sales, purchases, returns, and block expired stock', {skip:!databaseUrl}, async()=>{
  process.env.DATABASE_URL=databaseUrl;
  process.env.JWT_SECRET ||= 'integration-test-secret-with-adequate-length';
  const [{app},{pool}]=await Promise.all([import('../src/index.js'),import('../src/db.js')]);
  const server=app.listen(0);
  const base=`http://127.0.0.1:${server.address().port}/api`;
  const call=(path,token,body,method='POST')=>fetch(`${base}${path}`,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},...(body?{body:JSON.stringify(body)}:{})});
  try {
    const login=await fetch(`${base}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@fieldnote.demo',password:'FieldnoteDemo26!'})});
    assert.equal(login.status,200,'seed the test database with demo users first');
    const {token}=await login.json();
    const today=(await pool.query("select to_char(current_date,'YYYY-MM-DD') as day")).rows[0].day;
    const baselineResponse=await call(`/reports/sales?from=${today}&to=${today}`,token,null,'GET');
    const baseline=(await baselineResponse.json()).summary;
    const supplierRes=await call('/suppliers',token,{name:`Integration supplier ${randomUUID().slice(0,8)}`,contact:'+1 555 0101',email:'supply@example.test'});
    assert.equal(supplierRes.status,201);
    const supplier=(await supplierRes.json()).supplier;
    assert.equal((await call(`/suppliers/${supplier.id}`,token,{contact:'+1 555 0102'},'PATCH')).status,200);
    const productIds=[randomUUID(),randomUUID()];
    const batches=[];
    for(let i=0;i<2;i++){
      await pool.query("insert into products(id,sku,name,category,reorder_level,tax_rate,supplier_id) values($1,$2,$3,'Demo',0,5,$4)",[productIds[i],`TEST-${randomUUID().slice(0,8)}`,`Integration product ${i+1}`,supplier.id]);
      const batch=await pool.query("insert into batches(product_id,batch_number,expiry_date,quantity,purchase_price,sale_price) values($1,$2,current_date+90,5,2,10) returning id",[productIds[i],`B-${randomUUID().slice(0,8)}`]);
      batches.push(batch.rows[0].id);
      await pool.query("insert into stock_movements(batch_id,product_id,movement_type,quantity_delta,reason) values($1,$2,'opening',5,'Integration fixture opening stock')",[batch.rows[0].id,productIds[i]]);
    }
    assert.equal((await call(`/products/${productIds[0]}`,token,{category:'Updated demo category'},'PATCH')).status,200);

    const saleRes=await call('/sales',token,{items:[{productId:productIds[0],quantity:3},{productId:productIds[1],quantity:2}],idempotencyKey:randomUUID()});
    assert.equal(saleRes.status,201);
    const {sale}=await saleRes.json();
    assert.equal(Number(sale.total),52.5);
    for(const [i,expected]of [2,3].entries()){
      const remaining=await pool.query('select quantity from batches where id=$1',[batches[i]]);
      assert.equal(remaining.rows[0].quantity,expected);
    }

    const purchaseRes=await call('/purchases',token,{supplierId:supplier.id,reference:`PO-${randomUUID().slice(0,8)}`,items:[{productId:productIds[0],batchNumber:`RE-${randomUUID().slice(0,8)}`,expiryDate:(await pool.query("select to_char(current_date+180,'YYYY-MM-DD') as day")).rows[0].day,quantity:10,unitCost:2.5,salePrice:11}]});
    assert.equal(purchaseRes.status,201);
    const purchases=await call('/purchases',token,null,'GET');
    assert.equal(purchases.status,200);
    assert.ok((await purchases.json()).items.length>0);

    const invoice=await call(`/sales/${sale.id}`,token,null,'GET');
    const invoiceItems=(await invoice.json()).sale.items;
    const returned=await call('/returns',token,{saleItemId:invoiceItems[0].id,quantity:1,reason:'Customer returned sealed pack',restock:true});
    assert.equal(returned.status,201);
    const report=await call('/reports/stock',token,null,'GET');
    const row=(await report.json()).items.find(x=>x.id===productIds[0]);
    assert.equal(row.on_hand,13);
    assert.equal(row.opening+row.purchases+row.sales+row.returns+row.adjustments,row.on_hand);
    const salesReport=await call(`/reports/sales?from=${today}&to=${today}`,token,null,'GET');
    const salesData=await salesReport.json();
    assert.equal(salesReport.status,200);
    assert.equal(Math.round((Number(salesData.summary.revenue)-Number(baseline.revenue))*100)/100,42);
    assert.equal(Math.round((Number(salesData.summary.tax)-Number(baseline.tax))*100)/100,2);

    const expiredProduct=randomUUID();
    await pool.query("insert into products(id,sku,name,category,reorder_level,tax_rate) values($1,$2,'Expired test product','Demo',0,5)",[expiredProduct,`TEST-${randomUUID().slice(0,8)}`]);
    const expired=await pool.query("insert into batches(product_id,batch_number,expiry_date,quantity,purchase_price,sale_price) values($1,$2,current_date-1,4,2,10) returning id",[expiredProduct,`B-${randomUUID().slice(0,8)}`]);
    const blocked=await call('/sales',token,{items:[{productId:expiredProduct,quantity:1}],idempotencyKey:randomUUID()});
    assert.equal(blocked.status,409);
    const unchanged=await pool.query('select quantity from batches where id=$1',[expired.rows[0].id]);
    assert.equal(unchanged.rows[0].quantity,4);
    const expiredReceipt=await call('/purchases',token,{reference:`PO-${randomUUID().slice(0,8)}`,items:[{productId:expiredProduct,batchNumber:'EXPIRED-RECEIPT',expiryDate:(await pool.query("select to_char(current_date-1,'YYYY-MM-DD') as day")).rows[0].day,quantity:1,unitCost:1,salePrice:2}]});
    assert.equal(expiredReceipt.status,400);
  } finally {
    await new Promise(resolve=>server.close(resolve));
    await pool.end();
  }
});
