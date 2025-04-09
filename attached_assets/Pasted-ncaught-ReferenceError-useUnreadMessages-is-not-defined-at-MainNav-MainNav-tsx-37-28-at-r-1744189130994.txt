ncaught ReferenceError: useUnreadMessages is not defined
    at MainNav (MainNav.tsx:37:28)
    at renderWithHooks (chunk-W6L2VRDA.js?v=ae83a17f:11548:26)
    at mountIndeterminateComponent (chunk-W6L2VRDA.js?v=ae83a17f:14926:21)
    at beginWork (chunk-W6L2VRDA.js?v=ae83a17f:15914:22)
    at HTMLUnknownElement.callCallback2 (chunk-W6L2VRDA.js?v=ae83a17f:3674:22)
    at Object.invokeGuardedCallbackDev (chunk-W6L2VRDA.js?v=ae83a17f:3699:24)
    at invokeGuardedCallback (chunk-W6L2VRDA.js?v=ae83a17f:3733:39)
    at beginWork$1 (chunk-W6L2VRDA.js?v=ae83a17f:19765:15)
    at performUnitOfWork (chunk-W6L2VRDA.js?v=ae83a17f:19198:20)
    at workLoopSync (chunk-W6L2VRDA.js?v=ae83a17f:19137:13)
MainNav @ MainNav.tsx:37
renderWithHooks @ chunk-W6L2VRDA.js?v=ae83a17f:11548
mountIndeterminateComponent @ chunk-W6L2VRDA.js?v=ae83a17f:14926
beginWork @ chunk-W6L2VRDA.js?v=ae83a17f:15914
callCallback2 @ chunk-W6L2VRDA.js?v=ae83a17f:3674
invokeGuardedCallbackDev @ chunk-W6L2VRDA.js?v=ae83a17f:3699
invokeGuardedCallback @ chunk-W6L2VRDA.js?v=ae83a17f:3733
beginWork$1 @ chunk-W6L2VRDA.js?v=ae83a17f:19765
performUnitOfWork @ chunk-W6L2VRDA.js?v=ae83a17f:19198
workLoopSync @ chunk-W6L2VRDA.js?v=ae83a17f:19137
renderRootSync @ chunk-W6L2VRDA.js?v=ae83a17f:19116
performConcurrentWorkOnRoot @ chunk-W6L2VRDA.js?v=ae83a17f:18678
workLoop @ chunk-W6L2VRDA.js?v=ae83a17f:197
flushWork @ chunk-W6L2VRDA.js?v=ae83a17f:176
performWorkUntilDeadline @ chunk-W6L2VRDA.js?v=ae83a17f:384Understand this error
MainNav.tsx:37 Uncaught ReferenceError: useUnreadMessages is not defined
    at MainNav (MainNav.tsx:37:28)
    at renderWithHooks (chunk-W6L2VRDA.js?v=ae83a17f:11548:26)
    at mountIndeterminateComponent (chunk-W6L2VRDA.js?v=ae83a17f:14926:21)
    at beginWork (chunk-W6L2VRDA.js?v=ae83a17f:15914:22)
    at HTMLUnknownElement.callCallback2 (chunk-W6L2VRDA.js?v=ae83a17f:3674:22)
    at Object.invokeGuardedCallbackDev (chunk-W6L2VRDA.js?v=ae83a17f:3699:24)
    at invokeGuardedCallback (chunk-W6L2VRDA.js?v=ae83a17f:3733:39)
    at beginWork$1 (chunk-W6L2VRDA.js?v=ae83a17f:19765:15)
    at performUnitOfWork (chunk-W6L2VRDA.js?v=ae83a17f:19198:20)
    at workLoopSync (chunk-W6L2VRDA.js?v=ae83a17f:19137:13)
