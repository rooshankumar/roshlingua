
create table if not exists user_achievements (
  user_id uuid references auth.users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, achievement_id)
);

-- Create index for faster queries
create index if not exists idx_user_achievements_user_id on user_achievements(user_id);
