"use client";

import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icon";
import { Badge, CodeBlock } from "@/components/ui/kit";
import { CATEGORY_META, CATEGORY_ORDER, NODE_DEFINITIONS } from "@/lib/nodes/registry";
import { cn } from "@/lib/utils";

const SECTIONS = ["start", "concepts", "expressions", "nodes", "api", "selfhost"] as const;
type Section = (typeof SECTIONS)[number];

export function DocsContent({ appUrl }: { appUrl: string }) {
  const { d, locale, pick } = useI18n();
  const [active, setActive] = useState<Section>("start");
  const ar = locale === "ar";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-ink-100 sm:text-4xl">{d.docs.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-300">{d.docs.subtitle}</p>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[210px_1fr]">
        <nav className="lg:sticky lg:top-24 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {SECTIONS.map((section) => (
              <li key={section}>
                <button
                  onClick={() => setActive(section)}
                  aria-current={active === section}
                  className={cn(
                    "w-full rounded-lg px-3 py-2 text-start text-[13px] whitespace-nowrap transition-colors",
                    active === section
                      ? "bg-ink-800 font-medium text-ink-100"
                      : "text-ink-400 hover:bg-ink-900 hover:text-ink-200",
                  )}
                >
                  {d.docs.sections[section]}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-8">
          {active === "start" && (
            <Article title={d.docs.sections.start}>
              <P>
                {ar
                  ? "وصل يبني الأتمتة كمخطط: عُقد تنفّذ عملاً، ووصلات تنقل القيم بينها. كل تشغيل يسجّل مدخلات ومخرجات كل عقدة، لذا لا شيء يبقى صندوقاً أسود."
                  : "Wasl models automation as a graph: nodes do work, connections carry values between them. Every run records each node's inputs and output, so nothing stays a black box."}
              </P>
              <Steps
                items={
                  ar
                    ? [
                        "أنشئ حساباً — تحصل على ٥٠٠٠ رصيد شهرياً.",
                        "ثبّت قالباً من المعرض أو اوصف ما تريده بلغة بسيطة.",
                        "اضغط «تشغيل تجريبي» وشاهد كل عقدة تعمل مباشرة.",
                        "أضف مفتاح موديلك من بيانات الاعتماد ليصبح التشغيل مجانياً.",
                        "انشر سير العمل كويب هوك أو مهمة مجدولة.",
                      ]
                    : [
                        "Create an account — you get 5,000 credits a month.",
                        "Install a template from the gallery, or describe the flow in plain language.",
                        "Hit “Test run” and watch each node execute live.",
                        "Add your own model key under Credentials to make runs free.",
                        "Publish the flow as a webhook or a schedule.",
                      ]
                }
              />
            </Article>
          )}

          {active === "concepts" && (
            <Article title={d.docs.sections.concepts}>
              <Concept
                title={ar ? "المخطط الموجّه" : "The DAG"}
                body={
                  ar
                    ? "العُقد تُرتَّب طوبولوجياً ثم تُنفَّذ مرة واحدة لكل تشغيل. الحلقات المغلقة مرفوضة قبل البدء."
                    : "Nodes are topologically ordered and executed once per run. Circular connections are rejected before the run starts."
                }
              />
              <Concept
                title={ar ? "التوسّع التلقائي على القوائم" : "Automatic fan-out"}
                body={
                  ar
                    ? "إذا وصلت قائمة إلى عقدة تدعم التوسّع، فإنها تعمل مرة لكل عنصر ويصبح مخرجها قائمة بالنتائج. استخدم «دمج قائمة» للعودة إلى قيمة واحدة."
                    : "If a list reaches a fan-out capable node, it runs once per item and its output becomes a list of results. Use “Combine list” to collapse back to one value."
                }
              />
              <Concept
                title={ar ? "التفريع" : "Branching"}
                body={
                  ar
                    ? "«شرط» يعطي مخرجين، و«موجّه» و«تصنيف» يعطيان مخرجاً لكل حالة. العُقد الواقعة على مسار غير مُتَّخذ تُعلَّم «تم تخطيها» بدل أن تفشل."
                    : "“Condition” gives two outputs; “Router” and “Categorise” give one per case. Nodes on a path that was not taken are marked “Skipped” rather than failed."
                }
              />
              <Concept
                title={ar ? "معالجة الأخطاء" : "Error handling"}
                body={
                  ar
                    ? "عقدة «طلب HTTP» لها مخرج «خطأ». إذا وصّلته، يستمر التشغيل عبر ذلك المسار عند الفشل بدلاً من إيقاف كل شيء."
                    : "The HTTP request node has an “Error” output. Wire it up and a failure continues down that path instead of stopping the whole run."
                }
              />
              <Concept
                title={ar ? "الرصيد" : "Credits"}
                body={
                  ar
                    ? "الرصيد يُخصم على استدعاءات موديل المنصّة وقراءة صفحات الويب فقط. استدعاءات الموديل بمفتاحك تكلّف صفراً، والمنطق والقوالب والتسليم مجانية دائماً."
                    : "Credits are charged for platform model calls and web page reads. Model calls on your own key cost zero, and logic, templating and delivery are always free."
                }
              />
            </Article>
          )}

          {active === "expressions" && (
            <Article title={d.docs.sections.expressions}>
              <P>
                {ar
                  ? "أي حقل بيانات يقبل تعبيرات بين قوسين مزدوجين. إذا كان الحقل تعبيراً واحداً فقط، تُحفظ القيمة بنوعها الأصلي (كائن أو قائمة)؛ وإن خُلط مع نص فيتم تحويله إلى نص."
                  : "Any data field accepts double-brace expressions. If the field is exactly one expression the value keeps its native type (object, array); mixed with text it is stringified."}
              </P>
              <div className="panel overflow-hidden p-0">
                <table className="w-full">
                  <tbody className="divide-y divide-ink-800">
                    {[
                      ["{{$input}}", ar ? "القيمة القادمة من العقدة الموصولة قبلها" : "the value from the connected upstream node"],
                      ["{{$input.body.title}}", ar ? "مسار داخل تلك القيمة" : "a path into that value"],
                      ["{{$item}}", ar ? "العنصر الحالي أثناء التوسّع على قائمة" : "the current item while fanning out"],
                      ["{{$index}}", ar ? "ترتيب العنصر الحالي" : "the current item's index"],
                      ["{{$trigger.url}}", ar ? "حقل جمعه المشغّل" : "a field collected by the trigger"],
                      ["{{read.text}}", ar ? "مخرج عقدة سابقة بمعرّفها" : "an earlier node's output, by node id"],
                      ["{{$now}} · {{$today}}", ar ? "الوقت الحالي" : "current timestamp / date"],
                      ["{{$runId}}", ar ? "معرّف التشغيل الحالي" : "the current run id"],
                    ].map(([token, meaning]) => (
                      <tr key={token}>
                        <td className="w-[45%] px-3.5 py-2.5">
                          <code className="rounded bg-ink-950 px-1.5 py-0.5 text-[12px] text-brand-300">{token}</code>
                        </td>
                        <td className="px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink-400">{meaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <P>
                {ar
                  ? "مثال: بعد عقدة قراءة صفحة ويب معرّفها read، اكتب في عقدة الذكاء الاصطناعي:"
                  : "Example: after a “Read web page” node with id read, write this in an AI node:"}
              </P>
              <CodeBlock
                language="prompt"
                code={
                  ar
                    ? 'لخّص المقال التالي في ٣ نقاط بالعربية:\n\nالعنوان: {{read.title}}\nالمصدر: {{read.url}}\n\n{{read.text}}'
                    : "Summarise this article in 3 bullets:\n\nTitle: {{read.title}}\nSource: {{read.url}}\n\n{{read.text}}"
                }
              />
            </Article>
          )}

          {active === "nodes" && (
            <Article title={d.docs.sections.nodes}>
              <P>
                {ar
                  ? `${NODE_DEFINITIONS.length} نوع عقدة، كلها قابلة للتنفيذ.`
                  : `${NODE_DEFINITIONS.length} node types, all executable.`}
              </P>
              <div className="space-y-7">
                {CATEGORY_ORDER.map((category) => {
                  const meta = CATEGORY_META[category];
                  const nodes = NODE_DEFINITIONS.filter((definition) => definition.category === category);
                  return (
                    <div key={category} className="space-y-2.5">
                      <h3 className="flex items-center gap-2 text-[13px] font-semibold tracking-wide text-ink-200 uppercase">
                        <span className={cn("size-2 rounded-full", meta.color)} />
                        {pick(meta.label, meta.labelAr)}
                      </h3>
                      {nodes.map((definition) => (
                        <details key={definition.type} className="panel px-4 py-3 [&_summary::-webkit-details-marker]:hidden">
                          <summary className="flex cursor-pointer items-center gap-2.5">
                            <Icon name={definition.icon} size={15} className={meta.text} />
                            <span className="text-[13.5px] font-medium text-ink-100">
                              {pick(definition.label, definition.labelAr)}
                            </span>
                            <code className="text-[11px] text-ink-500">{definition.type}</code>
                            <span className="ms-auto flex items-center gap-1.5">
                              {definition.fanOut ? (
                                <Badge tone="info" icon="Repeat">
                                  {ar ? "توسّع" : "fan-out"}
                                </Badge>
                              ) : null}
                              {definition.credits > 0 ? (
                                <Badge tone="warning">
                                  {definition.credits} {d.common.credits}
                                </Badge>
                              ) : (
                                <Badge tone="success">{ar ? "مجاني" : "free"}</Badge>
                              )}
                            </span>
                          </summary>

                          <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-400">
                            {pick(definition.description, definition.descriptionAr)}
                          </p>

                          {definition.outputShape ? (
                            <p className="mt-2 text-[12px] text-ink-400">
                              <span className="text-ink-500">{ar ? "المخرج: " : "Output: "}</span>
                              <code className="text-brand-300">{definition.outputShape}</code>
                            </p>
                          ) : null}

                          {definition.fields.length > 0 ? (
                            <ul className="mt-2.5 space-y-1">
                              {definition.fields.map((field) => (
                                <li key={field.key} className="text-[12px] text-ink-400">
                                  <code className="text-ink-200">{field.key}</code>
                                  <span className="text-ink-600"> · {field.type}</span>
                                  {field.required ? <span className="text-rose-400"> · {d.common.required}</span> : null}
                                  <span className="text-ink-500"> — {pick(field.label, field.labelAr)}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </details>
                      ))}
                    </div>
                  );
                })}
              </div>
            </Article>
          )}

          {active === "api" && (
            <Article title={d.docs.sections.api}>
              <P>
                {ar
                  ? "أنشئ مفتاحاً من لوحة التحكم ← مفاتيح API، ثم شغّل أي سير عمل من كودك."
                  : "Create a key under Dashboard → API keys, then run any flow from your own code."}
              </P>
              <H3>{ar ? "تشغيل سير عمل والانتظار للنتيجة" : "Run a flow and wait for the result"}</H3>
              <CodeBlock
                language="bash"
                code={`curl -X POST ${appUrl}/api/v1/flows/FLOW_ID/run \\
  -H "Authorization: Bearer wsl_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"inputs":{"url":"https://example.com"},"wait":true}'`}
              />
              <CodeBlock
                language="json"
                code={`{
  "runId": "clx…",
  "status": "succeeded",
  "creditsUsed": 3,
  "outputs": {
    "summary": "• …\\n• …"
  }
}`}
              />
              <H3>{ar ? "بدون انتظار" : "Fire and forget"}</H3>
              <P>
                {ar
                  ? "أزل wait للحصول على معرّف التشغيل فوراً (202)، ثم اقرأ النتيجة لاحقاً."
                  : "Drop wait to get the run id back immediately (202), then read the result later."}
              </P>
              <CodeBlock
                language="bash"
                code={`curl ${appUrl}/api/runs/RUN_ID -H "Cookie: wasl_session=…"`}
              />
              <H3>{ar ? "الويب هوك" : "Webhooks"}</H3>
              <P>
                {ar
                  ? "كل سير عمل بمشغّل ويب هوك يحصل على رابط خاص. انشره أولاً، ثم أرسل إليه JSON — يصبح جسم الطلب مدخلات المشغّل."
                  : "Any flow with a webhook trigger gets its own URL. Publish it, then POST JSON — the body becomes the trigger inputs."}
              </P>
              <CodeBlock
                language="bash"
                code={`curl -X POST ${appUrl}/api/hooks/whk_… \\
  -H "Content-Type: application/json" \\
  -H "X-Wasl-Secret: optional_shared_secret" \\
  -d '{"subject":"Login broken","body":"…","email":"a@b.com"}'`}
              />
            </Article>
          )}

          {active === "selfhost" && (
            <Article title={d.docs.sections.selfhost}>
              <P>
                {ar
                  ? "وصل تطبيق Next.js عادي مع Prisma. لا يوجد مكوّن خاص: تحتاج Node 20+ وقاعدة بيانات."
                  : "Wasl is a plain Next.js app with Prisma. There is no special component — you need Node 20+ and a database."}
              </P>
              <CodeBlock
                language="bash"
                code={`git clone <your-fork> wasl && cd wasl
npm install
cp .env.example .env      # set AUTH_SECRET + ENCRYPTION_KEY
npm run db:push
npm run db:seed           # demo account + template gallery
npm run dev`}
              />
              <H3>{ar ? "الانتقال إلى Postgres" : "Switching to Postgres"}</H3>
              <P>
                {ar
                  ? "بدّل provider في prisma/schema.prisma إلى postgresql ووجّه DATABASE_URL إلى قاعدتك. كل حمولات JSON مخزّنة كنص، لذا المخطط يعمل كما هو."
                  : "Change provider in prisma/schema.prisma to postgresql and point DATABASE_URL at your database. Every JSON payload is stored as TEXT, so the schema ports as-is."}
              </P>
              <H3>{ar ? "متغيّرات البيئة" : "Environment variables"}</H3>
              <div className="panel overflow-hidden p-0">
                <table className="w-full">
                  <tbody className="divide-y divide-ink-800">
                    {[
                      ["DATABASE_URL", ar ? "مطلوب" : "required"],
                      ["AUTH_SECRET", ar ? "مطلوب · ٣٢ حرفاً على الأقل" : "required · 32+ chars"],
                      ["ENCRYPTION_KEY", ar ? "مطلوب · يشفّر بيانات الاعتماد" : "required · encrypts credentials"],
                      ["OPENAI_API_KEY", ar ? "اختياري · بدونه يعمل موديل محاكاة" : "optional · falls back to the simulated model"],
                      ["OPENAI_BASE_URL", ar ? "اختياري · أي نقطة متوافقة مع OpenAI" : "optional · any OpenAI-compatible endpoint"],
                    ].map(([name, note]) => (
                      <tr key={name}>
                        <td className="px-3.5 py-2.5">
                          <code className="text-[12px] text-brand-300">{name}</code>
                        </td>
                        <td className="px-3.5 py-2.5 text-[12.5px] text-ink-400">{note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/8 px-3.5 py-3 text-[12.5px] leading-relaxed text-amber-200">
                <Icon name="AlertTriangle" size={14} className="me-1.5 inline" />
                {ar
                  ? "عقدة «تشغيل JavaScript» تستخدم node:vm مع مهلة تنفيذ. هذا يمنع الحلقات اللانهائية لكنه ليس حاجزاً أمنياً — إن سمحت بكود غير موثوق، شغّله في isolated-vm أو عملية منفصلة."
                  : "The “Run JavaScript” node uses node:vm with a timeout. That stops infinite loops but is not a security boundary — if you allow untrusted code, run it in isolated-vm or a separate process."}
              </div>
            </Article>
          )}
        </div>
      </div>
    </div>
  );
}

function Article({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight text-ink-100">{title}</h2>
      {children}
    </article>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[13.5px] leading-relaxed text-ink-300">{children}</p>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="pt-2 text-[14px] font-semibold text-ink-100">{children}</h3>;
}

function Concept({ title, body }: { title: string; body: string }) {
  return (
    <div className="panel p-4">
      <h3 className="text-[13.5px] font-semibold text-ink-100">{title}</h3>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-400">{body}</p>
    </div>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2">
      {items.map((item, index) => (
        <li key={item} className="flex gap-3 text-[13.5px] leading-relaxed text-ink-300">
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border border-ink-600 bg-ink-850 text-[11px] font-semibold tabular-nums text-brand-300">
            {index + 1}
          </span>
          {item}
        </li>
      ))}
    </ol>
  );
}