MainNav @ MainNav.tsx:37
renderWithHooks @ chunk-W6L2VRDA.js?v=ae83a17f:11548
mountIndeterminateComponent @ chunk-W6L2VRDA.js?v=ae83a17f:14926
beginWork @ chunk-W6L2VRDA.js?v=ae83a17f:15914
callCallback2 @ chunk-W6L2VRDA.js?v=ae83a17f:3674
invokeGuardedCallbackDev @ chunk-W6L2VRDA.js?v=ae83a17f:3699
invokeGuardedCallback @ chunk-W6L2VRDA.js?v=ae83a17f:3733
beginWork$1 @ chunk-W6L2VRDA.js?v=ae83a17f:19765
performUnitOfWork @ chunk-W6L2VRDA.js?v=ae83a17f:19198
workLoopSync @ chunk-W6L2VRDA.js?v=ae83a17f:19137
renderRootSync @ chunk-W6L2VRDA.js?v=ae83a17f:19116
recoverFromConcurrentError @ chunk-W6L2VRDA.js?v=ae83a17f:18736
performConcurrentWorkOnRoot @ chunk-W6L2VRDA.js?v=ae83a17f:18684
workLoop @ chunk-W6L2VRDA.js?v=ae83a17f:197
flushWork @ chunk-W6L2VRDA.js?v=ae83a17f:176
performWorkUntilDeadline @ chunk-W6L2VRDA.js?v=ae83a17f:384Understand this error
chunk-W6L2VRDA.js?v=ae83a17f:14032 The above error occurred in the <MainNav> component:

    at MainNav (https://fd1d76f1-aef7-4ad3-bdf1-732966a22b80-00-968slrt8f8f4.sisko.replit.dev/src/components/navigation/MainNav.tsx:42:22)
    at div
    at div
    at AppLayout (https://fd1d76f1-aef7-4ad3-bdf1-732966a22b80-00-968slrt8f8f4.sisko.replit.dev/src/components/layouts/AppLayout.tsx:36:22)
    at ProtectedRoute (https://fd1d76f1-aef7-4ad3-bdf1-732966a22b80-00-968slrt8f8f4.sisko.replit.dev/src/components/auth/ProtectedRoute.tsx:15:27)
    at RenderedRoute (https://fd1d76f1-aef7-4ad3-bdf1-732966a22b80-00-968slrt8f8f4.sisko.replit.dev/node_modules/.vite/deps/react-router-dom.js?v=ae83a17f:4069:5)
    at Routes (https://fd1d76f1-aef7-4ad3-bdf1-732966a22b80-00-968slrt8f8f4.sisko.replit.dev/node_modules/.vite/deps/react-router-dom.js?v=ae83a17f:4508:5)
    at AppRoutes (https://fd1d76f1-aef7-4ad3-bdf1-732966a22b80-00-968slrt8f8f4.sisko.replit.dev/src/App.tsx:37:33)
    at AuthProvider (https://fd1d76f1-aef7-4ad3-bdf1-732966a22b80-00-968slrt8f8f4.sisko.replit.dev/src/providers/AuthProvider.tsx:23:32)
    at Router (https://fd1d76f1-aef7-4ad3-bdf1-732966a22b80-00-968slrt8f8f4.sisko.replit.dev/node_modules/.vite/deps/react-router-dom.js?v=ae83a17f:4451:15)
    at BrowserRouter (https://fd1d76f1-aef7-4ad3-bdf1-732966a22b80-00-968slrt8f8f4.sisko.replit.dev/node_modules/.vite/deps/react-router-dom.js?v=ae83a17f:5196:5)
    at ThemeProvider (https://fd1d76f1-aef7-4ad3-bdf1-732966a22b80-00-968slrt8f8f4.sisko.replit.dev/src/components/theme-provider.tsx:17:33)
    at QueryClientProvider (https://fd1d76f1-aef7-4ad3-bdf1-732966a22b80-00-968slrt8f8f4.sisko.replit.dev/node_modules/.vite/deps/@tanstack_react-query.js?v=ae83a17f:2794:3)
    at App

Consider adding an error boundary to your tree to customize error handling behavior.
Visit https://reactjs.org/link/error-boundaries to learn more about error boundaries.
logCapturedError @ chunk-W6L2VRDA.js?v=ae83a17f:14032
update.callback @ chunk-W6L2VRDA.js?v=ae83a17f:14052
callCallback @ chunk-W6L2VRDA.js?v=ae83a17f:11248
commitUpdateQueue @ chunk-W6L2VRDA.js?v=ae83a17f:11265
commitLayoutEffectOnFiber @ chunk-W6L2VRDA.js?v=ae83a17f:17093
commitLayoutMountEffects_complete @ chunk-W6L2VRDA.js?v=ae83a17f:17980
commitLayoutEffects_begin @ chunk-W6L2VRDA.js?v=ae83a17f:17969
commitLayoutEffects @ chunk-W6L2VRDA.js?v=ae83a17f:17920
commitRootImpl @ chunk-W6L2VRDA.js?v=ae83a17f:19353
commitRoot @ chunk-W6L2VRDA.js?v=ae83a17f:19277
finishConcurrentRender @ chunk-W6L2VRDA.js?v=ae83a17f:18760
performConcurrentWorkOnRoot @ chunk-W6L2VRDA.js?v=ae83a17f:18718
workLoop @ chunk-W6L2VRDA.js?v=ae83a17f:197
flushWork @ chunk-W6L2VRDA.js?v=ae83a17f:176
performWorkUntilDeadline @ chunk-W6L2VRDA.js?v=ae83a17f:384Understand this error
chunk-W6L2VRDA.js?v=ae83a17f:19413 Uncaught ReferenceError: useUnreadMessages is not defined
    at MainNav (MainNav.tsx:37:28)
    at renderWithHooks (chunk-W6L2VRDA.js?v=ae83a17f:11548:26)
    at mountIndeterminateComponent (chunk-W6L2VRDA.js?v=ae83a17f:14926:21)
    at beginWork (chunk-W6L2VRDA.js?v=ae83a17f:15914:22)
    at beginWork$1 (chunk-W6L2VRDA.js?v=ae83a17f:19753:22)
    at performUnitOfWork (chunk-W6L2VRDA.js?v=ae83a17f:19198:20)
    at workLoopSync (chunk-W6L2VRDA.js?v=ae83a17f:19137:13)
    at renderRootSync (chunk-W6L2VRDA.js?v=ae83a17f:19116:15)
    at recoverFromConcurrentError (chunk-W6L2VRDA.js?v=ae83a17f:18736:28)
    at performConcurrentWorkOnRoot (chunk-W6L2VRDA.js?v=ae83a17f:18684:30)
MainNav @ MainNav.tsx:37
renderWithHooks @ chunk-W6L2VRDA.js?v=ae83a17f:11548
mountIndeterminateComponent @ chunk-W6L2VRDA.js?v=ae83a17f:14926
beginWork @ chunk-W6L2VRDA.js?v=ae83a17f:15914
beginWork$1 @ chunk-W6L2VRDA.js?v=ae83a17f:19753
performUnitOfWork @ chunk-W6L2VRDA.js?v=ae83a17f:19198
workLoopSync @ chunk-W6L2VRDA.js?v=ae83a17f:19137
renderRootSync @ chunk-W6L2VRDA.js?v=ae83a17f:19116
recoverFromConcurrentError @ chunk-W6L2VRDA.js?v=ae83a17f:18736
performConcurrentWorkOnRoot @ chunk-W6L2VRDA.js?v=ae83a17f:18684
workLoop @ chunk-W6L2VRDA.js?v=ae83a17f:197
flushWork @ chunk-W6L2VRDA.js?v=ae83a17f:176
performWorkUntilDeadline @ chunk-W6L2VRDA.js?v=ae83a17f:384Understand this error
AuthProvider.tsx:75 GoTrueClient@0 (2.69.1) 2025-04-09T08:58:34.500Z #unsubscribe() state change callback with id removed 3c74a593-c1e9-4909-a30c-3ce7ef85f3d3