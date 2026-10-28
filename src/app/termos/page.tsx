import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de Uso e Política de Privacidade",
  description:
    "Consulte os Termos de Uso e a Política de Privacidade do Vitta Beauty.",
};

type LegalBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

type LegalSection = {
  id: string;
  number: string;
  title: string;
  blocks: LegalBlock[];
};

type LegalPart = {
  id: string;
  title: string;
  sections: LegalSection[];
};

function stripBoldMarkers(value: string): string {
  return value.replace(/\*\*/g, "").trim();
}

function renderEmphasis(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong className="font-semibold text-vitta-text" key={index}>
          {part.slice(2, -2)}
        </strong>
      );
    }

    return part;
  });
}

function parseLegalDocument(source: string): {
  effectiveDate: string;
  responsibleDetails: string[];
  parts: LegalPart[];
} {
  const lines = source.split(/\r?\n/).map((line) => line.trim());
  const partLines = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /^\*\*PARTE [IVX]+ - .+\*\*$/.test(line));

  const dateLine = lines.find((line) => line.startsWith("Data de vigência:"));
  const responsibleHeading = lines.findIndex((line) =>
    line.startsWith("**IDENTIFICAÇÃO DO RESPONSÁVEL"),
  );
  const firstSeparator = lines.findIndex((line) => line.startsWith("# ===="));
  const responsibleDetails =
    responsibleHeading >= 0 && firstSeparator > responsibleHeading
      ? lines
          .slice(responsibleHeading + 1, firstSeparator)
          .filter(Boolean)
      : [];

  const parts = partLines.map(({ line: partLine, index: partIndex }, partNumber) => {
    const endIndex = partLines[partNumber + 1]?.index ?? lines.length;
    const sections: LegalSection[] = [];
    let activeSection: LegalSection | null = null;
    let activeList: string[] = [];

    function flushList() {
      if (activeSection && activeList.length > 0) {
        activeSection.blocks.push({ type: "list", items: activeList });
        activeList = [];
      }
    }

    for (const line of lines.slice(partIndex + 1, endIndex)) {
      if (!line || line.startsWith("# ====")) {
        flushList();
        continue;
      }

      const sectionHeading = /^\*\*(\d+)\.\s+(.+)\*\*$/.exec(line);
      if (sectionHeading) {
        flushList();
        activeSection = {
          id: `${partNumber === 0 ? "terms" : "privacy"}-${sectionHeading[1]}`,
          number: sectionHeading[1],
          title: sectionHeading[2],
          blocks: [],
        };
        sections.push(activeSection);
        continue;
      }

      if (!activeSection) continue;

      const listItem = /^\*\s+(.+)$/.exec(line);
      if (listItem) {
        activeList.push(listItem[1]);
        continue;
      }

      flushList();
      activeSection.blocks.push({ type: "paragraph", text: line });
    }
    flushList();

    return {
      id: partNumber === 0 ? "termos-de-uso" : "politica-de-privacidade",
      title: stripBoldMarkers(partLine),
      sections,
    };
  });

  return {
    effectiveDate: dateLine?.replace("Data de vigência:", "").trim() ?? "",
    responsibleDetails,
    parts,
  };
}

function getLegalDocument() {
  const source = readFileSync(
    join(process.cwd(), "public", "termos-e-politica.txt"),
    "utf8",
  );
  return parseLegalDocument(source);
}

