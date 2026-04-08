import React, { useEffect, useRef } from 'react';
import { subscribeIncomingCall } from '../../services/callSocket';
import { useIncomingCall } from '../../context/IncomingCallContext';
import type { CallIncomingPayload } from '../../types/callSignaling';

/**
 * Listens for `call:incoming` and opens the full-screen incoming UI via context.
 */
const IncomingCallListener = () => {
  const { incoming, showIncomingCall } = useIncomingCall();
  const incomingRef = useRef(incoming);
  incomingRef.current = incoming;

  useEffect(() => {
    return subscribeIncomingCall((payload: CallIncomingPayload) => {
      if (incomingRef.current != null) {
        return;
      }
      showIncomingCall(payload, null);
    });
  }, [showIncomingCall]);

  return null;
};

export default IncomingCallListener;
