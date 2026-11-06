import type { Metadata } from "next";
import ProtectedShell from "@/components/protected-shell";
import WritingRoom from "@/components/writing-room";

export const metadata: Metadata = {
  title: "Phòng viết",
};

export default function NewWritingPage() {
  return (
    <ProtectedShell>
      <WritingRoom />
    </ProtectedShell>
  );
}
