create or replace function verify_wall_password(wall_id uuid, wall_password text)
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1 
    from links 
    where id = wall_id 
    and password = wall_password
  );
end;
$$; 