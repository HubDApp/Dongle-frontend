# Form Anomaly Detection Integration Guide

This guide explains how to integrate the form anomaly detection system into your application's form submission flows.

## Quick Start

### 1. Basic Frontend Integration (React Component)

```typescript
import { useFormAnomalyDetection } from "@/hooks/useFormAnomalyDetection";

function MyForm() {
  const { trackFieldChange, trackSubmission } = useFormAnomalyDetection({
    formId: "my-form",
    formType: "project-submission",
    userId: "user123",
    enableTracking: true,
  });

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.currentTarget;
    trackFieldChange(name, value); // Track for anomaly detection
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Track submission and check for anomalies
    const result = await trackSubmission();

    if (result?.flagged) {
      console.warn("Submission flagged for review:", result.flag);
      // Handle flagged submission
    } else {
      // Proceed with form submission
      await submitForm();
    }
  };

  return (
    <form id="my-form" onSubmit={handleSubmit}>
      <input
        name="title"
        value={title}
        onChange={handleFieldChange}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```

### 2. Backend Integration (API Route)

```typescript
import { checkFormAnomaly } from "@/services/anomaly-detection/form-integration";
import type { FormSubmissionMetrics } from "@/services/anomaly-detection";

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Reconstruct form submission metrics from request
  const metrics: FormSubmissionMetrics = body.metrics;

  // Check for anomalies before processing
  const anomalyCheck = await checkFormAnomaly(metrics, "project-submission", {
    userId: body.userId,
    walletFingerprint: body.walletFingerprint,
    requireApprovalForFlagged: true, // Require review before approval
    autoRejectCritical: false, // Don't automatically reject
  });

  if (!anomalyCheck.allow) {
    return NextResponse.json(
      { error: anomalyCheck.reason, flagId: anomalyCheck.flagId },
      { status: 202 } // Accepted but pending review
    );
  }

  // Proceed with form processing
  // ...
}
```

## Architecture

### Components

1. **AnomalyDetector** (`detector.ts`)
   - Core detection engine
   - Implements statistical models (Z-score, IQR methods)
   - Generates anomaly scores (0-1 scale)
   - Identifies specific anomalies

2. **AnomalyManager** (`manager.ts`)
   - Manages flagged submissions
   - Handles review workflow
   - Implements learning from feedback
   - Tracks model accuracy

3. **Configuration** (`config.ts`)
   - `DEFAULT_CONFIG`: Balanced thresholds for most forms
   - `STRICT_CONFIG`: Sensitive forms (payment, admin)
   - `LENIENT_CONFIG`: Low-risk forms (feedback, comments)
   - `DEV_CONFIG`: Development/testing configuration

4. **Form Integration** (`form-integration.ts`)
   - `FormAnomalyIntegration`: High-level API
   - `checkFormAnomaly()`: Middleware helper
   - Sanitization utilities

5. **React Hook** (`useFormAnomalyDetection`)
   - Tracks form interactions
   - Collects submission metrics
   - Calls analysis API

## Detected Anomalies

### Time-Based
- **Suspiciously fast submission** (<2 seconds)
- **Statistical outliers** (Z-score >2.5)
- **Unusual session duration**

### Behavioral
- **Excessive pasting** (>3 paste events)
- **High correction count** (>50% of fields)
- **Frequent tab switching** (>2 switches)
- **Frequent focus loss** (>5 times)
- **Perfect completion** (too many indicators at once)

### Device/Statistical
- **Device fingerprint mismatch**
- **Multiple metric outliers** (statistical anomaly)
- **Autofill detection** (monitor flag)

## Configuration

### Severity Levels

| Level | Score | Action |
|-------|-------|--------|
| Critical | 0.85+ | Block or require immediate review |
| High | 0.70-0.84 | Flag for review |
| Medium | 0.50-0.69 | Flag for monitoring |
| Low | 0.30-0.49 | Log only |

### Customizing Thresholds

```typescript
import { getConfig, createCustomConfig } from "@/services/anomaly-detection";

const customConfig = createCustomConfig(
  getConfig("payment"),
  {
    thresholds: {
      criticalAnomalyScore: 0.80, // Lower threshold for more sensitivity
      highAnomalyScore: 0.65,
      mediumAnomalyScore: 0.45,
      lowAnomalyScore: 0.25,
      zScoreThreshold: 2.0,
      iqrMultiplier: 1.5,
    },
  }
);

const manager = new AnomalyManager(customConfig);
```

## Usage Patterns

### Pattern 1: Strict Enforcement