export default function TermsPage() {
  const document = getLegalDocument();

  return (
    <div className="min-h-full bg-[#faf8fc]">
      <header className="relative isolate overflow-hidden bg-gradient-to-br from-[#4e3567] via-[#704a91] to-[#9368b3] text-white">
        <div
          aria-hidden="true"
          className="absolute -left-24 -top-32 -z-10 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-48 right-[-4rem] -z-10 h-96 w-96 rounded-full bg-[#e7c9e6]/20 blur-3xl"
        />
        <div className="mx-auto max-w-6xl px-5 pb-12 pt-7 sm:px-8 sm:pb-16 sm:pt-9">
          <Link
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/15"
            href="/cadastro"
          >
            <span aria-hidden="true">←</span>
            Voltar ao cadastro
          </Link>

          <div className="mt-10 max-w-3xl sm:mt-14">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85">
              Vitta Beauty · Documentos legais
            </span>
            <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">
              Termos de Uso e
              <span className="block text-[#f4dff2]">
                Política de Privacidade
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
              Informações sobre as regras de uso da plataforma e como os dados
              são tratados para oferecer os serviços do Vitta Beauty.
            </p>
            <p className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-white/75">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10"
              >
                ◷
              </span>
              Vigente desde {document.effectiveDate}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-8 sm:px-8 sm:py-12 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-12">
        <aside className="h-fit lg:sticky lg:top-8">
          <nav
            aria-label="Navegação dos documentos"
            className="rounded-[22px] border border-[#ebe5ef] bg-white p-4 shadow-[0_8px_28px_rgba(66,47,78,0.05)] sm:p-5"
          >
            <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-vitta-muted">
              Nesta página
            </p>
            <div className="mt-3 space-y-1">
              {document.parts.map((part) => (
                <div key={part.id}>
                  <a
                    className="block rounded-xl px-2 py-2 text-sm font-semibold text-vitta transition hover:bg-vitta-background"
                    href={`#${part.id}`}
                  >
                    {part.title.replace(/^PARTE [IVX]+ - /, "")}
                  </a>
                  <div className="ml-2 border-l border-[#eee8f1] pl-2">
                    {part.sections.map((section) => (
                      <a
                        className="block rounded-lg px-2 py-1.5 text-xs leading-5 text-vitta-muted transition hover:bg-vitta-background hover:text-vitta"
                        href={`#${section.id}`}
                        key={section.id}
                      >
                        {section.number}. {section.title}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          <section className="mt-4 rounded-[22px] border border-[#ebe5ef] bg-gradient-to-br from-white to-[#f7f1fa] p-5">
            <p className="text-xs font-semibold text-vitta-text">
              Responsável pela plataforma
            </p>
            <div className="mt-3 space-y-2 text-xs leading-5 text-vitta-muted">
              {document.responsibleDetails.map((detail) => (
                <p key={detail}>{renderEmphasis(detail)}</p>
              ))}
            </div>
          </section>
        </aside>

        <div className="min-w-0 space-y-10">
          {document.parts.map((part, partIndex) => (
            <section aria-labelledby={`${part.id}-heading`} key={part.id}>
              <div
                className="mb-5 scroll-mt-8 border-b border-[#e9e1ed] pb-4"
                id={part.id}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-vitta/75">
                  Parte {partIndex === 0 ? "01" : "02"}
                </p>
                <h2
                  className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-vitta-text sm:text-3xl"
                  id={`${part.id}-heading`}
                >
                  {part.title.replace(/^PARTE [IVX]+ - /, "")}
                </h2>
              </div>

              <div className="space-y-4">
                {part.sections.map((section) => (
                  <article
                    aria-labelledby={`${section.id}-heading`}
                    className="scroll-mt-8 rounded-[22px] border border-[#ebe5ef] bg-white p-5 shadow-[0_8px_28px_rgba(66,47,78,0.04)] sm:p-7"
                    id={section.id}
                    key={section.id}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f4edf8] text-xs font-bold text-vitta">
                        {section.number.padStart(2, "0")}
                      </span>
                      <h3
                        className="pt-1 text-base font-semibold leading-6 text-vitta-text sm:text-lg"
                        id={`${section.id}-heading`}
                      >
                        {section.title}
                      </h3>
                    </div>
                    <div className="mt-4 space-y-3 pl-0 text-sm leading-7 text-[#62596a] sm:pl-12">
                      {section.blocks.map((block, blockIndex) =>
                        block.type === "list" ? (
                          <ul
                            className="space-y-2.5 rounded-2xl bg-[#faf8fc] px-4 py-4 sm:px-5"
                            key={`${section.id}-list-${blockIndex}`}
                          >
                            {block.items.map((item, itemIndex) => (
                              <li
                                className="flex gap-3"
                                key={`${section.id}-item-${itemIndex}`}
                              >
                                <span
                                  aria-hidden="true"
                                  className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#a47bb9]"
                                />
                                <span>{renderEmphasis(item)}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p key={`${section.id}-paragraph-${blockIndex}`}>
                            {renderEmphasis(block.text)}
                          </p>
                        ),
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}

          <div className="rounded-[22px] border border-[#e8dced] bg-[#f4edf8] p-5 text-center sm:p-7">
            <p className="text-sm leading-6 text-vitta-text">
              Ao criar uma conta, você confirma que leu e compreendeu estes
              documentos.
            </p>
            <Link
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-vitta px-5 py-3 text-sm font-semibold text-white transition hover:bg-vitta/90"
              href="/cadastro"
            >
              Voltar ao cadastro
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
