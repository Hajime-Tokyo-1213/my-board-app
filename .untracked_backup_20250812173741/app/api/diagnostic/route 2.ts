import { NextResponse } from 'next/server';

export async function GET() {
  const hasMongoUri = Boolean(process.env.MONGODB_URI);
  return NextResponse.json({
    hasMONGODB_URI: hasMongoUri,
    nodeVersion: process.version,
    env: process.env.VERCEL ? 'vercel' : 'local',
  });
}


