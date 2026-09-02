"use client";

import { useForm } from "@tanstack/react-form";
import { CompletionSchema, INITIAL_VALUES, type CompletionValues } from "./model";

export function useCompletionForm(onSubmit: (values: CompletionValues) => Promise<void>) {
  return useForm({
    defaultValues: INITIAL_VALUES,
    validators: { onSubmit: CompletionSchema },
    onSubmit: async ({ value }) => onSubmit(value),
  });
}

export type CompletionForm = ReturnType<typeof useCompletionForm>;