```typescript
const anomalyCheck = await checkFormAnomaly(metrics, "payment-submission", {
  requireApprovalForFlagged: true,  // Block flagged submissions
  autoRejectCritical: true,         // Auto-reject critical
});

if (!anomalyCheck.allow) {
  throw new Error("Submission blocked: " + anomalyCheck.reason);
}
```

### Pattern 2: Learning Mode

```typescript
const flagged = manager.processSubmission(metrics, "form-type");

if (flagged) {
  // Store for later review, but still allow
  console.log("Submission flagged:", flagged.id);
}

// Later, when reviewer confirms:
manager.recordFeedback(
  flaggedId,
  true, // was actually anomalous
  "Confirmed spam submission"
);
```

### Pattern 3: Gradual Rollout

```typescript
const config = {
  enabled: Math.random() > 0.9, // Only check 10% of submissions initially
  // ... rest of config
};

const detector = new AnomalyDetector(config);
```

## API Endpoints

### Analyze Submission
```
POST /api/anomaly-detection/analyze
Content-Type: application/json

{
  "submission": { /* FormSubmissionMetrics */ },
  "formType": "project-submission",
  "userId": "user123",
  "walletFingerprint": "wallet_abc"
}

Response:
{
  "success": true,
  "flagged": true,
  "flag": { /* FlaggedSubmission */ }
}
```

### Get Pending Reviews
```
GET /api/anomaly-detection/flags?formType=project-submission&severity=high&limit=50

Response:
{
  "count": 15,
  "limit": 50,
  "submissions": [{ /* FlaggedSubmission */ }]
}
```

### Review Submission
```
POST /api/anomaly-detection/flags
Content-Type: application/json

{
  "flagId": "flag_xxx",
  "action": "review",
  "status": "approved",
  "reviewNotes": "Legitimate power user",
  "reviewedBy": "moderator@example.com",
  "isAnomaly": false
}
```

### Get Model Accuracy
```
GET /api/anomaly-detection/flags?action=model-accuracy

Response:
{
  "truePositives": 45,
  "trueNegatives": 240,
  "falsePositives": 8,
  "falseNegatives": 7,
  "precision": 0.849,
  "recall": 0.865,
  "accuracy": 0.973
}
```

## Privacy Considerations

1. **Device Fingerprinting**: Uses hashed device identifiers, never raw fingerprints
2. **IP Hashing**: IPs are hashed before storage, actual IP never logged
3. **Data Minimization**: Only collects interaction patterns, not content
4. **User Agent**: Captured for device tracking but not exposed
5. **No Content Storage**: Form field values are never collected

## Performance

- **Frontend**: ~2KB gzipped for tracking script
- **Detection**: <10ms to analyze a submission
- **Statistical Models**: Updated every 24 hours (configurable)
- **Storage**: Minimal (only flagged submissions + metrics)

## Testing

Run the test suite:

```bash
# Unit tests
npm run test -- anomaly-detection

# Integration tests
npm run test -- anomaly-detection/integration

# All tests
npm run test
```

## Troubleshooting

### Submissions not being flagged

1. Check if detection is enabled: `config.enabled === true`
2. Verify minimum data points: `historicalData.length >= minDataPointsForModel`
3. Check thresholds: Are they too high?
4. Enable debug logging: Check browser console for tracking events

### Too many false positives

1. Increase thresholds: Use `LENIENT_CONFIG`
2. Record feedback: Use `manager.recordFeedback()` to improve model
3. Adjust features: Disable less relevant features in config
4. Whitelist known users: Add to `ignoreLists.ignoredWallets`

### Model accuracy low

1. Ensure sufficient feedback: Need at least 50+ feedback entries
2. Check feedback quality: Are reviewers accurate?
3. Verify metrics collection: Are metrics being tracked correctly?
4. Review configuration: Is it appropriate for your use case?

## Best Practices

1. **Collect Baseline Data**: Accumulate 100+ normal submissions before enabling blocking
2. **Gradual Rollout**: Start with flagging only, then enable blocking gradually
3. **Monitor Accuracy**: Check `calculateModelAccuracy()` regularly
4. **Update Models**: Set appropriate `modelUpdateFrequency` (default: 24 hours)
5. **Combine Signals**: Use anomaly detection with other security measures
6. **Review Regularly**: Check pending reviews at least daily
7. **Learn from Feedback**: Actively record review decisions to improve model

## Examples

See `/dongle/__tests__` for comprehensive examples:
- `detector.test.ts`: Statistical model testing
- `manager.test.ts`: Workflow testing
- `integration.test.ts`: End-to-end scenarios
