import { Link } from "@tanstack/react-router";

const tabs = [
  { to: "/admin", label: "Upload" },
  { to: "/admin/catalog", label: "Catalogue" },
  { to: "/admin/analytics", label: "Analytics" },
] as const;

export function AdminTabs() {
  return (
    <nav className="flex gap-1 border-b border-border">
      {tabs.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          activeOptions={{ exact: true }}
          className="-mb-px border-b-2 border-transparent px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          activeProps={{ className: "-mb-px border-b-2 border-primary px-4 py-2.5 text-sm text-foreground" }}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export function StaffGate(props: { ready: boolean; staff: boolean; email: string | null; children: React.ReactNode }) {
  if (!props.ready) {
    return <div className="mx-auto max-w-[1400px] px-4 py-24 text-sm text-muted-foreground sm:px-6">Checking your access.</div>;
  }
  if (!props.staff) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 sm:px-6">
        <h1 className="text-2xl font-semibold text-foreground">Access restricted</h1>
        <p className="mt-3 text-sm text-muted-foreground">The account {props.email} is not allowed in the studio.</p>
        <Link to="/home" className="mt-6 inline-block text-sm text-primary">Back to LOVAN</Link>
      </div>
    );
  }
  return <>{props.children}</>;
}
