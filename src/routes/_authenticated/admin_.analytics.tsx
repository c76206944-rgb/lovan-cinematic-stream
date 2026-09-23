import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "@/lib/use-account";
import { AdminTabs, StaffGate } from "@/components/site/AdminTabs";
import { getCatalogAnalytics } from "@/lib/catalog.functions";

export const Route = createFileRoute("/_authenticated/admin_/analytics")({
  head: () => ({
    meta: [
      { title: "Studio analytics | LOVAN" },
      { name: "description", content: "Catalogue counts, publication status, storage and upload activity." },
      { property: "og:title", content: "Studio analytics | LOVAN" },
      { property: "og:description", content: "Catalogue counts, publication status, storage and upload activity." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AnalyticsPage,
});

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

const QUOTA = 2 * 1024 * 1024 * 1024 * 50;

function AnalyticsPage() {
  const account = useAccount();
  const fetchStats = useServerFn(getCatalogAnalytics);
  const { data, error, isLoading } = useQuery({
    queryKey: ["catalog-analytics"],
    queryFn: () => fetchStats(),
    enabled: account.staff,
  });

  const totalBytes = data?.storage.reduce((s, x) => s + x.bytes, 0) ?? 0;
  const totalFiles = data?.storage.reduce((s, x) => s + x.files, 0) ?? 0;
  const maxDay = Math.max(1, ...(data?.activity.map((d) => d.count) ?? [1]));
  const uploads30 = data?.activity.reduce((s, d) => s + d.count, 0) ?? 0;

  return (
    <StaffGate ready={account.ready} staff={account.staff} email={account.email}>
      <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold text-foreground">Studio</h1>
        <div className="mt-4">
          <AdminTabs />
        </div>

        {isLoading ? <p className="mt-8 text-sm text-muted-foreground">Loading figures.</p> : null}
        {error ? <p className="mt-8 text-sm text-primary">{error.message}</p> : null}

        {data ? (
          <div className="mt-8 space-y-8">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
              <Stat label="Titles in catalogue" value={data.total} />
              <Stat label="Films" value={data.movies} />
              <Stat label="Series episodes" value={data.episodes} />
              <Stat label="Uploads, last 30 days" value={uploads30} />
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              <section className="rounded-lg border border-border p-5">
                <h2 className="text-sm font-medium text-foreground">Publication status</h2>
                <div className="mt-4 flex h-3 overflow-hidden rounded bg-surface">
                  {data.total > 0 ? (
                    <>
                      <div className="bg-primary" style={{ width: `${(data.published / data.total) * 100}%` }} />
                      <div className="bg-muted-foreground/50" style={{ width: `${(data.drafts / data.total) * 100}%` }} />
                      <div className="bg-border" style={{ width: `${(data.archived / data.total) * 100}%` }} />
                    </>
                  ) : null}
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
                  <Mini label="Published" value={data.published} />
                  <Mini label="Drafts" value={data.drafts} />
                  <Mini label="Archived" value={data.archived} />
                  <Mini label="Premium only" value={data.premium} />
                  <Mini label="With adverts" value={data.withAds} />
                </dl>
              </section>

              <section className="rounded-lg border border-border p-5">
                <h2 className="text-sm font-medium text-foreground">Storage usage</h2>
                <p className="mt-3 text-2xl font-semibold text-foreground">{formatBytes(totalBytes)}</p>
                <p className="text-xs text-muted-foreground">{totalFiles} files in private storage</p>
                <div className="mt-4 h-2 overflow-hidden rounded bg-surface">
                  <div className="h-full bg-primary" style={{ width: `${Math.min(100, (totalBytes / QUOTA) * 100)}%` }} />
                </div>
                <table className="mt-4 w-full text-sm">
                  <tbody>
                    {data.storage.length === 0 ? (
                      <tr><td className="py-2 text-muted-foreground">No files uploaded yet.</td></tr>
                    ) : (
                      data.storage.map((s) => (
                        <tr key={s.folder} className="border-t border-border">
                          <td className="py-2 capitalize text-foreground">{s.folder}</td>
                          <td className="py-2 text-muted-foreground">{s.files} files</td>
                          <td className="py-2 text-right text-muted-foreground">{formatBytes(s.bytes)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </section>
            </div>

            <section className="rounded-lg border border-border p-5">
              <h2 className="text-sm font-medium text-foreground">Upload activity, last 30 days</h2>
              <div className="mt-5 flex h-40 items-end gap-1">
                {data.activity.map((d) => (
                  <div key={d.day} className="group relative flex-1" title={`${d.day}: ${d.count}`}>
                    <div
                      className={d.count ? "rounded-sm bg-primary" : "rounded-sm bg-surface"}
                      style={{ height: `${Math.max(4, (d.count / maxDay) * 150)}px` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{data.activity[0]?.day}</span>
                <span>{data.activity[data.activity.length - 1]?.day}</span>
              </div>
            </section>

            <section className="rounded-lg border border-border p-5">
              <h2 className="text-sm font-medium text-foreground">Top genres</h2>
              {data.genres.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No genres yet.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {data.genres.map((g) => (
                    <li key={g.name} className="flex items-center gap-3 text-sm">
                      <span className="w-32 truncate text-foreground">{g.name}</span>
                      <div className="h-2 flex-1 rounded bg-surface">
                        <div className="h-full rounded bg-primary" style={{ width: `${(g.count / (data.genres[0]?.count ?? 1)) * 100}%` }} />
                      </div>
                      <span className="w-8 text-right text-muted-foreground">{g.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </StaffGate>
  );
}

function Stat(props: { label: string; value: number }) {
  return (
    <div className="bg-background p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{props.label}</p>
      <p className="mt-2 text-3xl font-semibold text-foreground">{props.value}</p>
    </div>
  );
}

function Mini(props: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{props.label}</dt>
      <dd className="mt-1 text-lg text-foreground">{props.value}</dd>
    </div>
  );
}
