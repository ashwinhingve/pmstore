import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Account - PMSTORE",
  description: "Manage your account, orders, and preferences.",
};

export default function AccountLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
