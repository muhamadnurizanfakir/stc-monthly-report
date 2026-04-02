import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period');
  const factoryCode = searchParams.get('factory');
  const userId = searchParams.get('user');

  // Get STC info (issuer)
  const { data: stc } = await supabase.from('ts_factories').select('*').eq('code', 'STCSB').single();

  if (factoryCode && period) {
    const p = period as string;
    const lastDay = (() => { const [y,m] = p.split('-'); return new Date(parseInt(y), parseInt(m), 0).toISOString().split('T')[0]; })();
    const { data: factory } = await supabase.from('ts_factories').select('*').eq('code', factoryCode).single();
    const { data: sessions } = await supabase.from('ts_sessions')
      .select('*, ts_users(name, employee_id, designation, hourly_rate)')
      .eq('factory_code', factoryCode)
      .gte('date', p + '-01')
      .lte('date', lastDay)
      .not('clock_out', 'is', null)
      .order('date');
    return NextResponse.json({ stc, factory, sessions, type: 'factory' });
  }

  if (userId && period) {
    const p = period as string;
    const lastDay = (() => { const [y,m] = p.split('-'); return new Date(parseInt(y), parseInt(m), 0).toISOString().split('T')[0]; })();
    const { data: user } = await supabase.from('ts_users').select('*, ts_factories(name)').eq('id', userId).single();
    const { data: sessions } = await supabase.from('ts_sessions')
      .select('*, ts_factories(name)')
      .eq('user_id', userId)
      .gte('date', p + '-01')
      .lte('date', lastDay)
      .not('clock_out', 'is', null)
      .order('date');
    return NextResponse.json({ stc, user, sessions, type: 'individual' });
  }

  return NextResponse.json({ error: 'Missing params' }, { status: 400 });
}
