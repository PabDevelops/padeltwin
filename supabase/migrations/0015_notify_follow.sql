-- New follower -> notify the person being followed.
create or replace function notify_new_follow()
returns trigger as $$
declare
  v_recipient_token text;
  v_follower_name text;
begin
  select push_token into v_recipient_token from profiles where id = new.followed_id;
  select full_name into v_follower_name from profiles where id = new.follower_id;

  perform send_push_notification(
    v_recipient_token,
    'New follower',
    coalesce(v_follower_name, 'Someone') || ' started following you.',
    jsonb_build_object('type', 'follow', 'profileId', new.follower_id)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_follow_insert_notify
  after insert on follows
  for each row execute function notify_new_follow();
