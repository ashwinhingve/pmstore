import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Information - PMSTORE",
};

export default function InfoLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
