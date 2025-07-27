import React from 'react';
import { useParams } from 'react-router-dom';
import { ChatScreen } from '@/components/chat/ChatScreen';
import { useAuth } from '@/hooks/useAuth';

const Chat: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();

  console.log('📱 Chat page - Auth status:', { 
    hasUser: !!user, 
    loading, 
    userId: user?.id,
    receiverId: id 
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-red-600">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to access the chat</p>
          <button 
            onClick={() => window.location.href = '/auth'} 
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!id) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold">No Chat Selected</h2>
          <p className="text-muted-foreground">Please select a conversation from the chat list</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <ChatScreen receiverId={id} />
    </div>
  );
};

export default Chat;