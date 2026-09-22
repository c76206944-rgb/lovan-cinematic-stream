import { PageHeading } from "./TitleGrid";

export type Section = { heading: string; body: string };

export function Prose({
  title,
  description,
  sections,
}: {
  title: string;
  description: string;
  sections: Section[];
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <PageHeading title={title} description={description} />
      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-base font-semibold text-foreground">{section.heading}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
