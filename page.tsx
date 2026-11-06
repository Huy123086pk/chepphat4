import type { Metadata } from "next";
import LockScreen from "@/components/lock-screen";

export const metadata: Metadata = {
  title: "Khóa",
};

export default function LockPage() {
  return <LockScreen />;
}
