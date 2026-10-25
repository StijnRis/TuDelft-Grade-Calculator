import type { Metadata } from "next";
import Link from "next/link";
import CourseSearch from "@/components/CourseSearch";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const faq = [
  ["Where does the data come from?", "Live from the official TU Delft study guide, in your browser. Nothing is stored on a server."],
  ["How are the weights detected?", "The free-form assessment text is parsed for percentages and fractions. The original text is always shown with the detected parts highlighted, and you can edit every weight."],
  ["Is this official?", "No. It is an unofficial student tool. The study guide and your examiner decide."],
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>TU Delft grade calculator</h1>
        <p>Enter a course code to see its assessment, then calculate your final grade – or the grade you still need.</p>
        <CourseSearch />
        <p className="muted">No course loaded? Use the <Link href="/calculator/">manual calculator</Link>.</p>
      </section>
      <section>
        <h2>How it works</h2>
        <ol>
          <li>Search a course code from the study guide.</li>
          <li>Check the parsed weights against the original assessment text.</li>
          <li>Fill in your grades and see the outcome.</li>
        </ol>
      </section>
      <section>
        <h2>FAQ</h2>
        {faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
            }),
          }}
        />
      </section>
    </>
  );
}
