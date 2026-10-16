import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Ensina ao tailwind-merge os tokens do tailwind.config.ts: sem isso, `text-body`
// seria tratado como cor e sumiria ao lado de `text-muted-foreground`.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      spacing: ["page", "tap"],
    },
    classGroups: {
      "font-size": [{ text: ["caption", "label", "body", "title", "display"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
