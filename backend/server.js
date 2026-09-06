import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import 'dotenv/config';
import routes from './routes/index.js';
import { dbHealth } from './config/db.js';
import { notFound,errorHandler } from './middleware/errorHandler.js';

const app=express();
app.set('trust proxy',1);
app.use(helmet({crossOriginResourcePolicy:{policy:'cross-origin'}}));
// Deployments without a fixed domain get a fresh random public URL on every
// restart, so a static FRONTEND_URL allowlist would go stale immediately.
// Reflect whichever origin the browser actually sent instead of matching
// against one hardcoded value; if FRONTEND_URL is set, honor it as an
// allowlist (comma-separated) for setups that do have a stable domain.
const allowedOrigins=(process.env.FRONTEND_URL||'').split(',').map(o=>o.trim()).filter(Boolean);
app.use(cors({origin:(origin,callback)=>{
  if(!origin||allowedOrigins.length===0||allowedOrigins.includes(origin))return callback(null,true);
  callback(null,false);
},credentials:true}));
app.use(rateLimit({windowMs:15*60*1000,limit:500,standardHeaders:'draft-8',legacyHeaders:false}));
app.use(express.json({limit:'2mb'}));
app.use(express.urlencoded({extended:true}));
app.use('/uploads',express.static(path.resolve(process.env.UPLOAD_DIR||'uploads')));
app.get('/api/health',async(req,res)=>{try{res.json({ok:true,database:await dbHealth(),time:new Date().toISOString()})}catch(e){res.status(503).json({ok:false,database:false,message:e.message})}});
app.use('/api',routes);
app.use(notFound);app.use(errorHandler);
const port=Number(process.env.PORT||5000);app.listen(port,()=>console.log(`Construction ERP API running on http://localhost:${port}`));
