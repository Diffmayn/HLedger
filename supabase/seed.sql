-- Local development seed: a demo event owned by the first auth user.
-- Create a user first (Studio → Authentication) or sign in once via the app, then run this.
insert into public.events (slug, title, subtitle, theme, settings, owner)
select 'demo', 'Demo Guestbook', 'A celebration', '{"preset":"classic-warm"}'::jsonb,
       '{"moderation":false,"maxVideoSeconds":30,"allowedKinds":["message","photo","strip","video"],"language":"en"}'::jsonb,
       u.id
from auth.users u
order by u.created_at
limit 1
on conflict (slug) do nothing;

insert into public.entries (event_id, kind, author_name, body, emojis, client_id, created_at)
select e.id, 'message', n.name, n.body, n.emojis, 'seed', now() - (n.i || ' minutes')::interval
from public.events e
cross join (values
  (1, 'Maria', 'Congratulations! What a journey. Here''s to the next chapter.', '🎉🥂'),
  (2, 'Jonas', 'Thank you for everything you taught me. You made the team better every single day.', '🙏✨'),
  (3, 'Anne', 'Best colleague, best coffee breaks. Don''t be a stranger!', '☕❤️')
) as n(i, name, body, emojis)
where e.slug = 'demo'
on conflict do nothing;
