import { pool } from '../config/db.js';
import { audit } from '../services/audit.js';
import { notify } from '../services/notify.js';

export async function listCategories(req,res,next){ try{
  const [rows]=await pool.query('SELECT * FROM material_categories WHERE company_id=? AND is_deleted=0 ORDER BY name',[req.user.company_id]);
  res.json(rows);
}catch(e){next(e);} }

export async function createCategory(req,res,next){ try{
  const c=req.user.company_id;
  const [r]=await pool.query('INSERT INTO material_categories(company_id,name) VALUES(?,?)',[c,req.body.name]);
  await audit(req,'CREATE','material_categories',r.insertId,{name:req.body.name});
  const [[row]]=await pool.query('SELECT * FROM material_categories WHERE id=? AND company_id=?',[r.insertId,c]);
  res.status(201).json(row);
}catch(e){ if(e.code==='ER_DUP_ENTRY') return res.status(409).json({message:'A category with this name already exists'}); next(e); } }

export async function updateCategory(req,res,next){ try{
  await pool.query('UPDATE material_categories SET name=? WHERE id=? AND company_id=? AND is_deleted=0',[req.body.name,req.params.id,req.user.company_id]);
  await audit(req,'UPDATE','material_categories',req.params.id,req.body);
  const [[row]]=await pool.query('SELECT * FROM material_categories WHERE id=? AND company_id=?',[req.params.id,req.user.company_id]);
  res.json(row);
}catch(e){next(e);} }

export async function deleteCategory(req,res,next){ try{
  await pool.query('UPDATE material_categories SET is_deleted=1 WHERE id=? AND company_id=?',[req.params.id,req.user.company_id]);
  await audit(req,'DELETE','material_categories',req.params.id);
  res.json({message:'Deleted'});
}catch(e){next(e);} }

const ADJUST_TYPES=new Set(['Transfer In','Transfer Out','Damage','Wastage','Adjustment In','Adjustment Out']);

export async function adjustStock(req,res,next){ try{
  const b=req.body,c=req.user.company_id,materialId=req.params.id;
  if(!ADJUST_TYPES.has(b.transaction_type)) return res.status(422).json({message:'Invalid adjustment type'});
  const qty=Number(b.quantity);
  if(!qty||qty<=0) return res.status(422).json({message:'Quantity must be greater than zero'});
  const [[material]]=await pool.query('SELECT * FROM materials WHERE id=? AND company_id=? AND is_deleted=0',[materialId,c]);
  if(!material) return res.status(404).json({message:'Material not found'});
  const [r]=await pool.query(
    `INSERT INTO stock_transactions(company_id,material_id,project_id,transaction_date,transaction_type,quantity,unit_cost,reference_type,remarks,created_by)
     VALUES(?,?,?,?,?,?,?,?,?,?)`,
    [c,materialId,b.project_id||null,b.transaction_date||new Date(),b.transaction_type,qty,b.unit_cost||material.default_unit_cost||0,'manual_adjustment',b.remarks||null,req.user.id]
  );
  await audit(req,'ADJUST_STOCK','materials',materialId,{transaction_type:b.transaction_type,quantity:qty});

  const [[agg]]=await pool.query(
    `SELECT m.name,m.minimum_stock,m.opening_stock,
       COALESCE(SUM(CASE WHEN st.transaction_type IN ('Purchase','Transfer In','Adjustment In') THEN st.quantity ELSE 0 END),0) received,
       COALESCE(SUM(CASE WHEN st.transaction_type='Issue' THEN st.quantity ELSE 0 END),0) issued,
       COALESCE(SUM(CASE WHEN st.transaction_type IN ('Transfer Out','Damage','Wastage','Adjustment Out') THEN st.quantity ELSE 0 END),0) other_out
     FROM materials m LEFT JOIN stock_transactions st ON st.material_id=m.id AND st.is_deleted=0
     WHERE m.id=? AND m.company_id=? GROUP BY m.id`,[materialId,c]);
  if(agg){
    const available=Number(agg.opening_stock)+Number(agg.received)-Number(agg.issued)-Number(agg.other_out);
    if(available<=Number(agg.minimum_stock)) await notify(c,{type:'low_stock',title:'Low Stock Alert',message:`${agg.name} is ${available<=0?'out of stock':'running low'} (${available} available)`,entityType:'materials',entityId:materialId});
  }
  res.status(201).json({id:r.insertId});
}catch(e){next(e);} }

export async function getMaterialLedger(req,res,next){ try{
  const c=req.user.company_id, materialId=req.params.id;
  const [[material]]=await pool.query(
    `SELECT m.*,mc.name category_name FROM materials m LEFT JOIN material_categories mc ON mc.id=m.category_id WHERE m.id=? AND m.company_id=? AND m.is_deleted=0`,[materialId,c]);
  if(!material) return res.status(404).json({message:'Material not found'});
  const [txns]=await pool.query(
    `SELECT st.*,p.project_name FROM stock_transactions st LEFT JOIN projects p ON p.id=st.project_id
     WHERE st.material_id=? AND st.company_id=? AND st.is_deleted=0 ORDER BY st.transaction_date,st.id`,[materialId,c]);
  const IN=new Set(['Purchase','Transfer In','Adjustment In']);
  let balance=Number(material.opening_stock||0);
  const ledger=[{transaction_date:null,transaction_type:'Opening Stock',quantity:balance,project_name:null,remarks:null,balance},
    ...txns.map(t=>{ const qty=Number(t.quantity); balance+= IN.has(t.transaction_type)?qty:-qty; return {...t,balance}; })];
  res.json({material,ledger});
}catch(e){next(e);} }
