import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.DATABASE_URL || '';
  const isCloud = url.includes('aivencloud.com') || (!url.includes('localhost') && !url.includes('127.0.0.1'));
  
  return NextResponse.json({
    isCloud,
    tipo: isCloud ? 'nuvem' : 'local',
    label: isCloud ? 'Nuvem (Aiven)' : 'Local (MySQL)',
  });
}
