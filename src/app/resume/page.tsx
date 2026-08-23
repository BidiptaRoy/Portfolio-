import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { buttonStyles } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatYearMonth } from "@/lib/format";
import { getCurrentResume } from "@/server/queries/resume";

export const metadata: Metadata = {
  title: "Resume",
  description: "Education, experience, projects, and skills in one page.",
  alternates: { canonical: "/resume" },
};

export default async function ResumePage() {
  const resume = await getCurrentResume();

  return (
    <Container width="narrow" className="py-16 sm:py-24">
      <SectionHeading
        level={1}
        eyebrow="Resume"
        title="Resume"
        lead={resume ? `Last updated ${formatYearMonth(resume.revisedAt)}.` : undefined}
      />

      {resume ? (
        <>
          <div className="mt-8 flex flex-wrap gap-3">
            {/*
              `download` is IGNORED cross-origin, so it does nothing at all
              for a file hosted on Blob — the button would quietly become
              "open in this tab". Blob serves a separate URL that sets
              `content-disposition: attachment` instead; the attribute is
              still correct for a file under /public, where it works.
            */}
            <a
              href={resume.downloadUrl ?? resume.fileUrl}
              download={resume.downloadUrl ? undefined : resume.downloadName}
              className={buttonStyles()}
            >
              Download PDF
            </a>
            <a
              href={resume.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonStyles({ variant: "secondary" })}
            >
              Open in new tab
            </a>
          </div>

          {/*
            An <object> rather than an <iframe>: it degrades to its children
            when the browser cannot render a PDF inline, which is the norm on
            iOS Safari and most Android browsers. An iframe would show a blank
            box there instead, with the download link buried above the fold.
          */}
          <object
            data={resume.fileUrl}
            type="application/pdf"
            aria-label="Resume preview"
            className="border-line bg-surface mt-8 hidden h-[46rem] w-full rounded-lg border sm:block"
          >
            <p className="text-ink-muted p-6 text-sm">
              Your browser cannot display PDFs inline.{" "}
              <a href={resume.fileUrl} className="text-accent hover:text-accent-hover">
                Download the resume
              </a>{" "}
              instead.
            </p>
          </object>
        </>
      ) : (
        <p className="text-ink-muted mt-8 text-sm">
          An updated resume is being prepared. In the meantime, the Experience and Projects pages
          cover the same ground.
        </p>
      )}
    </Container>
  );
}
