'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useSidebarCounts } from '@/hooks/useSidebarCounts';
import { motion, AnimatePresence } from 'framer-motion';
import { useSidebar } from '@/components/SidebarContext';
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
  ChevronRight,
  Car,
  FileSearch,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  UserCog,
} from 'lucide-react';

type BadgeKey = 'pendingSpaces' | 'openSupportTickets' | 'expiringSubscriptions' | 'openAbuseReports';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badgeKey?: BadgeKey;
  subItems?: { name: string; href: string; badgeKey?: BadgeKey }[];
  superAdminOnly?: boolean;
}

const navigation: NavItem[] = [
  { name: 'Dashboard',            href: '/dashboard',   icon: LayoutDashboard },
  { name: 'Users Management',     href: '/users',        icon: Users },
  { name: 'Spaces Management',    href: '/spaces',       icon: MapPin,       badgeKey: 'pendingSpaces' },
  { name: 'Bookings & Sessions',  href: '/bookings',     icon: Calendar },
  { name: 'Payments & Billing',   href: '/payments',     icon: CreditCard,   superAdminOnly: true },
  { name: 'Subscriptions',        href: '/subscriptions',icon: Repeat,       badgeKey: 'expiringSubscriptions', superAdminOnly: true },
  { name: 'Platform Settings',    href: '/settings',     icon: Settings,     superAdminOnly: true },
  { name: 'Support & Issues',     href: '/support',      icon: LifeBuoy,     badgeKey: 'openSupportTickets' },
  { name: 'Cases & Evidence',     href: '/cases',        icon: FileSearch },
  { name: 'Reports & Analytics',  href: '/analytics',    icon: BarChart3,    superAdminOnly: true },
  {
    name: 'Moderation & Security',
    href: '/moderation',
    icon: ShieldAlert,
    badgeKey: 'openAbuseReports',
    subItems: [
      { name: 'Abuse Reports', href: '/moderation/abuse', badgeKey: 'openAbuseReports' },
      { name: 'Incidents',     href: '/moderation/incidents' },
    ],
  },
  { name: 'Communications',       href: '/communications', icon: MessageSquare, superAdminOnly: true },
  {
    name: 'Legal & Compliance',
    href: '/legal',
    icon: Scale,
    subItems: [
      { name: 'Documents & Policies', href: '/legal' },
    ],
    superAdminOnly: true,
  },
  { name: 'System Logs',          href: '/logs',         icon: Server,       superAdminOnly: true },
  { name: 'Manage Staff',         href: '/staff',        icon: UserCog,      superAdminOnly: true },
];

// Short labels shown in mini-rail (collapsed) mode — keeps it readable
const SHORT_LABEL: Record<string, string> = {
  'Dashboard':            'Dashboard',
  'Users Management':     'Users',
  'Spaces Management':    'Spaces',
  'Bookings & Sessions':  'Bookings',
  'Payments & Billing':   'Payments',
  'Subscriptions':        'Subscriptions',
  'Platform Settings':    'Settings',
  'Support & Issues':     'Support',
  'Cases & Evidence':     'Cases',
  'Reports & Analytics':  'Reports',
  'Moderation & Security':'Moderation',
  'Communications':       'Comms',
  'Legal & Compliance':   'Legal',
  'System Logs':          'Logs',
  'Manage Staff':         'Staff',
};

const Badge = ({ count, collapsed = false }: { count: number; collapsed?: boolean }) => {
  if (count <= 0) return null;
  if (collapsed) {
    return (
      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
    );
  }
  return (
    <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
      {count > 99 ? '99+' : count}
    </span>
  );
};

