[
  {
    "schema": "public",
    "function_name": "create_notification",
    "arguments": "p_user_id uuid, p_type text, p_content text, p_related_entity_id uuid DEFAULT NULL::uuid",
    "return_type": "uuid"
  },
  {
    "schema": "public",
    "function_name": "create_onboarding_status",
    "arguments": "",
    "return_type": "trigger"
  },
  {
    "schema": "public",
    "function_name": "create_user_related_data",
    "arguments": "",
    "return_type": "trigger"
  },
  {
    "schema": "public",
    "function_name": "handle_message_notification",
    "arguments": "",
    "return_type": "trigger"
  },
  {
    "schema": "public",
    "function_name": "handle_new_message",
    "arguments": "",
    "return_type": "trigger"
  },
  {
    "schema": "public",
    "function_name": "handle_new_user",
    "arguments": "",
    "return_type": "trigger"
  },
  {
    "schema": "public",
    "function_name": "handle_new_user_profile",
    "arguments": "",
    "return_type": "trigger"
  },
  {
    "schema": "public",
    "function_name": "handle_onboarding_status",
    "arguments": "",
    "return_type": "trigger"
  },
  {
    "schema": "public",
    "function_name": "handle_user_offline",
    "arguments": "",
    "return_type": "trigger"
  },
  {
    "schema": "public",
    "function_name": "sync_profiles_to_users",
    "arguments": "",
    "return_type": "trigger"
  },
  {
    "schema": "public",
    "function_name": "sync_users_to_profiles",
    "arguments": "",
    "return_type": "trigger"
  },
  {
    "schema": "public",
    "function_name": "update_user_presence",
    "arguments": "",
    "return_type": "trigger"
  },
  {
    "schema": "public",
    "function_name": "update_user_profile",
    "arguments": "p_user_id uuid, p_full_name text, p_avatar_url text, p_bio text, p_email text, p_gender text, p_date_of_birth date, p_native_language text, p_learning_language text, p_proficiency_level text, p_streak_count integer",
    "return_type": "void"
  }
]

#Table
[
  {
    "schemaname": "realtime",
    "tablename": "schema_migrations"
  },
  {
    "schemaname": "realtime",
    "tablename": "messages_2025_04_09"
  },
  {
    "schemaname": "auth",
    "tablename": "schema_migrations"
  },
  {
    "schemaname": "auth",
    "tablename": "instances"
  },
  {
    "schemaname": "auth",
    "tablename": "users"
  },
  {
    "schemaname": "auth",
    "tablename": "refresh_tokens"
  },
  {
    "schemaname": "storage",
    "tablename": "objects"
  },
  {
    "schemaname": "realtime",
    "tablename": "messages_2025_04_10"
  },
  {
    "schemaname": "storage",
    "tablename": "buckets"
  },
  {
    "schemaname": "storage",
    "tablename": "migrations"
  },
  {
    "schemaname": "pgsodium",
    "tablename": "key"
  },
  {
    "schemaname": "vault",
    "tablename": "secrets"
  },
  {
    "schemaname": "realtime",
    "tablename": "messages_2025_04_11"
  },
  {
    "schemaname": "realtime",
    "tablename": "messages"
  },
  {
    "schemaname": "realtime",
    "tablename": "messages_2025_04_12"
  },
  {
    "schemaname": "realtime",
    "tablename": "subscription"
  },
  {
    "schemaname": "public",
    "tablename": "messages"
  },
  {
    "schemaname": "public",
    "tablename": "conversations"
  },
  {
    "schemaname": "public",
    "tablename": "users"
  },
  {
    "schemaname": "public",
    "tablename": "message_reactions"
  },
  {
    "schemaname": "public",
    "tablename": "user_likes"
  },
  {
    "schemaname": "public",
    "tablename": "onboarding_status"
  },
  {
    "schemaname": "public",
    "tablename": "conversation_participants"
  },
  {
    "schemaname": "public",
    "tablename": "notification_settings"
  },
  {
    "schemaname": "public",
    "tablename": "notifications"
  },
  {
    "schemaname": "realtime",
    "tablename": "messages_2025_04_13"
  },
  {
    "schemaname": "public",
    "tablename": "profiles"
  },
  {
    "schemaname": "realtime",
    "tablename": "messages_2025_04_14"
  },
  {
    "schemaname": "realtime",
    "tablename": "messages_2025_04_08"
  },
  {
    "schemaname": "auth",
    "tablename": "mfa_factors"
  },
  {
    "schemaname": "auth",
    "tablename": "mfa_challenges"
  },
  {
    "schemaname": "auth",
    "tablename": "audit_log_entries"
  },
  {
    "schemaname": "auth",
    "tablename": "identities"
  },
  {
    "schemaname": "auth",
    "tablename": "sessions"
  },
  {
    "schemaname": "auth",
    "tablename": "sso_providers"
  },
  {
    "schemaname": "auth",
    "tablename": "sso_domains"
  },
  {
    "schemaname": "auth",
    "tablename": "mfa_amr_claims"
  },
  {
    "schemaname": "auth",
    "tablename": "saml_providers"
  },
  {
    "schemaname": "auth",
    "tablename": "saml_relay_states"
  },
  {
    "schemaname": "auth",
    "tablename": "flow_state"
  },
  {
    "schemaname": "auth",
    "tablename": "one_time_tokens"
  },
  {
    "schemaname": "storage",
    "tablename": "s3_multipart_uploads_parts"
  },
  {
    "schemaname": "storage",
    "tablename": "s3_multipart_uploads"
  }
]

