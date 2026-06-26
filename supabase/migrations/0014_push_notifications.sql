-- Push notifications, sent directly from Postgres via pg_net (no separate
-- Edge Function needed) straight to Expo's push API. pg_net.http_post is
-- fire-and-forget/async, which is exactly right for notifications.
create extension if not exists pg_net;

alter table profiles add column push_token text;

create or replace function send_push_notification(p_token text, p_title text, p_body text, p_data jsonb default '{}'::jsonb)
returns void as $$
begin
  if p_token is null then
    return;
  end if;
  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
    body := jsonb_build_object('to', p_token, 'title', p_title, 'body', p_body, 'data', p_data)
  );
end;
$$ language plpgsql security definer;

-- New chat message -> notify the other participant of the request.
create or replace function notify_new_message()
returns trigger as $$
declare
  v_recipient_id uuid;
  v_recipient_token text;
  v_sender_name text;
begin
  select case when pr.from_id = new.sender_id then pr.to_id else pr.from_id end
    into v_recipient_id
  from partner_requests pr
  where pr.id = new.request_id;

  select push_token into v_recipient_token from profiles where id = v_recipient_id;
  select full_name into v_sender_name from profiles where id = new.sender_id;

  perform send_push_notification(
    v_recipient_token,
    coalesce(v_sender_name, 'New message'),
    new.body,
    jsonb_build_object('type', 'message', 'requestId', new.request_id)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_message_insert_notify
  after insert on messages
  for each row execute function notify_new_message();

-- New partner request -> notify the recipient.
create or replace function notify_new_partner_request()
returns trigger as $$
declare
  v_recipient_token text;
  v_sender_name text;
begin
  select push_token into v_recipient_token from profiles where id = new.to_id;
  select full_name into v_sender_name from profiles where id = new.from_id;

  perform send_push_notification(
    v_recipient_token,
    'New partner request',
    coalesce(v_sender_name, 'Someone') || ' wants to connect with you.',
    jsonb_build_object('type', 'partner_request', 'requestId', new.id)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_partner_request_insert_notify
  after insert on partner_requests
  for each row execute function notify_new_partner_request();

-- Partner request accepted -> notify the original sender.
create or replace function notify_partner_request_accepted()
returns trigger as $$
declare
  v_recipient_token text;
  v_accepter_name text;
begin
  if new.status = 'accepted' and old.status <> 'accepted' then
    select push_token into v_recipient_token from profiles where id = new.from_id;
    select full_name into v_accepter_name from profiles where id = new.to_id;

    perform send_push_notification(
      v_recipient_token,
      'Request accepted',
      coalesce(v_accepter_name, 'Someone') || ' accepted your partner request.',
      jsonb_build_object('type', 'partner_accepted', 'requestId', new.id)
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_partner_request_update_notify
  after update on partner_requests
  for each row execute function notify_partner_request_accepted();
