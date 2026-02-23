import { Link } from "react-router-dom";
import { Calendar, Users, Building2, CreditCard, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/admin/calendar", label: "Calendar", icon: Calendar, desc: "View and manage shifts" },
  { to: "/admin/workers", label: "Workers", icon: Users, desc: "Workers and sick leave" },
  { to: "/admin/clients", label: "Clients", icon: Building2, desc: "Clients and budget alerts" },
  { to: "/admin/billing", label: "Billing", icon: CreditCard, desc: "SGB XI CSV export" },
  { to: "/admin/audit", label: "Audit Log", icon: FileText, desc: "Who did what, when" },
];

export function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Command center for Hausheld administration.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {links.map(({ to, label, icon: Icon, desc }) => (
          <Card key={to}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Icon className="h-5 w-5 text-primary" aria-hidden />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{desc}</p>
              <Link to={to}>
                <Button variant="secondary" size="sm" className="mt-4">
                  Open
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
