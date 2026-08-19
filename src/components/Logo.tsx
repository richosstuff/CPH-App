interface LogoProps {
  /** 'icon' is the bare mark (drop-in replacement for the old Compass icon).
   *  'full' adds the "CPH Project" wordmark alongside it. */
  variant?: 'icon' | 'full';
  className?: string;
}

/**
 * Fixed-color artwork (burgundy #822200, trimmed, transparent background) —
 * not inline SVG, so it doesn't respond to currentColor/text-* like the old
 * Compass icon did. There's no dark mode yet and the brand color is constant
 * everywhere this appears, so that trade-off costs nothing today.
 */
function Mark({ className }: { className?: string }) {
  return <img src="/logo-mark.png" alt="" className={className} />;
}

export default function Logo({ variant = 'icon', className = '' }: LogoProps) {
  if (variant === 'icon') return <Mark className={className} />;

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Mark className="h-full w-auto shrink-0" />
      <span className="font-mono text-xs tracking-[0.15em] uppercase leading-none whitespace-nowrap">
        <span className="text-harbor font-medium">CPH</span> <span className="text-ink-soft">Project</span>
      </span>
    </span>
  );
}
