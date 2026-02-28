-- Ensure columns exist
alter table batches add column if not exists allowed_domain text;
alter table batches add column if not exists domain_lock_status text default null;

-- Function to get domain requests
create or replace function get_domain_requests()
returns table (
  id bigint,
  name text,
  teacher_id uuid,
  teacher_name text,
  teacher_email text,
  allowed_domain text,
  domain_lock_status text,
  created_at timestamp with time zone
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    b.id,
    b.name,
    b.teacher_id,
    p.full_name as teacher_name,
    p.email as teacher_email,
    b.allowed_domain,
    b.domain_lock_status,
    b.created_at
  from batches b
  join profiles p on b.teacher_id = p.id
  where b.domain_lock_status is not null
  order by b.created_at desc;
end;
$$;

-- Function to approve domain request
create or replace function approve_domain_request(p_batch_id bigint)
returns void
language plpgsql
security definer
as $$
begin
  update batches
  set domain_lock_status = 'approved'
  where id = p_batch_id;
end;
$$;

-- Function to reject domain request
create or replace function reject_domain_request(p_batch_id bigint)
returns void
language plpgsql
security definer
as $$
begin
  update batches
  set domain_lock_status = 'rejected'
  where id = p_batch_id;
end;
$$;
