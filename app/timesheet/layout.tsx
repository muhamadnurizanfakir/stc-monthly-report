import PortalAuthGuard from '../components/PortalAuthGuard';

export default function TimesheetLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalAuthGuard module="portal">
      {children}
    </PortalAuthGuard>
  );
}
