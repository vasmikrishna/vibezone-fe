import React, { useEffect, useRef, useState } from 'react';

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


export default function App() {
  const wsRef = useRef(null);
  const pcRef = useRef(null);

  const [partnerId, setPartnerId] = useState(null);
  const [role, setRole] = useState(null); // 'caller' or 'callee'
  const [localStream, setLocalStream] = useState(null);
  const [socketId, setSocketId] = useState(null);

  const localVideo = useRef(null);
  const remoteVideo = useRef(null);


  useEffect(() => {
    // 1. Connect to signaling server
    // IMPORTANT: Use "ws://localhost:3001", not "http://"
    wsRef.current = new WebSocket('http://localhost:3001/');
    // wsRef.current = new WebSocket('http://3.110.148.74:3001/');


    wsRef.current.onopen = () => {
      setSocketId(wsRef.current.socketId);
      console.log('Connected to signaling server',wsRef.current );
    };

    wsRef.current.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      console.log('WS message: =>', data);

      switch (data.type) {
        case 'matched':
          // We have a partner now
          setPartnerId(data.partnerId);
          setRole(data.role);
          console.log(`Matched with ${data.partnerId}, I am the ${data.role}`);
          // Initialize PeerConnection
          initPeerConnection(data.partnerId);
          // If I'm caller, immediately create offer
          if (data.role === 'caller') {
            console.log('Creating offer...');
            createOffer(data.partnerId);
          }
          break;

        case 'offer':
          // We are the callee, automatically handle the offer
          console.log('Received offer from:', data.from);
          handleOffer(data.offer, data.from);
          break;

        case 'answer':
          // We are the caller
          console.log('Received answer from:', data.from);
          handleAnswer(data.answer);
          break;

        case 'candidate':
          console.log('Received candidate from:', data.from);
          handleCandidate(data.candidate);
          break;

        case 'hangup':
          console.log('Received hangup from:', data.from);
          endCall();
          break;
      }
    };

    wsRef.current.onerror = (err) => {
      console.error('WebSocket error:', err);
    };

    wsRef.current.onclose = () => {
      console.log('Disconnected from signaling server');
    };

    return () => {
      console.log('Disconnecting...');
      wsRef.current.close();
    };
  }, [localStream]);

  // 2. Get local media once on mount
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
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
    wsRef.current.send(JSON.stringify({ type: 'skip' }));
    endCall();
  }

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}> 
        <div> 
          <h2>VibeZone</h2> 
          <p>
            This is the place where you can find your vibe. 
          </p>
          <p>
            my socketId is: {socketId}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginRight: '4rem' }}>
        <button onClick={skip} style={{ width: '100px', height: '50px', textAlign: 'center', borderRadius: '10px', background: '#000', color: '#fff'   }}>Skip</button>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'space-between' }}>
        <video
          ref={localVideo}
          autoPlay
          muted
          style={{ width: '45%', background: '#000' }}
        />
        <video
          ref={remoteVideo}
          autoPlay
          style={{ width: '45%', background: '#000' }}
        />
       
      </div>
      <div style={{ marginTop: '1rem' }}>
          {partnerId ? (
            <>
              <p>Currently connected with partner: {partnerId} ({role})</p>
              
            </>
          ) : (
            <p>Waiting for a partner to match...</p>
          )}
        </div>

     
    </div>
  );
}
