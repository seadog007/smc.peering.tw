import { motion } from "motion/react";
export default function SidebarButton({
  onClick,
  children,
}: {
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="relative flex w-full cursor-pointer items-center justify-center rounded-full bg-white/5 p-2 text-sm font-medium text-white hover:bg-white/10"
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
      <div
        className="relative flex items-center justify-center gap-2 drop-shadow-sm drop-shadow-white/5"
        style={{
          maskImage:
            "radial-gradient(circle at bottom, black 0%, rgba(0,0,0,.75) 50%)",
        }}
      >
        {children}
      </div>
    </motion.button>
  );
}
