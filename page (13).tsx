import type { Metadata } from "next";
import ProtectedShell from "@/components/protected-shell";
import WritingRoom from "@/components/writing-room";

export const metadata: Metadata = {
  title: "Phòng viết",
};

export default async function WritingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ProtectedShell>
      <WritingRoom docId={id} />
    </ProtectedShell>
  );
}
