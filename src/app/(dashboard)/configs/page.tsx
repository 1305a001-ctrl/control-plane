import Link from "next/link";
import { api } from "~/trpc/server";
import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

export default async function ConfigsPage() {
  const configs = await api.configs.list();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Research Configs</h1>
          <p className="text-sm text-gray-400">
            Pipeline reads the active config for each slug on every run.
          </p>
        </div>
        <Link
          href="/configs/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500"
        >
          New Config
        </Link>
      </div>

      {configs.length === 0 ? (
        <p className="text-sm text-gray-500">No configs yet. Create one to start the pipeline.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Slug</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-sm">{c.slug}</TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell className="text-gray-400">v{c.version}</TableCell>
                <TableCell>
                  <Badge variant={c.isActive ? "default" : "secondary"}>
                    {c.isActive ? "active" : "inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-400 text-sm">
                  {c.createdAt.toLocaleDateString()}
                </TableCell>
                <TableCell className="text-gray-400 text-sm">{c.createdBy}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
