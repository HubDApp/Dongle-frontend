"use client";

/**
 * Drag-and-drop validation rule builder UI (Issue #544).
 * No code required — users compose rules visually, preview them, and
 * export/import Zod schemas.
 */

import React, { useCallback, useMemo, useState } from "react";
import { GripVertical, Plus, Trash2, Eye, Download, Upload, Code2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  RULE_OPERATOR_META,
  createEmptyDocument,
  createFieldRuleSet,
  createRule,
  exportDocumentJson,
  exportToZodSchema,
  importDocumentJson,
  importFromZodSchema,
  operatorsForType,
  previewValidation,
  reorderRules,
  touchDocument,
  type FieldRuleSet,
  type FieldValueType,
  type RuleBuilderDocument,
  type RuleOperator,
  type ValidationRule,
} from "@/services/validation-rule-builder";

export interface ValidationRuleBuilderProps {
  initialDocument?: RuleBuilderDocument;
  onChange?: (doc: RuleBuilderDocument) => void;
  className?: string;
}

export function ValidationRuleBuilder({
  initialDocument,
  onChange,
  className = "",
}: ValidationRuleBuilderProps) {
  const [doc, setDoc] = useState<RuleBuilderDocument>(
    () => initialDocument ?? createEmptyDocument("Form rules"),
  );
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});
  const [exportCode, setExportCode] = useState("");
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    fieldIndex: number;
    ruleIndex: number;
  } | null>(null);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<FieldValueType>("string");

  const updateDoc = useCallback(
    (updater: (current: RuleBuilderDocument) => RuleBuilderDocument) => {
      setDoc((current) => {
        const next = touchDocument(updater(current));
        onChange?.(next);
        return next;
      });
    },
    [onChange],
  );

  const preview = useMemo(
    () => previewValidation(doc.fields, previewValues),
    [doc.fields, previewValues],
  );

  const addField = () => {
    const name = newFieldName.trim().replace(/\s+/g, "_");
    if (!name) return;
    if (doc.fields.some((f) => f.fieldName === name)) {
      setImportError(`Field "${name}" already exists`);
      return;
    }
    setImportError(null);
    updateDoc((current) => ({
      ...current,
      fields: [...current.fields, createFieldRuleSet(name, newFieldType)],
    }));
    setNewFieldName("");
  };

  const removeField = (fieldIndex: number) => {
    updateDoc((current) => ({
      ...current,
      fields: current.fields.filter((_, i) => i !== fieldIndex),
    }));
  };

  const updateFieldRules = (
    fieldIndex: number,
    rules: ValidationRule[],
  ) => {
    updateDoc((current) => {
      const fields = current.fields.map((field, i) =>
        i === fieldIndex ? { ...field, rules } : field,
      );
      return { ...current, fields };
    });
  };

  const addRule = (fieldIndex: number, operator: RuleOperator) => {
    const field = doc.fields[fieldIndex];
    updateFieldRules(fieldIndex, [...field.rules, createRule(operator)]);
  };

  const updateRule = (
    fieldIndex: number,
    ruleIndex: number,
    patch: Partial<ValidationRule>,
  ) => {
    const field = doc.fields[fieldIndex];
    const rules = field.rules.map((rule, i) =>
      i === ruleIndex ? { ...rule, ...patch } : rule,
    );
    updateFieldRules(fieldIndex, rules);
  };

  const removeRule = (fieldIndex: number, ruleIndex: number) => {
    const field = doc.fields[fieldIndex];
    updateFieldRules(
      fieldIndex,
      field.rules.filter((_, i) => i !== ruleIndex),
    );
  };

  const onDragStart = (fieldIndex: number, ruleIndex: number) => {
    setDragState({ fieldIndex, ruleIndex });
  };

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const onDrop = (fieldIndex: number, toIndex: number) => {
    if (!dragState || dragState.fieldIndex !== fieldIndex) {
      setDragState(null);
      return;
    }
    const field = doc.fields[fieldIndex];
    updateFieldRules(
      fieldIndex,
      reorderRules(field.rules, dragState.ruleIndex, toIndex),
    );
    setDragState(null);
  };

  const handleExportZod = () => {
    const result = exportToZodSchema(doc);
    setExportCode(result.code);
  };

  const handleExportJson = async () => {
    const json = exportDocumentJson(doc);
    setExportCode(json);
    try {
      await navigator.clipboard?.writeText(json);
    } catch {
      // Clipboard may be unavailable in some environments.
    }
  };

  const handleImport = () => {
    setImportError(null);
    try {
      const trimmed = importText.trim();
      if (!trimmed) {
        setImportError("Paste a Zod schema or rule builder JSON first");
        return;
      }
      const next = trimmed.includes("z.object")
        ? importFromZodSchema(trimmed, doc.name)
        : importDocumentJson(trimmed);
      setDoc(next);
      onChange?.(next);
      setImportText("");
      setExportCode("");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Import failed");
    }
  };

  return (
    <div className={`flex flex-col gap-6 w-full ${className}`}>
      <header className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Validation rule builder
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Drag rules to reorder, preview live validation, and export to Zod — no code required.
        </p>
        <Input
          aria-label="Document name"
          value={doc.name}
          onChange={(e) =>
            updateDoc((current) => ({ ...current, name: e.target.value }))
          }
          className="max-w-md"
        />
      </header>

      <section className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">Field name</label>
          <Input
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            placeholder="email"
            className="w-48"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">Type</label>
          <select
            value={newFieldType}
            onChange={(e) => setNewFieldType(e.target.value as FieldValueType)}
            className="h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 text-sm"
          >
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="enum">Enum</option>
          </select>
        </div>
        <Button type="button" onClick={addField} leftIcon={<Plus />}>
          Add field
        </Button>
      </section>

      <div className="flex flex-col gap-4">
        {doc.fields.length === 0 && (
          <p className="text-sm text-zinc-500 italic">
            Add a field to start building validation rules.
          </p>
        )}

        {doc.fields.map((field, fieldIndex) => (
          <FieldRuleCard
            key={field.fieldName}
            field={field}
            fieldIndex={fieldIndex}
            previewValue={previewValues[field.fieldName] ?? ""}
            previewIssues={preview.issues.filter(
              (issue) => issue.fieldName === field.fieldName,
            )}
            onPreviewChange={(value) =>
              setPreviewValues((current) => ({
                ...current,
                [field.fieldName]: value,
              }))
            }
            onRemoveField={() => removeField(fieldIndex)}
            onAddRule={(operator) => addRule(fieldIndex, operator)}
            onUpdateRule={(ruleIndex, patch) =>
              updateRule(fieldIndex, ruleIndex, patch)
            }
            onRemoveRule={(ruleIndex) => removeRule(fieldIndex, ruleIndex)}
            onDragStart={(ruleIndex) => onDragStart(fieldIndex, ruleIndex)}
            onDragOver={onDragOver}
            onDrop={(toIndex) => onDrop(fieldIndex, toIndex)}
          />
        ))}
      </div>

      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          <Eye className="w-4 h-4" aria-hidden />
          Preview validation
        </div>
        {preview.valid ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            All enabled rules pass for the sample values.
          </p>
        ) : (
          <ul className="list-disc ps-5 text-sm text-red-600 dark:text-red-400 space-y-1">
            {preview.issues.map((issue) => (
              <li key={`${issue.fieldName}-${issue.ruleId}`}>{issue.message}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            leftIcon={<Code2 />}
            onClick={handleExportZod}
          >
            Export Zod
          </Button>
          <Button
            type="button"
            variant="outline"
            leftIcon={<Download />}
            onClick={handleExportJson}
          >
            Export JSON
          </Button>
        </div>
        {exportCode && (
          <pre className="overflow-auto rounded-lg bg-zinc-950 text-zinc-100 text-xs p-3 max-h-64">
            {exportCode}
          </pre>
        )}

        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Import existing schema or JSON
        </label>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={5}
          placeholder={'Paste z.object({ ... }) or exported JSON'}
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent p-3 text-sm font-mono"
        />
        <Button
          type="button"
          variant="secondary"
          leftIcon={<Upload />}
          onClick={handleImport}
        >
          Import
        </Button>
        {importError && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {importError}
          </p>
        )}
      </section>
    </div>
  );
}

interface FieldRuleCardProps {
  field: FieldRuleSet;
  fieldIndex: number;
  previewValue: string;
  previewIssues: { message: string }[];
  onPreviewChange: (value: string) => void;
  onRemoveField: () => void;
  onAddRule: (operator: RuleOperator) => void;
  onUpdateRule: (ruleIndex: number, patch: Partial<ValidationRule>) => void;
  onRemoveRule: (ruleIndex: number) => void;
  onDragStart: (ruleIndex: number) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (toIndex: number) => void;
}

function FieldRuleCard({
  field,
  previewValue,
  previewIssues,
  onPreviewChange,
  onRemoveField,
  onAddRule,
  onUpdateRule,
  onRemoveRule,
  onDragStart,
  onDragOver,
  onDrop,
}: FieldRuleCardProps) {
  const availableOps = operatorsForType(field.valueType);

  return (
    <article className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
            {field.label || field.fieldName}
          </h3>
          <p className="text-xs text-zinc-500">
            {field.fieldName} · {field.valueType}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<Trash2 />}
          onClick={onRemoveField}
          aria-label={`Remove field ${field.fieldName}`}
        >
          Remove
        </Button>
      </div>

      <div className="flex flex-col gap-2" role="list" aria-label={`Rules for ${field.fieldName}`}>
        {field.rules.map((rule, ruleIndex) => (
          <div
            key={rule.id}
            role="listitem"
            draggable
            onDragStart={() => onDragStart(ruleIndex)}
            onDragOver={onDragOver}
            onDrop={() => onDrop(ruleIndex)}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-900/40 p-2 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-4 h-4 text-zinc-400 shrink-0" aria-hidden />
            <select
              value={rule.operator}
              onChange={(e) =>
                onUpdateRule(ruleIndex, {
                  operator: e.target.value as RuleOperator,
                  value: RULE_OPERATOR_META[e.target.value as RuleOperator].needsValue
                    ? rule.value ?? ""
                    : undefined,
                })
              }
              className="h-9 rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent px-2 text-sm"
              aria-label="Rule operator"
            >
              {availableOps.map((op) => (
                <option key={op} value={op}>
                  {RULE_OPERATOR_META[op].label}
                </option>
              ))}
            </select>
            {RULE_OPERATOR_META[rule.operator].needsValue && (
              <Input
                value={
                  Array.isArray(rule.value)
                    ? rule.value.join(", ")
                    : String(rule.value ?? "")
                }
                onChange={(e) => onUpdateRule(ruleIndex, { value: e.target.value })}
                placeholder={RULE_OPERATOR_META[rule.operator].valueHint}
                className="w-40"
                aria-label="Rule value"
              />
            )}
            <Input
              value={rule.message ?? ""}
              onChange={(e) => onUpdateRule(ruleIndex, { message: e.target.value })}
              placeholder="Custom message"
              className="flex-1 min-w-[10rem]"
              aria-label="Custom error message"
            />
            <label className="flex items-center gap-1 text-xs text-zinc-500">
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={(e) =>
                  onUpdateRule(ruleIndex, { enabled: e.target.checked })
                }
              />
              On
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemoveRule(ruleIndex)}
              aria-label="Remove rule"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          defaultValue=""
          onChange={(e) => {
            if (!e.target.value) return;
            onAddRule(e.target.value as RuleOperator);
            e.target.value = "";
          }}
          className="h-9 rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent px-2 text-sm"
          aria-label="Add rule"
        >
          <option value="" disabled>
            Add rule…
          </option>
          {availableOps.map((op) => (
            <option key={op} value={op}>
              {RULE_OPERATOR_META[op].label}
            </option>
          ))}
        </select>
        <Input
          value={previewValue}
          onChange={(e) => onPreviewChange(e.target.value)}
          placeholder="Sample value for preview"
          className="max-w-xs"
          aria-label={`Preview value for ${field.fieldName}`}
        />
      </div>
      {previewIssues.length > 0 && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {previewIssues.map((issue) => issue.message).join(" · ")}
        </p>
      )}
    </article>
  );
}

export default ValidationRuleBuilder;
