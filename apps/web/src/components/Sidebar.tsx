'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useSidebarCounts } from '@/hooks/useSidebarCounts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  MapPin,
  Calendar,
  CreditCard,
  Repeat,
  Settings,
  LifeBuoy,
  BarChart3,
  ShieldAlert,
  MessageSquare,
  Scale,
  Server,
  User,
  LogOut,
  ChevronDown,
  Car,
  FileSearch,
  Menu,
  X,
} from 'lucide-react';

type BadgeKey = 'pendingSpaces' | 'openSupportTickets' | 'expiringSubscriptions' | 'openAbuseReports';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badgeKey?: BadgeKey;
  subItems?: { name: string; href: string; badgeKey?: BadgeKey }[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Users Management', href: '/users', icon: Users },
  { name: 'Spaces Management', href: '/spaces', icon: MapPin, badgeKey: 'pendingSpaces' },
  { name: 'Bookings & Sessions', href: '/bookings', icon: Calendar },
  { name: 'Payments & Billing', href: '/payments', icon: CreditCard },
  { name: 'Subscriptions', href: '/subscriptions', icon: Repeat, badgeKey: 'expiringSubscriptions' },
  { name: 'Platform Settings', href: '/settings', icon: Settings },
  { name: 'Support & Issues', href: '/support', icon: LifeBuoy, badgeKey: 'openSupportTickets' },
  { name: 'Cases & Evidence', href: '/cases', icon: FileSearch },
  { name: 'Reports & Analytics', href: '/analytics', icon: BarChart3 },
  {
    name: 'Moderation & Security',
    href: '/moderation',
    icon: ShieldAlert,
    badgeKey: 'openAbuseReports',
    subItems: [
      { name: 'Abuse Reports', href: '/moderation/abuse', badgeKey: 'openAbuseReports' },
      { name: 'Incidents', href: '/moderation/incidents' },
    ],
  },
  { name: 'Communications', href: '/communications', icon: MessageSquare },
  {
    name: 'Legal & Compliance',
    href: '/legal',
    icon: Scale,
    subItems: [
      { name: 'Documents & Policies', href: '/legal' },
    ],
  },
  { name: 'System Logs', href: '/logs', icon: Server },
];

const Badge = ({ count }: { count: number }) => {
  if (count <= 0) return null;
  return (
    <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
      {count > 99 ? '99+' : count}
    </span>
  );
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const counts = useSidebarCounts();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const toggleExpand = (name: string) => {
    setExpandedItems(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <>
      {/* Mobile hamburger — only shows below lg */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="lg:hidden fixed top-4 left-4 z-[60] w-10 h-10 rounded-xl bg-[#0A0A0A] text-white flex items-center justify-center shadow-lg border border-white/10"
      >
        <Menu size={20} />
      </button>

      {/* Backdrop when the mobile drawer is open */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 z-[55]"
        />
      )}

    <aside className={`w-72 bg-[#0A0A0A] text-white h-screen fixed left-0 top-0 flex flex-col border-r border-white/5 font-sans z-[60] transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Logo */}
      <div className="p-6 border-b border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[50px]" />
        <div className="relative flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
            <Car size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">ParkSwift</h1>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">Admin Dashboard</p>
          </div>
          {/* Close button — only on mobile drawer */}
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="lg:hidden ml-auto text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
        {navigation.map((item) => {
          // Check if parent or any subitem is active
          const isParentActive = pathname === item.href;
          const isSubItemActive = item.subItems?.some(sub => pathname === sub.href);
          const isActive = isParentActive || isSubItemActive;
          const isExpanded = expandedItems[item.name] || isActive;

          return (
            <div key={item.name} className="mb-1">
              <button
                onClick={() => {
                  if (item.subItems) {
                    toggleExpand(item.name);
                  } else {
                    router.push(item.href);
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-white/10 text-white' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <item.icon size={18} className={isActive ? 'text-indigo-400' : 'text-gray-400 group-hover:text-gray-300'} />
                  <span className="font-medium text-sm">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.badgeKey && <Badge count={counts[item.badgeKey] ?? 0} />}
                  {item.subItems && (
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown size={14} className="text-gray-500" />
                    </motion.div>
                  )}
                </div>
              </button>

              {/* Sub Navigation */}
              <AnimatePresence initial={false}>
                {item.subItems && isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-11 py-1 space-y-1">
                      {item.subItems.map((subItem) => {
                        const isSubActive = pathname === subItem.href;
                        return (
                          <Link
                            key={subItem.name}
                            href={subItem.href}
                            className={`flex items-center justify-between pr-3 py-2 text-sm transition-colors ${
                              isSubActive
                                ? 'text-indigo-400 font-medium'
                                : 'text-gray-500 hover:text-gray-300'
                            }`}
                          >
                            <span>{subItem.name}</span>
                            {subItem.badgeKey && <Badge count={counts[subItem.badgeKey] ?? 0} />}
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* User Profile & Logout */}
      <div className="border-t border-white/5 p-4 bg-white/[0.02]">
        {user ? (
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <User size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.email}</p>
              <p className="text-xs text-indigo-400 font-medium capitalize mt-0.5">
                {user.role === 'admin' ? 'Super Admin' : user.role}
              </p>
            </div>
          </div>
        ) : null}
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl transition-all duration-200 text-sm font-medium"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </aside>
    </>
  );
}
