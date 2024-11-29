-- Supabase Export

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can create links" ON links;
DROP POLICY IF EXISTS "Links are viewable by everyone" ON links;
DROP POLICY IF EXISTS "Owner can view full link details" ON links;
DROP POLICY IF EXISTS "Users can create their own links" ON links;
DROP POLICY IF EXISTS "Users can delete their own links" ON links;
DROP POLICY IF EXISTS "Users can update their own links" ON links;
DROP POLICY IF EXISTS "wall owners can delete walls" ON links;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON message_comments;
DROP POLICY IF EXISTS "View comments with proper access" ON message_comments;
DROP POLICY IF EXISTS "Wall owners can delete comments" ON message_comments;
DROP POLICY IF EXISTS "Anyone can create messages" ON messages;
DROP POLICY IF EXISTS "View messages with proper access" ON messages;
DROP POLICY IF EXISTS "Wall owners can delete messages from wall" ON messages;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Policies
CREATE POLICY "Authenticated users can create links" ON links
  FOR INSERT
  USING (null);

CREATE POLICY "Links are viewable by everyone" ON links
  FOR SELECT
  USING (true);

CREATE POLICY "Owner can view full link details" ON links
  FOR SELECT
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can create their own links" ON links
  FOR INSERT
  USING (null);

CREATE POLICY "Users can delete their own links" ON links
  FOR DELETE
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can update their own links" ON links
  FOR UPDATE
  USING ((auth.uid() = user_id));

CREATE POLICY "wall owners can delete walls" ON links
  FOR DELETE
  USING ((auth.uid() = user_id));

CREATE POLICY "Authenticated users can create comments" ON message_comments
  FOR INSERT
  USING (null);

CREATE POLICY "View comments with proper access" ON message_comments
  FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM (messages m
     JOIN links l ON ((l.id = m.link_id)))
  WHERE ((m.id = message_comments.message_id) AND ((l.password IS NULL) OR (l.user_id = auth.uid()))))));

CREATE POLICY "Wall owners can delete comments" ON message_comments
  FOR DELETE
  USING ((EXISTS ( SELECT 1
   FROM (messages m
     JOIN links l ON ((l.id = m.link_id)))
  WHERE ((m.id = message_comments.message_id) AND (l.user_id = auth.uid())))));

CREATE POLICY "Anyone can create messages" ON messages
  FOR INSERT
  USING (null);

CREATE POLICY "View messages with proper access" ON messages
  FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM links l
  WHERE ((l.id = messages.link_id) AND ((l.password IS NULL) OR (l.user_id = auth.uid()))))));

CREATE POLICY "Wall owners can delete messages from wall" ON messages
  FOR DELETE
  USING ((EXISTS ( SELECT 1
   FROM links
  WHERE ((links.id = messages.link_id) AND (links.user_id = auth.uid())))));

CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT
  USING (null);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING ((auth.uid() = id));

-- Functions
CREATE OR REPLACE FUNCTION extensions.grant_pg_cron_access()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$function$


CREATE OR REPLACE FUNCTION extensions.grant_pg_net_access()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
    ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

    ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
    ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

    REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
    REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

    GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
  END IF;
END;
$function$


CREATE OR REPLACE FUNCTION pgbouncer.get_auth(p_usename text)
 RETURNS TABLE(username text, password text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RAISE WARNING 'PgBouncer auth request: %', p_usename;

    RETURN QUERY
    SELECT usename::TEXT, passwd::TEXT FROM pg_catalog.pg_shadow
    WHERE usename = p_usename;
END;
$function$


CREATE OR REPLACE FUNCTION public.check_wall_password(wall_id uuid, wall_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  stored_password text;
  is_owner boolean;
begin
  -- Check if user is owner
  is_owner := exists (
    select 1 from public.links 
    where id = wall_id and user_id = auth.uid()
  );
  
  -- If user is owner, allow access
  if is_owner then
    return true;
  end if;
  
  -- Otherwise check password
  select password into stored_password
  from public.links
  where id = wall_id;
  
  return stored_password = wall_password;
end;
$function$


CREATE OR REPLACE FUNCTION public.delete_wall_messages()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  delete from public.messages where link_id = old.id;
  return old;
end;
$function$


CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  EXECUTE sql;
END;
$function$


CREATE OR REPLACE FUNCTION public.get_functions()
 RETURNS TABLE(name text, schema text, language text, definition text, arguments text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.proname::text,
        n.nspname::text,
        l.lanname::text,
        pg_get_functiondef(p.oid)::text,
        pg_get_function_arguments(p.oid)::text
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    JOIN pg_language l ON p.prolang = l.oid
    WHERE n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
    AND p.prokind = 'f'
    AND p.proowner = (SELECT usesysid FROM pg_user WHERE usename = current_user)
    ORDER BY n.nspname, p.proname;
END;
$function$


CREATE OR REPLACE FUNCTION public.get_policies()
 RETURNS TABLE(name text, table_name text, command text, definition text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.policyname::text,
        p.tablename::text,
        p.cmd::text,
        p.qual::text
    FROM pg_policies p
    ORDER BY p.tablename, p.policyname;
END;
$function$


CREATE OR REPLACE FUNCTION public.get_triggers()
 RETURNS TABLE(name text, table_name text, event text, timing text, definition text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        t.tgname::text,
        c.relname::text,
        CASE 
            WHEN t.tgtype & 1 = 1 THEN 'ROW'
            ELSE 'STATEMENT'
        END::text,
        CASE 
            WHEN t.tgtype & 2 = 2 THEN 'BEFORE'
            WHEN t.tgtype & 64 = 64 THEN 'INSTEAD OF'
            ELSE 'AFTER'
        END::text,
        pg_get_triggerdef(t.oid)::text
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE NOT t.tgisinternal
    AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
    ORDER BY c.relname, t.tgname;
END;
$function$


CREATE OR REPLACE FUNCTION public.get_wall_messages(wall_id uuid, wall_password text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, content text, created_at timestamp with time zone, comments json)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$


CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public.profiles (id, username)
  values (new.id, new.email);
  return new;
end;
$function$


CREATE OR REPLACE FUNCTION public.upsert_wall_visit(p_wall_id uuid, p_title text, p_is_authenticated boolean DEFAULT false, p_user_id uuid DEFAULT NULL::uuid, p_visitor_id text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into wall_visits (wall_id, user_id, visitor_id, title, last_visited, is_authenticated)
  values (p_wall_id, p_user_id, p_visitor_id, p_title, now(), p_is_authenticated)
  on conflict (wall_id, user_id, visitor_id)
  do update set 
    last_visited = now(),
    title = p_title,
    is_authenticated = p_is_authenticated;
end;
$function$


CREATE OR REPLACE FUNCTION public.verify_wall_password(wall_id uuid, wall_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return exists (
    select 1 
    from links 
    where id = wall_id 
    and password = wall_password
  );
end;
$function$


-- Triggers
CREATE TRIGGER key_encrypt_secret_trigger_raw_key BEFORE INSERT OR UPDATE OF raw_key ON pgsodium.key FOR EACH ROW EXECUTE FUNCTION pgsodium.key_encrypt_secret_raw_key();

CREATE TRIGGER on_wall_delete BEFORE DELETE ON public.links FOR EACH ROW EXECUTE FUNCTION delete_wall_messages();

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();

CREATE TRIGGER secrets_encrypt_secret_trigger_secret BEFORE INSERT OR UPDATE OF secret ON vault.secrets FOR EACH ROW EXECUTE FUNCTION vault.secrets_encrypt_secret_secret();

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

