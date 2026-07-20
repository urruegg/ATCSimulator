import { describe, expect, it, vi } from 'vitest';
import { createSpeechClient } from '../speechClient';

vi.mock('microsoft-cognitiveservices-speech-sdk', () => ({
  SpeechConfig: { fromAuthorizationToken: vi.fn(() => ({ speechRecognitionLanguage: '', speechSynthesisVoiceName: '' })) },
  AudioConfig: { fromDefaultMicrophoneInput: vi.fn(() => ({})), fromDefaultSpeakerOutput: vi.fn(() => ({})) },
  SpeechRecognizer: vi.fn(() => ({ recognizeOnceAsync: (cb: (r: unknown) => void) => cb({ text: 'heading 290' }), close: vi.fn() })),
  SpeechSynthesizer: vi.fn(() => ({ speakTextAsync: (_t: string, cb: () => void) => cb(), close: vi.fn() })),
  ResultReason: { RecognizedSpeech: 3 },
}));

describe('speechClient', () => {
  it('recognizes a single utterance', async () => {
    const client = createSpeechClient({ token: 't', region: 'switzerlandnorth', language: 'en-US', voice: 'en-US-JennyNeural' });
    const text = await client.recognizeOnce();
    expect(text).toBe('heading 290');
  });
});
