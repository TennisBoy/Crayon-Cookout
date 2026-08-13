-- Crayon Cookout — optional seed data
--
-- Development only. Never run this against production.
--
-- Designs belong to a real auth.users row, so create a user first:
--   Dashboard → Authentication → Users → Add user
-- then run this file. It attaches sample designs to the OLDEST user in the
-- project, which on a fresh dev project is the one you just made.
--
-- Safe to re-run: it deletes its own seeded rows first.

do $$
declare
    seed_user uuid;
begin
    select id into seed_user from auth.users order by created_at limit 1;

    if seed_user is null then
        raise notice 'No users exist yet — create one in the dashboard, then re-run.';
        return;
    end if;

    -- Clear previous seed rows so this stays idempotent.
    delete from public.crayon_designs
     where user_id = seed_user
       and name in ('Sunset Stripes', 'Ocean Layers', 'Rainbow Tower');

    insert into public.crayon_designs (user_id, name, colors, heights, shape) values
        (seed_user, 'Sunset Stripes',
         array['#EF4444', '#F97316', '#FACC15'],
         array[0.34, 0.33, 0.33], 'crayon'),
        (seed_user, 'Ocean Layers',
         array['#3B82F6', '#38BDF8', '#14B8A6'],
         array[0.5, 0.25, 0.25], 'star'),
        (seed_user, 'Rainbow Tower',
         array['#EF4444', '#F97316', '#FACC15', '#22C55E', '#3B82F6', '#A855F7'],
         array[0.17, 0.17, 0.17, 0.17, 0.16, 0.16], 'heart');

    delete from public.collectibles
     where user_id = seed_user and set_name = 'Nature Set';

    insert into public.collectibles (user_id, set_name, crayon_name) values
        (seed_user, 'Nature Set', 'Butterfly'),
        (seed_user, 'Nature Set', 'Ladybug');

    raise notice 'Seeded 3 designs and 2 collectibles for user %', seed_user;
end $$;
