import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

export interface SpeechClientOptions {
  token: string;
  region: string;
  language: string; // e.g. 'en-US', 'de-CH'
  voice: string; // e.g. 'en-US-JennyNeural'
}

export interface SpeechClient {
  recognizeOnce: () => Promise<string>;
  speak: (text: string) => Promise<void>;
}

/**
 * Thin wrapper over Azure AI Speech STT/TTS. Audio is handled in-country
 * (Switzerland North) using a short-lived authorization token from the broker
 * — no key in the browser, no third-party audio path.
 */
export function createSpeechClient(options: SpeechClientOptions): SpeechClient {
  const config = sdk.SpeechConfig.fromAuthorizationToken(options.token, options.region);
  config.speechRecognitionLanguage = options.language;
  config.speechSynthesisVoiceName = options.voice;

  return {
    recognizeOnce: () =>
      new Promise<string>((resolve, reject) => {
        const recognizer = new sdk.SpeechRecognizer(config, sdk.AudioConfig.fromDefaultMicrophoneInput());
        recognizer.recognizeOnceAsync(
          (result) => { recognizer.close(); resolve(result.text ?? ''); },
          (err) => { recognizer.close(); reject(new Error(String(err))); },
        );
      }),
    speak: (text: string) =>
      new Promise<void>((resolve, reject) => {
        const synth = new sdk.SpeechSynthesizer(config, sdk.AudioConfig.fromDefaultSpeakerOutput());
        synth.speakTextAsync(
          text,
          () => { synth.close(); resolve(); },
          (err) => { synth.close(); reject(new Error(String(err))); },
        );
      }),
  };
}
