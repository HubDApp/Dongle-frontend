export interface ContextFieldInput {
  formType: string;
  fieldName: string;
  value: string;
  pattern?: RegExp;
  required?: boolean;
}

export interface ContextValidationResult {
  valid: boolean;
  unusual: boolean;
  issues: string[];
  suggestions: string[];
}

interface Correction {
  value: string;
  count: number;
}

interface FieldModel {
  samples: number;
  shapes: Map<string, number>;
  corrections: Map<string, Correction>;
}

const MINIMUM_SAMPLES = 5;

/** Learns field-specific value shapes and corrections for a running app session. */
export class ContextAwareValidator {
  private models = new Map<string, FieldModel>();

  validate(input: ContextFieldInput): ContextValidationResult {
    const issues: string[] = [];
    const value = input.value;

    if (input.required && value.trim().length === 0) {
      issues.push("This field is required.");
    }

    if (input.pattern && value.length > 0) {
      const pattern = new RegExp(
        input.pattern.source,
        input.pattern.flags.replace(/[gy]/g, "")
      );
      if (!pattern.test(value)) {
        issues.push("This value does not match the expected pattern.");
      }
    }

    const model = this.getModel(input.formType, input.fieldName);
    const unusual = this.isUnusual(model, value);
    const correction = this.findCorrection(model, value);

    return {
      valid: issues.length === 0,
      unusual,
      issues,
      suggestions: correction ? [correction.value] : [],
    };
  }

  learnFromCorrection(
    formType: string,
    fieldName: string,
    originalValue: string,
    correctedValue: string
  ): void {
    const original = originalValue.trim();
    const corrected = correctedValue.trim();
    if (!original || !corrected || original === corrected) return;

    const model = this.getModel(formType, fieldName);
    const key = this.normalize(original);
    const existing = model.corrections.get(key);
    if (existing && this.normalize(existing.value) === this.normalize(corrected)) {
      existing.count++;
    } else {
      model.corrections.set(key, { value: corrected, count: 1 });
    }
    this.learnAcceptedValue(formType, fieldName, corrected);
  }

  learnAcceptedValue(formType: string, fieldName: string, value: string): void {
    if (!value.trim()) return;

    const model = this.getModel(formType, fieldName);
    const shape = this.getShape(value);
    model.samples++;
    model.shapes.set(shape, (model.shapes.get(shape) ?? 0) + 1);
  }

  private isUnusual(model: FieldModel, value: string): boolean {
    if (!value.trim() || model.samples < MINIMUM_SAMPLES) return false;
    return !model.shapes.has(this.getShape(value));
  }

  private findCorrection(model: FieldModel, value: string): Correction | undefined {
    const normalized = this.normalize(value);
    const exact = model.corrections.get(normalized);
    if (exact) return exact;

    const maxDistance = Math.max(1, Math.floor(normalized.length * 0.25));
    let closest: Correction | undefined;
    let closestDistance = maxDistance + 1;

    for (const [original, correction] of model.corrections) {
      const distance = this.editDistance(normalized, original);
      if (
        distance < closestDistance ||
        (distance === closestDistance && correction.count > (closest?.count ?? 0))
      ) {
        closest = correction;
        closestDistance = distance;
      }
    }

    return closestDistance <= maxDistance ? closest : undefined;
  }

  private getModel(formType: string, fieldName: string): FieldModel {
    const key = JSON.stringify([formType, fieldName]);
    let model = this.models.get(key);
    if (!model) {
      model = { samples: 0, shapes: new Map(), corrections: new Map() };
      this.models.set(key, model);
    }
    return model;
  }

  private getShape(value: string): string {
    return value.replace(/[A-Za-z]/g, "a").replace(/[0-9]/g, "0");
  }

  private normalize(value: string): string {
    return value.trim().toLocaleLowerCase();
  }

  private editDistance(left: string, right: string): number {
    const distances = Array.from({ length: left.length + 1 }, (_, row) => row);
    for (let column = 1; column <= right.length; column++) {
      let diagonal = distances[0];
      distances[0] = column;
      for (let row = 1; row <= left.length; row++) {
        const above = distances[row];
        distances[row] = Math.min(
          distances[row] + 1,
          distances[row - 1] + 1,
          diagonal + (left[row - 1] === right[column - 1] ? 0 : 1)
        );
        diagonal = above;
      }
    }
    return distances[left.length];
  }
}