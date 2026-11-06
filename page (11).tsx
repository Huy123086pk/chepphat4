import type { Metadata } from "next";
import ProtectedShell from "@/components/protected-shell";
import Dashboard from "@/components/dashboard";

export const metadata: Metadata = {
  title: "Thư viện bài viết",
};

export default function HomePage() {
  return (
    <ProtectedShell>
      <Dashboard />
    </ProtectedShell>
  );
}
