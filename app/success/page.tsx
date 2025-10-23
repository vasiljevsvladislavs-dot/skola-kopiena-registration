export default function SuccessPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f8f2fa] px-4 py-12">
      <div className="max-w-md text-center bg-white rounded-2xl shadow p-8">
        <h1 className="text-2xl font-semibold text-[#4a2961] mb-3">
          Paldies! 🎉
        </h1>

        <p className="text-slate-700 mb-4">
          Jūsu reģistrācija projekta <strong>“Skola – kopienā”</strong> rudens
          konferencei <strong>“Vide. Skola. Kopiena.”</strong> ir apstiprināta.
        </p>

        <p className="text-slate-700 mb-4">
          Tikšanās 7. novembrī plkst. 11.00 tiešraidē!
        </p>

        <p className="text-slate-700 mb-4">
          Tiešraide būs skatāma projekta{" "}
          <a
            href="https://www.facebook.com/skolakopiena.lv"
            target="_blank"
            rel="noreferrer"
            className="text-[#4a2961] hover:underline"
          >
            Facebook lapā
          </a>{" "}
          un projekta tīmekļvietnē{" "}
          <a
            href="https://www.skola-kopiena.lv/news"
            target="_blank"
            rel="noreferrer"
            className="text-[#4a2961] hover:underline"
          >
            www.skola-kopiena.lv/news
          </a>
          .
        </p>

        <p className="text-slate-700">
          Ja radušies jautājumi, lūdzu, sazinieties:{" "}
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
