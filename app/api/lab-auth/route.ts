import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { type, password, email, pin, userId, registerEmail, registerPassword, registerName, companyId } = await req.json();

  // 1. Check lab portal password
  if (type === 'portal_password') {
    const { data } = await supabase.from('portal_settings').select('value').eq('key', 'lab_password').single();
    if (data?.value === password) return NextResponse.json({ ok: true });
    return NextResponse.json({ ok: false, error: 'Wrong password' }, { status: 401 });
  }

  // 2. Internal user PIN login
  if (type === 'internal_pin') {
    const { data: user } = await supabase.from('ts_users')
      .select('id, name, employee_id, hourly_rate, default_factory')
      .eq('id', userId).eq('pin', pin).eq('is_active', true).maybeSingle();
    if (!user) return NextResponse.json({ ok: false, error: 'Wrong PIN' }, { status: 401 });
    
    // Check if lab_user exists for this ts_user
    let { data: labUser } = await supabase.from('lab_users')
      .select('*').eq('employee_id', user.employee_id ?? user.id).maybeSingle();
    
    if (!labUser) {
      // Auto-create lab user for internal staff
      const { data: newLabUser } = await supabase.from('lab_users').insert([{
        name: user.name,
        email: user.employee_id + '@stc.internal',
        role: 'lab_customer',
        employee_id: user.employee_id,
        user_type: 'internal',
        is_active: true,
      }]).select().single();
      labUser = newLabUser;
    }
    
    return NextResponse.json({ ok: true, user: { ...user, labUserId: labUser?.id, type: 'internal' } });
  }

  // 3. External user login
  if (type === 'external_login') {
    const { data: labUser } = await supabase.from('lab_users')
      .select('*').eq('email', email).eq('user_type', 'external').eq('is_active', true).maybeSingle();
    if (!labUser) return NextResponse.json({ ok: false, error: 'User not found' }, { status: 401 });
    if (labUser.password_hash !== password) return NextResponse.json({ ok: false, error: 'Wrong password' }, { status: 401 });
    return NextResponse.json({ ok: true, user: { ...labUser, type: 'external' } });
  }

  // 4. External user registration
  if (type === 'external_register') {
    const { data: existing } = await supabase.from('lab_users').select('id').eq('email', registerEmail).maybeSingle();
    if (existing) return NextResponse.json({ ok: false, error: 'Email already registered' }, { status: 400 });
    
    const { data: newUser, error } = await supabase.from('lab_users').insert([{
      name: registerName,
      email: registerEmail,
      password_hash: registerPassword, // In production use bcrypt
      role: 'lab_customer',
      company_id: companyId || null,
      user_type: 'external',
      is_active: true,
    }]).select().single();
    
    if (error) return NextResponse.json({ ok: false, error: 'Registration failed' }, { status: 500 });
    return NextResponse.json({ ok: true, user: { ...newUser, type: 'external' } });
  }

  return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
}
