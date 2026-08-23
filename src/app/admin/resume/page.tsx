import { ResumeUploadForm } from "@/components/admin/resume-form";
import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatYearMonth } from "@/lib/format";
import { isStorageConfigured } from "@/lib/storage";
import { deleteResumeVersion, setCurrentResume, setResumeStatus } from "@/server/actions/resume";
import { getResumeVersionsForAdmin } from "@/server/queries/admin";

export default async function AdminResumePage() {
  const versions = await getResumeVersionsForAdmin();
  const storageConfigured = isStorageConfigured();

  return (
    <Container className="py-12">
      <SectionHeading
        level={1}
        eyebrow="Content"
        title="Resume"
        lead="Revisions are kept, not overwritten. Exactly one is offered for download."
      />

      <div className="mt-8">
        {storageConfigured ? (
          <ResumeUploadForm />
        ) : (
          <p
            role="status"
            className="border-line text-ink-muted rounded-md border border-dashed px-3 py-4 text-sm"
          >
            File storage is not configured, so uploads are unavailable. Create a Blob store (Vercel
            → Storage → Blob) and set <code>BLOB_READ_WRITE_TOKEN</code> in the environment. The
            revisions below are unaffected.
          </p>
        )}
      </div>

      <h2 className="text-ink mt-12 font-serif text-lg">Revisions</h2>

      {versions.length === 0 ? (
        <p className="text-ink-muted mt-2 text-sm">
          No revisions. The public Resume page renders without a download link, which is a supported
          state — it says an updated resume is being prepared.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {versions.map((version) => (
            <li
              key={version.id}
              className="border-line flex flex-wrap items-start justify-between gap-4 rounded-lg border p-4"
            >
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-ink text-sm font-medium">{version.label}</span>
                  {version.isCurrent ? <Badge>Current</Badge> : null}
                  {version.status === "DRAFT" ? <Badge>Draft</Badge> : null}
                  {version.pathname === null ? <Badge>In repository</Badge> : null}
                </div>

                <p className="text-ink-muted text-xs">
                  Revised {formatYearMonth(version.revisedAt)} · saves as {version.downloadName}
                </p>

                <a
                  href={version.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent-hover text-xs transition-colors"
                >
                  Open this file ↗
                </a>
              </div>

              <div className="flex flex-wrap gap-2">
                {/*
                  Inline server actions rather than a client component: these
                  are one-field state changes with nothing to validate, and
                  each still re-checks the session inside the action itself.
                */}
                {version.isCurrent ? null : (
                  <form
                    action={async () => {
                      "use server";
                      await setCurrentResume(version.id);
                    }}
                  >
                    <Button type="submit" variant="secondary" size="sm">
                      Make current
                    </Button>
                  </form>
                )}

                <form
                  action={async () => {
                    "use server";
                    await setResumeStatus(
                      version.id,
                      version.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                    );
                  }}
                >
                  <Button type="submit" variant="secondary" size="sm">
                    {version.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                  </Button>
                </form>

                <form
                  action={async () => {
                    "use server";
                    await deleteResumeVersion(version.id);
                  }}
                >
                  <Button type="submit" variant="secondary" size="sm">
                    Delete
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-ink-muted mt-8 max-w-prose text-sm">
        Unpublishing every revision is a deliberate option: it takes the resume off the site without
        deleting anything, which is what to do when a published PDF turns out to have an error in
        it.
      </p>
    </Container>
  );
}
