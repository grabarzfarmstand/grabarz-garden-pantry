import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grabarz Garden & Pantry",
  description: "A seasonal farm and home market for pantry goods, garden harvests, handmade essentials, neighbor-made goods and gathered resale finds.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
