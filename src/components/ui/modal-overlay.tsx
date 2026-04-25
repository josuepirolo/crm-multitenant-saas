"use client";

import { motion } from "framer-motion";

interface ModalOverlayProps {
  onClick?: () => void;
}

export function ModalOverlay({ onClick }: ModalOverlayProps) {
  return (
    <motion.div
      key="backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
      onClick={onClick}
    />
  );
}
