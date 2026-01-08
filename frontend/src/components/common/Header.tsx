'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';

interface NavigationItem {
  label: string;
  path: string;
  icon: string;
}

interface HeaderProps {
  className?: string;
}

const Header = ({ className = '' }: HeaderProps) => {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems: NavigationItem[] = [
    {
      label: 'Dashboard',
      path: '/executive-control-room',
      icon: 'ChartBarIcon',
    },
    {
      label: 'Network',
      path: '/network-optimization-view',
      icon: 'MapIcon',
    },
    {
      label: 'Scenarios',
      path: '/scenario-risk-analysis',
      icon: 'BeakerIcon',
    },
    {
      label: 'Inventory',
      path: '/inventory-safety-stock',
      icon: 'CubeIcon',
    },
    {
      label: 'Sustainability',
      path: '/sustainability-impact-dashboard',
      icon: 'GlobeAltIcon',
    },
    {
      label: 'Advanced OR',
      path: '/advanced-optimization',
      icon: 'CpuChipIcon',
    },
  ];

  const isActivePath = (path: string) => pathname === path;

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-navigation bg-card shadow-md ${className}`}
    >
      <div className="flex items-center justify-between h-16 px-lg">
        <Link
          href="/executive-control-room"
          className="flex items-center gap-3 focus-ring rounded-md transition-smooth"
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="flex-shrink-0"
          >
            <rect width="40" height="40" rx="8" fill="var(--color-primary)" />
            <path
              d="M12 20L20 12L28 20M20 28V14"
              stroke="var(--color-primary-foreground)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx="20"
              cy="26"
              r="2"
              fill="var(--color-accent)"
            />
          </svg>
          <div className="flex flex-col">
            <span className="font-heading font-semibold text-lg text-foreground leading-tight">
              ClinkerFlow
            </span>
            <span className="font-caption text-xs text-muted-foreground leading-tight">
              Manufacturing Intelligence
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-2">
          {navigationItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-md font-body font-medium text-sm transition-smooth interactive-lift focus-ring ${
                isActivePath(item.path)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <Icon name={item.icon as any} size={18} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <button
          onClick={toggleMobileMenu}
          className="md:hidden p-2 rounded-md text-foreground hover:bg-muted transition-smooth focus-ring"
          aria-label="Toggle mobile menu"
        >
          <Icon
            name={isMobileMenuOpen ? 'XMarkIcon' : 'Bars3Icon'}
            size={24}
          />
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden bg-card border-t border-border animate-slide-in">
          <nav className="flex flex-col p-4 gap-2">
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-md font-body font-medium text-base transition-smooth focus-ring ${
                  isActivePath(item.path)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <Icon name={item.icon as any} size={20} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;