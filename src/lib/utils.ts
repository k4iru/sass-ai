import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { NextResponse } from "next/server";

//TODO REMOVE tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const response = (success: boolean, message: string, status: number): NextResponse => {
  return NextResponse.json({ success, message }, { status });
};
