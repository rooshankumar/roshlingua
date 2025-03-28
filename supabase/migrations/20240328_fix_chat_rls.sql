-- Set RLS on the view
ALTER VIEW chat_members SET (security_invoker = on);