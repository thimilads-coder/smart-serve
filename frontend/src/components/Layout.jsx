import { Link, NavLink, Outlet } from 'react-router-dom';

const links = [
  ['/', 'Dashboard'],
  ['/new', 'New order'],
  ['/queue', 'Queue'],
  ['/preparing', 'Preparing'],
  ['/history', 'History'],
  ['/analytics', 'Analytics'],
];

export default function Layout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <span>SmartServe</span>
          <small>Kitchen queue</small>
        </Link>
        <nav className="nav" aria-label="Sections">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}>
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="sidebar-note">Orders start in arrival order. First in, first served.</p>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
