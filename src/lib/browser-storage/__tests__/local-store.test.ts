/**
 * @jest-environment jsdom
 */

/**
 * The generic browser-storage store.
 *
 * This module is the single implementation of the useSyncExternalStore contract for
 * eight storage keys, so the properties that make that contract hold are asserted
 * directly rather than inferred from the components that use it:
 *
 *  1. SNAPSHOT STABILITY. useSyncExternalStore compares `read()` results with
 *     Object.is during render. A freshly parsed value every call is never equal and
 *     React throws "The result of getSnapshot should be cached to avoid an infinite
 *     loop". Every reference assertion below fails if the cache is removed.
 *
 *  2. THE CACHE IS KEYED ON THE RAW STRING, not on a dirty flag. A write made without
 *     going through this module must still be visible to the next read, because
 *     app/saved/page.tsx deliberately does one.
 *
 *  3. WRITE NOTIFIES, and TEARDOWN IS SYMMETRIC. Those are the two defects the
 *     hand-rolled copies had.
 *
 *  4. UNUSABLE INPUT FALLS BACK rather than throwing. localStorage contents are
 *     user-editable; a hand-edited value must not crash a page.
 */

import {
  createLocalStore,
  createArrayStore,
  createBooleanStore,
} from "../local-store";

interface Item {
  id: string;
}

