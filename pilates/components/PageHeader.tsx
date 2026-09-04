import Link from "next/link";

export default function PageHeader({
  title,
  eyebrow,
  action,
  back,
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-5">
      {back && (
        <Link href={back.href} className="inline-flex items-center gap-1 text-sm text-mint/70 hover:text-mint mb-2 min-h-[44px]">
          <span aria-hidden>←</span> {back.label}
        </Link>
      )}
      <div className="flex items-end justify-between gap-3">
        <div>
          {eyebrow && <p className="text-xs uppercase tracking-widest text-mint/60 mb-1">{eyebrow}</p>}
          <h1 className="display text-4xl md:text-5xl">{title}</h1>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
