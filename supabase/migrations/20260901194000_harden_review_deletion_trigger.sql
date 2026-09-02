-- Keep the public RPC security-invoker while guaranteeing that deleting an
-- approved private submission removes only its exact linked website review.

drop function public.delete_review_submission(uuid);
drop function booking_private.delete_review_submission_internal(uuid);

create policy staff_delete_review_submissions
  on public.review_submissions
  for delete to authenticated
  using ((select booking_private.is_active_staff()));

grant delete on table public.review_submissions to authenticated;

create or replace function booking_private.delete_linked_website_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.published_review_id is not null then
    delete from public.published_reviews
    where id = old.published_review_id
      and source = 'website'
      and source_key = 'website:' || old.id::text;

    if not found then
      raise exception using errcode = 'P0001', message = 'review_public_link_mismatch';
    end if;
  end if;

  return old;
end;
$$;

revoke all on function booking_private.delete_linked_website_review()
  from public, anon, authenticated;

create trigger review_submissions_delete_linked_public
after delete on public.review_submissions
for each row execute function booking_private.delete_linked_website_review();

create or replace function public.delete_review_submission(p_submission_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select booking_private.is_active_staff()) then
    raise exception using errcode = '42501', message = 'active_staff_required';
  end if;

  delete from public.review_submissions
  where id = p_submission_id;

  return found;
end;
$$;

revoke all on function public.delete_review_submission(uuid)
  from public, anon, authenticated;
grant execute on function public.delete_review_submission(uuid)
  to authenticated;
