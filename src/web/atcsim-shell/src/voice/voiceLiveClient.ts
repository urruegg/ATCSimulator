export async function requestSdpAnswer(brokerBaseUrl: string, sdpOffer: string): Promise<string> {
  const res = await fetch(`${brokerBaseUrl}/api/voice/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sdpOffer }),
  });
  if (!res.ok) {
    throw new Error(`SDP relay failed: ${res.status}`);
  }
  const data = (await res.json()) as { sdpAnswer: string };
  return data.sdpAnswer;
}

export interface VoiceSession {
  stop: () => void;
}

export async function startVoiceSession(brokerBaseUrl: string): Promise<VoiceSession> {
  const pc = new RTCPeerConnection();

  const audio = document.createElement('audio');
  audio.autoplay = true;
  document.body.appendChild(audio);
  pc.ontrack = (e) => { audio.srcObject = e.streams[0]; };

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((t) => pc.addTrack(t, stream));

  // Data channel: VAD + transcripts (forwarded to the broker for audit).
  const dc = pc.createDataChannel('voice-live-events');
  dc.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === 'response.audio_transcript.done' || msg.type?.includes('transcription')) {
        void fetch(`${brokerBaseUrl}/api/voice/transcript`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'agent', text: '', timestampMs: Date.now() }),
        });
      }
    } catch { /* ignore non-JSON */ }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await new Promise<void>((resolve) => {
    if (pc.iceGatheringState === 'complete') resolve();
    else {
      pc.addEventListener('icegatheringstatechange', () => {
        if (pc.iceGatheringState === 'complete') resolve();
      });
      setTimeout(resolve, 3000);
    }
  });

  const answer = await requestSdpAnswer(brokerBaseUrl, pc.localDescription!.sdp);
  await pc.setRemoteDescription({ type: 'answer', sdp: answer });

  return {
    stop: () => {
      stream.getTracks().forEach((t) => t.stop());
      pc.close();
      audio.remove();
    },
  };
}
