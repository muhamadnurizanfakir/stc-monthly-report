import PortalAuthGuard from '../components/PortalAuthGuard';

export default function ReportingLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalAuthGuard module="portal">
      {children}
    </PortalAuthGuard>
  );
}
