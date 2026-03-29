import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ChatsUnreadContextValue = {
  chatsTabUnread: number;
  groupsTabUnread: number;
  setTabUnreadTotals: (chatsTotal: number, groupsTotal: number) => void;
};

const ChatsUnreadContext = createContext<ChatsUnreadContextValue | null>(null);

export function ChatsUnreadProvider({ children }: { children: React.ReactNode }) {
  const [chatsTabUnread, setChatsTabUnread] = useState(0);
  const [groupsTabUnread, setGroupsTabUnread] = useState(0);

  const setTabUnreadTotals = useCallback((chatsTotal: number, groupsTotal: number) => {
    setChatsTabUnread(chatsTotal);
    setGroupsTabUnread(groupsTotal);
  }, []);

  const value = useMemo(
    () => ({
      chatsTabUnread,
      groupsTabUnread,
      setTabUnreadTotals,
    }),
    [chatsTabUnread, groupsTabUnread, setTabUnreadTotals],
  );

  return <ChatsUnreadContext.Provider value={value}>{children}</ChatsUnreadContext.Provider>;
}

export function useChatsUnread(): ChatsUnreadContextValue {
  const ctx = useContext(ChatsUnreadContext);
  if (!ctx) {
    throw new Error('useChatsUnread must be used within ChatsUnreadProvider');
  }
  return ctx;
}
