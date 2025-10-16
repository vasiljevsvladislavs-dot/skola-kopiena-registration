"use client";

import { useState, useMemo } from "react";
import { z } from "zod";

const schema = z.object({
  fullName: z.string().min(2, "Lūdzu, ievadiet vārdu un uzvārdu"),
  email: z.string().email("Nederīga e-pasta adrese"),
  org: z.string().optional(),
  role: z.string().optional(),
  about: z.enum(["site","social","friends","other"], { required_error: "Lūdzu, izvēlieties variantu" }),
  aboutOther: z.string().optional(),
  notes: z.string().optional(),
  consent: z.literal(true, { errorMap: () => ({ message: "Nepieciešama piekrišana" }) }),
});

export default function Page() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const aboutOptions = useMemo(() => ([
    { value: "site", label: "Projekta “Skola – kopiena” mājaslapā" },
    { value: "social", label: "Projekta “Skola – kopiena” sociālajos tīklos (Facebook, Instagram)" },
    { value: "friends", label: "No kolēģiem / draugiem" },
    { value: "other", label: "Cits (lūdzu, precizējiet)" },
  ]), []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      fullName: String(fd.get("fullName")||""),
      email: String(fd.get("email")||""),
      org: String(fd.get("org")||""),
      role: String(fd.get("role")||""),
      about: String(fd.get("about")||""),
      aboutOther: String(fd.get("aboutOther")||""),
      notes: String(fd.get("notes")||""),
      consent: fd.get("consent")==="on",
    };

    const parsed = schema.safeParse({
      ...payload,
      about: (["site","social","friends","other"].includes(payload.about) ? payload.about : undefined) as any,
    });
    if (!parsed.success) {
      setLoading(false);
      setError(parsed.error.errors[0]?.message || "Pārbaudiet ievades laukus");
      return;
    }
    if (parsed.data.about === "other" && !payload.aboutOther.trim()) {
      setLoading(false);
      setError("Lūdzu, precizējiet 'Cits' lauku");
      return;
    }

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    setLoading(false);
    if (!res.ok) {
      const t = await res.text();
      setError(t || "Kļūda. Mēģiniet vēlreiz.");
      return;
    }
    window.location.href = "/success";
  }

  return (
    <main className="py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">“Skola – kopienā” rudens konference “Vide. Skola. Kopiena.”</h1>
        <p className="text-slate-600">7. novembrī plkst. 11.00 · tiešraide</p>
      </header>

      <div className="grid md:grid-cols-5 gap-8">
        <section className="md:col-span-3">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
            <p className="text-slate-700 mb-5">
              Aicinām reģistrēties, lai piedalītos konferencē. Konferences laikā runāsim par skolu un kopienu sadarbības
              stiprināšanu, skolēnu un pedagogu labsajūtu, iekļaujošu vidi, kā arī par skolēnu kavējumu problemātiku Latvijā,
              iespējamiem risinājumiem un gūto pieredzi.
            </p>

            {error && <div className="mb-5 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="block text-sm mb-1">Vārds, uzvārds *</label>
                <input name="fullName" className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>

              <div>
                <label className="block text-sm mb-1">E-pasts *</label>
                <input type="email" name="email" className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>

              <div>
                <label className="block text-sm mb-1">Pārstāvētā izglītības iestāde / organizācija / pašvaldība</label>
                <input name="org" className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>

              <div>
                <label className="block text-sm mb-1">Amats (piem., skolotājs, direktors, pašvaldības pārstāvis, vecāks, u.c.)</label>
                <input name="role" className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>

              <div>
                <label className="block text-sm mb-1">Kā uzzinājāt par konferenci? *</label>
                <div className="space-y-2">
                  {aboutOptions.map((opt) => (
                    <label key={opt.value} className="flex items-start gap-3 text-sm">
                      <input type="radio" name="about" value={opt.value} className="mt-1" />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                  <div className="pl-7">
                    <input name="aboutOther" placeholder="Ja izvēlējāties “Cits”, lūdzu, precizējiet" className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">Jautājumi / piezīmes</label>
                <textarea name="notes" rows={4} className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </div>

              <label className="flex items-start gap-3 text-sm select-none">
                <input type="checkbox" name="consent" className="mt-1" />
                <span>Piekrītu, ka mani dati tiek izmantoti tikai konferences organizēšanas nolūkos, saskaņā ar datu aizsardzības noteikumiem.</span>
              </label>

              <button type="submit" disabled={loading} className="rounded-xl bg-sky-600 text-white px-5 py-3 font-medium hover:bg-sky-700 disabled:opacity-60">
                {loading ? "Nosūtīšana…" : "Reģistrēties"}
              </button>
            </form>
          </div>
        </section>

        <aside className="md:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-sky-50 p-6">
            <h3 className="text-lg font-semibold mb-2">Par konferenci</h3>
            <p className="text-slate-700">Runāsim par skolu un kopienu sadarbības stiprināšanu, skolēnu un pedagogu labsajūtu, iekļaujošu vidi, kā arī par skolēnu kavējumu problemātiku, risinājumiem un pieredzi Latvijā.</p>
            <ul className="mt-4 space-y-1 text-slate-700">
              <li>📅 7. novembris</li>
              <li>🕚 11.00 (tiešraide)</li>
              <li>🌐 www.skola-kopiena.lv</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
