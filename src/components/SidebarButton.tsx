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
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/5 to-transparent" />
      <div className="relative flex items-center justify-center gap-2">
        {children}
      </div>
    </motion.button>
  );
}
