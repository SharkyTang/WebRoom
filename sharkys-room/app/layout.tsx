import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: "Sharky's Room · Web Foundation", description: 'Frozen room blockout — v0.3 local Web Foundation.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
