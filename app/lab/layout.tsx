'use client';
import { usePathname } from 'next/navigation';
import PortalAuthGuard from '../components/PortalAuthGuard';

export default function LabLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Login page does not require portal password guard
  if (pathname === '/lab/login') {
    return <>{children}</>;
  }

  return (
    <PortalAuthGuard module="lab">
      {children}
    </PortalAuthGuard>
  );
}
