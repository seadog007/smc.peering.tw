import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { splitIncidentDescription } from '@/lib/incident-glossary';

function GlossaryTerm({ text, title, description }: {
  text: string;
  title: string;
  description: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline cursor-help rounded-xs border-0 bg-transparent p-0 text-left font-[inherit] text-inherit underline decoration-dotted underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
          onClick={(event) => {
            // Radix normally closes on click; keep the explanation open on tap.
            event.preventDefault();
            setOpen(true);
          }}
        >
          {text}
        </button>
      </TooltipTrigger>
      <TooltipContent
        sideOffset={6}
        collisionPadding={16}
        className="max-w-[min(20rem,calc(100vw-2rem))] text-left text-pretty"
      >
        <span className="block font-semibold">{title}</span>
        <span className="mt-1 block">{description}</span>
      </TooltipContent>
    </Tooltip>
  );
}

export default function IncidentDescription({ description }: { description: string }) {
  const { t, i18n } = useTranslation();

  return splitIncidentDescription(description).map((part) => {
    if (!part.term) return part.text;
    const titleKey = `incidentGlossary.${part.term}.title`;
    const descriptionKey = `incidentGlossary.${part.term}.description`;
    if (!i18n.exists(titleKey) || !i18n.exists(descriptionKey)) return part.text;

    const title = t(titleKey);
    const explanation = t(descriptionKey);
    if (!title || !explanation) return part.text;

    return (
      <GlossaryTerm
        key={part.start}
        text={part.text}
        title={title}
        description={explanation}
      />
    );
  });
}
