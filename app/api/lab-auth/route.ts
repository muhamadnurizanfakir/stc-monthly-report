import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type } = body;

  // 1. Check lab portal password (for admin panel access)
  if (type === 'portal_password') {
    const { data } = await supabase.from('portal_settings').select('value').eq('key', 'lab_password').single();
    if (data?.value === body.password) return NextResponse.json({ ok: true });
    return NextResponse.json({ ok: false, error: 'Wrong password' }, { status: 401 });
  }

  // 2. Internal user PIN login (from ts_users - as customer)
  if (type === 'internal_pin') {
    const { data: user } = await supabase.from('ts_users')
      .select('id, name, employee_id')
      .eq('id', body.userId).eq('pin', body.pin).eq('is_active', true).maybeSingle();
    if (!user) return NextResponse.json({ ok: false, error: 'Wrong PIN' }, { status: 401 });
    
    // Check if lab_user exists for this ts_user, auto-create if not
    let { data: labUser } = await supabase.from('lab_users')
      .select('*').eq('employee_id', user.employee_id ?? user.id).eq('user_type', 'internal').maybeSingle();
    
    if (!labUser) {
      const { data: newLabUser } = await supabase.from('lab_users').insert([{
        name: user.name,
        email: (user.employee_id ?? user.id) + '@stc.internal',
        role: 'lab_customer',
        employee_id: user.employee_id,
        user_type: 'internal',
        is_active: true,
      }]).select().single();
      labUser = newLabUser;
    }
    
    return NextResponse.json({ ok: true, user: { 
      id: labUser?.id, name: user.name, 
      email: labUser?.email, role: labUser?.role ?? 'lab_customer',
      user_type: 'internal', labUserId: labUser?.id 
    }});
  }

  // 3. Staff login (lab engineers, reviewers, approvers)
  if (type === 'staff_login') {
    const { data: labUser } = await supabase.from('lab_users')
      .select('*').eq('email', body.email).eq('user_type', 'staff').eq('is_active', true).maybeSingle();
    if (!labUser) return NextResponse.json({ ok: false, error: 'Staff account not found' }, { status: 401 });
    if (!labUser.password_hash) return NextResponse.json({ ok: false, error: 'Password not set. Contact admin.' }, { status: 401 });
    if (labUser.password_hash !== body.password) return NextResponse.json({ ok: false, error: 'Wrong password' }, { status: 401 });

    // Log session
    await supabase.from('lab_staff_sessions').insert([{ user_id: labUser.id }]);
    
    return NextResponse.json({ ok: true, user: {
      id: labUser.id, name: labUser.name, email: labUser.email,
      role: labUser.role, designation: labUser.designation,
      user_type: 'staff', labUserId: labUser.id,
    }});
  }

  // 4. External user login
  if (type === 'external_login') {
    const { data: labUser } = await supabase.from('lab_users')
      .select('*').eq('email', body.email).eq('user_type', 'external').eq('is_active', true).maybeSingle();
    if (!labUser) return NextResponse.json({ ok: false, error: 'Account not found' }, { status: 401 });
    if (labUser.password_hash !== body.password) return NextResponse.json({ ok: false, error: 'Wrong password' }, { status: 401 });
    return NextResponse.json({ ok: true, user: {
      id: labUser.id, name: labUser.name, email: labUser.email,
      role: labUser.role, company_id: labUser.company_id,
      user_type: 'external', labUserId: labUser.id,
    }});
  }

  // 5. External user registration
  if (type === 'external_register') {
    const { data: existing } = await supabase.from('lab_users')
      .select('id').eq('email', body.registerEmail).maybeSingle();
    if (existing) return NextResponse.json({ ok: false, error: 'Email already registered' }, { status: 400 });
    
    const { data: newUser, error } = await supabase.from('lab_users').insert([{
      name: body.registerName,
      email: body.registerEmail,
      password_hash: body.registerPassword,
      role: 'lab_customer',
      company_id: body.companyId || null,
      user_type: 'external',
      is_active: true,
    }]).select().single();
    
    if (error) return NextResponse.json({ ok: false, error: 'Registration failed' }, { status: 500 });
    return NextResponse.json({ ok: true, user: {
      id: newUser.id, name: newUser.name, email: newUser.email,
      role: newUser.role, user_type: 'external', labUserId: newUser.id,
    }});
  }

  return NextResponse.json({ ok: false, error: 'Invalid request type' }, { status: 400 });
}
