import { useId, useState } from 'react';
import './VerificationBadge.css';

export type VerificationStatus = 'verified' | 'pending' | 'rejected';

interface Props {
  status: VerificationStatus;
  /** Adds pattern fills (solid / stripes / dots) so status doesn't rely on color. */
  colorblindMode?: boolean;
  className?: string;
}

const CONFIG: Record<
  VerificationStatus,
  { label: string; srLabel: string; tooltip: string }
> = {
  verified: {
    label: 'VERIFIED',
    srLabel: 'Verified',
    tooltip: 'Verified: this account has passed identity verification.',
  },
  pending: {
    label: 'PENDING',
    srLabel: 'Pending',
    tooltip: 'Pending: verification has been submitted and is awaiting review.',
  },
  rejected: {
    label: 'REJECTED',
    srLabel: 'Rejected',
    tooltip: 'Rejected: verification was not approved. Resubmit with updated details.',
  },
};

function StatusShape({
  status,
  patternId,
  colorblindMode,
}: {
  status: VerificationStatus;
  patternId: string;
  colorblindMode: boolean;
}) {
  // In colorblind mode: verified = solid, pending = diagonal stripes, rejected = dots
  const fill = colorblindMode && status !== 'verified' ? `url(#${patternId})` : 'currentColor';

  return (
    <svg
      className="vbadge__shape"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      focusable="false"
    >
      {colorblindMode && status === 'pending' && (
        <defs>
          <pattern id={patternId} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="5" height="5" fill="var(--vbadge-bg)" />
            <rect width="2.5" height="5" fill="var(--vbadge-fg)" />
          </pattern>
        </defs>
      )}
      {colorblindMode && status === 'rejected' && (
        <defs>
          <pattern id={patternId} width="5" height="5" patternUnits="userSpaceOnUse">
            <rect width="5" height="5" fill="var(--vbadge-bg)" />
            <circle cx="2.5" cy="2.5" r="1.3" fill="var(--vbadge-fg)" />
          </pattern>
        </defs>
      )}

      {status === 'verified' && (
        <>
          <circle cx="12" cy="12" r="11" fill={fill} />
          <path d="M7 12.5l3.2 3.2L17 8.8" fill="none" stroke="var(--vbadge-glyph)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {status === 'pending' && (
        <>
          <rect x="1.5" y="1.5" width="21" height="21" rx="2" fill={fill} stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="6.2" fill="var(--vbadge-glyph-bg)" stroke="var(--vbadge-glyph)" strokeWidth="1.6" />
          <path d="M12 8.6V12l2.4 1.6" fill="none" stroke="var(--vbadge-glyph)" strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
      {status === 'rejected' && (
        <>
          <path d="M12 1.5L23 22H1z" fill={fill} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M9.2 12.8l5.6 5.6M14.8 12.8l-5.6 5.6" stroke="var(--vbadge-glyph)" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export function VerificationBadge({ status, colorblindMode = false, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const uid = useId().replace(/:/g, '');
  const tooltipId = `vbadge-tip-${uid}`;
  const patternId = `vbadge-pat-${uid}`;
  const { label, srLabel, tooltip } = CONFIG[status];

  return (
    <span
      className={`vbadge vbadge--${status} ${colorblindMode ? 'vbadge--cb' : ''} ${className}`.trim()}
      tabIndex={0}
      aria-describedby={tooltipId}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
    >
      <StatusShape status={status} patternId={patternId} colorblindMode={colorblindMode} />
      <span className="vbadge__text" aria-hidden="true">{label}</span>
      <span className="vbadge__sr">Verification status: {srLabel}</span>
      <span id={tooltipId} role="tooltip" className="vbadge__tooltip" data-open={open}>
        {tooltip}
      </span>
    </span>
  );
}

export default VerificationBadge;
