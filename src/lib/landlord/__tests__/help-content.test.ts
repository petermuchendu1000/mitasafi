import {
  HELP_SECTIONS,
  NOT_BUILT,
  searchHelp,
  countTopics,
} from "../help-content";

describe("help content structure", () => {
  it("has sections and topics at all", () => {
    expect(HELP_SECTIONS.length).toBeGreaterThan(3);
    expect(countTopics(HELP_SECTIONS)).toBeGreaterThan(10);
  });

  it("gives every topic a unique id", () => {
    // Ids become DOM ids for the aria-controls wiring. A duplicate silently
    // points two buttons at one panel.
    const ids = HELP_SECTIONS.flatMap((s) => s.topics.map((t) => t.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every section a unique id", () => {
    const ids = HELP_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never ships a topic with no answer", () => {
    const empty = HELP_SECTIONS.flatMap((s) =>
      s.topics.filter(
        (t) => t.answer.length === 0 || t.answer.some((p) => p.trim() === ""),
      ),
    ).map((t) => t.id);
    expect(empty).toEqual([]);
  });

  it("links only to internal routes", () => {
    // Existence is enforced by src/__tests__/internal-links-resolve.test.ts,
    // which scans the `href: "/..."` form these use. This only catches the
    // shape that would slip past that scanner.
    const bad = HELP_SECTIONS.flatMap((s) =>
      s.topics.flatMap((t) =>
        (t.links ?? []).filter((l) => !l.href.startsWith("/")),
      ),
    );
    expect(bad).toEqual([]);
  });

  it("says what is not built, with a reason for each", () => {
    expect(NOT_BUILT.length).toBeGreaterThan(3);
    const thin = NOT_BUILT.filter(
      (n) => n.what.trim() === "" || n.why.trim().length < 20,
    );
    expect(thin).toEqual([]);
  });
});

describe("help search", () => {
  it("returns everything for an empty query", () => {
    expect(searchHelp(HELP_SECTIONS, "")).toEqual(HELP_SECTIONS);
    expect(searchHelp(HELP_SECTIONS, "   ")).toEqual(HELP_SECTIONS);
  });

  it("finds a topic by a word that appears ONLY in its keywords", () => {
    // "escrow" is a word a landlord might search for and one this product
    // never uses in its prose, so a hit can only have come from the keyword
    // list. The first version of this test used "paybill", which appears in
    // the answer text too — it passed with keyword matching removed, so it
    // was not testing what its name said.
    const topic = HELP_SECTIONS.flatMap((s) => s.topics).find(
      (t) => t.id === "who-holds-the-money",
    );
    const prose = [
      topic?.question ?? "",
      ...(topic?.answer ?? []),
      ...(topic?.steps ?? []),
    ]
      .join(" ")
      .toLowerCase();
    expect(prose).not.toContain("escrow");
    expect(topic?.keywords).toContain("escrow");

    const ids = searchHelp(HELP_SECTIONS, "escrow").flatMap((s) =>
      s.topics.map((t) => t.id),
    );
    expect(ids).toEqual(["who-holds-the-money"]);
  });

  it("ignores case", () => {
    expect(countTopics(searchHelp(HELP_SECTIONS, "PAYBILL"))).toBe(
      countTopics(searchHelp(HELP_SECTIONS, "paybill")),
    );
  });

  it("narrows with more terms rather than widening", () => {
    const one = countTopics(searchHelp(HELP_SECTIONS, "rent"));
    const two = countTopics(searchHelp(HELP_SECTIONS, "rent caretaker"));
    expect(one).toBeGreaterThan(0);
    expect(two).toBeLessThan(one);
  });

  it("drops sections whose topics all failed to match", () => {
    const r = searchHelp(HELP_SECTIONS, "paybill");
    expect(r.every((s) => s.topics.length > 0)).toBe(true);
    expect(r.length).toBeLessThan(HELP_SECTIONS.length);
  });

  it("returns nothing for a term that appears nowhere", () => {
    expect(searchHelp(HELP_SECTIONS, "zzzznotatopic")).toEqual([]);
  });

  it("EVERY topic is findable by each of its own keywords", () => {
    // A keyword list is only useful if it works. A typo in one is invisible
    // on screen and makes the topic unreachable by the word a landlord
    // would actually type.
    const unreachable: string[] = [];
    for (const section of HELP_SECTIONS) {
      for (const topic of section.topics) {
        for (const kw of topic.keywords ?? []) {
          const ids = searchHelp(HELP_SECTIONS, kw).flatMap((s) =>
            s.topics.map((t) => t.id),
          );
          if (!ids.includes(topic.id))
            unreachable.push(`${topic.id} <- "${kw}"`);
        }
      }
    }
    expect(unreachable).toEqual([]);
  });

  it("every topic is findable by a distinctive word from its own question", () => {
    // Guards the other direction: a topic whose question words are all
    // stripped or misspelled would only be reachable by keyword.
    const missed: string[] = [];
    for (const section of HELP_SECTIONS) {
      for (const topic of section.topics) {
        const word = topic.question
          .toLowerCase()
          .replace(/[^a-z\s]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length > 5)[0];
        if (!word) continue;
        const ids = searchHelp(HELP_SECTIONS, word).flatMap((s) =>
          s.topics.map((t) => t.id),
        );
        if (!ids.includes(topic.id)) missed.push(`${topic.id} <- "${word}"`);
      }
    }
    expect(missed).toEqual([]);
  });
});
