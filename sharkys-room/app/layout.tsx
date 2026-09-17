import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: "Sharky's Room · Interaction Prototype", description: 'Frozen room blockout — v0.4 local Interaction Prototype.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
