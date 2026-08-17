"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { NumberField, NumberFieldInput } from "@/components/ui/number-field";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useAudioFeedback } from "@/hooks/use-audio-feedback";
import { DELAY_STEP_MS, MAX_DELAY_MS } from "@/lib/audio-session";

export function AudioFeedback() {
  const {
    form,
    inputId,
    inputOptions,
    pause,
    phase,
    refreshInputs,
    selectInput,
    start,
    toggleMute,
  } = useAudioFeedback();
  const isRecording = phase.kind === "active";
  const isMuted = isRecording && phase.muted;

  return (
    <Form className="flex flex-col gap-6" onSubmit={(event) => event.preventDefault()}>
      <div className="flex flex-col gap-6">
        <form.Field name="inputId">
          {(field) => (
            <Field className="flex-row items-center justify-between gap-4">
              <FieldLabel className="shrink-0 text-muted-foreground">Input</FieldLabel>
              <Select
                items={inputOptions}
                name={field.name}
                onOpenChange={(open) => {
                  if (open) {
                    refreshInputs();
                  }
                }}
                onValueChange={(value) => {
                  if (value !== null) {
                    selectInput(value);
                  }
                }}
                value={inputId}
              >
                <SelectTrigger
                  aria-label="Audio input device"
                  className="min-h-10 w-[70%] min-w-0 justify-end gap-1 border-transparent bg-transparent p-0 text-right text-muted-foreground shadow-none ring-0 before:hidden hover:text-foreground focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 sm:min-h-10 dark:bg-transparent"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup alignItemWithTrigger={false} sideOffset={6}>
                  {inputOptions.map((option) => (
                    <SelectItem key={option.value} title={option.label} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </Field>
          )}
        </form.Field>

        <form.Field name="delay">
          {(field) => (
            <div className="flex flex-col items-start gap-3">
              <div className="flex w-full items-center justify-between gap-4">
                <Label className="text-muted-foreground" htmlFor="delay-value" id="delay-label">
                  Delay
                </Label>
                <NumberField
                  aria-labelledby="delay-label"
                  className="w-24 items-stretch gap-0"
                  format={{
                    style: "unit",
                    unit: "millisecond",
                    unitDisplay: "short",
                  }}
                  max={MAX_DELAY_MS}
                  min={0}
                  id="delay-value"
                  name={field.name}
                  onValueChange={(value) => field.handleChange(value ?? 0)}
                  size="sm"
                  step={DELAY_STEP_MS}
                  value={field.state.value}
                >
                  <NumberFieldInput
                    className="h-10 rounded-sm p-0 text-right text-base text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 sm:h-10 sm:text-sm"
                    onBlur={field.handleBlur}
                  />
                </NumberField>
              </div>
              <Slider
                aria-keyshortcuts="ArrowLeft ArrowRight"
                aria-labelledby="delay-label"
                format={{ style: "unit", unit: "millisecond" }}
                max={MAX_DELAY_MS}
                min={0}
                onValueChange={field.handleChange}
                step={DELAY_STEP_MS}
                value={field.state.value}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="volume">
          {(field) => (
            <div className="flex flex-col items-start gap-3">
              <div className="flex w-full items-center justify-between gap-4">
                <Label className="text-muted-foreground" htmlFor="volume-value" id="volume-label">
                  Volume
                </Label>
                <NumberField
                  aria-labelledby="volume-label"
                  className="w-20 items-stretch gap-0"
                  format={{
                    style: "unit",
                    unit: "percent",
                    unitDisplay: "short",
                  }}
                  max={100}
                  min={0}
                  id="volume-value"
                  name={field.name}
                  onValueChange={(value) => field.handleChange(value ?? 0)}
                  size="sm"
                  value={field.state.value}
                >
                  <NumberFieldInput
                    className="h-10 rounded-sm p-0 text-right text-base text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 sm:h-10 sm:text-sm"
                    onBlur={field.handleBlur}
                  />
                </NumberField>
              </div>
              <Slider
                aria-labelledby="volume-label"
                format={{ style: "unit", unit: "percent" }}
                max={100}
                min={0}
                onValueChange={field.handleChange}
                value={field.state.value}
              />
            </div>
          )}
        </form.Field>
      </div>

      <Button
        aria-disabled={phase.kind === "checking" || phase.kind === "unsupported"}
        aria-keyshortcuts="Space"
        className="h-10 w-full transition-[transform,box-shadow] duration-[160ms] ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[.985] active:duration-[100ms] active:ease-[cubic-bezier(0.2,0,0,1)] aria-disabled:pointer-events-none aria-disabled:opacity-64 motion-reduce:transition-shadow motion-reduce:active:scale-100"
        loading={phase.kind === "starting"}
        onClick={isRecording ? pause : start}
        type="button"
        variant="outline"
      >
        {isRecording ? "Pause" : "Start"}
      </Button>

      <fieldset className="flex flex-wrap gap-x-3 gap-y-2 text-muted-foreground text-xs">
        <legend className="sr-only">Keyboard shortcuts</legend>
        <span className="inline-flex items-center gap-1.5">
          <Kbd>Space</Kbd>
          Start / pause
        </span>
        <span className="inline-flex items-center gap-1.5">
          <KbdGroup>
            <Kbd>
              <ArrowLeftIcon aria-hidden="true" />
              <span className="sr-only">Left arrow</span>
            </Kbd>
            <Kbd>
              <ArrowRightIcon aria-hidden="true" />
              <span className="sr-only">Right arrow</span>
            </Kbd>
          </KbdGroup>
          Delay
        </span>
        <Button
          aria-disabled={!isRecording}
          aria-keyshortcuts="M"
          aria-label={isMuted ? "Unmute feedback" : "Mute feedback"}
          aria-pressed={isMuted}
          className="h-auto gap-1.5 border-0 p-0 text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground aria-disabled:pointer-events-none aria-disabled:opacity-50"
          onClick={toggleMute}
          type="button"
          variant="ghost"
        >
          <Kbd className={isMuted ? "bg-foreground text-background" : ""}>M</Kbd>
          {isMuted ? "Unmute" : "Mute"}
        </Button>
      </fieldset>
    </Form>
  );
}
