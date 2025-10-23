"use client";

import { useState, useMemo, useEffect } from "react";
import { z } from "zod";
import { Calendar, Clock, Globe } from "lucide-react";

const schema = z
  .object({
    fullName: z.string().min(2, "Lūdzu, ievadiet vārdu un uzvārdu"),
    email: z.string().email("Nederīga e-pasta adrese"),
    org: z.string().min(1, "Lūdzu, ievadiet iestādi / organizāciju"),
    municipality: z.string().min(1, "Lūdzu, ievadiet pašvaldību"),
    role: z.string().min(1, "Lūdzu, ievadiet amatu"),
    about: z.enum(["site", "social", "friends", "other"], {
      required_error: "Lūdzu, izvēlieties variantu",
    }),
    aboutOther: z.string().optional(),
    notes: z.string().optional(),
    consent: z.literal(true, {
      errorMap: () => ({ message: "Nepieciešama piekrišana" }),
    }),
  })
  .superRefine((val, ctx) => {
    if (val.about === "other" && (!val.aboutOther || !val.aboutOther.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["aboutOther"],
        message: "Lūdzu, precizējiet 'Cits' lauku",
      });
    }
  });

export default function Page() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [aboutValue, setAboutValue] = useState<string>("");

  const aboutOptions = useMemo(
    () => [
      { value: "site", label: "Projekta “Skola – kopiena” mājaslapā" },
      { value: "social", label: "Projekta “Skola – kopiena” sociālajos tīklos (Facebook, Instagram)" },
      { value: "friends", label: "No kolēģiem / draugiem" },
      { value: "other", label: "Cits (lūdzu, precizējiet)" },
    ],
    []
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      fullName: String(fd.get("fullName") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      org: String(fd.get("org") || "").trim(),
      municipality: String(fd.get("municipality") || "").trim(),
      role: String(fd.get("role") || "").trim(),
      about: String(fd.get("about") || ""),
      aboutOther: String(fd.get("aboutOther") || "").trim(),
      notes: String(fd.get("notes") || "").trim(),
      consent: fd.get("consent") === "on",
    };

    const parsed = schema.safeParse({
      ...payload,
      about: (["site", "social", "friends", "other"].includes(payload.about)
        ? (payload.about as "site" | "social" | "friends" | "other")
        : undefined),
    });

    if (!parsed.success) {
      setLoading(false);
      const perField: Record<string, string> = {};
      for (const issue of parsed.error.errors) {
        const key = issue.path?.[0] as string;
        if (key) perField[key] = issue.message;
      }
      setFieldErrors(perField);
      setError(parsed.error.errors[0]?.message || "Pārbaudiet ievades laukus");
      return;
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const t = await res.text();
        setError(t || "Kļūda. Mēģiniet vēlreiz.");
        return;
      }
      window.location.href = "/success";
    } catch (err) {
      setError("Kļūda nosūtot datus");
    } finally {
      setLoading(false);
    }
  }

  const isOther = aboutValue === "other";

  return (
    <main className="py-8" data-debug="register-page">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          “Skola – kopienā” rudens konference “Vide. Skola. Kopiena.”
        </h1>
        <p className="text-slate-600 flex items-center gap-2 mt-1">
          <Calendar className="w-4 h-4 text-[#4a2961]" aria-hidden="true" />
          7. novembrī plkst. 11.00 · tiešraide
        </p>
      </header>

      <div className="grid md:grid-cols-5 gap-8">
        {/* ---------- FORM ---------- */}
        <section className="md:col-span-3">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
            <p className="text-slate-700 mb-5">
              Aicinām šeit reģistrēties, lai piedalītos konferencē “Vide. Skola. Kopiena.”.
            </p>

            {error && (
              <div className="mb-5 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              {/* Name */}
              <div>
                <label className="block text-sm mb-1">Vārds, uzvārds *</label>
                <input
                  name="fullName"
                  required
                  aria-invalid={!!fieldErrors.fullName}
                  className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-[#4a2961] focus:ring-2 focus:ring-[#eae3f2]"
                />
                {fieldErrors.fullName && (
                  <p className="mt-1 text-sm text-rose-700">{fieldErrors.fullName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm mb-1">E-pasts *</label>
                <input
                  type="email"
                  name="email"
                  required
                  aria-invalid={!!fieldErrors.email}
                  className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-[#4a2961] focus:ring-2 focus:ring-[#eae3f2]"
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-sm text-rose-700">{fieldErrors.email}</p>
                )}
              </div>

              {/* Organization */}
              <div>
                <label className="block text-sm mb-1">
                  Pārstāvētā izglītības iestāde / organizācija *
                </label>
                <input
                  name="org"
                  required
                  aria-invalid={!!fieldErrors.org}
                  className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-[#4a2961] focus:ring-2 focus:ring-[#eae3f2]"
                />
                {fieldErrors.org && (
                  <p className="mt-1 text-sm text-rose-700">{fieldErrors.org}</p>
                )}
              </div>

              {/* Municipality */}
              <div>
                <label className="block text-sm mb-1">Pārstāvētā pašvaldība *</label>
                <input
                  name="municipality"
                  required
                  aria-invalid={!!fieldErrors.municipality}
                  className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-[#4a2961] focus:ring-2 focus:ring-[#eae3f2]"
                />
                {fieldErrors.municipality && (
                  <p className="mt-1 text-sm text-rose-700">{fieldErrors.municipality}</p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm mb-1">Amats / loma *</label>
                <input
                  name="role"
                  required
                  aria-invalid={!!fieldErrors.role}
                  className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-[#4a2961] focus:ring-2 focus:ring-[#eae3f2]"
                />
                {fieldErrors.role && (
                  <p className="mt-1 text-sm text-rose-700">{fieldErrors.role}</p>
                )}
              </div>

              {/* About */}
              <div>
                <label className="block text-sm mb-1">
                  Kā uzzinājāt par konferenci? *
                </label>
                <div className="space-y-2">
                  {aboutOptions.map((opt) => (
                    <label key={opt.value} className="flex items-start gap-3 text-sm">
                      <input
                        type="radio"
                        name="about"
                        value={opt.value}
                        required
                        className="mt-1"
                        onChange={(e) => setAboutValue(e.currentTarget.value)}
                        aria-invalid={!!fieldErrors.about}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}

                  <div className="pl-7">
                    <input
                      name="aboutOther"
                      placeholder="Ja izvēlējāties “Cits”, lūdzu, precizējiet"
                      aria-invalid={!!fieldErrors.aboutOther}
                      required={isOther}
                      className={`w-full rounded-xl border p-3 outline-none focus:border-[#4a2961] focus:ring-2 focus:ring-[#eae3f2] ${
                        isOther ? "border-slate-300" : "border-slate-200"
                      }`}
                    />
                    {fieldErrors.aboutOther && (
                      <p className="mt-1 text-sm text-rose-700">{fieldErrors.aboutOther}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm mb-1">Jautājumi / piezīmes</label>
                <textarea
                  name="notes"
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-[#4a2961] focus:ring-2 focus:ring-[#eae3f2]"
                />
              </div>

              {/* Consent */}
              <label className="flex items-start gap-3 text-sm select-none">
                <input type="checkbox" name="consent" required className="mt-1" />
                <span>
                  Piekrītu, ka mani dati tiek izmantoti tikai konferences organizēšanai.
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-[#4a2961] text-white px-5 py-3 font-medium hover:bg-[#5a3474] disabled:opacity-60"
              >
                {loading ? "Nosūtīšana…" : "Reģistrēties"}
              </button>
            </form>
          </div>
        </section>

        {/* ---------- SIDEBAR ---------- */}
        <aside className="md:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-[#f6f1fa] p-6">
            <h3 className="text-lg font-semibold mb-2">Par konferenci</h3>
            <p className="text-slate-700 whitespace-pre-line">
              Aicinām piedalīties projekta “Skola – kopienā” rudens konferencē “Vide. Skola. Kopiena.”,
              kas notiks 7. novembrī plkst. 11.00 tiešraidē. Konferences laikā runāsim par skolu un kopienu
              sadarbības stiprināšanu, skolēnu un pedagogu labsajūtu, iekļaujošu vidi, kā arī par skolēnu
              kavējumu problemātiku Latvijā, iespējamiem risinājumiem un gūto pieredzi.
            </p>

            <ul className="mt-4 space-y-1 text-slate-700">
              <li className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#4a2961]" />
                7. novembris
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#4a2961]" />
                11.00 (tiešraide)
              </li>
              <li className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#4a2961]" />
                <a
                  href="https://www.skola-kopiena.lv/news"
                  target="_blank"
                  className="text-[#4a2961] hover:underline"
                  rel="noreferrer"
                >
                  www.skola-kopiena.lv/news
                </a>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
