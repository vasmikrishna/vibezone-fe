import React, { useEffect, useRef, useState } from 'react';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CircularProgress from "@mui/material/CircularProgress";
import { analytics } from "./firebase";
import { logEvent } from "firebase/analytics";
import { messaging } from "./firebase";
import { getToken, onMessage } from "firebase/messaging";
import CameraswitchIcon from '@mui/icons-material/Cameraswitch';
import './video.css';

import logo from './assets/vibezone-logo.svg';
import StatusWithNumber from './components/activeUsers';
import InstagramCTA from './page/insta';
import FreeAccessForm from './components/earlybardAcess';


const configuration = {
  iceServers: [
    { urls: 'stun:43.204.141.222:3478' },
    {
      urls: 'turn:43.204.141.222:3478',
      username: 'vamsi',
      credential: '9100684109',
    },
  ],
};


export default function VideoPage() {
  const wsRef = useRef(null);
  const pcRef = useRef(null);

  const [serverUrl, setServerUrl] = useState('https://vibezone.in/');
  const [partnerId, setPartnerId] = useState(null);
  const [role, setRole] = useState(null); // 'caller' or 'callee'
  const [localStream, setLocalStream] = useState(null);
  const [socketId, setSocketId] = useState('');
  const [micOn, setMicOn] = useState(true); // Track mic state
  const [videoOn, setVideoOn] = useState(true); // Track video state
  const [keyword, setKeyword] = useState('');
  const [isPaused, setisPaused] = useState(true);

  const localVideo = useRef(null);
  const remoteVideo = useRef(null);

  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false); // Track submission state

  useEffect(() => {
    const submittedStatus = localStorage.getItem('freeAccessSubmitted');
    console.log('submittedStatus:', submittedStatus);
    if (submittedStatus === 'true') {
      setHasSubmitted(true);
    }
  }, []);

  const handlePopupOpen = () => {
    if (!hasSubmitted) {
      setIsPopupOpen(true);
    }
  };

  const handlePopupClose = () => {
    setIsPopupOpen(false);
  };

  const handleFormSubmitFreeAccess = () => {
    console.log('Form submitted!');
    setHasSubmitted(true); // Mark as submitted
    setIsPopupOpen(false); // Close the popup
    localStorage.setItem('freeAccessSubmitted', 'true'); // Persist submission state
  };




  const [activeUsers, setActiveUsers] = useState(1);

  useEffect(() => {
    const requestPermission = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          console.log("Notification permission granted.");
          const token = await getToken(messaging, {
            vapidKey: "BLBpommLIjIUxyevEwGpcw2AsngGQluz10W6CNDBlZyeEMM7K5JSrxoNlJv1YqJLiM9ElxOyNth62wIlyIuTr30", // Replace with your VAPID key
          });
          if (token) {
            console.log("FCM Token:", token);
            // Send this token to your backend to send push notifications
          } else {
            console.log("No FCM token received.");
          }
        } else {
          console.log("Notification permission denied.");
        }
      } catch (error) {
        console.error("Error requesting notification permission:", error);
      }
    };

    requestPermission();
  }, []);

    // Function to initialize the WebSocket connection
    const initializeWebSocket = () => {
      wsRef.current = new WebSocket(serverUrl);
      // wsRef.current = new WebSocket('http://localhost:3001/');
  
      wsRef.current.onopen = () => {
        console.log('Connected to signaling server');
      };
  
      wsRef.current.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log('WS message: =>', data);
  
        switch (data.type) {
          case 'connected':
            setSocketId(data.id);
            break;
          case 'activeUsers':
            setActiveUsers(data.value);
            break;
          case 'matched':
            setPartnerId(data.partnerId);
            setRole(data.role);
            initPeerConnection(data.partnerId);
            if (data.role === 'caller') {
              createOffer(data.partnerId);
            }
            break;
          case 'offer':
            handleOffer(data.offer, data.from);
            break;
          case 'answer':
            handleAnswer(data.answer);
            break;
          case 'candidate':
            handleCandidate(data.candidate);
            break;
          case 'hangup':
            endCall();
            break;
          default:
            console.warn('Unknown message type:', data.type);
        }
      };
  
      wsRef.current.onerror = (err) => {
        console.error('WebSocket error:', err);
      };
  
      wsRef.current.onclose = () => {
        console.log('Disconnected from signaling server');
      };
    };

  const getStream = async (deviceId = null) => {
    try {
      // Detect device type
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
      const isAndroid = /Android/i.test(userAgent);
  
      console.log(`Device detected: ${isIOS ? 'iOS' : isAndroid ? 'Android' : 'Desktop/Other'}`);
  
      // Fetch available video input devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
  
      if (videoDevices.length === 0) {
        console.error('No video input devices found.');
        return null;
      }
  
      // If no deviceId is provided, use the first available camera
      const selectedDeviceId = deviceId || videoDevices[0].deviceId;
  
      // Cross-platform constraints
      const constraints = {
        video: isIOS
          ? { facingMode: deviceId ? { exact: 'environment' } : 'user' } // iOS prefers facingMode
          : { deviceId: { exact: selectedDeviceId } }, // Default for other platforms
        audio: micOn,
      };
  
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log(`Using camera: ${selectedDeviceId}`);
      return stream;
    } catch (err) {
      // Handle errors
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        console.error('No camera or microphone found.');
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        console.error('Permission denied for accessing media devices.');
      } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
        console.error('Constraints cannot be satisfied by available devices.');
      } else {
        console.error('Error accessing media devices:', err);
      }
      return null;
    }
  };
  

  const switchCamera = async () => {
    if (availableCameras.length > 1) {
      const nextCameraIndex = (currentCameraIndex + 1) % availableCameras.length;
      console.log('Next camera index:', nextCameraIndex);
      console.log('Available cameras:', availableCameras);
      const nextCamera = availableCameras[nextCameraIndex];
  
      try {
     
  
        // Use facingMode for mobile devices
        const newStream = await getStream(nextCamera.deviceId);


        setCurrentCameraIndex(nextCameraIndex);
        console.log(`Switched to camera: ${nextCamera.label}`);

        if(!newStream?.active){
          console.log('No video tracks found');
          return;
        }

        // Stop the old tracks to release resources
        localStream?.getTracks().forEach((track) => track.stop());
  
        // Replace the video track in the WebRTC PeerConnection
        const videoTrack = newStream.getVideoTracks()[0];
        const sender = pcRef.current
          ?.getSenders()
          ?.find((sender) => sender.track.kind === "video");
  
        if (sender) {
          await sender.replaceTrack(videoTrack); // Replace track without renegotiation
        } else {
          console.warn("No sender found for video track.");
        }
  
        // Update the local video element and state
        setLocalStream(newStream);
        if (localVideo.current) {
          localVideo.current.srcObject = newStream;
        }
  
        setCurrentCameraIndex(nextCameraIndex);
        console.log(`Switched to camera: ${nextCamera.label}`);
      } catch (err) {
        setCurrentCameraIndex((currentCameraIndex+1) % availableCameras.length);
        console.error("Error switching camera:", err);
      }
    } else {
      console.warn("No additional cameras available to switch.");
    }
  };
  

  useEffect(() => {
    const getCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setAvailableCameras(videoDevices);
  
        if (videoDevices.length > 0) {
          const stream = await getStream(videoDevices[0].deviceId);
          setLocalStream(stream);
          if (localVideo.current) {
            localVideo.current.srcObject = stream;
          }
        }
      } catch (err) {
        console.error('Error accessing cameras:', err);
      }
    };
  
    getCameras();
  }, []);
   

  useEffect(() => {
    // Handle incoming messages while the app is in the foreground
    onMessage(messaging, (payload) => {
      console.log("Message received in foreground: ", payload);
      // Optionally show a notification
      new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: payload.notification.icon,
      });
    });
  }, []);

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !micOn;
      });
      setMicOn(!micOn);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !videoOn;
      });
      setVideoOn(!videoOn);
    }
  };


  // 2. Get local media once on mount
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        setIsStreaming(true);
        if (localVideo.current) {
          localVideo.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing media devices:', err);
      }
    })();
  }, []);
  

  /** Initialize a new RTCPeerConnection */
  function initPeerConnection(remoteId) {
    // const pc = new RTCPeerConnection(configuration);
    if (!localStream) {
      console.error('Local stream not initialized yet.');
      return;
    }
    const pc = new RTCPeerConnection(configuration, { iceCandidatePoolSize: 10 });

    pc.onicegatheringstatechange = () => {
      console.log('ICE gathering state:', pc.iceGatheringState);
    };


    console.log('Created RTCPeerConnection:');

    pcRef.current = pc;

    // Add local tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    // When we get a remote track, show it in remoteVideo
    pc.ontrack = (event) => {
      console.log('Received remote track');
      if (remoteVideo.current) {
        remoteVideo.current.srcObject = event.streams[0];
      }
    };

    // onicecandidate => send to partner
    pc.onicecandidate = (event) => {
      console.log('ICE candidate:', event.candidate);
      if (event.candidate) {
        wsRef.current.send(JSON.stringify({
          type: 'candidate',
          candidate: event.candidate,
          to: remoteId
        }));
      }
    };
  }

  /** Caller: create offer automatically if I'm "caller" */
  async function createOffer(id) {
    const pc = pcRef.current;
    if (!pc) return;
    try {
      const offer = await pc.createOffer();
      console.log('Created offer:', offer);
      await pc.setLocalDescription(offer);
      // Send offer to partner
      wsRef.current.send(JSON.stringify({
        type: 'offer',
        offer: pc.localDescription,
        to: id
      }));
      console.log('Sent offer to:', id);
    } catch (err) {
      console.error('createOffer error:', err);
    }
  }

  /** Callee: handle incoming offer automatically */
  async function handleOffer(offer, fromId) {
    setPartnerId(fromId); // in case we didn't have it yet

    const pc = pcRef.current;
    if (!pc) {
      initPeerConnection(fromId);
    }
    // setRemoteDescription
    await pcRef.current.setRemoteDescription(offer);

    // createAnswer
    const answer = await pcRef.current.createAnswer();
    await pcRef.current.setLocalDescription(answer);

    // send 'answer'
    wsRef.current.send(JSON.stringify({
      type: 'answer',
      answer: pcRef.current.localDescription,
      to: fromId
    }));
  }

  /** Caller: handle incoming answer */
  async function handleAnswer(answer) {
    console.log('Received answer:', answer);
    const pc = pcRef.current;
    if (!pc) return;
    await pc.setRemoteDescription(answer);
    console.log('Remote description set');
  }

  /** Both: handle ICE candidate */
  async function handleCandidate(candidate) {
    const pc = pcRef.current;
    if (!pc) return;
    try {
      await pc.addIceCandidate(candidate);
    } catch (err) {
      console.error('Error adding candidate', err);
    }
  }

  /** End the call and reset */
  function endCall() {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (remoteVideo.current) {
      remoteVideo.current.srcObject = null;
    }
    setPartnerId(null);
    setRole(null);
  }

  /** User presses "Skip" => send skip, server re-queues us */
  function skip() {
    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'skip', // The event name that matches your GTM trigger
      });
    }
    wsRef.current.send(JSON.stringify({ type: 'skip' }));
    endCall();
  }

  const handlePause = () => {
    endCall();
    wsRef.current?.close();
    wsRef.current = null;
    setisPaused(true);
  };

  const handleResume = async () => {
    setisPaused(false);
    initializeWebSocket();
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    setAvailableCameras(videoDevices);

    if (videoDevices.length > 0) {
      const stream = await getStream(videoDevices[0].deviceId);
      setLocalStream(stream);
      if (localVideo.current) {
        localVideo.current.srcObject = stream;
      }
    }
  };

  useEffect(() => {
    if (!isPaused) {
      initializeWebSocket();
    }

    return () => {
      wsRef.current?.close();
    };
  }, [isPaused]);




  return (
    <div  style={{ padding: '2rem'}} >
     <div style={{ display: 'flex', marginBottom: '30px', justifyContent: 'end', gap: '0.5rem' }}>
      {hasSubmitted && <InstagramCTA />}
      </div>
      {/* Free Access Button */}
      {
        !hasSubmitted && (
          <div className="free-access-btn-container">
            <button className="free-access-btn" onClick={handlePopupOpen}>
              Get Lifetime Free Access!
            </button>
          </div>
        )
      }

      

      {/* Popup Modal */}
      {isPopupOpen && (
        <div className="popup-modal">
          <div className="popup-content">
            <button className="close-btn" onClick={handlePopupClose}>
              &times;
            </button>
            <FreeAccessForm handleFormSubmitFreeAccess={handleFormSubmitFreeAccess} />
          </div>
        </div>
      )}
      
 
      <div style={{ display: 'flex', marginBottom: '30px', justifyContent: 'End', gap: '0.5rem' }}> 
        <StatusWithNumber number={activeUsers} />
      </div>
      <div style={{ display: 'flex', marginBottom: '30px', justifyContent: 'space-between', gap: '0.5rem' }}> 
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}> 
          <img src={logo} className="logo" alt="logo" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', gap: '0.5rem'}}>
            <button
                onClick={isPaused ? handleResume : handlePause}
                style={{ width: '70px', padding: '0px', fontSize: '13px', height: '30px', textAlign: 'center', borderRadius: '10px', background: isPaused ? '#28a745' : '#dc3545', color: '#fff' }}
              >
            {isPaused ? 'Start' : 'Stop'}
          </button>
            {!isPaused && (
                <button onClick={skip} style={{ width: '70px',padding: '0px', fontSize: '13px', height: '30px', textAlign: 'center', borderRadius: '10px', background: '#8F47FF', color: '#fff', }}>
                Skip
              </button>
            )}
        </div>
      </div>
      {/* <p>{JSON.stringify(availableCameras)} cams {currentCameraIndex}</p> */}
      
      <div className="video-container">
        <div className="video-wrapper">
          <video ref={localVideo} autoPlay playsInline  muted className="video" />
          
          {availableCameras.length > 1 && (
              <button
              
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                // background: '#6C63FF',
                border: 'none',
                borderRadius: '50%',
                padding: '3px', /* Reduced padding for smaller size */
                color: 'white',
                // cursor: 'pointer',
                boxShadow: '0 4px 4px rgba(0, 0, 0, 0.2)',
              }}
            >
              <CameraswitchIcon onClick={switchCamera} style={{ fontSize: '14px', 
                backgroundColor: '#6C63FF', 
                padding: '7px', 
                borderRadius: '50%',
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                cursor: 'pointer',
                }} /> {/* Reduced icon size */}
            </button>
          )}

        </div>
        <div className="video-wrapper">
          {partnerId ? (
            <video ref={remoteVideo} autoPlay playsInline  className="video" />
          ) : (
            <div className="loader"><CircularProgress color='#8F47FF' /></div>
          )}
        </div>
      </div>

      <div className="container">
        <div className="button-container">
          <button onClick={toggleMic} className="icon-button">
            {micOn ? <MicIcon className="icon" /> : <MicOffIcon className="icon" />}
          </button>
          <button onClick={toggleVideo} className="icon-button">
            {videoOn ? <VideocamIcon className="icon" /> : <VideocamOffIcon className="icon" />}
          </button>
        </div>
        <div className="dummy-div">
          {/* Dummy content */}
        </div>
      </div>
{/* 
      <div style={{ marginTop: '1rem' }}>
          {partnerId ? (
            <>
              <p>you {socketId} Currently connected with partner: {partnerId} ({role})</p>
              
            </>
          ) : (
            <p>you {socketId} Waiting for a partner to match ...</p>
          )}
        </div>      */}
    </div>
  );
}
