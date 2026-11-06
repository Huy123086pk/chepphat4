import type { Metadata } from "next";
import ProtectedShell from "@/components/protected-shell";
import SettingsPage from "@/components/settings-page";

export const metadata: Metadata = {
  title: "Cài đặt",
};

export default function Settings() {
  return (
    <ProtectedShell>
      <SettingsPage />
    </ProtectedShell>
  );
}
