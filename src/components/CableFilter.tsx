import { motion } from "framer-motion";
import { CircleDot, CircleCheck, CircleX } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CableFilterProps {
  cableFilter: "all" | "normal" | "broken";
  setCableFilter: (filter: "all" | "normal" | "broken") => void;
  t: (key: string) => string;
}

const filterOptions = [
  { icon: CircleDot, value: "all" as const, tooltipKey: "filter.all" },
  { icon: CircleCheck, value: "normal" as const, tooltipKey: "filter.normal" },
  { icon: CircleX, value: "broken" as const, tooltipKey: "filter.broken" },
];

export default function CableFilter({
  cableFilter,
  setCableFilter,
  t,
}: CableFilterProps) {
  return (
    <div className="flex flex-col rounded-full border border-white/10 bg-[#19191B]/50 p-1 shadow-lg backdrop-blur-md select-none">
      {filterOptions.map(({ icon: Icon, value, tooltipKey }) => (
        <Tooltip key={value} useTouch>
          <TooltipTrigger asChild>
            <button
              className="relative flex size-10 items-center justify-center rounded-full"
              onClick={() => setCableFilter(value)}
            >
              <Icon className="size-6" />
              {cableFilter === value && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-white/10"
                  layoutId="cable-filter-active-indicator"
                />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{t(tooltipKey)}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
