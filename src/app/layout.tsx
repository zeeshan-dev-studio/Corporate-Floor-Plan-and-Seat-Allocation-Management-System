import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Corporate Floor Plan & Seat Allocation Management System',
  description: 'Enterprise facility floor planning, program-level seat allocations, capacity analytics, and CAD exports',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-white text-slate-100 antialiased h-screen w-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
