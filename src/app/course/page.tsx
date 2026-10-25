import { Suspense } from "react";
import type { Metadata } from "next";
import CourseView from "@/components/CourseView";

export const metadata: Metadata = {
  title: "Course grade calculator",
  robots: { index: false, follow: true },
};

export default function Page() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <CourseView />
    </Suspense>
  );
}
