"use client";

import { motion, type MotionProps } from "framer-motion";

export const appleEase = [0.25, 0.46, 0.45, 0.94] as const;

export const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: { duration: 0.45, ease: appleEase },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.35, ease: appleEase },
};

export const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

type MotionDivProps = MotionProps & React.HTMLAttributes<HTMLDivElement>;

export function FadeUp({ children, className, ...props }: MotionDivProps) {
  return (
    <motion.div
      initial={fadeUp.initial}
      animate={fadeUp.animate}
      exit={fadeUp.exit}
      transition={fadeUp.transition}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function FadeIn({ children, className, ...props }: MotionDivProps) {
  return (
    <motion.div
      initial={fadeIn.initial}
      animate={fadeIn.animate}
      transition={fadeIn.transition}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
