"use client";

import { useForm, useSelector } from "@tanstack/react-form";
import { useHotkeys } from "@tanstack/react-hotkeys";
import { Cause, Effect, Exit } from "effect";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type AudioInputOption,
  type AudioSession,
  createAudioSession,
  DEFAULT_DELAY_MS,
  DEFAULT_INPUT_ID,
  DEFAULT_VOLUME_PERCENT,
  DELAY_STEP_MS,
  getBrowserAudioDependencies,
  isBrowserAudioSupported,
  listBrowserAudioInputs,
  MAX_DELAY_MS,
} from "@/lib/audio-session";

const SHORTCUT_BLOCKERS =
  'button, input, textarea, select, summary, a[href], [role="slider"], [contenteditable]:not([contenteditable="false"])';
const DEFAULT_INPUT_OPTIONS: readonly AudioInputOption[] = [
  { label: "System default", value: DEFAULT_INPUT_ID },
];

export type AudioPhase =
  | { kind: "checking" }
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "active"; muted: boolean }
  | { kind: "paused" }
  | { kind: "unsupported" }
  | { kind: "error" };

type PendingRequest = { cancel: () => void };

function runShortcut(event: KeyboardEvent, action: () => void): void {
  const target = event.target;
  if (target instanceof Element && target.closest(SHORTCUT_BLOCKERS)) {
    return;
  }

  event.preventDefault();
  action();
}

function close(session: AudioSession): void {
  Effect.runFork(session.close);
}

function loadAudioInputs(onLoaded: (options: readonly AudioInputOption[]) => void): () => void {
  return Effect.runCallback(listBrowserAudioInputs(), {
    onExit: (exit) => {
      if (Exit.isSuccess(exit)) {
        onLoaded(exit.value);
      }
    },
  });
}

export function useAudioFeedback() {
  const form = useForm({
    defaultValues: {
      delay: DEFAULT_DELAY_MS,
      inputId: DEFAULT_INPUT_ID,
      volume: DEFAULT_VOLUME_PERCENT,
    },
  });
  const delay = useSelector(form.store, (state) => state.values.delay);
  const inputId = useSelector(form.store, (state) => state.values.inputId);
  const volume = useSelector(form.store, (state) => state.values.volume);
  const [inputOptions, setInputOptions] =
    useState<readonly AudioInputOption[]>(DEFAULT_INPUT_OPTIONS);
  const [phase, setPhase] = useState<AudioPhase>({ kind: "checking" });
  const inputRequest = useRef<(() => void) | null>(null);
  const request = useRef<PendingRequest | null>(null);
  const session = useRef<AudioSession | null>(null);

  const refreshInputs = useCallback((): void => {
    inputRequest.current?.();
    inputRequest.current = loadAudioInputs(setInputOptions);
  }, []);

  const stopSession = useCallback((): void => {
    request.current?.cancel();
    request.current = null;

    const activeSession = session.current;
    session.current = null;
    if (activeSession) {
      close(activeSession);
    }
  }, []);

  useEffect(() => {
    setPhase(isBrowserAudioSupported() ? { kind: "idle" } : { kind: "unsupported" });
  }, []);

  useEffect(() => {
    if (!isBrowserAudioSupported()) {
      return;
    }

    refreshInputs();
    navigator.mediaDevices.addEventListener("devicechange", refreshInputs);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", refreshInputs);
      inputRequest.current?.();
      inputRequest.current = null;
    };
  }, [refreshInputs]);

  useEffect(() => {
    session.current?.update({
      delayMs: delay,
      muted: phase.kind === "active" && phase.muted,
      volumePercent: volume,
    });
  }, [delay, phase, volume]);

  useEffect(
    () => () => {
      stopSession();
    },
    [stopSession],
  );

  function beginSession(nextInputId: string, muted: boolean): void {
    const pending: PendingRequest = { cancel: () => undefined };
    request.current = pending;
    setPhase({ kind: "starting" });

    pending.cancel = Effect.runCallback(
      createAudioSession({
        dependencies: getBrowserAudioDependencies(),
        inputId: nextInputId,
        settings: {
          delayMs: delay,
          muted,
          volumePercent: volume,
        },
      }),
      {
        onExit: (exit) => {
          if (request.current !== pending) {
            if (Exit.isSuccess(exit)) {
              close(exit.value);
            }
            return;
          }

          request.current = null;

          if (Exit.isSuccess(exit)) {
            session.current = exit.value;
            setPhase({ kind: "active", muted });
            refreshInputs();
            return;
          }

          if (Cause.isInterruptedOnly(exit.cause)) {
            return;
          }

          setPhase({ kind: "error" });
        },
      },
    );
  }

  function start(): void {
    if (
      phase.kind === "checking" ||
      phase.kind === "starting" ||
      phase.kind === "active" ||
      phase.kind === "unsupported" ||
      session.current
    ) {
      return;
    }

    beginSession(inputId, false);
  }

  function pause(): void {
    stopSession();
    setPhase({ kind: "paused" });
  }

  function togglePlayback(): void {
    if (phase.kind === "active" || phase.kind === "starting") {
      pause();
    } else {
      start();
    }
  }

  function adjustDelay(change: number): void {
    form.setFieldValue("delay", (currentDelay) =>
      Math.min(MAX_DELAY_MS, Math.max(0, currentDelay + change)),
    );
  }

  function selectInput(nextInputId: string): void {
    if (nextInputId === inputId) {
      return;
    }

    form.setFieldValue("inputId", nextInputId);
    if (phase.kind === "active" || phase.kind === "starting") {
      const muted = phase.kind === "active" && phase.muted;
      stopSession();
      beginSession(nextInputId, muted);
    }
  }

  function toggleMute(): void {
    setPhase((currentPhase) =>
      currentPhase.kind === "active"
        ? { kind: "active", muted: !currentPhase.muted }
        : currentPhase,
    );
  }

  useHotkeys(
    [
      {
        hotkey: "Space",
        callback: (event) => runShortcut(event, togglePlayback),
        options: {
          enabled: phase.kind !== "checking" && phase.kind !== "unsupported",
          requireReset: true,
        },
      },
      {
        hotkey: "ArrowLeft",
        callback: (event) => runShortcut(event, () => adjustDelay(-DELAY_STEP_MS)),
      },
      {
        hotkey: "ArrowRight",
        callback: (event) => runShortcut(event, () => adjustDelay(DELAY_STEP_MS)),
      },
      {
        hotkey: "M",
        callback: (event) => runShortcut(event, toggleMute),
        options: { enabled: phase.kind === "active" },
      },
    ],
    {
      ignoreInputs: true,
      preventDefault: false,
      stopPropagation: false,
    },
  );

  return {
    delay,
    form,
    inputId,
    inputOptions,
    pause,
    phase,
    refreshInputs,
    selectInput,
    start,
    toggleMute,
    volume,
  };
}
