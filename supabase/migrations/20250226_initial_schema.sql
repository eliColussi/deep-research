-- Create user_profiles table
create table public.user_profiles (
  id uuid references auth.users(id) primary key,
  email text not null,
  display_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_login timestamp with time zone default timezone('utc'::text, now()) not null,
  payment_confirmed boolean default false,
  payment_date timestamp with time zone,
  payment_transaction_id text,
  plans_generated integer default 0,
  revisions_remaining integer default 2
);

-- Create index on user_id for faster lookups
CREATE INDEX idx_user_profiles_id ON public.user_profiles(id);

-- Create wedding_plans table
create table public.wedding_plans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  current_plan jsonb not null,
  initial_preferences jsonb not null,
  revision_history jsonb[] default array[]::jsonb[],
  research_log jsonb,
  unique(user_id)
);

-- Set up RLS (Row Level Security)
alter table public.user_profiles enable row level security;
alter table public.wedding_plans enable row level security;

-- Create policies for user_profiles
create policy "Users can view own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.user_profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

create policy "Service role can manage all profiles"
  on public.user_profiles for all
  using (auth.jwt()->>'role' = 'service_role')
  with check (auth.jwt()->>'role' = 'service_role');

-- Create policies for wedding_plans
create policy "Users can view own wedding plan"
  on public.wedding_plans for select
  using (auth.uid() = user_id);

create policy "Users can update own wedding plan"
  on public.wedding_plans for update
  using (auth.uid() = user_id);

create policy "Users can insert own wedding plan"
  on public.wedding_plans for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own wedding plan"
  on public.wedding_plans for delete
  using (auth.uid() = user_id);

create policy "Service role can manage all wedding plans"
  on public.wedding_plans for all
  using (auth.jwt()->>'role' = 'service_role')
  with check (auth.jwt()->>'role' = 'service_role');

create policy "Users can delete own wedding plan"
  on public.wedding_plans for delete
  using (auth.uid() = user_id);

-- Create function to handle user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Grant necessary permissions to authenticated users
grant usage on schema public to authenticated;
grant all on public.user_profiles to authenticated;
grant all on public.wedding_plans to authenticated;

