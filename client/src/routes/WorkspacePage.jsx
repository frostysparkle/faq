import { Badge } from "@/components/ui/badge.jsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";

const queueItems = [
  "Governance review",
  "Evidence check",
  "Publishing approval"
];

export default function WorkspacePage({ title, description }) {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[1.5fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {queueItems.map((item, index) => (
              <div key={item} className="rounded-md border bg-background p-4">
                <p className="text-xs font-medium text-muted-foreground">Stage {index + 1}</p>
                <p className="mt-2 text-sm font-semibold">{item}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Operating Mode</CardTitle>
          <CardDescription>Role-aware review and publishing flows</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge>RBAC</Badge>
          <Badge variant="secondary">Audit Trail</Badge>
          <Badge variant="accent">Validated Data</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
