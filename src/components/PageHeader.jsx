import React from "react";

export default function PageHeader({ title, crumb, meta }) {
  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        {crumb && <div className="crumb">{crumb}</div>}
      </div>
      {meta && <div className="topbar__meta">{meta}</div>}
    </header>
  );
}
