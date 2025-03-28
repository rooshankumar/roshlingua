
export const TypingIndicator = () => {
  return (
    <div className="bg-muted rounded-lg px-4 py-2 max-w-[80px]">
      <div className="flex gap-1">
        <div className="w-2 h-2 rounded-full bg-foreground/50 animate-typing-dot-1" />
        <div className="w-2 h-2 rounded-full bg-foreground/50 animate-typing-dot-2" />
        <div className="w-2 h-2 rounded-full bg-foreground/50 animate-typing-dot-3" />
      </div>
    </div>
  );
};
export const TypingIndicator = () => {
  return (
    <div className="flex items-center space-x-1 p-2">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-typing-dot-1"></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-typing-dot-2"></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-typing-dot-3"></div>
    </div>
  );
};
