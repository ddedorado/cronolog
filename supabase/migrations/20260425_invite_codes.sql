-- =============================================================
-- Invite codes with usage tracking
-- =============================================================

create table if not exists public.invite_codes (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,
  max_uses   int  not null default 1,
  used_count int  not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now(),

  constraint positive_max_uses check (max_uses > 0),
  constraint non_negative_used  check (used_count >= 0)
);

-- Index for fast lookup by code
create index if not exists idx_invite_codes_code
  on public.invite_codes (upper(code));

-- No direct table access for anon/authenticated – only through RPCs
alter table public.invite_codes enable row level security;

-- -------------------------------------------------------
-- validate_invite_code: read-only check (for live typing)
-- -------------------------------------------------------
create or replace function public.validate_invite_code(input_code text)
returns jsonb
language plpgsql
security definer
as $$
declare
  invite record;
begin
  select * into invite
    from public.invite_codes
   where upper(trim(code)) = upper(trim(input_code));

  if not found then
    return jsonb_build_object('valid', false, 'reason', 'invalid');
  end if;

  if invite.expires_at is not null and invite.expires_at < now() then
    return jsonb_build_object('valid', false, 'reason', 'expired');
  end if;

  if invite.used_count >= invite.max_uses then
    return jsonb_build_object('valid', false, 'reason', 'exhausted');
  end if;

  return jsonb_build_object(
    'valid', true,
    'remaining', invite.max_uses - invite.used_count
  );
end;
$$;

-- -------------------------------------------------------
-- redeem_invite_code: atomic validate + consume one use
-- -------------------------------------------------------
create or replace function public.redeem_invite_code(input_code text)
returns jsonb
language plpgsql
security definer
as $$
declare
  invite record;
begin
  select * into invite
    from public.invite_codes
   where upper(trim(code)) = upper(trim(input_code))
   for update;              -- row lock to prevent race conditions

  if not found then
    return jsonb_build_object('valid', false, 'reason', 'invalid');
  end if;

  if invite.expires_at is not null and invite.expires_at < now() then
    return jsonb_build_object('valid', false, 'reason', 'expired');
  end if;

  if invite.used_count >= invite.max_uses then
    return jsonb_build_object('valid', false, 'reason', 'exhausted');
  end if;

  update public.invite_codes
     set used_count = used_count + 1
   where id = invite.id;

  return jsonb_build_object(
    'valid', true,
    'remaining', invite.max_uses - invite.used_count - 1
  );
end;
$$;

-- Grant anon + authenticated the ability to call the RPCs
grant execute on function public.validate_invite_code(text) to anon, authenticated;
grant execute on function public.redeem_invite_code(text)   to anon, authenticated;

-- -------------------------------------------------------
-- Seed: migrate existing env codes (adjust max_uses as needed)
-- -------------------------------------------------------
insert into public.invite_codes (code, max_uses) values
  ('CRONOLOG2026', 50),
  ('BETA-ACCESS',  25)
on conflict (code) do nothing;
