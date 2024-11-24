-- Create wall visits table
create table wall_visits (
  id uuid default uuid_generate_v4() primary key,
  wall_id uuid references links(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  visitor_id text, -- For anonymous users (stored in localStorage)
  title text,
  last_visited timestamp with time zone default now(),
  is_authenticated boolean default false,
  constraint wall_visits_unique unique (wall_id, user_id, visitor_id)
);

-- Create function to upsert wall visits
create or replace function upsert_wall_visit(
  p_wall_id uuid,
  p_title text,
  p_is_authenticated boolean default false,
  p_user_id uuid default null,
  p_visitor_id text default null
)
returns void
language plpgsql
security definer
as $$
begin
  insert into wall_visits (wall_id, user_id, visitor_id, title, last_visited, is_authenticated)
  values (p_wall_id, p_user_id, p_visitor_id, p_title, now(), p_is_authenticated)
  on conflict (wall_id, user_id, visitor_id)
  do update set 
    last_visited = now(),
    title = p_title,
    is_authenticated = p_is_authenticated;
end;
$$; 