import Link from "next/link";

import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Rule } from "@/components/ui/rule";
import { SectionHeading } from "@/components/ui/section-heading";

import { getCurrentExperience } from "@/server/queries/experience";
import { getProfile } from "@/server/queries/profile";

// Interim home page. The full layout — featured projects, an experience
// strip, a contact prompt — is Phase 4. What matters here is that every
// value below comes through src/server/queries, never from src/content.

/** Shown as hero badges. Drawn from real project stacks, not aspiration. */
const technologies = ["TypeScript", "React", "Next.js", "Node.js", "Python", "MongoDB"];

const sections = [
  {
    href: "/projects",
    title: "Projects",
    body: "Things I have designed and built, with the reasoning and the trade-offs behind them.",
  },
  {
    href: "/experience",
    title: "Experience",
    body: "Technical work alongside independent professional services and client-facing roles.",
  },
  {
    href: "/about",
    title: "About",
    body: "Background, what I am working toward, and how I like to build software.",
  },
];

export default async function HomePage() {
  const [profile, current] = await Promise.all([getProfile(), getCurrentExperience()]);

  return (
    <Container className="py-16 sm:py-24">
      <section className="flex flex-col gap-6">
        <Eyebrow>Computer Science · Boston University</Eyebrow>

        <h1 className="text-ink font-serif text-4xl leading-[1.05] sm:text-6xl">{profile.name}</h1>

        <p className="text-ink-muted max-w-xl text-lg leading-relaxed">{profile.shortBio}</p>

        {current ? (
          <p className="text-ink-muted text-sm">
            Currently{" "}
            <span className="text-ink">
              {current.title}
              {current.organization ? ` at ${current.organization}` : null}
            </span>
            .
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap gap-3">
          <Link href="/projects" className={buttonStyles()}>
            View projects
          </Link>
          <Link href="/about" className={buttonStyles({ variant: "secondary" })}>
            About me
          </Link>
        </div>

        <ul className="mt-4 flex flex-wrap gap-2">
          {technologies.map((tech) => (
            <li key={tech}>
              <Badge>{tech}</Badge>
            </li>
          ))}
        </ul>
      </section>

      <Rule ornament className="my-16" />

      <section className="flex flex-col gap-8">
        <SectionHeading
          eyebrow="Start here"
          title="What you'll find"
          lead="The site is organized around three things: what I have built, where I have worked, and how I think about the work."
        />

        <div className="grid gap-4 sm:grid-cols-3">
          {sections.map((section, index) => (
            <Link key={section.href} href={section.href} className="group rounded-lg">
              <Card
                accent={index === 0}
                className="group-hover:border-line-strong h-full transition-colors"
              >
                <CardTitle className="group-hover:text-accent">{section.title}</CardTitle>
                <CardBody className="mt-2">{section.body}</CardBody>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </Container>
  );
}
