'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

// next-themes injects an inline <script> to prevent theme flicker.
// With React 19, rendering that <script> during client render logs a noisy warning:
// "Encountered a script tag while rendering React component..."
//
// We suppress only that specific message in development.
if (
  process.env.NODE_ENV === 'development' &&
  !(globalThis as any).__mygarage_suppress_nextthemes_script_tag_warning__
) {
  ;(globalThis as any).__mygarage_suppress_nextthemes_script_tag_warning__ = true

  const originalError = console.error
  const originalWarn = console.warn
  const shouldSuppress = (args: unknown[]) =>
    args.some(
      (arg) =>
        typeof arg === 'string' &&
        arg.includes('Encountered a script tag while rendering React component'),
    )

  console.error = (...args: unknown[]) => {
    if (shouldSuppress(args)) return
    originalError(...(args as Parameters<typeof console.error>))
  }

  console.warn = (...args: unknown[]) => {
    if (shouldSuppress(args)) return
    originalWarn(...(args as Parameters<typeof console.warn>))
  }
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
