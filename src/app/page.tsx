import Link from "next/link";

import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Rule } from "@/components/ui/rule";
import { SectionHeading } from "@/components/ui/section-heading";

// Placeholder home. Real copy, featured projects, and experience arrive in
// Phase 4, sourced through src/server/queries — see docs/roadmap.md.
// This page exists so the design system can be judged on a real screen.

const technologies = ["TypeScript", "React", "Node.js", "Python", "PostgreSQL", "Next.js"];

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

export default function HomePage() {
  return (
    <Container className="py-16 sm:py-24">
      <section className="flex flex-col gap-6">
        <Eyebrow>Computer Science · Boston University</Eyebrow>

        <h1 className="text-ink font-serif text-4xl leading-[1.05] sm:text-6xl">Bidipta Roy</h1>

        <p className="text-ink-muted max-w-xl text-lg leading-relaxed">
          Software engineer focused on building things that stay maintainable long after the first
          release — full-stack applications, clean data models, and interfaces that get out of the
          way.
        </p>

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