#Trigger
[
  {
    "trigger_name": "tr_check_filters",
    "table_name": "subscription",
    "function_name": "subscription_check_filters"
  },
  {
    "trigger_name": "key_encrypt_secret_trigger_raw_key",
    "table_name": "key",
    "function_name": "key_encrypt_secret_raw_key"
  },
  {
    "trigger_name": "secrets_encrypt_secret_trigger_secret",
    "table_name": "secrets",
    "function_name": "secrets_encrypt_secret_secret"
  },
  {
    "trigger_name": "sync_users_trigger",
    "table_name": "users",
    "function_name": "sync_users_to_profiles"
  },
  {
    "trigger_name": "on_user_presence",
    "table_name": "users",
    "function_name": "update_user_presence"
  },
  {
    "trigger_name": "on_user_offline",
    "table_name": "users",
    "function_name": "handle_user_offline"
  },
  {
    "trigger_name": "on_new_message",
    "table_name": "messages",
    "function_name": "handle_new_message"
  },
  {
    "trigger_name": "on_message_notification",
    "table_name": "messages",
    "function_name": "handle_message_notification"
  },
  {
    "trigger_name": "sync_profiles_trigger",
    "table_name": "profiles",
    "function_name": "sync_profiles_to_users"
  },
  {
    "trigger_name": "trg_create_onboarding_status",
    "table_name": "users",
    "function_name": "create_onboarding_status"
  },
  {
    "trigger_name": "create_user_related_data_trigger",
    "table_name": "users",
    "function_name": "create_user_related_data"
  },
  {
    "trigger_name": "trigger_handle_new_user_profile",
    "table_name": "users",
    "function_name": "handle_new_user_profile"
  },
  {
    "trigger_name": "on_auth_user_created",
    "table_name": "users",
    "function_name": "handle_new_user"
  },
  {
    "trigger_name": "update_objects_updated_at",
    "table_name": "objects",
    "function_name": "update_updated_at_column"
  }
]

#auth.users
[
  {
    "id": "ed1c374e-3823-4ea2-aa28-3999c21d1140",
    "email": "isthisroshan@gmail.com",
    "created_at": "2025-04-04 05:20:57.210797+00"
  },
  {
    "id": "b875a86f-c582-4283-b43c-8b11036ceaf6",
    "email": "roshangupta7481@gmail.com",
    "created_at": "2025-04-08 09:59:06.728045+00"
  }
]

#public.profiles
[
  {
    "id": "ed1c374e-3823-4ea2-aa28-3999c21d1140",
    "email": null,
    "created_at": "2025-04-09 08:17:08.000946+00"
  },
  {
    "id": "b875a86f-c582-4283-b43c-8b11036ceaf6",
    "email": null,
    "created_at": "2025-04-09 08:24:23.51825+00"
  }
]

#funtions & procedure
[
  {
    "routine_name": "update_user_profile",
    "routine_type": "FUNCTION"
  },
  {
    "routine_name": "handle_onboarding_status",
    "routine_type": "FUNCTION"
  },
  {
    "routine_name": "handle_new_user",
    "routine_type": "FUNCTION"
  },
  {
    "routine_name": "create_onboarding_status",
    "routine_type": "FUNCTION"
  },
  {
    "routine_name": "create_user_related_data",
    "routine_type": "FUNCTION"
  },
  {
    "routine_name": "handle_new_user_profile",
    "routine_type": "FUNCTION"
  },
  {
    "routine_name": "sync_users_to_profiles",
    "routine_type": "FUNCTION"
  },
  {
    "routine_name": "sync_profiles_to_users",
    "routine_type": "FUNCTION"
  },
  {
    "routine_name": "update_user_presence",
    "routine_type": "FUNCTION"
  },
  {
    "routine_name": "handle_user_offline",
    "routine_type": "FUNCTION"
  },
  {
    "routine_name": "handle_new_message",
    "routine_type": "FUNCTION"
  },
  {
    "routine_name": "create_notification",
    "routine_type": "FUNCTION"
  },
  {
    "routine_name": "handle_message_notification",
    "routine_type": "FUNCTION"
  }
]