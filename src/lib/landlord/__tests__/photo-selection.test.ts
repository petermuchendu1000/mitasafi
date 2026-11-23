/**
 * Which selected files the photo step accepts.
 *
 * This was extracted while fixing a bug that was NOT about the rules: Step 4
 * held on to `input.files`, the live FileList, and read its `.length` inside an
 * async FileReader callback. The change handler clears `input.value`
 * immediately, which empties that FileList, so the guard
 * `newPhotos.length === files.length` compared 1 against 0 and the photo was
 * dropped with no error. Measured in a real browser: "0 / 20 photos uploaded"
 * after picking a file.
 *
 * Hence the first test below. `selectPhotos` returning a plain array rather
 * than the FileList is the property that makes the caller safe, and emptying
 * the source afterwards must not change what it returned.
 */

import { selectPhotos, DEFAULT_PHOTO_LIMITS } from "../photo-selection";

function file(name: string, type = "image/png", size = 1024): File {
  const f = new File([new Uint8Array(1)], name, { type });
  // File size is read-only; the tests need to exercise the size rule.
  Object.defineProperty(f, "size", { value: size });
  return f;
}

/**
 * A stand-in for the live FileList an <input type="file"> owns.
 *
 * ArrayLike<File> declares `length` readonly, which is true of the real thing
 * from the page's point of view — the browser is what empties it when
 * input.value is reset. `clear()` plays the browser's part.
 */
type LiveList = ArrayLike<File> & { clear: () => void };

function liveList(files: File[]): LiveList {
  const backing: { length: number; clear: () => void } = {
    length: files.length,
    clear() {
      backing.length = 0;
    },
  };
  files.forEach((f, i) => {
    (backing as unknown as Record<number, File>)[i] = f;
  });
  return backing as LiveList;
}

/**
 * Names, not File objects.
 *
 * jest's diff printer deep-copies the received value, and a File has enough
 * exotic accessors that doing so overflows the stack — a FAILING assertion on
 * a File array aborts the whole run instead of printing a diff. A check whose
 * failure crashes the reporter is not much of a check.
 */
const names = (files: File[]) => files.map((f) => f.name);

describe("the selection is snapshotted away from the input", () => {
  it("survives the FileList being emptied afterwards", () => {
    // This is the defect, in miniature. The input's value is reset right after
    // the change handler runs, which empties the list the browser owns. Work
    // that reads it later sees nothing.
    const list = liveList([file("a.png"), file("b.png")]);
    const { accepted } = selectPhotos(0, list);
    list.clear();
    expect(accepted).toHaveLength(2);
    expect(accepted.map((f) => f.name)).toEqual(["a.png", "b.png"]);
  });

  it("returns a real array, not a FileList", () => {
    const { accepted } = selectPhotos(0, liveList([file("a.png")]));
    expect(Array.isArray(accepted)).toBe(true);
  });
});

describe("nothing selected", () => {
  it("handles null and an empty list", () => {
    for (const input of [null, undefined, [] as File[]]) {
      const r = selectPhotos(0, input);
      expect(r.accepted).toHaveLength(0);
      expect(r.rejected).toHaveLength(0);
    }
  });
});

describe("type", () => {
  it("accepts the three the bucket allows", () => {
    const { accepted } = selectPhotos(0, [
      file("a.jpg", "image/jpeg"),
      file("b.png", "image/png"),
      file("c.webp", "image/webp"),
    ]);
    expect(accepted).toHaveLength(3);
  });

  it("rejects a PDF and says which file", () => {
    const { accepted, rejected } = selectPhotos(0, [
      file("deed.pdf", "application/pdf"),
    ]);
    expect(names(accepted)).toEqual([]);
    expect(rejected[0]).toContain("deed.pdf");
  });

  it("rejects a GIF, which the bucket does not allow", () => {
    // The old check was `file.type.startsWith("image/")`, which let through
    // types the storage bucket refuses — the upload would fail later instead.
    expect(
      names(selectPhotos(0, [file("a.gif", "image/gif")]).accepted),
    ).toEqual([]);
  });

  it("is case insensitive about the type", () => {
    // NOT via `new File(...)`: the File constructor lowercases a valid MIME
    // type per spec, so a File can never reach the rule with "IMAGE/PNG" and a
    // test built on one proves nothing. A mutation run caught exactly that —
    // removing .toLowerCase() left the suite green. selectPhotos takes
    // ArrayLike<File> and only reads name/type/size, so a duck-typed object
    // exercises the branch that a real File cannot.
    const shouty = { name: "a.png", type: "IMAGE/PNG", size: 1024 } as File;
    expect(names(selectPhotos(0, [shouty]).accepted)).toEqual(["a.png"]);
  });

  it("the File constructor is what normally does that normalising", () => {
    // Worth pinning, because it is the reason the test above cannot use a File.
    expect(file("a.png", "IMAGE/PNG").type).toBe("image/png");
  });

  it("rejects a file with no type at all", () => {
    expect(names(selectPhotos(0, [file("mystery", "")]).accepted)).toEqual([]);
  });
});

describe("size", () => {
  const max = DEFAULT_PHOTO_LIMITS.maxBytes;

  it("accepts a file exactly at the limit", () => {
    expect(
      selectPhotos(0, [file("a.png", "image/png", max)]).accepted,
    ).toHaveLength(1);
  });

  it("rejects one byte over", () => {
    const { accepted, rejected } = selectPhotos(0, [
      file("big.png", "image/png", max + 1),
    ]);
    expect(names(accepted)).toEqual([]);
    expect(rejected[0]).toContain("5MB");
  });
});

describe("the count limit", () => {
  const many = (n: number) =>
    Array.from({ length: n }, (_, i) => file(`p${i}.png`));

  it("accepts up to the maximum", () => {
    expect(selectPhotos(0, many(20)).accepted).toHaveLength(20);
  });

  it("counts photos already added", () => {
    expect(selectPhotos(18, many(5)).accepted).toHaveLength(2);
  });

  it("KEEPS the ones that fit rather than refusing the whole batch", () => {
    // The old code refused everything if the total would exceed the max, so
    // dropping 25 photos onto an empty form added none of them.
    const { accepted, rejected } = selectPhotos(0, many(25));
    expect(accepted).toHaveLength(20);
    expect(rejected).toHaveLength(5);
  });

  it("accepts nothing once full, and says why", () => {
    const { accepted, rejected } = selectPhotos(20, many(1));
    expect(names(accepted)).toEqual([]);
    expect(rejected[0]).toContain("at most 20");
  });

  it("is not confused by an existing count above the maximum", () => {
    expect(names(selectPhotos(25, many(3)).accepted)).toEqual([]);
  });

  it("keeps selection order", () => {
    const { accepted } = selectPhotos(0, [
      file("one.png"),
      file("two.png"),
      file("three.png"),
    ]);
    expect(accepted.map((f) => f.name)).toEqual([
      "one.png",
      "two.png",
      "three.png",
    ]);
  });
});

describe("a mixed selection", () => {
  it("keeps the good ones and reports each bad one separately", () => {
    const { accepted, rejected } = selectPhotos(0, [
      file("good.png", "image/png"),
      file("doc.pdf", "application/pdf"),
      file("huge.jpg", "image/jpeg", DEFAULT_PHOTO_LIMITS.maxBytes + 1),
      file("alsogood.webp", "image/webp"),
    ]);
    expect(accepted.map((f) => f.name)).toEqual(["good.png", "alsogood.webp"]);
    expect(rejected).toHaveLength(2);
  });
});
