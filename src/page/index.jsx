import React, { useEffect, useRef } from 'react';

const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }, 
    ],
  };

function Video() {
    const [localStream, setLocalStream] = useState(null);
    const videoRef = useRef(null);
    const remoteVideoElem = useRef(null);


    const makeCall = async () => {
        const peerConnection = new RTCPeerConnection(configuration);
       
        localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
        });

        peerConnection.ontrack = (event) => {
        remoteVideoElem.srcObject = event.streams[0];
        };

        // When local ICE candidate is found, send it to remote via signaling
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
            signalingSocket.emit('signal', {
                type: 'candidate',
                candidate: event.candidate,
                to: remotePeerId,
            });
            }
        };
        
        // When receiving a candidate from remote
        if (message.type === 'candidate') {
            peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
        }
        
    }

  useEffect(() => {
    // Define an async function inside useEffect
    const getUserMediaStream = async () => {
      try {
        // Request video/audio permissions
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        console.log('Got MediaStream:', stream);

        // If our video element is still mounted, set its source
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing media devices.', error);
      }
    };

    getUserMediaStream();
  }, []);

  return (
    <div>
      <video ref={videoRef} autoPlay height={200} />
      <video ref={remoteVideoElem} autoPlay height={200} />
      Hello
    </div>
  );
}

export default Video;
