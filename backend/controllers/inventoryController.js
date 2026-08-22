import { pool } from '../config/db.js';
import { audit } from '../services/audit.js';
import { notify } from '../services/notify.js';
export async function stock(req,res,next){try{
  const [rows]=await pool.query(`SELECT m.id,m.name,m.unit,m.sku,m.category_id,m.opening_stock,m.minimum_stock,m.default_unit_cost rate,mc.name category_name,
    COALESCE(SUM(CASE WHEN st.transaction_type IN ('Purchase','Transfer In','Adjustment In') THEN st.quantity ELSE 0 END),0) received,
    COALESCE(SUM(CASE WHEN st.transaction_type='Issue' THEN st.quantity ELSE 0 END),0) issued,
    COALESCE(SUM(CASE WHEN st.transaction_type IN ('Transfer Out','Damage','Wastage','Adjustment Out') THEN st.quantity ELSE 0 END),0) other_out
    FROM materials m LEFT JOIN material_categories mc ON mc.id=m.category_id
    LEFT JOIN stock_transactions st ON st.material_id=m.id AND st.is_deleted=0
    WHERE m.company_id=? AND m.is_deleted=0 GROUP BY m.id ORDER BY m.name`,[req.user.company_id]);
  const data=rows.map(r=>{
    const available=Number(r.opening_stock)+Number(r.received)-Number(r.issued)-Number(r.other_out);
    const totalValue=available*Number(r.rate||0);
    const status=available<=0?'Out of Stock':(available<=Number(r.minimum_stock)?'Low Stock':'In Stock');
    return {...r,in_stock:Number(r.opening_stock)+Number(r.received),available,total_value:totalValue,status};
  });
  res.json(data);
}catch(e){next(e)}}
export async function issue(req,res,next){try{const b=req.body,c=req.user.company_id,items=Array.isArray(b.items)?b.items:[];const conn=await pool.getConnection();try{await conn.beginTransaction();const [r]=await conn.query(`INSERT INTO material_issues(company_id,project_id,issue_date,remarks,created_by) VALUES(?,?,?,?,?)`,[c,b.project_id,b.issue_date||new Date(),b.remarks||null,req.user.id]);for(const x of items){await conn.query(`INSERT INTO material_issue_items(company_id,material_issue_id,material_id,quantity,unit_cost) VALUES(?,?,?,?,?)`,[c,r.insertId,x.material_id,x.quantity,x.unit_cost||0]);await conn.query(`INSERT INTO stock_transactions(company_id,material_id,project_id,transaction_date,transaction_type,quantity,unit_cost,reference_type,reference_id,created_by) VALUES(?,?,?,?, 'Issue',?,?,?,?,?)`,[c,x.material_id,b.project_id,b.issue_date||new Date(),x.quantity,x.unit_cost||0,'material_issue',r.insertId,req.user.id]);}await conn.commit();await audit(req,'ISSUE','materials',r.insertId,{project_id:b.project_id});
  for(const x of items){
    const [[m]]=await pool.query(`SELECT m.name,m.minimum_stock,m.opening_stock,COALESCE(SUM(CASE WHEN st.transaction_type IN ('Purchase','Transfer In','Adjustment In') THEN st.quantity ELSE 0 END),0) received,COALESCE(SUM(CASE WHEN st.transaction_type='Issue' THEN st.quantity ELSE 0 END),0) issued,COALESCE(SUM(CASE WHEN st.transaction_type IN ('Transfer Out','Damage','Wastage','Adjustment Out') THEN st.quantity ELSE 0 END),0) other_out FROM materials m LEFT JOIN stock_transactions st ON st.material_id=m.id AND st.is_deleted=0 WHERE m.id=? AND m.company_id=? GROUP BY m.id`,[x.material_id,c]);
    if(m){
      const available=Number(m.opening_stock)+Number(m.received)-Number(m.issued)-Number(m.other_out);
      if(available<=Number(m.minimum_stock)) await notify(c,{type:'low_stock',title:'Low Stock Alert',message:`${m.name} is ${available<=0?'out of stock':'running low'} (${available} available)`,entityType:'materials',entityId:x.material_id});
    }
  }
  res.status(201).json({id:r.insertId})}catch(e){await conn.rollback();throw e}finally{conn.release()}}catch(e){next(e)}}