// Tooltip for collapsed rail mode
const RailTooltip = ({ label }: { label: string }) => (
  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-[100] pointer-events-none">
    <div className="bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl border border-white/10">
      {label}
    </div>
    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
  </div>
);

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const { collapsed, toggleCollapse: ctxToggle } = useSidebar();
  const counts = useSidebarCounts();

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const toggleCollapse = () => {
    ctxToggle();
    if (!collapsed) setExpandedItems({});
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const toggleExpand = (name: string) => {
    setExpandedItems(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const sidebarWidth = collapsed ? 'w-[110px]' : 'w-72';

  const isSuperAdmin = user?.adminRole === 'SUPER_ADMIN' || !user?.adminRole;
  const visibleNav = navigation.filter(item => !item.superAdminOnly || isSuperAdmin);

  const SidebarContent = () => (
    <aside className={`${sidebarWidth} bg-[#0A0A0A] text-white h-screen fixed left-0 top-0 flex flex-col border-r border-white/5 font-sans z-[60] transition-all duration-300 ease-in-out lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
      {/* Logo */}
      <div className={`border-b border-white/5 relative overflow-hidden flex-shrink-0 ${collapsed ? 'p-3' : 'p-5'}`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[50px]" />
        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 flex-shrink-0">
            <Car size={18} className="text-white" />
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap flex-1"
              >
                <h1 className="text-lg font-bold text-white tracking-tight">ParkSwift</h1>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Admin Dashboard</p>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Collapse toggle — desktop */}
          <button
            onClick={toggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="lg:flex hidden ml-auto text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
          {/* Close button — mobile only */}
          {!collapsed && (
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="lg:hidden ml-auto text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto custom-scrollbar min-h-0">
        {visibleNav.map((item) => {
          const isParentActive = pathname === item.href;
          const isSubItemActive = item.subItems?.some(sub => pathname === sub.href);
          const isActive = isParentActive || isSubItemActive;
          const isExpanded = expandedItems[item.name] || isActive;
          const totalBadge = item.badgeKey ? (counts[item.badgeKey] ?? 0) : 0;

          return (
            <div key={item.name}>
              <div className="relative group/item">
                <button
                  onMouseEnter={() => collapsed && setHoveredItem(item.name)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => {
                    if (item.subItems) {
                      if (collapsed) {
                        ctxToggle();
                        setTimeout(() => toggleExpand(item.name), 10);
                      } else {
                        toggleExpand(item.name);
                      }
                    } else {
                      router.push(item.href);
                    }
                  }}
                  className={`w-full flex transition-all duration-200 group rounded-xl relative ${
                    collapsed
                      ? 'flex-col items-center justify-center px-1 py-2 gap-1'
                      : 'flex-row items-center justify-between px-3 py-2.5'
                  } ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {/* Icon */}
                  <div className="relative flex-shrink-0">
                    <item.icon
                      size={collapsed ? 17 : 18}
                      className={isActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-300'}
                    />
                    {collapsed && totalBadge > 0 && <Badge count={totalBadge} collapsed />}
                  </div>

                  {/* Collapsed: short label below icon */}
                  {collapsed && (
                    <span className={`text-[10px] font-medium leading-tight text-center w-full truncate px-0.5 ${
                      isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'
                    }`}>
                      {SHORT_LABEL[item.name] ?? item.name}
                    </span>
                  )}

                  {/* Expanded: label + badge inline */}
                  {!collapsed && (
                    <div className="flex items-center justify-between flex-1 overflow-hidden ml-3">
                      <span className="font-medium text-sm whitespace-nowrap">{item.name}</span>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {item.badgeKey && <Badge count={totalBadge} />}
                        {item.subItems && (
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown size={13} className="text-gray-500" />
                          </motion.div>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              </div>

              {/* Sub Navigation — only when expanded */}
              <AnimatePresence initial={false}>
                {item.subItems && isExpanded && !collapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-9 py-1 space-y-0.5">
                      {item.subItems.map((subItem) => {
                        const isSubActive = pathname === subItem.href;
                        return (
                          <Link
                            key={subItem.name}
                            href={subItem.href}
                            className={`flex items-center justify-between pr-3 py-2 text-sm rounded-lg transition-colors ${
                              isSubActive
                                ? 'text-primary font-medium'
                                : 'text-gray-500 hover:text-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <ChevronRight size={12} className="text-gray-600" />
                              <span>{subItem.name}</span>
                            </div>
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
      <div className={`border-t border-white/5 bg-white/[0.02] flex-shrink-0 ${collapsed ? 'p-2' : 'p-3'}`}>
        {user && !collapsed && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <User size={15} className="text-white" />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user.email}</p>
              <p className="text-xs text-indigo-400 font-medium mt-0.5">
                {user.adminRole === 'SUPPORT_AGENT' ? 'Support Agent' : 'Super Admin'}
              </p>
            </div>
          </div>
        )}
        {user && collapsed && (
          <div className="flex flex-col items-center mb-2 gap-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <User size={14} className="text-white" />
            </div>
            <span className="text-[10px] text-gray-500 font-medium truncate w-full text-center px-1">Admin</span>
          </div>
        )}

        <button
          onClick={handleLogout}
          className={`w-full flex transition-all duration-200 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl text-sm font-medium ${
            collapsed ? 'flex-col items-center py-2 gap-1' : 'flex-row items-center gap-2 px-3 py-2'
          }`}
        >
          <LogOut size={16} />
          {collapsed
            ? <span className="text-[10px] font-medium text-gray-500">Sign Out</span>
            : <span>Sign Out</span>
          }
        </button>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>
    </aside>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="lg:hidden fixed top-4 left-4 z-[60] w-10 h-10 rounded-xl bg-[#0A0A0A] text-white flex items-center justify-center shadow-lg border border-white/10"
      >
        <Menu size={20} />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 z-[55]"
        />
      )}

      <SidebarContent />
    </>
  );
}
