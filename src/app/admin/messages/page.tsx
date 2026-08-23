import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { isEmailConfigured } from "@/lib/email";
import { deleteMessage, setMessageRead } from "@/server/actions/contact-admin";
import { getMessagesForAdmin } from "@/server/queries/admin";

/** Absolute, with the time — "2 days ago" is not what you want on a message. */
function formatReceived(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function AdminMessagesPage() {
  const messages = await getMessagesForAdmin();
  const unread = messages.filter((message) => !message.read).length;
  const emailConfigured = isEmailConfigured();

  return (
    <Container className="py-12">
      <SectionHeading
        level={1}
        eyebrow="Inbox"
        title="Messages"
        lead={
          messages.length === 0
            ? "Nothing yet. Messages sent through the contact form arrive here."
            : `${messages.length} message${messages.length === 1 ? "" : "s"}, ${unread} unread.`
        }
      />

      {/*
        Stated plainly rather than left to be discovered. Without a key the
        form still works and still stores every message — but nothing tells
        Bidipta one arrived, so this page is the only place they exist.
      */}
      {!emailConfigured ? (
        <p
          role="status"
          className="border-line text-ink-muted mt-6 rounded-md border border-dashed px-3 py-4 text-sm"
        >
          Email notifications are not configured, so nothing is sent when a message arrives — check
          this page. Messages are still received and stored. Set <code>RESEND_API_KEY</code> to turn
          notifications on.
        </p>
      ) : null}

      <ul className="mt-8 flex flex-col gap-4">
        {messages.map((message) => (
          <li
            key={message.id}
            className={`rounded-lg border p-4 ${
              message.read ? "border-line" : "border-line-strong bg-surface"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-ink text-sm font-medium">{message.name}</span>
                  {message.read ? null : <Badge>Unread</Badge>}
                  {message.notifiedAt === null ? <Badge>Not emailed</Badge> : null}
                </div>

                <a
                  href={`mailto:${message.email}?subject=${encodeURIComponent(
                    message.subject ? `Re: ${message.subject}` : "Re: your message",
                  )}`}
                  className="text-accent hover:text-accent-hover text-xs transition-colors"
                >
                  {message.email}
                </a>

                <p className="text-ink-muted text-xs">{formatReceived(message.createdAt)}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <form
                  action={async () => {
                    "use server";
                    await setMessageRead(message.id, !message.read);
                  }}
                >
                  <Button type="submit" variant="secondary" size="sm">
                    {message.read ? "Mark unread" : "Mark read"}
                  </Button>
                </form>

                <form
                  action={async () => {
                    "use server";
                    await deleteMessage(message.id);
                  }}
                >
                  <Button type="submit" variant="secondary" size="sm">
                    Delete
                  </Button>
                </form>
              </div>
            </div>

            {message.subject ? (
              <p className="text-ink mt-4 text-sm font-medium">{message.subject}</p>
            ) : null}

            {/*
              `whitespace-pre-wrap` keeps the sender's paragraphs. Rendered as
              text, never as markup — this is the one string on the site
              written by someone who is not the owner.
            */}
            <p className="text-ink-muted mt-2 text-sm leading-relaxed whitespace-pre-wrap">
              {message.message}
            </p>
          </li>
        ))}
      </ul>
    </Container>
  );
}
