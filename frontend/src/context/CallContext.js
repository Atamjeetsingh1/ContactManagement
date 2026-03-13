import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { connectSocket, getSocket } from '../services/socket';
import CallModal from '../components/CallModal';

const CallContext = createContext(null);

export const useCall = () => useContext(CallContext);

export const CallProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  
  const [showCallModal, setShowCallModal] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [callerData, setCallerData] = useState(null);
  const [contactIdToCall, setContactIdToCall] = useState(null);

  // Connect to socket globally when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const socket = connectSocket();
      
      const handleCallUser = (data) => {
        setCallerData(data);
        setIsVideoCall(data.isVideo);
        setIsReceivingCall(true);
        setShowCallModal(true);
        // Maybe play a ringtone here in the future
      };

      if (socket) {
        // remove existing listener to avoid duplicates
        socket.off('call_user', handleCallUser); 
        socket.on('call_user', handleCallUser);
      }

      return () => {
        if (socket) {
          socket.off('call_user', handleCallUser);
        }
      };
    }
  }, [isAuthenticated]);

  const initiateCall = (contactId, isVideo) => {
    setIsVideoCall(isVideo);
    setIsReceivingCall(false);
    setCallerData(null);
    setContactIdToCall(contactId);
    setShowCallModal(true);
  };

  const closeCall = () => {
    setShowCallModal(false);
    setIsReceivingCall(false);
    setCallerData(null);
    setContactIdToCall(null);
  };

  return (
    <CallContext.Provider value={{ initiateCall }}>
      {children}
      {showCallModal && user && (
        <CallModal
          user={user}
          contactId={contactIdToCall}
          isReceivingCall={isReceivingCall}
          callerData={callerData}
          isVideoCall={isVideoCall}
          onClose={closeCall}
        />
      )}
    </CallContext.Provider>
  );
};
