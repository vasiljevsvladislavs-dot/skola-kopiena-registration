// app/success/page.tsx
export const metadata = {
  title: "Reģistrācija apstiprināta — Skola – kopienā",
};

export default function SuccessPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f6f1fa] p-6">
      <div className="max-w-lg text-center bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-semibold text-[#4a2961] mb-4">
          Paldies! 🎉
        </h1>
        <p className="text-slate-700 mb-4">
          Jūsu reģistrācija projekta <b>“Skola – kopienā”</b> rudens konferencei
          <b> “Vide. Skola. Kopiena.”</b> ir apstiprināta.
        </p>
        <p className="text-slate-700 mb-4">
          Tiekamies 7. novembrī plkst. 11.00 tiešraidē!
        </p>
        <p className="text-slate-700">
          Ja radušies jautājumi, lūdzu, sazinieties:
          <br />
          <a
            href="mailto:rudenskonference@gmail.com"
            className="text-[#4a2961] font-medium hover:underline"
          >
            rudenskonference@gmail.com
          </a>
        </p>
      </div>
    </main>
  );
}
