import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
export async function POST(req: NextRequest) {
  const { password, type = 'portal' } = await req.json();
  const keyMap: Record<string, string> = {
    portal: 'portal_password',
    admin: 'admin_password',
    lab: 'lab_password',
  };
  const key = keyMap[type] ?? 'portal_password';
  const { data } = await supabase
    .from('portal_settings')
    .select('value')
    .eq('key', key)
    .single();
  if (data && data.value === password) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false }, { status: 401 });
}
