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
    <div className="relative flex flex-col rounded-full bg-black/10 p-1 shadow-lg backdrop-blur-md select-none">
      <div
        className="pointer-events-none absolute inset-0 rounded-full bg-white/10"
        style={{
          maskImage:
            "radial-gradient(circle at top, black 0%, transparent 60%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-full border-[0.5px] border-white/20"
        style={{
          maskImage:
            "radial-gradient(circle at top, black 0%, rgba(0,0,0,.5) 60%)",
        }}
      />
      {filterOptions.map(({ icon: Icon, value, tooltipKey }) => (
        <Tooltip key={value} useTouch>
          <TooltipTrigger asChild>
            <motion.button
              className="relative flex size-10 items-center justify-center rounded-full"
              onClick={() => setCableFilter(value)}
              whileHover={{
                scale: 1.05,
              }}
              whileTap={{
                scale: 0.95,
              }}
            >
              <Icon className="size-6" />
              {cableFilter === value && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-white/10 shadow-sm shadow-black/5"
                  layoutId="cable-filter-active-indicator"
                >
                  <div
                    className="pointer-events-none absolute inset-0 rounded-full bg-white/10"
                    style={{
                      maskImage:
                        "radial-gradient(circle at top, black 0%, transparent 60%)",
                    }}
                  />
                  <div
                    className="pointer-events-none absolute inset-0 rounded-full border-[0.5px] border-white/20"
                    style={{
                      maskImage:
                        "radial-gradient(circle at top, black 0%, transparent 80%)",
                    }}
                  />
                </motion.div>
              )}
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{t(tooltipKey)}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