function isItem(value: unknown): value is Item {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Item).id === "string"
  );
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("snapshot stability (the caching rule)", () => {
  it("returns the SAME reference while the raw string is unchanged", () => {
    const store = createArrayStore<Item>("stability", isItem);
    localStorage.setItem("stability", JSON.stringify([{ id: "a" }]));

    const first = store.read();
    const second = store.read();
    const third = store.read();

    expect(first).toEqual([{ id: "a" }]);
    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  it("returns a NEW reference once the raw string changes", () => {
    const store = createArrayStore<Item>("stability2", isItem);
    localStorage.setItem("stability2", JSON.stringify([{ id: "a" }]));
    const before = store.read();

    store.write([{ id: "a" }, { id: "b" }]);
    const after = store.read();

    expect(after).not.toBe(before);
    expect(after).toEqual([{ id: "a" }, { id: "b" }]);
  });

  it("returns the same empty reference when nothing is stored", () => {
    const store = createArrayStore<Item>("absent", isItem);
    expect(store.read()).toBe(store.read());
    expect(store.read()).toEqual([]);
  });

  it("returns the same empty reference for a stored empty array", () => {
    // A fresh [] here would be a new reference on every read and would reintroduce
    // exactly the infinite-loop crash the cache exists to prevent.
    const store = createArrayStore<Item>("emptyarr", isItem);
    localStorage.setItem("emptyarr", "[]");
    expect(store.read()).toBe(store.read());
  });

  it("the server snapshot is the same reference as the empty value", () => {
    const store = createArrayStore<Item>("srv", isItem);
    expect(store.serverSnapshot()).toBe(store.read());
  });
});

describe("the cache is keyed on the raw string, not a dirty flag", () => {
  it("sees a write made without going through the store", () => {
    const store = createArrayStore<Item>("bypass", isItem);
    expect(store.read()).toEqual([]);

    // app/saved/page.tsx does this deliberately, to persist without notifying.
    localStorage.setItem("bypass", JSON.stringify([{ id: "z" }]));

    expect(store.read()).toEqual([{ id: "z" }]);
  });

  it("sees the key being removed out of band", () => {
    const store = createArrayStore<Item>("bypass2", isItem);
    localStorage.setItem("bypass2", JSON.stringify([{ id: "z" }]));
    expect(store.read()).toEqual([{ id: "z" }]);

    localStorage.removeItem("bypass2");
    expect(store.read()).toEqual([]);
  });
});

describe("write and clear notify", () => {
  it("write notifies every subscriber in this tab", () => {
    const store = createArrayStore<Item>("notify", isItem);
    const a = jest.fn();
    const b = jest.fn();
    const offA = store.subscribe(a);
    const offB = store.subscribe(b);

    store.write([{ id: "a" }]);

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    offA();
    offB();
  });

  it("clear removes the key and notifies", () => {
    const store = createArrayStore<Item>("clearme", isItem);
    store.write([{ id: "a" }]);
    const listener = jest.fn();
    const off = store.subscribe(listener);

    store.clear();

    expect(localStorage.getItem("clearme")).toBeNull();
    expect(store.read()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(1);
    off();
  });
});

describe("subscription teardown is symmetric", () => {
  it("stops calling the listener after teardown", () => {
    const store = createArrayStore<Item>("teardown", isItem);
    const listener = jest.fn();
    const off = store.subscribe(listener);

    store.write([{ id: "a" }]);
    expect(listener).toHaveBeenCalledTimes(1);

    off();
    store.write([{ id: "b" }]);

    // A hand-rolled copy that removed a different function reference than it added
    // would see 2 here. That is the Navbar leak, asserted rather than assumed.
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("leaves no listener behind on window after teardown", () => {
    const store = createArrayStore<Item>("teardown2", isItem);
    const added: string[] = [];
    const removed: string[] = [];
    const origAdd = window.addEventListener;
    const origRemove = window.removeEventListener;
    const addSpy = jest
      .spyOn(window, "addEventListener")
      .mockImplementation((...args: Parameters<typeof origAdd>) => {
        added.push(String(args[0]));
        return origAdd.apply(window, args);
      });
    const removeSpy = jest
      .spyOn(window, "removeEventListener")
      .mockImplementation((...args: Parameters<typeof origRemove>) => {
        removed.push(String(args[0]));
        return origRemove.apply(window, args);
      });

    store.subscribe(() => {})();

    expect(added.sort()).toEqual(removed.sort());
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});

describe("cross-tab changes", () => {
  it("invalidates the cache and notifies on a storage event for our key", () => {
    const store = createArrayStore<Item>("xtab", isItem);
    const listener = jest.fn();
    const off = store.subscribe(listener);
    expect(store.read()).toEqual([]);

    // jsdom does not fire `storage` for same-document writes, so the other tab's write
    // is simulated: the value lands in storage and the event is dispatched.
    localStorage.setItem("xtab", JSON.stringify([{ id: "other-tab" }]));
    window.dispatchEvent(new StorageEvent("storage", { key: "xtab" }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.read()).toEqual([{ id: "other-tab" }]);
    off();
  });

  it("ignores a storage event for a different key", () => {
    const store = createArrayStore<Item>("xtab2", isItem);
    const listener = jest.fn();
    const off = store.subscribe(listener);

    window.dispatchEvent(new StorageEvent("storage", { key: "somebody-else" }));

    expect(listener).not.toHaveBeenCalled();
    off();
  });

  it("reacts to the whole area being cleared (key === null)", () => {
    const store = createArrayStore<Item>("xtab3", isItem);
    const listener = jest.fn();
    const off = store.subscribe(listener);

    window.dispatchEvent(new StorageEvent("storage", { key: null }));

    expect(listener).toHaveBeenCalledTimes(1);
    off();
  });
});

describe("unusable stored input falls back instead of throwing", () => {
  it.each([
    ["not JSON at all", "{{{"],
    ["JSON that is not an array", '{"a":1}'],
    ["a JSON string", '"hello"'],
    ["null", "null"],
  ])("%s yields the empty value", (_label, raw) => {
    const store = createArrayStore<Item>("corrupt", isItem);
    localStorage.setItem("corrupt", raw);
    expect(() => store.read()).not.toThrow();
    expect(store.read()).toEqual([]);
  });

  it("drops only the elements that fail the guard", () => {
    // One hand-edited entry should not empty the user's whole list.
    const store = createArrayStore<Item>("mixed", isItem);
    localStorage.setItem(
      "mixed",
      JSON.stringify([{ id: "keep" }, { nope: 1 }, 7, null, { id: "also" }]),
    );
    expect(store.read()).toEqual([{ id: "keep" }, { id: "also" }]);
  });

  it("a parse that throws yields the empty value", () => {
    const store = createLocalStore<string>({
      key: "throwing",
      empty: "fallback",
      parse: () => {
        throw new Error("boom");
      },
    });
    localStorage.setItem("throwing", "anything");
    expect(store.read()).toBe("fallback");
  });
});

describe("boolean store", () => {
  it("round-trips true and false", () => {
    const store = createBooleanStore("bool");
    expect(store.read()).toBe(false);

    store.write(true);
    expect(localStorage.getItem("bool")).toBe("true");
    expect(store.read()).toBe(true);

    store.write(false);
    expect(localStorage.getItem("bool")).toBe("false");
    expect(store.read()).toBe(false);
  });

  it('treats anything that is not "true"/"false" as the default', () => {
    const store = createBooleanStore("bool2");
    localStorage.setItem("bool2", "yes please");
    expect(store.read()).toBe(false);
  });

  it("distinguishes stored false from absent, both rendering as false", () => {
    // The old code used `stored !== null` to decide whether to apply the value at all.
    // Here false and absent coincide, which is why the default must be false.
    const store = createBooleanStore("bool3");
    store.write(false);
    expect(store.read()).toBe(false);
    store.clear();
    expect(store.read()).toBe(false);
  });
});

describe("sessionStorage variant", () => {
  it("writes to sessionStorage and leaves localStorage alone", () => {
    const store = createArrayStore<Item>("sess", isItem, { session: true });
    store.write([{ id: "s" }]);

    expect(sessionStorage.getItem("sess")).not.toBeNull();
    expect(localStorage.getItem("sess")).toBeNull();
    expect(store.read()).toEqual([{ id: "s" }]);
  });
});

describe("storage that throws", () => {
  it("read falls back to empty when getItem throws", () => {
    const store = createArrayStore<Item>("hostile", isItem);
    const spy = jest
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("SecurityError");
      });

    expect(store.read()).toEqual([]);
    spy.mockRestore();
  });

  it("write does not notify when setItem throws, because nothing changed", () => {
    const store = createArrayStore<Item>("hostile2", isItem);
    const listener = jest.fn();
    const off = store.subscribe(listener);
    const setSpy = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    store.write([{ id: "a" }]);

    expect(listener).not.toHaveBeenCalled();
    setSpy.mockRestore();
    errSpy.mockRestore();
    off();
  });
});

describe("two stores on one key share nothing but the key", () => {
  it("each keeps its own cache and both see the other's write", () => {
    // Not a pattern to use — asserted so that a second store created by accident
    // degrades to "slightly wasteful" rather than "serves stale data forever".
    const a = createArrayStore<Item>("shared", isItem);
    const b = createArrayStore<Item>("shared", isItem);

    a.write([{ id: "from-a" }]);
    expect(b.read()).toEqual([{ id: "from-a" }]);

    b.write([{ id: "from-b" }]);
    expect(a.read()).toEqual([{ id: "from-b" }]);
  });
});
