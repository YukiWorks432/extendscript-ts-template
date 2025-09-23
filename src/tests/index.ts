import "../init";

(() => {
  const result: string[] = [];
  const assert = (condition: any, message: string) => {
    result.push(`${condition ? "OK" : "NG"}: ${message}`);
  };

  // Simple pretty printer for arrays/objects
  const toStr = (v: any) => {
    try {
      if (typeof v === "string") return `'${v}'`;
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  };

  const eq = (a: any, b: any) => {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a && b && typeof a === "object") {
      try {
        return JSON.stringify(a) === JSON.stringify(b);
      } catch {
        return false;
      }
    }
    // handle NaN without self-compare rule
    const isNaNNumber = (x: any) => typeof x === "number" && x !== x;
    return isNaNNumber(a) && isNaNNumber(b);
  };

  const assertEq = (actual: any, expected: any, message: string) => {
    assert(
      eq(actual, expected),
      `${message} => actual: ${toStr(actual)}, expected: ${toStr(expected)}`
    );
  };

  const section = (name: string) => {
    result.push(`\n[${name}]`);
  };

  const run = (name: string, fn: () => void) => {
    try {
      fn();
    } catch (e) {
      assert(
        false,
        `${name} threw: ${e && e.toString ? e.toString() : e}; line: ${e && (e as any).line ? (e as any).line : "?"}`
      ); // in case of ScriptError
    }
  };

  // ES5-shim tests
  section("ES5");

  run("JSON", () => {
    assert(typeof JSON === "object", "JSON exists");
    const obj = { a: 1, b: [2, 3], c: { d: 4 } };
    const str = JSON.stringify(obj);
    const parsed = JSON.parse(str);
    assertEq(parsed, obj, "JSON.parse/stringify roundtrip");
  });

  run("Function.prototype.bind", () => {
    function add(this: any, a: number, b: number) {
      return this.x + a + b;
    }
    const ctx = { x: 1 } as any;
    const bound = add.bind(ctx, 2);
    assertEq(bound(3), 6, "bind should bind this and pre-args");
  });

  run("Array core methods", () => {
    const arr = [1, 2, 3];
    let sum = 0;
    arr.forEach((n) => (sum += n));
    assertEq(sum, 6, "Array.forEach accumulates");
    assertEq(
      arr.map((n) => n * 2),
      [2, 4, 6],
      "Array.map doubles values"
    );
    assertEq(
      arr.filter((n) => n > 1),
      [2, 3],
      "Array.filter by predicate"
    );
    assertEq(
      arr.some((n) => n === 3),
      true,
      "Array.some finds 3"
    );
    assertEq(
      arr.every((n) => n > 0),
      true,
      "Array.every positive"
    );
    assertEq(
      arr.reduce((a, b) => a + b, 0),
      6,
      "Array.reduce sums"
    );
    assertEq(
      ["a", "b", "c"].reduceRight((a, b) => a + b),
      "cba",
      "Array.reduceRight order"
    );
    assertEq(Array.isArray(arr), true, "Array.isArray true for arrays");
    assertEq(Array.isArray({}), false, "Array.isArray false for objects");
  });

  run("Object.keys", () => {
    const o = { a: 1, b: 2 } as any;
    const k = Object.keys(o).sort();
    assertEq(k, ["a", "b"], "Object.keys lists enumerable keys");
  });

  run("Date.now", () => {
    const n = Date.now();
    assert(typeof n === "number" && n > 0, "Date.now returns positive number");
  });

  run("String.prototype.trim", () => {
    assertEq("  a  ".trim(), "a", "trim removes surrounding whitespace");
  });

  // ES6-shim tests (forked es6-shim)
  section("ES6");

  run("Array.from (array-like)", () => {
    const like: any = { 0: "x", 1: "y", length: 2 };
    assertEq(Array.from(like), ["x", "y"], "Array.from from array-like");
  });

  run("Array.from (array-mapped)", () => {
    const like: any = { 0: "x", 1: "y", length: 2 };
    const mapped = Array.from(like, (v: string, i: number) => v + i);
    assertEq(mapped, ["x0", "y1"], "Array.from with mapFn");
  });

  run("Array.of", () => {
    assertEq(Array.of(1, 2, 3), [1, 2, 3], "Array.of builds from args");
  });

  run("Array.prototype.find", () => {
    const a = [1, 3, 4];
    assertEq(
      a.find((n) => n % 2 === 0),
      4,
      "find even value"
    );
  });

  run("Array.prototype.findIndex", () => {
    const a = [1, 3, 4];
    assertEq(
      a.findIndex((n) => n % 2 === 0),
      2,
      "findIndex even value"
    );
  });

  run("Array.prototype.fill", () => {
    const f = new Array(3).fill(5);
    assertEq(f, [5, 5, 5], "fill all with 5");
    const f2 = [0, 0, 0, 0];
    f2.fill(1, 1, 3);
    assertEq(f2, [0, 1, 1, 0], "fill range");
  });

  run("Array.prototype.copyWithin", () => {
    const c = [1, 2, 3, 4, 5];
    c.copyWithin(0, 3);
    assertEq(c, [4, 5, 3, 4, 5], "copyWithin basic");
  });

  run("Array.prototype.keys", () => {
    const a = [10, 20];
    const k = a.keys();
    assertEq(k.next().value, 0, "keys first is 0");
    assertEq(k.next().value, 1, "keys second is 1");
  });

  run("Array.prototype.values", () => {
    const a = [10, 20];
    const v = a.values();
    assertEq(v.next().value, 10, "values first is 10");
    assertEq(v.next().value, 20, "values second is 20");
  });

  run("Array.prototype.entries", () => {
    const a = [10, 20];
    const e = a.entries();
    const er1 = e.next();
    const er2 = e.next();
    const first = (er1 && er1.value) as [number, number]; // [0,10]
    const second = (er2 && er2.value) as [number, number]; // [1,20]
    assertEq(first[0], 0, "entries first key");
    assertEq(first[1], 10, "entries first value");
    assertEq(second[0], 1, "entries second key");
    assertEq(second[1], 20, "entries second value");
  });

  run("String.prototype.startsWith/endsWith/includes", () => {
    const s = "hello world";
    assertEq(s.startsWith("he"), true, "startsWith he");
    assertEq(s.endsWith("ld"), true, "endsWith ld");
    assertEq(s.includes("lo wo"), true, "includes lo wo");
  });

  run("String.fromCodePoint", () => {
    assertEq(String.fromCodePoint(65), "A", "fromCodePoint 65 => 'A'");
  });

  run("Number.isNaN", () => {
    assertEq(Number.isNaN(NaN), true, "Number.isNaN true for NaN");
    assertEq(
      Number.isNaN("NaN" as any),
      false,
      "Number.isNaN false for string"
    );
  });

  run("Number.isFinite", () => {
    assertEq(Number.isFinite(1), true, "Number.isFinite true for 1");
    assertEq(
      Number.isFinite("2" as any),
      false,
      "Number.isFinite false for string"
    );
  });

  run("Number.MAX_SAFE_INTEGER and Number.EPSILON", () => {
    assert(
      typeof Number.MAX_SAFE_INTEGER === "number" &&
        Number.MAX_SAFE_INTEGER > 0,
      "MAX_SAFE_INTEGER exists"
    );
    assert(
      typeof Number.EPSILON === "number" && Number.EPSILON > 0,
      "EPSILON exists"
    );
  });

  run("Object.assign", () => {
    const target: any = { a: 1 };
    const assigned = Object.assign(target, { b: 2 }, { c: 3 });
    assertEq(assigned, { a: 1, b: 2, c: 3 }, "Object.assign merges sources");
  });

  run("Object.is", () => {
    assertEq(Object.is(+0, -0), false, "Object.is distinguishes +0 and -0");
    assertEq(Object.is(NaN, NaN), true, "Object.is treats NaN equal to NaN");
  });

  // Finalize: output results
  const print = (text: string) => {
    const dialog = new Window("dialog", "Test Results");
    dialog.add("edittext", [0, 0, 600, 500], text, {
      multiline: true,
      scrollable: true,
      readonly: true,
    });
    dialog.show();
  };

  const okCount = result.filter((l) => l.indexOf("OK:") === 0).length;
  const ngCount = result.filter((l) => l.indexOf("NG:") === 0).length;
  result.push(`\nSummary: OK=${okCount}, NG=${ngCount}`);

  print(result.join("\n"));
})();
