import { Link } from "react-router-dom";

export default function PageHeader({ title, subtitle, actions, breadcrumb = [] }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {breadcrumb.length > 0 && (
          <nav className="mb-2 flex flex-wrap items-center gap-2 text-xs text-textMuted" aria-label="Breadcrumb">
            {breadcrumb.map((item, index) => (
              <span key={item.href ?? item.label} className="flex items-center gap-2">
                {item.href ? <Link to={item.href} className="hover:text-accent">{item.label}</Link> : <span>{item.label}</span>}
                {index < breadcrumb.length - 1 && <span>/</span>}
              </span>
            ))}
          </nav>
        )}
        <h1 className="font-display text-4xl leading-tight text-textPrimary md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-3xl text-sm leading-6 text-textMuted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
