"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldValues, type DefaultValues, type Path } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

// Field metadata — attach to any Zod schema via .describe()
// Format: "label|type|placeholder|options"
// type: text | number | textarea | checkbox | multicheck
// e.g. z.string().describe("Schedule Cron|text|0 * * * *")
// e.g. z.array(...).describe("Sources|multicheck|newsapi,cryptopanic,finnhub")

interface FieldMeta {
  label: string;
  type: "text" | "number" | "textarea" | "checkbox" | "multicheck";
  placeholder?: string;
  options?: string[];
}

function parseMeta(description: string | undefined, key: string): FieldMeta {
  if (!description) {
    return { label: key.replace(/_/g, " "), type: "text" };
  }
  const [label, type, placeholder, optionsStr] = description.split("|");
  return {
    label: label ?? key,
    type: (type as FieldMeta["type"]) ?? "text",
    placeholder,
    options: optionsStr ? optionsStr.split(",") : undefined,
  };
}

interface SchemaFormProps<T extends FieldValues> {
  schema: z.ZodObject<z.ZodRawShape>;
  defaultValues?: DefaultValues<T>;
  onSubmit: (values: T) => void | Promise<void>;
  submitLabel?: string;
  isSubmitting?: boolean;
  fieldOrder?: string[];
}

export function SchemaForm<T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  submitLabel = "Save",
  isSubmitting = false,
  fieldOrder,
}: SchemaFormProps<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const shape = schema.shape as Record<string, z.ZodTypeAny>;
  const keys = fieldOrder ?? Object.keys(shape);

  function renderField(key: string) {
    const fieldSchema = shape[key];
    if (!fieldSchema) return null;

    const inner = unwrap(fieldSchema);
    const meta = parseMeta(inner.description, key);
    const error = form.formState.errors[key]?.message as string | undefined;

    return (
      <div key={key} className="flex flex-col gap-1.5">
        <Label htmlFor={key} className="text-sm font-medium capitalize">
          {meta.label}
          {isOptional(fieldSchema) && (
            <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
          )}
        </Label>

        {meta.type === "textarea" ? (
          <Textarea
            id={key}
            placeholder={meta.placeholder}
            {...form.register(key as Path<T>)}
            className="font-mono text-sm"
          />
        ) : meta.type === "multicheck" && meta.options ? (
          <div className="flex flex-wrap gap-3">
            {meta.options.map((opt) => (
              <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  value={opt}
                  {...form.register(key as Path<T>)}
                  className="rounded"
                />
                {opt}
              </label>
            ))}
          </div>
        ) : meta.type === "checkbox" ? (
          <input
            id={key}
            type="checkbox"
            {...form.register(key as Path<T>)}
            className="h-4 w-4 rounded"
          />
        ) : (
          <Input
            id={key}
            type={meta.type === "number" ? "number" : "text"}
            placeholder={meta.placeholder}
            step={meta.type === "number" ? "0.01" : undefined}
            {...form.register(key as Path<T>)}
          />
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {keys.map((key) => renderField(key))}
      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}

function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof (z as any).ZodOptional || schema instanceof (z as any).ZodDefault) {
    return unwrap(schema._def.innerType as z.ZodTypeAny);
  }
  return schema;
}

function isOptional(schema: z.ZodTypeAny): boolean {
  return schema instanceof (z as any).ZodOptional;
}
