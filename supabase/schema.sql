-- ============================================================
-- SCEMAS — Supabase Schema
-- Run in the Supabase SQL Editor (in order)
-- ============================================================

-- ── Tables ──────────────────────────────────────────────────

create table zones (
  id   uuid primary key default gen_random_uuid(),
  name text not null,
  geojson_boundary jsonb
);

create table sensors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  zone_id     uuid references zones(id) on delete set null,
  metric_type text not null,
  status      text not null default 'active' check (status in ('active','inactive','maintenance')),
  approved    boolean not null default false,
  latitude    double precision,
  longitude   double precision,
  created_at  timestamptz not null default now()
);

create table telemetry_readings (
  id          uuid primary key default gen_random_uuid(),
  sensor_id   uuid not null references sensors(id) on delete cascade,
  zone_id     uuid not null references zones(id) on delete cascade,
  metric_type text not null,
  value       numeric not null,
  timestamp   timestamptz not null default now()
);

create table alert_rules (
  id              uuid primary key default gen_random_uuid(),
  metric_type     text not null,
  threshold_value numeric not null,
  operator        text not null check (operator in ('>','<','>=','<=','=')),
  severity        text not null check (severity in ('low','medium','high','critical')),
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create table alerts (
  id           uuid primary key default gen_random_uuid(),
  rule_id      uuid references alert_rules(id) on delete cascade,
  sensor_id    uuid references sensors(id) on delete cascade,
  value        numeric not null,
  status       text not null default 'active' check (status in ('active','acknowledged','resolved')),
  triggered_at timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid references auth.users(id) on delete set null
);

create table user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role    text not null check (role in ('city_operator','system_admin','government_official','emergency_services'))
);

create table audit_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  action     text not null,
  table_name text not null,
  old_val    jsonb,
  new_val    jsonb,
  timestamp  timestamptz not null default now()
);

-- ── Indexes ──────────────────────────────────────────────────

create index on telemetry_readings (sensor_id, timestamp desc);
create index on telemetry_readings (metric_type, timestamp desc);
create index on alerts (status, triggered_at desc);
create index on audit_log (user_id, timestamp desc);

-- ── Row Level Security ────────────────────────────────────────

alter table zones              enable row level security;
alter table sensors            enable row level security;
alter table telemetry_readings enable row level security;
alter table alert_rules        enable row level security;
alter table alerts             enable row level security;
alter table user_roles         enable row level security;
alter table audit_log          enable row level security;

-- Helper: get the calling user's role
create or replace function public.user_role()
returns text language sql stable security definer as $$
  select role from public.user_roles where user_id = auth.uid()
$$;

-- zones: all authenticated users can read
create policy "zones: authenticated read"
  on zones for select to authenticated using (true);

-- sensors: all authenticated users can read approved sensors
create policy "sensors: read approved"
  on sensors for select to authenticated using (approved = true);

create policy "sensors: admin can manage"
  on sensors for all to authenticated
  using (public.user_role() = 'system_admin');

-- telemetry_readings: all authenticated users can read
create policy "telemetry: authenticated read"
  on telemetry_readings for select to authenticated using (true);

-- alert_rules: operators and admins can manage; others read-only
create policy "alert_rules: read all"
  on alert_rules for select to authenticated using (true);

create policy "alert_rules: operator or admin write"
  on alert_rules for all to authenticated
  using (public.user_role() in ('city_operator','system_admin'));

-- alerts: all authenticated can read; operators can update status
create policy "alerts: read all"
  on alerts for select to authenticated using (true);

create policy "alerts: operator update status"
  on alerts for update to authenticated
  using (public.user_role() in ('city_operator','system_admin'));

-- user_roles: admin full access; users can read their own row
create policy "user_roles: read own"
  on user_roles for select to authenticated
  using (user_id = auth.uid());

create policy "user_roles: admin manage"
  on user_roles for all to authenticated
  using (public.user_role() = 'system_admin');

-- audit_log: admin read-only; no user writes (inserts via triggers only)
create policy "audit_log: admin read"
  on audit_log for select to authenticated
  using (public.user_role() = 'system_admin');

-- ── Alert Trigger ─────────────────────────────────────────────
-- Evaluates alert_rules on every new telemetry reading.

create or replace function fn_evaluate_alert_rules()
returns trigger language plpgsql security definer as $$
begin
  insert into alerts (rule_id, sensor_id, value)
  select r.id, new.sensor_id, new.value
  from   alert_rules r
  where  r.metric_type = new.metric_type
    and  (
      (r.operator = '>'  and new.value >  r.threshold_value) or
      (r.operator = '<'  and new.value <  r.threshold_value) or
      (r.operator = '>=' and new.value >= r.threshold_value) or
      (r.operator = '<=' and new.value <= r.threshold_value) or
      (r.operator = '='  and new.value =  r.threshold_value)
    );
  return new;
end;
$$;

create trigger trg_evaluate_alerts
after insert on telemetry_readings
for each row execute function fn_evaluate_alert_rules();

-- ── Audit Log Triggers ────────────────────────────────────────

create or replace function fn_audit_log()
returns trigger language plpgsql security definer as $$
begin
  insert into audit_log (user_id, action, table_name, old_val, new_val)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    case when tg_op = 'DELETE' then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

-- Apply audit trigger to key tables
create trigger trg_audit_sensors
after insert or update or delete on sensors
for each row execute function fn_audit_log();

create trigger trg_audit_alert_rules
after insert or update or delete on alert_rules
for each row execute function fn_audit_log();

create trigger trg_audit_alerts
after update on alerts
for each row execute function fn_audit_log();

create trigger trg_audit_user_roles
after insert or update or delete on user_roles
for each row execute function fn_audit_log();

-- webhook subscription so external systems register here to get notified on new alerts

create table webhook_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  url        text not null,
  secret     text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

alter table webhook_subscriptions enable row level security;

-- only admins can manage webhook subscriptions
create policy "webhooks: admin manage"
  on webhook_subscriptions for all to authenticated
  using (public.user_role() = 'system_admin');

-- Supabase realtime on tables the frontend subscribes to

alter publication supabase_realtime add table telemetry_readings;
alter publication supabase_realtime add table alerts;
