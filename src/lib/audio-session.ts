import { Data, Effect } from "effect";

export const DEFAULT_DELAY_MS = 175;
export const DEFAULT_INPUT_ID = "";
export const DEFAULT_VOLUME_PERCENT = 50;
export const DELAY_STEP_MS = 25;
export const MAX_DELAY_MS = 2000;

export type AudioInputOption = Readonly<{
  label: string;
  value: string;
}>;

export type AudioSettings = Readonly<{
  delayMs: number;
  muted: boolean;
  volumePercent: number;
}>;

export type AudioSession = {
  close: Effect.Effect<void>;
  update: (settings: AudioSettings) => void;
};

export type AudioDependencies<Stream> = {
  createSession: (
    stream: Stream,
    settings: AudioSettings,
    signal: AbortSignal,
  ) => Promise<AudioSession>;
  getUserMedia: (inputId: string) => Promise<Stream>;
  releaseStream: (stream: Stream) => void;
};

export class AudioSessionError extends Data.TaggedError("AudioSessionError")<{
  cause: unknown;
  message: string;
}> {}

function toAudioError(cause: unknown): AudioSessionError {
  let message = "Could not start audio. Check your microphone and try again.";

  if (cause instanceof DOMException && cause.name === "NotAllowedError") {
    message = "Microphone access is off. Allow it in your browser, then try again.";
  } else if (cause instanceof DOMException && cause.name === "NotFoundError") {
    message = "No microphone was found.";
  } else if (cause instanceof DOMException && cause.name === "OverconstrainedError") {
    message = "That microphone is no longer available.";
  }

  return new AudioSessionError({ cause, message });
}

function interruptiblePromise<Value>({
  run,
  onLateSuccess,
}: {
  run: (signal: AbortSignal) => Promise<Value>;
  onLateSuccess: (value: Value) => Promise<void> | void;
}): Effect.Effect<Value, AudioSessionError> {
  return Effect.tryPromise({
    try: (signal) =>
      run(signal).then(async (value) => {
        if (signal.aborted) {
          await onLateSuccess(value);
        }
        return value;
      }),
    catch: toAudioError,
  });
}

export function createAudioSession<Stream>({
  dependencies,
  inputId,
  settings,
}: {
  dependencies: AudioDependencies<Stream>;
  inputId: string;
  settings: AudioSettings;
}): Effect.Effect<AudioSession, AudioSessionError> {
  return Effect.gen(function* () {
    const stream = yield* interruptiblePromise({
      run: () => dependencies.getUserMedia(inputId),
      onLateSuccess: (lateStream) => dependencies.releaseStream(lateStream),
    });

    return yield* interruptiblePromise({
      run: (signal) => dependencies.createSession(stream, settings, signal),
      onLateSuccess: (lateSession) => Effect.runPromise(lateSession.close),
    }).pipe(Effect.onError(() => Effect.sync(() => dependencies.releaseStream(stream))));
  });
}

function releaseMediaStream(stream: MediaStream): void {
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

function closeAudioContext(context: AudioContext): Promise<void> {
  return context.state === "closed" ? Promise.resolve() : context.close().catch(() => undefined);
}

function createBrowserSession(
  stream: MediaStream,
  settings: AudioSettings,
  signal: AbortSignal,
): Promise<AudioSession> {
  const context = new AudioContext({ latencyHint: "interactive" });
  const closeContext = (): void => {
    void closeAudioContext(context);
  };

  signal.addEventListener("abort", closeContext, { once: true });

  const ready = context.state === "suspended" ? context.resume() : Promise.resolve();

  return ready
    .then(() => {
      signal.throwIfAborted();

      const source = context.createMediaStreamSource(stream);
      const delay = context.createDelay(MAX_DELAY_MS / 1000);
      const gain = context.createGain();
      let closed = false;

      delay.delayTime.value = settings.delayMs / 1000;
      gain.gain.value = settings.muted ? 0 : settings.volumePercent / 100;
      source.connect(delay).connect(gain).connect(context.destination);

      return {
        close: Effect.promise(() => {
          if (closed) {
            return Promise.resolve();
          }

          closed = true;
          releaseMediaStream(stream);
          return closeAudioContext(context);
        }),
        update(nextSettings): void {
          if (closed) {
            return;
          }

          delay.delayTime.setTargetAtTime(nextSettings.delayMs / 1000, context.currentTime, 0.01);
          gain.gain.setTargetAtTime(
            nextSettings.muted ? 0 : nextSettings.volumePercent / 100,
            context.currentTime,
            0.01,
          );
        },
      } satisfies AudioSession;
    })
    .catch((error: unknown) => closeAudioContext(context).then(() => Promise.reject(error)))
    .finally(() => signal.removeEventListener("abort", closeContext));
}

export function getBrowserAudioDependencies(): AudioDependencies<MediaStream> {
  return {
    createSession: createBrowserSession,
    getUserMedia: (inputId) =>
      navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: false,
          ...(inputId ? { deviceId: { exact: inputId } } : {}),
          echoCancellation: false,
          noiseSuppression: false,
        },
      }),
    releaseStream: releaseMediaStream,
  };
}

export function listBrowserAudioInputs(): Effect.Effect<
  readonly AudioInputOption[],
  AudioSessionError
> {
  return Effect.tryPromise({
    try: () => navigator.mediaDevices.enumerateDevices(),
    catch: toAudioError,
  }).pipe(
    Effect.map((devices) => {
      const inputs: AudioInputOption[] = [{ label: "System default", value: DEFAULT_INPUT_ID }];
      let unnamedInput = 0;

      for (const device of devices) {
        if (device.kind !== "audioinput" || !device.deviceId) {
          continue;
        }

        unnamedInput += 1;
        inputs.push({
          label: device.label || `Microphone ${unnamedInput}`,
          value: device.deviceId,
        });
      }

      return inputs;
    }),
  );
}

export function isBrowserAudioSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "AudioContext" in window &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}
