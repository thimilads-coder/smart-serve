import { useEffect } from 'react';

export default function PageHeader({ eyebrow, title, description, children }) {
  useEffect(() => {
    document.title = `${title} · SmartServe`;
  }, [title]);

  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description ? <p className="lede">{description}</p> : null}
      </div>
      {children ? <div className="page-actions">{children}</div> : null}
    </header>
  );
}
