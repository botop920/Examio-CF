create table announcements (
  id uuid default uuid_generate_v4() primary key,
  teacher_id uuid references auth.users(id) not null,
  title text not null,
  message text not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table announcements enable row level security;

-- Policies
create policy "Teachers can view their own announcements"
  on announcements for select
  using (auth.uid() = teacher_id);

create policy "Teachers can insert their own announcements"
  on announcements for insert
  with check (auth.uid() = teacher_id);

create policy "Teachers can update their own announcements"
  on announcements for update
  using (auth.uid() = teacher_id);

create policy "Teachers can delete their own announcements"
  on announcements for delete
  using (auth.uid() = teacher_id);

create policy "Public can view active announcements"
  on announcements for select
  using (is_active = true);
