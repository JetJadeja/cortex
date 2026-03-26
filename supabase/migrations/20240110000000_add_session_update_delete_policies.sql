create policy "users can update own sessions"
  on sessions for update using (auth.uid() = user_id);

create policy "users can delete own sessions"
  on sessions for delete using (auth.uid() = user_id);
