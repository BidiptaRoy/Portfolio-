import { notFound } from "next/navigation";

import { SkillForm } from "@/components/admin/skill-form";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { deleteSkill } from "@/server/actions/content";
import { getSkillForAdmin } from "@/server/queries/admin";

export default async function EditSkillPage({ params }: PageProps<"/admin/skills/[id]">) {
  const { id } = await params;
  const skill = await getSkillForAdmin(id);

  if (!skill) notFound();

  return (
    <Container width="narrow" className="py-12">
      <SectionHeading level={1} eyebrow="Skills" title={skill.name} />

      <div className="mt-8">
        <SkillForm skill={skill} />
      </div>

      <div className="border-line mt-12 border-t pt-6">
        <form
          action={async () => {
            "use server";
            await deleteSkill(skill.id);
          }}
        >
          <Button type="submit" variant="secondary" size="sm">
            Delete this skill
          </Button>
        </form>
      </div>
    </Container>
  );
}
