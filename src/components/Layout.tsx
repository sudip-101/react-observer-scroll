import { NavLink, Outlet } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/infinite-scroll', label: 'InfiniteScroll' },
  { to: '/bidirectional-scroll', label: 'BidirectionalScroll' },
];

export const Layout = () => (
  <div className="min-h-screen flex flex-col">
    <header className="border-b border-border bg-card sticky top-0 z-10">
      <nav className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-6">
        <span className="font-semibold text-sm tracking-tight">
          react-observer-scroll
        </span>
        <div className="flex gap-1 flex-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
        <ThemeToggle />
      </nav>
    </header>
    <main className="flex-1">
      <Outlet />
    </main>
  </div>
);
