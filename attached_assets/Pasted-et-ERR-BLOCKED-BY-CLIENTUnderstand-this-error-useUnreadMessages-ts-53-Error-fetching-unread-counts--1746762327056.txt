et::ERR_BLOCKED_BY_CLIENTUnderstand this error
useUnreadMessages.ts:53 Error fetching unread counts: TypeError: supabase.from(...).select(...).eq(...).eq(...).group is not a function
    at fetchInitialUnreadCounts (useUnreadMessages.ts:20:10)
    at useUnreadMessages.ts:99:5
    at commitHookEffectListMount (chunk-276SZO74.js?v=12562e5c:16915:34)
    at commitPassiveMountOnFiber (chunk-276SZO74.js?v=12562e5c:18156:19)
    at commitPassiveMountEffects_complete (chunk-276SZO74.js?v=12562e5c:18129:17)
    at commitPassiveMountEffects_begin (chunk-276SZO74.js?v=12562e5c:18119:15)
    at commitPassiveMountEffects (chunk-276SZO74.js?v=12562e5c:18109:11)
    at flushPassiveEffectsImpl (chunk-276SZO74.js?v=12562e5c:19490:11)
    at flushPassiveEffects (chunk-276SZO74.js?v=12562e5c:19447:22)
    at chunk-276SZO74.js?v=12562e5c:19328:17
fetchInitialUnreadCounts @ useUnreadMessages.ts:53
(anonymous) @ useUnreadMessages.ts:99
commitHookEffectListMount @ chunk-276SZO74.js?v=12562e5c:16915
commitPassiveMountOnFiber @ chunk-276SZO74.js?v=12562e5c:18156
commitPassiveMountEffects_complete @ chunk-276SZO74.js?v=12562e5c:18129
commitPassiveMountEffects_begin @ chunk-276SZO74.js?v=12562e5c:18119
commitPassiveMountEffects @ chunk-276SZO74.js?v=12562e5c:18109
flushPassiveEffectsImpl @ chunk-276SZO74.js?v=12562e5c:19490
flushPassiveEffects @ chunk-276SZO74.js?v=12562e5c:19447
(anonymous) @ chunk-276SZO74.js?v=12562e5c:19328
workLoop @ chunk-276SZO74.js?v=12562e5c:197
flushWork @ chunk-276SZO74.js?v=12562e5c:176
performWorkUntilDeadline @ chunk-276SZO74.js?v=12562e5c:384Understand this error
supabase.ts:43 
            
            
           GET https://wqojeesjtgfcftpnzaet.supabase.co/rest/v1/user_achievements?select=achievement_id%2Ccount%28*%29&order=achievement_id.asc 400 (Bad Request)
fetch @ supabase.ts:43
(anonymous) @ @supabase_supabase-js.js?v=12562e5c:3900
(anonymous) @ @supabase_supabase-js.js?v=12562e5c:3921
fulfilled @ @supabase_supabase-js.js?v=12562e5c:3873
Promise.then
step @ @supabase_supabase-js.js?v=12562e5c:3886
(anonymous) @ @supabase_supabase-js.js?v=12562e5c:3888
__awaiter6 @ @supabase_supabase-js.js?v=12562e5c:3870
(anonymous) @ @supabase_supabase-js.js?v=12562e5c:3911
then @ @supabase_supabase-js.js?v=12562e5c:89Understand this error
supabase.ts:43 
            
            
           HEAD https://wqojeesjtgfcftpnzaet.supabase.co/rest/v1/conversations?select=*&or=%28user1_id.eq.ed1c374e-3823-4ea2-aa28-3999c21d1140%2Cuser2_id.eq.ed1c374e-3823-4ea2-aa28-3999c21d1140%29 400 (Bad Request)
fetch @ supabase.ts:43
(anonymous) @ @supabase_supabase-js.js?v=12562e5c:3900
(anonymous) @ @supabase_supabase-js.js?v=12562e5c:3921
fulfilled @ @supabase_supabase-js.js?v=12562e5c:3873
Promise.then
step @ @supabase_supabase-js.js?v=12562e5c:3886
(anonymous) @ @supabase_supabase-js.js?v=12562e5c:3888
__awaiter6 @ @supabase_supabase-js.js?v=12562e5c:3870
(anonymous) @ @supabase_supabase-js.js?v=12562e5c:3911
then @ @supabase_supabase-js.js?v=12562e5c:89Understand this error
achievementTrigger.ts:30 Error counting conversations: {message: ''}
checkAllAchievements @ achievementTrigger.ts:30
await in checkAllAchievements
(anonymous) @ Dashboard.tsx:298
commitHookEffectListMount @ chunk-276SZO74.js?v=12562e5c:16915
commitPassiveMountOnFiber @ chunk-276SZO74.js?v=12562e5c:18156
commitPassiveMountEffects_complete @ chunk-276SZO74.js?v=12562e5c:18129
commitPassiveMountEffects_begin @ chunk-276SZO74.js?v=12562e5c:18119
commitPassiveMountEffects @ chunk-276SZO74.js?v=12562e5c:18109
flushPassiveEffectsImpl @ chunk-276SZO74.js?v=12562e5c:19490
flushPassiveEffects @ chunk-276SZO74.js?v=12562e5c:19447
(anonymous) @ chunk-276SZO74.js?v=12562e5c:19328
workLoop @ chunk-276SZO74.js?v=12562e5c:197
flushWork @ chunk-276SZO74.js?v=12562e5c:176
performWorkUntilDeadline @ chunk-276SZO74.js?v=12562e5c:384Understand this error