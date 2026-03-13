import React, { useEffect, useRef, useState } from 'react';
import { getSocket } from '../services/socket';
import './CallModal.css';

const CallModal = ({
  user,
  contactId,
  isReceivingCall,
  callerData,
  isVideoCall,
  onClose
}) => {
  const [stream, setStream] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [calling, setCalling] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef(null);

  useEffect(() => {
    let activeStream = null;

    const setupMedia = async () => {
      try {
        const currentStream = await navigator.mediaDevices.getUserMedia({ video: isVideoCall, audio: true });
        setStream(currentStream);
        activeStream = currentStream;
        
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
        }

        if (!isReceivingCall) {
          callUser(contactId, currentStream);
        }
      } catch (err) {
        console.error("Failed to get local stream", err);
      }
    };

    if (!isReceivingCall) {
      setupMedia();
    }

    const socket = getSocket();

    const handleCallAccepted = async (signal) => {
      setCallAccepted(true);
      if (connectionRef.current) {
        await connectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
      }
    };

    const handleIceCandidate = async (candidate) => {
      if (connectionRef.current) {
        await connectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    const handleEndCall = () => {
      endCall(false);
    };

    if (socket) {
      socket.on('call_accepted', handleCallAccepted);
      socket.on('ice_candidate', handleIceCandidate);
      socket.on('end_call', handleEndCall);
    }

    // Synthetic ringing sound for incoming calls
    let audioCtx = null;
    let ringerInterval = null;

    if (isReceivingCall && !callAccepted) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const playRing = () => {
          if (!audioCtx) return;
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, audioCtx.currentTime); // 440 Hz
          osc.frequency.setValueAtTime(480, audioCtx.currentTime + 0.2); // 480 Hz
          
          gain.gain.setValueAtTime(0, audioCtx.currentTime);
          gain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.1);
          gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1);

          osc.connect(gain);
          gain.connect(audioCtx.destination);
          
          osc.start(audioCtx.currentTime);
          osc.stop(audioCtx.currentTime + 1);
        };
        
        playRing();
        window.ringerIntervalId = setInterval(playRing, 2000);
      } catch (e) {
        console.error("Audio API not supported for ringing");
      }
    }

    return () => {
      if (window.ringerIntervalId) clearInterval(window.ringerIntervalId);
      if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
      
      if (socket) {
        socket.off('call_accepted', handleCallAccepted);
        socket.off('ice_candidate', handleIceCandidate);
        socket.off('end_call', handleEndCall);
      }
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      if (connectionRef.current) {
        connectionRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createPeerConnection = (idToCall, currentStream, isInitiator) => {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478" },
      ]
    });
    
    connectionRef.current = peer;
    const socket = getSocket();

    // Triggered when a new ICE candidate is available
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice_candidate', {
          to: isReceivingCall ? callerData.from : idToCall,
          candidate: event.candidate
        });
      }
    };

    // Triggered when a remote stream is added
    peer.ontrack = (event) => {
      if (userVideo.current && userVideo.current.srcObject !== event.streams[0]) {
        userVideo.current.srcObject = event.streams[0];
      }
    };

    // Add local stream tracks to the connection
    if (currentStream) {
      currentStream.getTracks().forEach(track => {
        peer.addTrack(track, currentStream);
      });
    }

    return peer;
  };

  const callUser = async (idToCall, currentStream) => {
    setCalling(true);
    const peer = createPeerConnection(idToCall, currentStream, true);
    
    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      
      const socket = getSocket();
      socket.emit('call_user', {
        userToCall: idToCall,
        signalData: offer,
        from: user.id,
        name: user.name || 'User',
        isVideo: isVideoCall
      });
    } catch (err) {
      console.error("Error calling user", err);
    }
  };

  const answerCall = async () => {
    try {
      if (window.ringerIntervalId) {
        clearInterval(window.ringerIntervalId);
      }
      
      const currentStream = await navigator.mediaDevices.getUserMedia({ video: isVideoCall, audio: true });
      setStream(currentStream);
      if (myVideo.current) {
        myVideo.current.srcObject = currentStream;
      }

      setCallAccepted(true);
      const peer = createPeerConnection(callerData.from, currentStream, false);
      
      await peer.setRemoteDescription(new RTCSessionDescription(callerData.signal));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      const socket = getSocket();
      socket.emit('answer_call', { signal: answer, to: callerData.from });
    } catch (err) {
      console.error("Error answering call", err);
    }
  };

  const endCall = (emitEvent = true) => {
    setCallEnded(true);
    if (connectionRef.current) {
      connectionRef.current.close();
      connectionRef.current = null;
    }
    
    // Stop all tracks in the current stream
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
    }

    // Backup approach: look for any media elements and stop their srcObject
    if (myVideo.current && myVideo.current.srcObject) {
       myVideo.current.srcObject.getTracks().forEach(t => t.stop());
    }

    if (emitEvent) {
      const socket = getSocket();
      if (socket) {
        socket.emit('end_call', { to: isReceivingCall ? callerData.from : contactId });
      }
    }
    onClose();
  };

  const toggleMute = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (stream && isVideoCall) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraOff(!videoTrack.enabled);
      }
    }
  };

  return (
    <div className="call-modal-overlay">
      <div className="call-modal-content">
        <div className="call-header">
          <h3>{isVideoCall ? 'Video Call' : 'Audio Call'}</h3>
          {isReceivingCall && !callAccepted && (
            <p>{callerData.name || 'Someone'} is calling...</p>
          )}
        </div>

        <div className="video-container">
          <div className="video-box local">
            <video playsInline muted ref={myVideo} autoPlay className={isVideoCall ? '' : 'hidden-video'} />
            <span className="video-label">You {isMuted ? '🔇' : ''}</span>
          </div>

          <div className={`video-box remote ${(callAccepted && !callEnded) ? '' : 'hidden-video'}`}>
            <video playsInline ref={userVideo} autoPlay className={isVideoCall ? '' : 'hidden-video'} />
            <span className="video-label">Remote</span>
          </div>
        </div>

        <div className="call-controls">
          {isReceivingCall && !callAccepted ? (
            <button className="btn-answer" onClick={answerCall}>📞 Answer</button>
          ) : null}

          {((callAccepted && !callEnded) || (!isReceivingCall && !callEnded)) && (
            <>
              <button className={`btn-control \${isMuted ? 'muted' : ''}`} onClick={toggleMute}>
                {isMuted ? '🔇' : '🎙️'}
              </button>
              {isVideoCall && (
                <button className={`btn-control \${cameraOff ? 'off' : ''}`} onClick={toggleCamera}>
                  {cameraOff ? '🚫' : '📷'}
                </button>
              )}
              <button className="btn-end" onClick={() => endCall(true)}>☎️</button>
            </>
          )}

          {isReceivingCall && !callAccepted && (
            <button className="btn-end" onClick={() => endCall(true)}>Decline</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallModal;
