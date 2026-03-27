import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_EqnSI60diANj@ep-steep-glitter-anplycs3-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require');
const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
console.log('Tables:', JSON.stringify(tables));
