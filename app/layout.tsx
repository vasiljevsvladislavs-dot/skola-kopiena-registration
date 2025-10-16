import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reģistrācija — “Skola – kopienā” konference",
  description: "Vienkārša reģistrācijas forma ar e-pasta apstiprinājumu",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lv">
      <body className="min-h-screen">
        <div className="max-w-4xl mx-auto p-6">{children}</div>
      </body>
    </html>
  );
}
