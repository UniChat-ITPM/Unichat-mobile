import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CallIncomingPayload } from '../types/callSignaling';

type IncomingCallContextValue = {
  incoming: CallIncomingPayload | null;
  /** Optional display name when known (e.g. from contacts). */
  peerDisplayName: string | null;
  showIncomingCall: (payload: CallIncomingPayload, displayName?: string | null) => void;
  dismissIncomingCall: () => void;
};

const IncomingCallContext = createContext<IncomingCallContextValue | undefined>(undefined);

export function IncomingCallProvider({ children }: { children: ReactNode }) {
  const [incoming, setIncoming] = useState<CallIncomingPayload | null>(null);
  const [peerDisplayName, setPeerDisplayName] = useState<string | null>(null);

  const showIncomingCall = useCallback((payload: CallIncomingPayload, displayName?: string | null) => {
    setIncoming(payload);
    setPeerDisplayName(displayName?.trim() || null);
  }, []);

  const dismissIncomingCall = useCallback(() => {
    setIncoming(null);
    setPeerDisplayName(null);
  }, []);

  const value = useMemo(
    () => ({
      incoming,
      peerDisplayName,
      showIncomingCall,
      dismissIncomingCall,
    }),
    [incoming, peerDisplayName, showIncomingCall, dismissIncomingCall],
  );

  return <IncomingCallContext.Provider value={value}>{children}</IncomingCallContext.Provider>;
}

export function useIncomingCall(): IncomingCallContextValue {
  const ctx = useContext(IncomingCallContext);
  if (!ctx) {
    throw new Error('useIncomingCall must be used within IncomingCallProvider');
  }
  return ctx;
}
