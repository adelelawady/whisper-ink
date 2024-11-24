create or replace function get_wall_messages(
  wall_id uuid,
  wall_password text default null
)
returns table (
  id uuid,
  content text,
  created_at timestamptz,
  comments json
)
language plpgsql
security definer
as $$
begin
  -- Check if wall exists and verify access
  if not exists (
    select 1 from links 
    where links.id = wall_id 
    and (
      links.password is null 
      or links.password = wall_password
    )
  ) then
    return;
  end if;

  return query
  select 
    m.id,
    m.content,
    m.created_at,
    coalesce(
      json_agg(
        json_build_object(
          'id', mc.id,
          'content', mc.content,
          'created_at', mc.created_at,
          'user_id', mc.user_id
        ) order by mc.created_at desc
      ) filter (where mc.id is not null),
      '[]'::json
    ) as comments
  from messages m
  left join message_comments mc on mc.message_id = m.id
  where m.link_id = wall_id
  group by m.id, m.content, m.created_at
  order by m.created_at desc;
end;
$$; 