import PortalAuthGuard from '../components/PortalAuthGuard';

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalAuthGuard module="lab">
      {children}
    </PortalAuthGuard>
  );
}
