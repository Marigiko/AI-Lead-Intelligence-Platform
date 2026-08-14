import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with proper precedence handling.
 * Uses clsx for conditional classes and tailwind-merge to resolve conflicts.
 *
 * @example
 * cn("px-4 py-2", isActive && "bg-purple-500", "px-6") // => "py-2 bg-purple-500 px-6"
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
