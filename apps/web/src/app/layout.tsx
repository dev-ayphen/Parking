import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ParkSwift Admin',
  description: 'Admin Dashboard for ParkSwift Parking Management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50">{children}</body>
    </html>
  );
}
