"use client";

import { useState, type ComponentProps } from "react";

import { Input } from "@/components/ui/input";

const COMPLETE_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const LOOSE_TIME = /^([01]?\d|2[0-3]):([0-5]?\d)$/;

type TimePickerProps = {
  /** `HH:mm`, the same value a native time input holds; `""` when empty or incomplete. */
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
} & Omit<ComponentProps<typeof Input>, "value" | "defaultValue" | "onChange" | "type">;

/** Typed 24-hour time: digits get their colon, a short entry is padded on blur. */
function formatTyping(raw: string) {
  const cleaned = raw.replace(/[^\d:]/g, "");
  if (cleaned.includes(":")) return cleaned.slice(0, 5);
  return cleaned.length > 2 ? `${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)}` : cleaned;
}

function padTime(text: string) {
  const match = LOOSE_TIME.exec(text);
  return match ? `${match[1].padStart(2, "0")}:${match[2].padStart(2, "0")}` : text;
}

function TimePicker({ value, onChange, invalid, onBlur, ...props }: TimePickerProps) {
  const [text, setText] = useState(value);
  const [formValue, setFormValue] = useState(value);
  const [touched, setTouched] = useState(false);

  // A value changed by the form (reset, load) replaces the text; one we emitted ourselves does not.
  if (value !== formValue) {
    setFormValue(value);
    if (value !== (COMPLETE_TIME.test(text) ? text : "")) setText(value);
  }

  const incomplete = text !== "" && !COMPLETE_TIME.test(text);
  const showInvalid = invalid || (incomplete && (touched || text.length >= 5));

  function commit(next: string) {
    setText(next);
    const emitted = COMPLETE_TIME.test(next) ? next : "";
    setFormValue(emitted);
    if (emitted !== value) onChange(emitted);
  }

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="hh:mm"
      maxLength={5}
      value={text}
      aria-invalid={showInvalid || undefined}
      data-slot="time-picker"
      onChange={(event) => commit(formatTyping(event.target.value))}
      onBlur={(event) => {
        setTouched(true);
        commit(padTime(text));
        onBlur?.(event);
      }}
    />
  );
}

export { TimePicker };
export type { TimePickerProps };
