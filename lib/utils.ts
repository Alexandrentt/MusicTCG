import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function generateUUID() {
  return 'inst_' + Math.random().toString(36).substring(2, 11);
}
