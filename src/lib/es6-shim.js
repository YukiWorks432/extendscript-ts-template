/*!
 * https://github.com/paulmillr/es6-shim
 * @license es6-shim Copyright 2013-2016 by Paul Miller (http://paulmillr.com)
 *   and contributors,  MIT License
 * es6-shim: v0.35.4
 * see https://github.com/paulmillr/es6-shim/blob/0.35.3/LICENSE
 * Details and documentation:
 * https://github.com/paulmillr/es6-shim/
 */

// UMD (Universal Module Definition)
// see https://github.com/umdjs/umd/blob/master/returnExports.js
(function (root, factory) {
  /*global define */
  if (typeof define === "function" && define.amd) {
    // AMD. Register as an anonymous module.
    define(factory);
  } else if (typeof exports === "object") {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    // Browser globals (root is window)
    root.returnExports = factory();
  }
})(this, function () {
  "use strict";

  var _apply = Function.call.bind(Function.apply);
  var _call = Function.call.bind(Function.call);
  var isArray = Array.isArray;
  var keys = Object.keys;

  var not = function notThunker(func) {
    return function notThunk() {
      return !_apply(func, this, arguments);
    };
  };
  var throwsError = function (func) {
    try {
      func();
      return false;
    } catch (e) {
      return true;
    }
  };
  var valueOrFalseIfThrows = function valueOrFalseIfThrows(func) {
    try {
      return func();
    } catch (e) {
      return false;
    }
  };

  var isCallableWithoutNew = not(throwsError);
  var arePropertyDescriptorsSupported = function () {
    // if Object.defineProperty exists but throws, it's IE 8
    return !throwsError(function () {
      return Object.defineProperty({}, "x", { get: function () {} }); // eslint-disable-line getter-return
    });
  };
  var supportsDescriptors =
    !!Object.defineProperty && arePropertyDescriptorsSupported();
  var functionsHaveNames = function foo() {}.name === "foo";

  var _forEach = Function.call.bind(Array.prototype.forEach);
  var _reduce = Function.call.bind(Array.prototype.reduce);
  var _filter = Function.call.bind(Array.prototype.filter);
  var _some = Function.call.bind(Array.prototype.some);

  var defineProperty = function (object, name, value, force) {
    if (!force && name in object) {
      return;
    }
    object[name] = value;
  };

  // Define configurable, writable and non-enumerable props
  // if they don’t exist.
  var defineProperties = function (object, map, forceOverride) {
    _forEach(keys(map), function (name) {
      var method = map[name];
      defineProperty(object, name, method, !!forceOverride);
    });
  };

  var _toString = Function.call.bind(Object.prototype.toString);
  var isCallable =
    typeof /abc/ === "function"
      ? function IsCallableSlow(x) {
          // Some old browsers (IE, FF) say that typeof /abc/ === 'function'
          return (
            typeof x === "function" && _toString(x) === "[object Function]"
          );
        }
      : function IsCallableFast(x) {
          return typeof x === "function";
        };

  var Value = {
    getter: function (object, name, getter) {
      if (!supportsDescriptors) {
        throw new TypeError("getters require true ES5 support");
      }
      Object.defineProperty(object, name, {
        configurable: true,
        enumerable: false,
        get: getter,
      });
    },
    proxy: function (originalObject, key, targetObject) {
      if (!supportsDescriptors) {
        throw new TypeError("getters require true ES5 support");
      }
      var originalDescriptor = Object.getOwnPropertyDescriptor(
        originalObject,
        key
      );
      Object.defineProperty(targetObject, key, {
        configurable: originalDescriptor.configurable,
        enumerable: originalDescriptor.enumerable,
        get: function getKey() {
          return originalObject[key];
        },
        set: function setKey(value) {
          originalObject[key] = value;
        },
      });
    },
    redefine: function (object, property, newValue) {
      if (supportsDescriptors) {
        var descriptor = Object.getOwnPropertyDescriptor(object, property);
        descriptor.value = newValue;
        Object.defineProperty(object, property, descriptor);
      } else {
        object[property] = newValue;
      }
    },
    defineByDescriptor: function (object, property, descriptor) {
      if (supportsDescriptors) {
        Object.defineProperty(object, property, descriptor);
      } else if ("value" in descriptor) {
        object[property] = descriptor.value;
      }
    },
    preserveToString: function (target, source) {
      if (source && isCallable(source.toString)) {
        defineProperty(target, "toString", source.toString.bind(source), true);
      }
    },
  };

  // Simple shim for Object.create on ES3 browsers
  // (unlike real shim, no attempt to support `prototype === null`)
  var create =
    Object.create ||
    function (prototype, properties) {
      var Prototype = function Prototype() {};
      Prototype.prototype = prototype;
      var object = new Prototype();
      if (typeof properties !== "undefined") {
        keys(properties).forEach(function (key) {
          Value.defineByDescriptor(object, key, properties[key]);
        });
      }
      return object;
    };

  var supportsSubclassing = function (C, f) {
    if (!Object.setPrototypeOf) {
      return false; /* skip test on IE < 11 */
    }
    return valueOrFalseIfThrows(function () {
      var Sub = function Subclass(arg) {
        var o = new C(arg);
        Object.setPrototypeOf(o, Subclass.prototype);
        return o;
      };
      Object.setPrototypeOf(Sub, C);
      Sub.prototype = create(C.prototype, {
        constructor: { value: Sub },
      });
      return f(Sub);
    });
  };

  var getGlobal = function () {
    /* global self, window */
    // the only reliable means to get the global object is
    // `Function('return this')()`
    // However, this causes CSP violations in Chrome apps.
    if (typeof self !== "undefined") {
      return self;
    }
    if (typeof window !== "undefined") {
      return window;
    }
    if (typeof global !== "undefined") {
      return global;
    }
    return this;
  };

  var globals = getGlobal();
  var globalIsFinite = function (value) {
    return (
      typeof value === "number" &&
      value === value &&
      value !== Infinity &&
      value !== -Infinity
    );
  };
  var _indexOf = Function.call.bind(String.prototype.indexOf);
  var _arrayIndexOfApply = Function.apply.bind(Array.prototype.indexOf);
  var _concat = Function.call.bind(Array.prototype.concat);
  // var _sort = Function.call.bind(Array.prototype.sort);
  var _strSlice = Function.call.bind(String.prototype.slice);
  var _push = Function.call.bind(Array.prototype.push);
  var _pushApply = Function.apply.bind(Array.prototype.push);
  var _join = Function.call.bind(Array.prototype.join);
  var _shift = Function.call.bind(Array.prototype.shift);
  var _max = Math.max;
  var _min = Math.min;
  var _floor = Math.floor;
  var _abs = Math.abs;
  var _exp = Math.exp;
  var _log = Math.log;
  var _sqrt = Math.sqrt;
  var _hasOwnProperty = Function.call.bind(Object.prototype.hasOwnProperty);
  var ArrayIterator; // make our implementation private
  var noop = function () {};

  var Symbol = globals.Symbol || {};
  var symbolSpecies = Symbol.species || "@@species";

  var numberIsNaN =
    Number.isNaN ||
    function isNaN(value) {
      // NaN !== NaN, but they are identical.
      // NaNs are the only non-reflexive value, i.e., if x !== x,
      // then x is NaN.
      // isNaN is broken: it converts its argument to number, so
      // isNaN('foo') => true
      return value !== value;
    };
  var numberIsFinite =
    Number.isFinite ||
    function isFinite(value) {
      return typeof value === "number" && globalIsFinite(value);
    };
  var _sign = isCallable(Math.sign)
    ? Math.sign
    : function sign(value) {
        var number = Number(value);
        if (number === 0) {
          return number;
        }
        if (numberIsNaN(number)) {
          return number;
        }
        return number < 0 ? -1 : 1;
      };
  var _log1p = function log1p(value) {
    var x = Number(value);
    if (x < -1 || numberIsNaN(x)) {
      return NaN;
    }
    if (x === 0 || x === Infinity) {
      return x;
    }
    if (x === -1) {
      return -Infinity;
    }

    return 1 + x - 1 === 0 ? x : x * (_log(1 + x) / (1 + x - 1));
  };

  // taken directly from https://github.com/ljharb/is-arguments/blob/master/index.js
  // can be replaced with require('is-arguments') if we ever use a build process instead
  var isStandardArguments = function isArguments(value) {
    return _toString(value) === "[object Arguments]";
  };
  var isLegacyArguments = function isArguments(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      typeof value.length === "number" &&
      value.length >= 0 &&
      _toString(value) !== "[object Array]" &&
      _toString(value.callee) === "[object Function]"
    );
  };
  var isArguments = isStandardArguments(arguments)
    ? isStandardArguments
    : isLegacyArguments;

  var Type = {
    primitive: function (x) {
      return x === null || (typeof x !== "function" && typeof x !== "object");
    },
    string: function (x) {
      return _toString(x) === "[object String]";
    },
    regex: function (x) {
      return _toString(x) === "[object RegExp]";
    },
    symbol: function (x) {
      return typeof globals.Symbol === "function" && typeof x === "symbol";
    },
  };

  var overrideNative = function overrideNative(object, property, replacement) {
    var original = object[property];
    defineProperty(object, property, replacement, true);
    Value.preserveToString(object[property], original);
  };

  // eslint-disable-next-line no-restricted-properties
  var hasSymbols =
    typeof Symbol === "function" &&
    typeof Symbol["for"] === "function" &&
    Type.symbol(Symbol());

  // This is a private name in the es6 spec, equal to '[Symbol.iterator]'
  // we're going to use an arbitrary _-prefixed name to make our shims
  // work properly with each other, even though we don't have full Iterator
  // support.  That is, `Array.from(map.keys())` will work, but we don't
  // pretend to export a "real" Iterator interface.
  var $iterator$ = Type.symbol(Symbol.iterator)
    ? Symbol.iterator
    : "_es6-shim iterator_";
  // Firefox ships a partial implementation using the name @@iterator.
  // https://bugzilla.mozilla.org/show_bug.cgi?id=907077#c14
  // So use that name if we detect it.
  if (globals.Set && typeof new globals.Set()["@@iterator"] === "function") {
    $iterator$ = "@@iterator";
  }

  // Reflect
  if (!globals.Reflect) {
    defineProperty(globals, "Reflect", {}, true);
  }
  var Reflect = globals.Reflect;

  var $String = String;

  /* global document */
  var domAll =
    typeof document === "undefined" || !document ? null : document.all;
  var isNullOrUndefined =
    domAll == null
      ? function isNullOrUndefined(x) {
          return x == null;
        }
      : function isNullOrUndefinedAndNotDocumentAll(x) {
          return x == null && x !== domAll;
        };

  var ES = {
    // http://www.ecma-international.org/ecma-262/6.0/#sec-call
    Call: function Call(F, V) {
      var args = arguments.length > 2 ? arguments[2] : [];
      if (!ES.IsCallable(F)) {
        throw new TypeError(F + " is not a function");
      }
      return _apply(F, V, args);
    },

    RequireObjectCoercible: function (x, optMessage) {
      if (isNullOrUndefined(x)) {
        throw new TypeError(optMessage || "Cannot call method on " + x);
      }
      return x;
    },

    // This might miss the "(non-standard exotic and does not implement
    // [[Call]])" case from
    // http://www.ecma-international.org/ecma-262/6.0/#sec-typeof-operator-runtime-semantics-evaluation
    // but we can't find any evidence these objects exist in practice.
    // If we find some in the future, you could test `Object(x) === x`,
    // which is reliable according to
    // http://www.ecma-international.org/ecma-262/6.0/#sec-toobject
    // but is not well optimized by runtimes and creates an object
    // whenever it returns false, and thus is very slow.
    TypeIsObject: function (x) {
      if (x === void 0 || x === null || x === true || x === false) {
        return false;
      }
      return typeof x === "function" || typeof x === "object" || x === domAll;
    },

    ToObject: function (o, optMessage) {
      return Object(ES.RequireObjectCoercible(o, optMessage));
    },

    IsCallable: isCallable,

    IsConstructor: function (x) {
      // We can't tell callables from constructors in ES5
      return ES.IsCallable(x);
    },

    ToInt32: function (x) {
      return ES.ToNumber(x) >> 0;
    },

    ToUint32: function (x) {
      return ES.ToNumber(x) >>> 0;
    },

    ToNumber: function (value) {
      if (hasSymbols && _toString(value) === "[object Symbol]") {
        throw new TypeError("Cannot convert a Symbol value to a number");
      }
      return +value;
    },

    ToInteger: function (value) {
      var number = ES.ToNumber(value);
      if (numberIsNaN(number)) {
        return 0;
      }
      if (number === 0 || !numberIsFinite(number)) {
        return number;
      }
      return (number > 0 ? 1 : -1) * _floor(_abs(number));
    },

    ToLength: function (value) {
      var len = ES.ToInteger(value);
      if (len <= 0) {
        return 0;
      } // includes converting -0 to +0
      if (len > Number.MAX_SAFE_INTEGER) {
        return Number.MAX_SAFE_INTEGER;
      }
      return len;
    },

    SameValue: function (a, b) {
      if (a === b) {
        // 0 === -0, but they are not identical.
        if (a === 0) {
          return 1 / a === 1 / b;
        }
        return true;
      }
      return numberIsNaN(a) && numberIsNaN(b);
    },

    SameValueZero: function (a, b) {
      // same as SameValue except for SameValueZero(+0, -0) == true
      return a === b || (numberIsNaN(a) && numberIsNaN(b));
    },

    GetIterator: function (o) {
      if (isArguments(o)) {
        // special case support for `arguments`
        return new ArrayIterator(o, "value");
      }
      var itFn = ES.GetMethod(o, $iterator$);
      if (!ES.IsCallable(itFn)) {
        // Better diagnostics if itFn is null or undefined
        throw new TypeError("value is not an iterable");
      }
      var it = ES.Call(itFn, o);
      if (!ES.TypeIsObject(it)) {
        throw new TypeError("bad iterator");
      }
      return it;
    },

    GetMethod: function (o, p) {
      var func = ES.ToObject(o)[p];
      if (isNullOrUndefined(func)) {
        return void 0;
      }
      if (!ES.IsCallable(func)) {
        throw new TypeError("Method not callable: " + p);
      }
      return func;
    },

    IteratorComplete: function (iterResult) {
      return !!iterResult.done;
    },

    IteratorClose: function (iterator, completionIsThrow) {
      var returnMethod = ES.GetMethod(iterator, "return");
      if (returnMethod === void 0) {
        return;
      }
      var innerResult, innerException;
      try {
        innerResult = ES.Call(returnMethod, iterator);
      } catch (e) {
        innerException = e;
      }
      if (completionIsThrow) {
        return;
      }
      if (innerException) {
        throw innerException;
      }
      if (!ES.TypeIsObject(innerResult)) {
        throw new TypeError("Iterator's return method returned a non-object.");
      }
    },

    IteratorNext: function (it) {
      var result = arguments.length > 1 ? it.next(arguments[1]) : it.next();
      if (!ES.TypeIsObject(result)) {
        throw new TypeError("bad iterator");
      }
      return result;
    },

    IteratorStep: function (it) {
      var result = ES.IteratorNext(it);
      var done = ES.IteratorComplete(result);
      return done ? false : result;
    },

    Construct: function (C, args, newTarget, isES6internal) {
      var target = typeof newTarget === "undefined" ? C : newTarget;

      if (!isES6internal && Reflect.construct) {
        // Try to use Reflect.construct if available
        return Reflect.construct(C, args, target);
      }
      // OK, we have to fake it.  This will only work if the
      // C.[[ConstructorKind]] == "base" -- but that's the only
      // kind we can make in ES5 code anyway.

      // OrdinaryCreateFromConstructor(target, "%ObjectPrototype%")
      var proto = target.prototype;
      if (!ES.TypeIsObject(proto)) {
        proto = Object.prototype;
      }
      var obj = create(proto);
      // Call the constructor.
      var result = ES.Call(C, obj, args);
      return ES.TypeIsObject(result) ? result : obj;
    },

    SpeciesConstructor: function (O, defaultConstructor) {
      var C = O.constructor;
      if (C === void 0) {
        return defaultConstructor;
      }
      if (!ES.TypeIsObject(C)) {
        throw new TypeError("Bad constructor");
      }
      var S = C[symbolSpecies];
      if (isNullOrUndefined(S)) {
        return defaultConstructor;
      }
      if (!ES.IsConstructor(S)) {
        throw new TypeError("Bad @@species");
      }
      return S;
    },

    CreateHTML: function (string, tag, attribute, value) {
      var S = ES.ToString(string);
      var p1 = "<" + tag;
      if (attribute !== "") {
        var V = ES.ToString(value);
        var escapedV = V.replace(/"/g, "&quot;");
        p1 += " " + attribute + '="' + escapedV + '"';
      }
      var p2 = p1 + ">";
      var p3 = p2 + S;
      return p3 + "</" + tag + ">";
    },

    IsRegExp: function IsRegExp(argument) {
      if (!ES.TypeIsObject(argument)) {
        return false;
      }
      var isRegExp = argument[Symbol.match];
      if (typeof isRegExp !== "undefined") {
        return !!isRegExp;
      }
      return Type.regex(argument);
    },

    ToString: function ToString(string) {
      if (hasSymbols && _toString(string) === "[object Symbol]") {
        throw new TypeError("Cannot convert a Symbol value to a number");
      }
      return $String(string);
    },
  };

  // Well-known Symbol shims
  if (supportsDescriptors && hasSymbols) {
    var defineWellKnownSymbol = function defineWellKnownSymbol(name) {
      if (Type.symbol(Symbol[name])) {
        return Symbol[name];
      }
      // eslint-disable-next-line no-restricted-properties
      var sym = Symbol["for"]("Symbol." + name);
      Object.defineProperty(Symbol, name, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: sym,
      });
      return sym;
    };
    if (!Type.symbol(Symbol.search)) {
      var symbolSearch = defineWellKnownSymbol("search");
      var originalSearch = String.prototype.search;
      defineProperty(RegExp.prototype, symbolSearch, function search(string) {
        return ES.Call(originalSearch, string, [this]);
      });
      var searchShim = function search(regexp) {
        var O = ES.RequireObjectCoercible(this);
        if (!isNullOrUndefined(regexp)) {
          var searcher = ES.GetMethod(regexp, symbolSearch);
          if (typeof searcher !== "undefined") {
            return ES.Call(searcher, regexp, [O]);
          }
        }
        return ES.Call(originalSearch, O, [ES.ToString(regexp)]);
      };
      overrideNative(String.prototype, "search", searchShim);
    }
    if (!Type.symbol(Symbol.replace)) {
      var symbolReplace = defineWellKnownSymbol("replace");
      var originalReplace = String.prototype.replace;
      defineProperty(
        RegExp.prototype,
        symbolReplace,
        function replace(string, replaceValue) {
          return ES.Call(originalReplace, string, [this, replaceValue]);
        }
      );
      var replaceShim = function replace(searchValue, replaceValue) {
        var O = ES.RequireObjectCoercible(this);
        if (!isNullOrUndefined(searchValue)) {
          var replacer = ES.GetMethod(searchValue, symbolReplace);
          if (typeof replacer !== "undefined") {
            return ES.Call(replacer, searchValue, [O, replaceValue]);
          }
        }
        return ES.Call(originalReplace, O, [
          ES.ToString(searchValue),
          replaceValue,
        ]);
      };
      overrideNative(String.prototype, "replace", replaceShim);
    }
    if (!Type.symbol(Symbol.split)) {
      var symbolSplit = defineWellKnownSymbol("split");
      var originalSplit = String.prototype.split;
      defineProperty(
        RegExp.prototype,
        symbolSplit,
        function split(string, limit) {
          return ES.Call(originalSplit, string, [this, limit]);
        }
      );
      var splitShim = function split(separator, limit) {
        var O = ES.RequireObjectCoercible(this);
        if (!isNullOrUndefined(separator)) {
          var splitter = ES.GetMethod(separator, symbolSplit);
          if (typeof splitter !== "undefined") {
            return ES.Call(splitter, separator, [O, limit]);
          }
        }
        return ES.Call(originalSplit, O, [ES.ToString(separator), limit]);
      };
      overrideNative(String.prototype, "split", splitShim);
    }
    var symbolMatchExists = Type.symbol(Symbol.match);
    var stringMatchIgnoresSymbolMatch =
      symbolMatchExists &&
      (function () {
        // Firefox 41, through Nightly 45 has Symbol.match, but String#match ignores it.
        // Firefox 40 and below have Symbol.match but String#match works fine.
        var o = {};
        o[Symbol.match] = function () {
          return 42;
        };
        return "a".match(o) !== 42;
      })();
    if (!symbolMatchExists || stringMatchIgnoresSymbolMatch) {
      var symbolMatch = defineWellKnownSymbol("match");

      var originalMatch = String.prototype.match;
      defineProperty(RegExp.prototype, symbolMatch, function match(string) {
        return ES.Call(originalMatch, string, [this]);
      });

      var matchShim = function match(regexp) {
        var O = ES.RequireObjectCoercible(this);
        if (!isNullOrUndefined(regexp)) {
          var matcher = ES.GetMethod(regexp, symbolMatch);
          if (typeof matcher !== "undefined") {
            return ES.Call(matcher, regexp, [O]);
          }
        }
        return ES.Call(originalMatch, O, [ES.ToString(regexp)]);
      };
      overrideNative(String.prototype, "match", matchShim);
    }
  }

  var wrapConstructor = function wrapConstructor(
    original,
    replacement,
    keysToSkip
  ) {
    Value.preserveToString(replacement, original);
    if (Object.setPrototypeOf) {
      // sets up proper prototype chain where possible
      Object.setPrototypeOf(original, replacement);
    }
    if (supportsDescriptors) {
      _forEach(Object.getOwnPropertyNames(original), function (key) {
        if (key in noop || keysToSkip[key]) {
          return;
        }
        Value.proxy(original, key, replacement);
      });
    } else {
      _forEach(Object.keys(original), function (key) {
        if (key in noop || keysToSkip[key]) {
          return;
        }
        replacement[key] = original[key];
      });
    }
    replacement.prototype = original.prototype;
    Value.redefine(original.prototype, "constructor", replacement);
  };

  var defaultSpeciesGetter = function () {
    return this;
  };
  var addDefaultSpecies = function (C) {
    if (supportsDescriptors && !_hasOwnProperty(C, symbolSpecies)) {
      Value.getter(C, symbolSpecies, defaultSpeciesGetter);
    }
  };

  var addIterator = function (prototype, impl) {
    var implementation =
      impl ||
      function iterator() {
        return this;
      };
    defineProperty(prototype, $iterator$, implementation);
    if (!prototype[$iterator$] && Type.symbol($iterator$)) {
      // implementations are buggy when $iterator$ is a Symbol
      prototype[$iterator$] = implementation;
    }
  };

  var createDataProperty = function createDataProperty(object, name, value) {
    if (supportsDescriptors) {
      Object.defineProperty(object, name, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: value,
      });
    } else {
      object[name] = value;
    }
  };
  var createDataPropertyOrThrow = function createDataPropertyOrThrow(
    object,
    name,
    value
  ) {
    createDataProperty(object, name, value);
    if (!ES.SameValue(object[name], value)) {
      throw new TypeError("property is nonconfigurable");
    }
  };

  var emulateES6construct = function (
    o,
    defaultNewTarget,
    defaultProto,
    slots
  ) {
    // This is an es5 approximation to es6 construct semantics.  in es6,
    // 'new Foo' invokes Foo.[[Construct]] which (for almost all objects)
    // just sets the internal variable NewTarget (in es6 syntax `new.target`)
    // to Foo and then returns Foo().

    // Many ES6 object then have constructors of the form:
    // 1. If NewTarget is undefined, throw a TypeError exception
    // 2. Let xxx by OrdinaryCreateFromConstructor(NewTarget, yyy, zzz)

    // So we're going to emulate those first two steps.
    if (!ES.TypeIsObject(o)) {
      throw new TypeError(
        "Constructor requires `new`: " + defaultNewTarget.name
      );
    }
    var proto = defaultNewTarget.prototype;
    if (!ES.TypeIsObject(proto)) {
      proto = defaultProto;
    }
    var obj = create(proto);
    for (var name in slots) {
      if (_hasOwnProperty(slots, name)) {
        var value = slots[name];
        defineProperty(obj, name, value, true);
      }
    }
    return obj;
  };

  // Firefox 31 reports this function's length as 0
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1062484
  if (String.fromCodePoint && String.fromCodePoint.length !== 1) {
    var originalFromCodePoint = String.fromCodePoint;
    overrideNative(String, "fromCodePoint", function fromCodePoint(codePoints) {
      return ES.Call(originalFromCodePoint, this, arguments);
    });
  }

  var StringShims = {
    fromCodePoint: function fromCodePoint(codePoints) {
      var result = [];
      var next;
      for (var i = 0, length = arguments.length; i < length; i++) {
        next = Number(arguments[i]);
        if (
          !ES.SameValue(next, ES.ToInteger(next)) ||
          next < 0 ||
          next > 0x10ffff
        ) {
          throw new RangeError("Invalid code point " + next);
        }

        if (next < 0x10000) {
          _push(result, String.fromCharCode(next));
        } else {
          next -= 0x10000;
          _push(result, String.fromCharCode((next >> 10) + 0xd800));
          _push(result, String.fromCharCode((next % 0x400) + 0xdc00));
        }
      }
      return _join(result, "");
    },

    raw: function raw(template) {
      var numberOfSubstitutions = arguments.length - 1;
      var cooked = ES.ToObject(template, "bad template");
      var raw = ES.ToObject(cooked.raw, "bad raw value");
      var len = raw.length;
      var literalSegments = ES.ToLength(len);
      if (literalSegments <= 0) {
        return "";
      }

      var stringElements = [];
      var nextIndex = 0;
      var nextKey, next, nextSeg, nextSub;
      while (nextIndex < literalSegments) {
        nextKey = ES.ToString(nextIndex);
        nextSeg = ES.ToString(raw[nextKey]);
        _push(stringElements, nextSeg);
        if (nextIndex + 1 >= literalSegments) {
          break;
        }
        next = nextIndex + 1 < arguments.length ? arguments[nextIndex + 1] : "";
        nextSub = ES.ToString(next);
        _push(stringElements, nextSub);
        nextIndex += 1;
      }
      return _join(stringElements, "");
    },
  };
  if (
    String.raw &&
    String.raw({ raw: { 0: "x", 1: "y", length: 2 } }) !== "xy"
  ) {
    // IE 11 TP has a broken String.raw implementation
    overrideNative(String, "raw", StringShims.raw);
  }
  defineProperties(String, StringShims);

  // Fast repeat, uses the `Exponentiation by squaring` algorithm.
  // Perf: http://jsperf.com/string-repeat2/2
  var stringRepeat = function repeat(s, times) {
    if (times < 1) {
      return "";
    }
    if (times % 2) {
      return repeat(s, times - 1) + s;
    }
    var half = repeat(s, times / 2);
    return half + half;
  };
  var stringMaxLength = Infinity;

  var StringPrototypeShims = {
    repeat: function repeat(times) {
      var thisStr = ES.ToString(ES.RequireObjectCoercible(this));
      var numTimes = ES.ToInteger(times);
      if (numTimes < 0 || numTimes >= stringMaxLength) {
        throw new RangeError(
          "repeat count must be less than infinity and not overflow maximum string size"
        );
      }
      return stringRepeat(thisStr, numTimes);
    },

    startsWith: function startsWith(searchString) {
      var S = ES.ToString(ES.RequireObjectCoercible(this));
      if (ES.IsRegExp(searchString)) {
        throw new TypeError('Cannot call method "startsWith" with a regex');
      }
      var searchStr = ES.ToString(searchString);
      var position;
      if (arguments.length > 1) {
        position = arguments[1];
      }
      var start = _max(ES.ToInteger(position), 0);
      return _strSlice(S, start, start + searchStr.length) === searchStr;
    },

    endsWith: function endsWith(searchString) {
      var S = ES.ToString(ES.RequireObjectCoercible(this));
      if (ES.IsRegExp(searchString)) {
        throw new TypeError('Cannot call method "endsWith" with a regex');
      }
      var searchStr = ES.ToString(searchString);
      var len = S.length;
      var endPosition;
      if (arguments.length > 1) {
        endPosition = arguments[1];
      }
      var pos =
        typeof endPosition === "undefined" ? len : ES.ToInteger(endPosition);
      var end = _min(_max(pos, 0), len);
      return _strSlice(S, end - searchStr.length, end) === searchStr;
    },

    includes: function includes(searchString) {
      if (ES.IsRegExp(searchString)) {
        throw new TypeError('"includes" does not accept a RegExp');
      }
      var searchStr = ES.ToString(searchString);
      var position;
      if (arguments.length > 1) {
        position = arguments[1];
      }
      // Somehow this trick makes method 100% compat with the spec.
      return _indexOf(this, searchStr, position) !== -1;
    },

    codePointAt: function codePointAt(pos) {
      var thisStr = ES.ToString(ES.RequireObjectCoercible(this));
      var position = ES.ToInteger(pos);
      var length = thisStr.length;
      if (position >= 0 && position < length) {
        var first = thisStr.charCodeAt(position);
        var isEnd = position + 1 === length;
        if (first < 0xd800 || first > 0xdbff || isEnd) {
          return first;
        }
        var second = thisStr.charCodeAt(position + 1);
        if (second < 0xdc00 || second > 0xdfff) {
          return first;
        }
        return (first - 0xd800) * 1024 + (second - 0xdc00) + 0x10000;
      }
    },
  };
  if (String.prototype.includes && "a".includes("a", Infinity) !== false) {
    overrideNative(String.prototype, "includes", StringPrototypeShims.includes);
  }

  if (String.prototype.startsWith && String.prototype.endsWith) {
    var startsWithRejectsRegex = throwsError(function () {
      /* throws if spec-compliant */
      return "/a/".startsWith(/a/);
    });
    var startsWithHandlesInfinity = valueOrFalseIfThrows(function () {
      return "abc".startsWith("a", Infinity) === false;
    });
    if (!startsWithRejectsRegex || !startsWithHandlesInfinity) {
      // Firefox (< 37?) and IE 11 TP have a noncompliant startsWith implementation
      overrideNative(
        String.prototype,
        "startsWith",
        StringPrototypeShims.startsWith
      );
      overrideNative(
        String.prototype,
        "endsWith",
        StringPrototypeShims.endsWith
      );
    }
  }
  if (hasSymbols) {
    var startsWithSupportsSymbolMatch = valueOrFalseIfThrows(function () {
      var re = /a/;
      re[Symbol.match] = false;
      return "/a/".startsWith(re);
    });
    if (!startsWithSupportsSymbolMatch) {
      overrideNative(
        String.prototype,
        "startsWith",
        StringPrototypeShims.startsWith
      );
    }
    var endsWithSupportsSymbolMatch = valueOrFalseIfThrows(function () {
      var re = /a/;
      re[Symbol.match] = false;
      return "/a/".endsWith(re);
    });
    if (!endsWithSupportsSymbolMatch) {
      overrideNative(
        String.prototype,
        "endsWith",
        StringPrototypeShims.endsWith
      );
    }
    var includesSupportsSymbolMatch = valueOrFalseIfThrows(function () {
      var re = /a/;
      re[Symbol.match] = false;
      return "/a/".includes(re);
    });
    if (!includesSupportsSymbolMatch) {
      overrideNative(
        String.prototype,
        "includes",
        StringPrototypeShims.includes
      );
    }
  }

  defineProperties(String.prototype, StringPrototypeShims);

  // whitespace from: http://es5.github.io/#x15.5.4.20
  // implementation from https://github.com/es-shims/es5-shim/blob/v3.4.0/es5-shim.js#L1304-L1324
  var ws = [
    "\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003",
    "\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028",
    "\u2029\uFEFF",
  ].join("");
  var trimRegexp = new RegExp("(^[" + ws + "]+)|([" + ws + "]+$)", "g");
  var trimShim = function trim() {
    return ES.ToString(ES.RequireObjectCoercible(this)).replace(trimRegexp, "");
  };
  var nonWS = ["\u0085", "\u200b", "\ufffe"].join("");
  var nonWSregex = new RegExp("[" + nonWS + "]", "g");
  var isBadHexRegex = /^[-+]0x[0-9a-f]+$/i;
  var hasStringTrimBug = nonWS.trim().length !== nonWS.length;
  defineProperty(String.prototype, "trim", trimShim, hasStringTrimBug);

  // Given an argument x, it will return an IteratorResult object,
  // with value set to x and done to false.
  // Given no arguments, it will return an iterator completion object.
  var iteratorResult = function (x) {
    return { value: x, done: arguments.length === 0 };
  };

  // see http://www.ecma-international.org/ecma-262/6.0/#sec-string.prototype-@@iterator
  var StringIterator = function (s) {
    ES.RequireObjectCoercible(s);
    defineProperty(this, "_s", ES.ToString(s));
    defineProperty(this, "_i", 0);
  };
  StringIterator.prototype.next = function () {
    var s = this._s;
    var i = this._i;
    if (typeof s === "undefined" || i >= s.length) {
      this._s = void 0;
      return iteratorResult();
    }
    var first = s.charCodeAt(i);
    var second, len;
    if (first < 0xd800 || first > 0xdbff || i + 1 === s.length) {
      len = 1;
    } else {
      second = s.charCodeAt(i + 1);
      len = second < 0xdc00 || second > 0xdfff ? 1 : 2;
    }
    this._i = i + len;
    return iteratorResult(s.substr(i, len));
  };
  addIterator(StringIterator.prototype);
  addIterator(String.prototype, function () {
    return new StringIterator(this);
  });

  var ArrayShims = {
    from: function from(items) {
      var C = this;
      var mapFn;
      if (arguments.length > 1) {
        mapFn = arguments[1];
      }
      var mapping, T;
      if (typeof mapFn === "undefined") {
        mapping = false;
      } else {
        if (!ES.IsCallable(mapFn)) {
          throw new TypeError(
            "Array.from: when provided, the second argument must be a function"
          );
        }
        if (arguments.length > 2) {
          T = arguments[2];
        }
        mapping = true;
      }

      // Note that that Arrays will use ArrayIterator:
      // https://bugs.ecmascript.org/show_bug.cgi?id=2416
      var usingIterator =
        typeof (isArguments(items) || ES.GetMethod(items, $iterator$)) !==
        "undefined";

      var length, result, i;
      if (usingIterator) {
        result = ES.IsConstructor(C) ? Object(new C()) : [];
        var iterator = ES.GetIterator(items);
        var next, nextValue;

        i = 0;
        while (true) {
          next = ES.IteratorStep(iterator);
          if (next === false) {
            break;
          }
          nextValue = next.value;
          try {
            if (mapping) {
              nextValue =
                typeof T === "undefined"
                  ? mapFn(nextValue, i)
                  : _call(mapFn, T, nextValue, i);
            }
            result[i] = nextValue;
          } catch (e) {
            ES.IteratorClose(iterator, true);
            throw e;
          }
          i += 1;
        }
        length = i;
      } else {
        var arrayLike = ES.ToObject(items);
        length = ES.ToLength(arrayLike.length);
        result = ES.IsConstructor(C)
          ? Object(new C(length))
          : new Array(length);
        var value;
        for (i = 0; i < length; ++i) {
          value = arrayLike[i];
          if (mapping) {
            value =
              typeof T === "undefined"
                ? mapFn(value, i)
                : _call(mapFn, T, value, i);
          }
          createDataPropertyOrThrow(result, i, value);
        }
      }

      result.length = length;
      return result;
    },

    of: function of() {
      var len = arguments.length;
      var C = this;
      var A =
        isArray(C) || !ES.IsCallable(C)
          ? new Array(len)
          : ES.Construct(C, [len]);
      for (var k = 0; k < len; ++k) {
        createDataPropertyOrThrow(A, k, arguments[k]);
      }
      A.length = len;
      return A;
    },
  };
  defineProperties(Array, ArrayShims);
  addDefaultSpecies(Array);

  // Our ArrayIterator is private; see
  // https://github.com/paulmillr/es6-shim/issues/252
  ArrayIterator = function (array, kind) {
    defineProperty(this, "i", 0);
    defineProperty(this, "array", array);
    defineProperty(this, "kind", kind);
  };

  defineProperties(ArrayIterator.prototype, {
    next: function () {
      var i = this.i;
      var array = this.array;
      if (!(this instanceof ArrayIterator)) {
        throw new TypeError("Not an ArrayIterator");
      }
      if (typeof array !== "undefined") {
        var len = ES.ToLength(array.length);
        if (i < len) {
          //for (; i < len; i++) {
          var kind = this.kind;
          var retval;
          if (kind === "key") {
            retval = i;
          } else if (kind === "value") {
            retval = array[i];
          } else if (kind === "entry") {
            retval = [i, array[i]];
          }
          this.i = i + 1;
          return iteratorResult(retval);
        }
      }
      this.array = void 0;
      return iteratorResult();
    },
  });
  addIterator(ArrayIterator.prototype);

  /*
  var orderKeys = function orderKeys(a, b) {
    var aNumeric = String(ES.ToInteger(a)) === a;
    var bNumeric = String(ES.ToInteger(b)) === b;
    if (aNumeric && bNumeric) {
      return b - a;
    } else if (aNumeric && !bNumeric) {
      return -1;
    } else if (!aNumeric && bNumeric) {
      return 1;
    } else {
      return a.localeCompare(b);
    }
  };

  var getAllKeys = function getAllKeys(object) {
    var ownKeys = [];
    var keys = [];

    for (var key in object) {
      _push(_hasOwnProperty(object, key) ? ownKeys : keys, key);
    }
    _sort(ownKeys, orderKeys);
    _sort(keys, orderKeys);

    return _concat(ownKeys, keys);
  };
  */

  // note: this is positioned here because it depends on ArrayIterator
  var arrayOfSupportsSubclassing =
    Array.of === ArrayShims.of ||
    (function () {
      // Detects a bug in Webkit nightly r181886
      var Foo = function Foo(len) {
        this.length = len;
      };
      Foo.prototype = [];
      var fooArr = Array.of.apply(Foo, [1, 2]);
      return fooArr instanceof Foo && fooArr.length === 2;
    })();
  if (!arrayOfSupportsSubclassing) {
    overrideNative(Array, "of", ArrayShims.of);
  }

  var ArrayPrototypeShims = {
    copyWithin: function copyWithin(target, start) {
      var o = ES.ToObject(this);
      var len = ES.ToLength(o.length);
      var relativeTarget = ES.ToInteger(target);
      var relativeStart = ES.ToInteger(start);
      var to =
        relativeTarget < 0
          ? _max(len + relativeTarget, 0)
          : _min(relativeTarget, len);
      var from =
        relativeStart < 0
          ? _max(len + relativeStart, 0)
          : _min(relativeStart, len);
      var end;
      if (arguments.length > 2) {
        end = arguments[2];
      }
      var relativeEnd = typeof end === "undefined" ? len : ES.ToInteger(end);
      var finalItem =
        relativeEnd < 0 ? _max(len + relativeEnd, 0) : _min(relativeEnd, len);
      var count = _min(finalItem - from, len - to);
      var direction = 1;
      if (from < to && to < from + count) {
        direction = -1;
        from += count - 1;
        to += count - 1;
      }
      while (count > 0) {
        if (from in o) {
          o[to] = o[from];
        } else {
          delete o[to];
        }
        from += direction;
        to += direction;
        count -= 1;
      }
      return o;
    },

    fill: function fill(value) {
      var start;
      if (arguments.length > 1) {
        start = arguments[1];
      }
      var end;
      if (arguments.length > 2) {
        end = arguments[2];
      }
      var O = ES.ToObject(this);
      var len = ES.ToLength(O.length);
      start = ES.ToInteger(typeof start === "undefined" ? 0 : start);
      end = ES.ToInteger(typeof end === "undefined" ? len : end);

      var relativeStart = start < 0 ? _max(len + start, 0) : _min(start, len);
      var relativeEnd = end < 0 ? len + end : end;

      for (var i = relativeStart; i < len && i < relativeEnd; ++i) {
        O[i] = value;
      }
      return O;
    },

    find: function find(predicate) {
      var list = ES.ToObject(this);
      var length = ES.ToLength(list.length);
      if (!ES.IsCallable(predicate)) {
        throw new TypeError("Array#find: predicate must be a function");
      }
      var thisArg = arguments.length > 1 ? arguments[1] : null;
      for (var i = 0, value; i < length; i++) {
        value = list[i];
        if (thisArg) {
          if (_call(predicate, thisArg, value, i, list)) {
            return value;
          }
        } else if (predicate(value, i, list)) {
          return value;
        }
      }
    },

    findIndex: function findIndex(predicate) {
      var list = ES.ToObject(this);
      var length = ES.ToLength(list.length);
      if (!ES.IsCallable(predicate)) {
        throw new TypeError("Array#findIndex: predicate must be a function");
      }
      var thisArg = arguments.length > 1 ? arguments[1] : null;
      for (var i = 0; i < length; i++) {
        if (thisArg) {
          if (_call(predicate, thisArg, list[i], i, list)) {
            return i;
          }
        } else if (predicate(list[i], i, list)) {
          return i;
        }
      }
      return -1;
    },

    keys: function keys() {
      return new ArrayIterator(this, "key");
    },

    values: function values() {
      return new ArrayIterator(this, "value");
    },

    entries: function entries() {
      return new ArrayIterator(this, "entry");
    },
  };
  // Safari 7.1 defines Array#keys and Array#entries natively,
  // but the resulting ArrayIterator objects don't have a "next" method.
  if (Array.prototype.keys && !ES.IsCallable([1].keys().next)) {
    delete Array.prototype.keys;
  }
  if (Array.prototype.entries && !ES.IsCallable([1].entries().next)) {
    delete Array.prototype.entries;
  }

  // Chrome 38 defines Array#keys and Array#entries, and Array#@@iterator, but not Array#values
  if (
    Array.prototype.keys &&
    Array.prototype.entries &&
    !Array.prototype.values &&
    Array.prototype[$iterator$]
  ) {
    defineProperties(Array.prototype, {
      values: Array.prototype[$iterator$],
    });
    if (Type.symbol(Symbol.unscopables)) {
      Array.prototype[Symbol.unscopables].values = true;
    }
  }
  // Chrome 40 defines Array#values with the incorrect name, although Array#{keys,entries} have the correct name
  if (
    functionsHaveNames &&
    Array.prototype.values &&
    Array.prototype.values.name !== "values"
  ) {
    var originalArrayPrototypeValues = Array.prototype.values;
    overrideNative(Array.prototype, "values", function values() {
      return ES.Call(originalArrayPrototypeValues, this, arguments);
    });
    defineProperty(Array.prototype, $iterator$, Array.prototype.values, true);
  }
  defineProperties(Array.prototype, ArrayPrototypeShims);

  if (1 / [true].indexOf(true, -0) < 0) {
    // indexOf when given a position arg of -0 should return +0.
    // https://github.com/tc39/ecma262/pull/316
    defineProperty(
      Array.prototype,
      "indexOf",
      function indexOf(searchElement) {
        var value = _arrayIndexOfApply(this, arguments);
        if (value === 0 && 1 / value < 0) {
          return 0;
        }
        return value;
      },
      true
    );
  }

  addIterator(Array.prototype, function () {
    return this.values();
  });
  // Chrome defines keys/values/entries on Array, but doesn't give us
  // any way to identify its iterator.  So add our own shimmed field.
  if (Object.getPrototypeOf) {
    var ChromeArrayIterator = Object.getPrototypeOf([].values());
    if (ChromeArrayIterator) {
      // in WSH, this is `undefined`
      addIterator(ChromeArrayIterator);
    }
  }

  // note: this is positioned here because it relies on Array#entries
  var arrayFromSwallowsNegativeLengths = (function () {
    // Detects a Firefox bug in v32
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1063993
    return valueOrFalseIfThrows(function () {
      return Array.from({ length: -1 }).length === 0;
    });
  })();
  var arrayFromHandlesIterables = (function () {
    // Detects a bug in Webkit nightly r181886
    return false;
  })();
  if (!arrayFromSwallowsNegativeLengths || !arrayFromHandlesIterables) {
    overrideNative(Array, "from", ArrayShims.from);
  }
  var arrayFromHandlesUndefinedMapFunction = (function () {
    // Microsoft Edge v0.11 throws if the mapFn argument is *provided* but undefined,
    // but the spec doesn't care if it's provided or not - undefined doesn't throw.
    return valueOrFalseIfThrows(function () {
      return Array.from([0], void 0);
    });
  })();
  if (!arrayFromHandlesUndefinedMapFunction) {
    var origArrayFrom = Array.from;
    overrideNative(Array, "from", function from(items) {
      if (arguments.length > 1 && typeof arguments[1] !== "undefined") {
        return ES.Call(origArrayFrom, this, arguments);
      }
      return _call(origArrayFrom, this, items);
    });
  }

  var int32sAsOne = -(Math.pow(2, 32) - 1);
  var toLengthsCorrectly = function (method, reversed) {
    var obj = { length: int32sAsOne };
    obj[reversed ? (obj.length >>> 0) - 1 : 0] = true;
    return valueOrFalseIfThrows(function () {
      _call(
        method,
        obj,
        function () {
          // note: in nonconforming browsers, this will be called
          // -1 >>> 0 times, which is 4294967295, so the throw matters.
          throw new RangeError("should not reach here");
        },
        []
      );
      return true;
    });
  };
  if (!toLengthsCorrectly(Array.prototype.forEach)) {
    var originalForEach = Array.prototype.forEach;
    overrideNative(Array.prototype, "forEach", function forEach(callbackFn) {
      return ES.Call(originalForEach, this.length >= 0 ? this : [], arguments);
    });
  }
  if (!toLengthsCorrectly(Array.prototype.map)) {
    var originalMap = Array.prototype.map;
    overrideNative(Array.prototype, "map", function map(callbackFn) {
      return ES.Call(originalMap, this.length >= 0 ? this : [], arguments);
    });
  }
  if (!toLengthsCorrectly(Array.prototype.filter)) {
    var originalFilter = Array.prototype.filter;
    overrideNative(Array.prototype, "filter", function filter(callbackFn) {
      return ES.Call(originalFilter, this.length >= 0 ? this : [], arguments);
    });
  }
  if (!toLengthsCorrectly(Array.prototype.some)) {
    var originalSome = Array.prototype.some;
    overrideNative(Array.prototype, "some", function some(callbackFn) {
      return ES.Call(originalSome, this.length >= 0 ? this : [], arguments);
    });
  }
  if (!toLengthsCorrectly(Array.prototype.every)) {
    var originalEvery = Array.prototype.every;
    overrideNative(Array.prototype, "every", function every(callbackFn) {
      return ES.Call(originalEvery, this.length >= 0 ? this : [], arguments);
    });
  }
  if (!toLengthsCorrectly(Array.prototype.reduce)) {
    var originalReduce = Array.prototype.reduce;
    overrideNative(Array.prototype, "reduce", function reduce(callbackFn) {
      return ES.Call(originalReduce, this.length >= 0 ? this : [], arguments);
    });
  }
  if (!toLengthsCorrectly(Array.prototype.reduceRight, true)) {
    var originalReduceRight = Array.prototype.reduceRight;
    overrideNative(
      Array.prototype,
      "reduceRight",
      function reduceRight(callbackFn) {
        return ES.Call(
          originalReduceRight,
          this.length >= 0 ? this : [],
          arguments
        );
      }
    );
  }

  var lacksOctalSupport = Number("0o10") !== 8;
  var lacksBinarySupport = Number("0b10") !== 2;
  var trimsNonWhitespace = _some(nonWS, function (c) {
    return Number(c + 0 + c) === 0;
  });
  if (lacksOctalSupport || lacksBinarySupport || trimsNonWhitespace) {
    var OrigNumber = Number;
    var binaryRegex = /^0b[01]+$/i;
    var octalRegex = /^0o[0-7]+$/i;
    // Note that in IE 8, RegExp.prototype.test doesn't seem to exist: ie, "test" is an own property of regexes. wtf.
    var isBinary = binaryRegex.test.bind(binaryRegex);
    var isOctal = octalRegex.test.bind(octalRegex);
    var toPrimitive = function (O, hint) {
      // need to replace this with `es-to-primitive/es6`
      var result;
      if (typeof O.valueOf === "function") {
        result = O.valueOf();
        if (Type.primitive(result)) {
          return result;
        }
      }
      if (typeof O.toString === "function") {
        result = O.toString();
        if (Type.primitive(result)) {
          return result;
        }
      }
      throw new TypeError("No default value");
    };
    var hasNonWS = nonWSregex.test.bind(nonWSregex);
    var isBadHex = isBadHexRegex.test.bind(isBadHexRegex);
    var NumberShim = (function () {
      // this is wrapped in an IIFE because of IE 6-8's wacky scoping issues with named function expressions.
      var NumberShim = function Number(value) {
        var primValue;
        if (arguments.length > 0) {
          primValue = Type.primitive(value)
            ? value
            : toPrimitive(value, "number");
        } else {
          primValue = 0;
        }
        if (typeof primValue === "string") {
          primValue = ES.Call(trimShim, primValue);
          if (isBinary(primValue)) {
            primValue = parseInt(_strSlice(primValue, 2), 2);
          } else if (isOctal(primValue)) {
            primValue = parseInt(_strSlice(primValue, 2), 8);
          } else if (hasNonWS(primValue) || isBadHex(primValue)) {
            primValue = NaN;
          }
        }
        var receiver = this;
        var valueOfSucceeds = valueOrFalseIfThrows(function () {
          OrigNumber.prototype.valueOf.call(receiver);
          return true;
        });
        if (receiver instanceof NumberShim && !valueOfSucceeds) {
          return new OrigNumber(primValue);
        }
        return OrigNumber(primValue);
      };
      return NumberShim;
    })();
    wrapConstructor(OrigNumber, NumberShim, {});
    // this is necessary for ES3 browsers, where these properties are non-enumerable.
    defineProperties(NumberShim, {
      NaN: OrigNumber.NaN,
      MAX_VALUE: OrigNumber.MAX_VALUE,
      MIN_VALUE: OrigNumber.MIN_VALUE,
      NEGATIVE_INFINITY: OrigNumber.NEGATIVE_INFINITY,
      POSITIVE_INFINITY: OrigNumber.POSITIVE_INFINITY,
    });
    Number = NumberShim; // eslint-disable-line no-global-assign
    Value.redefine(globals, "Number", NumberShim);
  }

  var maxSafeInteger = Math.pow(2, 53) - 1;
  defineProperties(Number, {
    MAX_SAFE_INTEGER: maxSafeInteger,
    MIN_SAFE_INTEGER: -maxSafeInteger,
    EPSILON: 2.220446049250313e-16,

    parseInt: globals.parseInt,
    parseFloat: globals.parseFloat,

    isFinite: numberIsFinite,

    isInteger: function isInteger(value) {
      return numberIsFinite(value) && ES.ToInteger(value) === value;
    },

    isSafeInteger: function isSafeInteger(value) {
      return Number.isInteger(value) && _abs(value) <= Number.MAX_SAFE_INTEGER;
    },

    isNaN: numberIsNaN,
  });
  // Firefox 37 has a conforming Number.parseInt, but it's not === to the global parseInt (fixed in v40)
  defineProperty(
    Number,
    "parseInt",
    globals.parseInt,
    Number.parseInt !== globals.parseInt
  );

  overrideNative(Array.prototype, "find", ArrayPrototypeShims.find);
  overrideNative(Array.prototype, "findIndex", ArrayPrototypeShims.findIndex);

  var isEnumerableOn = Function.bind.call(
    Function.bind,
    Object.prototype.propertyIsEnumerable
  );
  var ensureEnumerable = function ensureEnumerable(obj, prop) {
    if (supportsDescriptors && isEnumerableOn(obj, prop)) {
      Object.defineProperty(obj, prop, { enumerable: false });
    }
  };
  var sliceArgs = function sliceArgs() {
    // per https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#32-leaking-arguments
    // and https://gist.github.com/WebReflection/4327762cb87a8c634a29
    var initial = Number(this);
    var len = arguments.length;
    var desiredArgCount = len - initial;
    var args = new Array(desiredArgCount < 0 ? 0 : desiredArgCount);
    for (var i = initial; i < len; ++i) {
      args[i - initial] = arguments[i];
    }
    return args;
  };
  var assignTo = function assignTo(source) {
    return function assignToSource(target, key) {
      target[key] = source[key];
      return target;
    };
  };
  var assignReducer = function (target, source) {
    var sourceKeys = keys(Object(source));
    var symbols;
    if (ES.IsCallable(Object.getOwnPropertySymbols)) {
      symbols = _filter(
        Object.getOwnPropertySymbols(Object(source)),
        isEnumerableOn(source)
      );
    }
    return _reduce(
      _concat(sourceKeys, symbols || []),
      assignTo(source),
      target
    );
  };

  var ObjectShims = {
    // 19.1.3.1
    assign: function (target, source) {
      var to = ES.ToObject(
        target,
        "Cannot convert undefined or null to object"
      );
      return _reduce(ES.Call(sliceArgs, 1, arguments), assignReducer, to);
    },

    // Added in WebKit in https://bugs.webkit.org/show_bug.cgi?id=143865
    is: function is(a, b) {
      return ES.SameValue(a, b);
    },
  };
  var assignHasPendingExceptions =
    Object.assign &&
    Object.preventExtensions &&
    (function () {
      // Firefox 37 still has "pending exception" logic in its Object.assign implementation,
      // which is 72% slower than our shim, and Firefox 40's native implementation.
      var thrower = Object.preventExtensions({ 1: 2 });
      try {
        Object.assign(thrower, "xy");
      } catch (e) {
        return thrower[1] === "y";
      }
    })();
  if (assignHasPendingExceptions) {
    overrideNative(Object, "assign", ObjectShims.assign);
  }
  defineProperties(Object, ObjectShims);

  if (supportsDescriptors) {
    var ES5ObjectShims = {
      // 19.1.3.9
      // shim from https://gist.github.com/WebReflection/5593554
      setPrototypeOf: (function (Object) {
        var set;

        var checkArgs = function (O, proto) {
          if (!ES.TypeIsObject(O)) {
            throw new TypeError("cannot set prototype on a non-object");
          }
          if (!(proto === null || ES.TypeIsObject(proto))) {
            throw new TypeError(
              "can only set prototype to an object or null" + proto
            );
          }
        };

        var setPrototypeOf = function (O, proto) {
          checkArgs(O, proto);
          _call(set, O, proto);
          return O;
        };

        try {
          // this works already in Firefox and Safari
          set = Object.getOwnPropertyDescriptor(
            Object.prototype,
            "__proto__"
          ).set;
          _call(set, {}, null);
        } catch (e) {
          if (Object.prototype !== {}.__proto__) {
            // eslint-disable-line no-proto
            // IE < 11 cannot be shimmed
            return;
          }
          // probably Chrome or some old Mobile stock browser
          set = function (proto) {
            this.__proto__ = proto; // eslint-disable-line no-proto
          };
          // please note that this will **not** work
          // in those browsers that do not inherit
          // __proto__ by mistake from Object.prototype
          // in these cases we should probably throw an error
          // or at least be informed about the issue
          setPrototypeOf.polyfill =
            setPrototypeOf(
              setPrototypeOf({}, null),
              Object.prototype
            ) instanceof Object;
          // setPrototypeOf.polyfill === true means it works as meant
          // setPrototypeOf.polyfill === false means it's not 100% reliable
          // setPrototypeOf.polyfill === undefined
          // or
          // setPrototypeOf.polyfill ==  null means it's not a polyfill
          // which means it works as expected
          // we can even delete Object.prototype.__proto__;
        }
        return setPrototypeOf;
      })(Object),
    };

    defineProperties(Object, ES5ObjectShims);
  }

  // Workaround bug in Opera 12 where setPrototypeOf(x, null) doesn't work,
  // but Object.create(null) does.
  if (
    Object.setPrototypeOf &&
    Object.getPrototypeOf &&
    Object.getPrototypeOf(Object.setPrototypeOf({}, null)) !== null &&
    Object.getPrototypeOf(Object.create(null)) === null
  ) {
    (function () {
      var FAKENULL = Object.create(null);
      var gpo = Object.getPrototypeOf;
      var spo = Object.setPrototypeOf;
      Object.getPrototypeOf = function (o) {
        var result = gpo(o);
        return result === FAKENULL ? null : result;
      };
      Object.setPrototypeOf = function (o, p) {
        var proto = p === null ? FAKENULL : p;
        return spo(o, proto);
      };
      Object.setPrototypeOf.polyfill = false;
    })();
  }

  var objectKeysAcceptsPrimitives = !throwsError(function () {
    return Object.keys("foo");
  });
  if (!objectKeysAcceptsPrimitives) {
    var originalObjectKeys = Object.keys;
    overrideNative(Object, "keys", function keys(value) {
      return originalObjectKeys(ES.ToObject(value));
    });
    keys = Object.keys;
  }
  var objectKeysRejectsRegex = throwsError(function () {
    return Object.keys(/a/g);
  });
  if (objectKeysRejectsRegex) {
    var regexRejectingObjectKeys = Object.keys;
    overrideNative(Object, "keys", function keys(value) {
      if (Type.regex(value)) {
        var regexKeys = [];
        for (var k in value) {
          if (_hasOwnProperty(value, k)) {
            _push(regexKeys, k);
          }
        }
        return regexKeys;
      }
      return regexRejectingObjectKeys(value);
    });
    keys = Object.keys;
  }

  if (Object.getOwnPropertyNames) {
    var objectGOPNAcceptsPrimitives = !throwsError(function () {
      return Object.getOwnPropertyNames("foo");
    });
    if (!objectGOPNAcceptsPrimitives) {
      var cachedWindowNames =
        typeof window === "object" ? Object.getOwnPropertyNames(window) : [];
      var originalObjectGetOwnPropertyNames = Object.getOwnPropertyNames;
      overrideNative(
        Object,
        "getOwnPropertyNames",
        function getOwnPropertyNames(value) {
          var val = ES.ToObject(value);
          if (_toString(val) === "[object Window]") {
            try {
              return originalObjectGetOwnPropertyNames(val);
            } catch (e) {
              // IE bug where layout engine calls userland gOPN for cross-domain `window` objects
              return _concat([], cachedWindowNames);
            }
          }
          return originalObjectGetOwnPropertyNames(val);
        }
      );
    }
  }
  if (Object.getOwnPropertyDescriptor) {
    var objectGOPDAcceptsPrimitives = !throwsError(function () {
      return Object.getOwnPropertyDescriptor("foo", "bar");
    });
    if (!objectGOPDAcceptsPrimitives) {
      var originalObjectGetOwnPropertyDescriptor =
        Object.getOwnPropertyDescriptor;
      overrideNative(
        Object,
        "getOwnPropertyDescriptor",
        function getOwnPropertyDescriptor(value, property) {
          return originalObjectGetOwnPropertyDescriptor(
            ES.ToObject(value),
            property
          );
        }
      );
    }
  }
  if (Object.seal) {
    var objectSealAcceptsPrimitives = !throwsError(function () {
      return Object.seal("foo");
    });
    if (!objectSealAcceptsPrimitives) {
      var originalObjectSeal = Object.seal;
      overrideNative(Object, "seal", function seal(value) {
        if (!ES.TypeIsObject(value)) {
          return value;
        }
        return originalObjectSeal(value);
      });
    }
  }
  if (Object.isSealed) {
    var objectIsSealedAcceptsPrimitives = !throwsError(function () {
      return Object.isSealed("foo");
    });
    if (!objectIsSealedAcceptsPrimitives) {
      var originalObjectIsSealed = Object.isSealed;
      overrideNative(Object, "isSealed", function isSealed(value) {
        if (!ES.TypeIsObject(value)) {
          return true;
        }
        return originalObjectIsSealed(value);
      });
    }
  }
  if (Object.freeze) {
    var objectFreezeAcceptsPrimitives = !throwsError(function () {
      return Object.freeze("foo");
    });
    if (!objectFreezeAcceptsPrimitives) {
      var originalObjectFreeze = Object.freeze;
      overrideNative(Object, "freeze", function freeze(value) {
        if (!ES.TypeIsObject(value)) {
          return value;
        }
        return originalObjectFreeze(value);
      });
    }
  }
  if (Object.isFrozen) {
    var objectIsFrozenAcceptsPrimitives = !throwsError(function () {
      return Object.isFrozen("foo");
    });
    if (!objectIsFrozenAcceptsPrimitives) {
      var originalObjectIsFrozen = Object.isFrozen;
      overrideNative(Object, "isFrozen", function isFrozen(value) {
        if (!ES.TypeIsObject(value)) {
          return true;
        }
        return originalObjectIsFrozen(value);
      });
    }
  }
  if (Object.preventExtensions) {
    var objectPreventExtensionsAcceptsPrimitives = !throwsError(function () {
      return Object.preventExtensions("foo");
    });
    if (!objectPreventExtensionsAcceptsPrimitives) {
      var originalObjectPreventExtensions = Object.preventExtensions;
      overrideNative(
        Object,
        "preventExtensions",
        function preventExtensions(value) {
          if (!ES.TypeIsObject(value)) {
            return value;
          }
          return originalObjectPreventExtensions(value);
        }
      );
    }
  }
  if (Object.isExtensible) {
    var objectIsExtensibleAcceptsPrimitives = !throwsError(function () {
      return Object.isExtensible("foo");
    });
    if (!objectIsExtensibleAcceptsPrimitives) {
      var originalObjectIsExtensible = Object.isExtensible;
      overrideNative(Object, "isExtensible", function isExtensible(value) {
        if (!ES.TypeIsObject(value)) {
          return false;
        }
        return originalObjectIsExtensible(value);
      });
    }
  }
  if (Object.getPrototypeOf) {
    var objectGetProtoAcceptsPrimitives = !throwsError(function () {
      return Object.getPrototypeOf("foo");
    });
    if (!objectGetProtoAcceptsPrimitives) {
      var originalGetProto = Object.getPrototypeOf;
      overrideNative(Object, "getPrototypeOf", function getPrototypeOf(value) {
        return originalGetProto(ES.ToObject(value));
      });
    }
  }

  var hasFlags =
    supportsDescriptors &&
    (function () {
      var desc = Object.getOwnPropertyDescriptor(RegExp.prototype, "flags");
      return desc && ES.IsCallable(desc.get);
    })();
  if (supportsDescriptors && !hasFlags) {
    var regExpFlagsGetter = function flags() {
      if (!ES.TypeIsObject(this)) {
        throw new TypeError(
          "Method called on incompatible type: must be an object."
        );
      }
      var result = "";
      if (this.global) {
        result += "g";
      }
      if (this.ignoreCase) {
        result += "i";
      }
      if (this.multiline) {
        result += "m";
      }
      if (this.unicode) {
        result += "u";
      }
      if (this.sticky) {
        result += "y";
      }
      return result;
    };

    Value.getter(RegExp.prototype, "flags", regExpFlagsGetter);
  }

  var regExpSupportsFlagsWithRegex =
    supportsDescriptors &&
    valueOrFalseIfThrows(function () {
      return String(new RegExp(/a/g, "i")) === "/a/i";
    });
  var regExpNeedsToSupportSymbolMatch =
    hasSymbols &&
    supportsDescriptors &&
    (function () {
      // Edge 0.12 supports flags fully, but does not support Symbol.match
      var regex = /./;
      regex[Symbol.match] = false;
      return RegExp(regex) === regex;
    })();

  var regexToStringIsGeneric = valueOrFalseIfThrows(function () {
    return RegExp.prototype.toString.call({ source: "abc" }) === "/abc/";
  });
  var regexToStringSupportsGenericFlags =
    regexToStringIsGeneric &&
    valueOrFalseIfThrows(function () {
      return (
        RegExp.prototype.toString.call({ source: "a", flags: "b" }) === "/a/b"
      );
    });
  if (!regexToStringIsGeneric || !regexToStringSupportsGenericFlags) {
    var origRegExpToString = RegExp.prototype.toString;
    defineProperty(
      RegExp.prototype,
      "toString",
      function toString() {
        var R = ES.RequireObjectCoercible(this);
        if (Type.regex(R)) {
          return _call(origRegExpToString, R);
        }
        var pattern = $String(R.source);
        var flags = $String(R.flags);
        return "/" + pattern + "/" + flags;
      },
      true
    );
    Value.preserveToString(RegExp.prototype.toString, origRegExpToString);
    RegExp.prototype.toString.prototype = void 0;
  }

  if (
    supportsDescriptors &&
    (!regExpSupportsFlagsWithRegex || regExpNeedsToSupportSymbolMatch)
  ) {
    var flagsGetter = Object.getOwnPropertyDescriptor(
      RegExp.prototype,
      "flags"
    ).get;
    var sourceDesc =
      Object.getOwnPropertyDescriptor(RegExp.prototype, "source") || {};
    var legacySourceGetter = function () {
      // prior to it being a getter, it's own + nonconfigurable
      return this.source;
    };
    var sourceGetter = ES.IsCallable(sourceDesc.get)
      ? sourceDesc.get
      : legacySourceGetter;

    var OrigRegExp = RegExp;
    var RegExpShim = (function () {
      return function RegExp(pattern, flags) {
        var patternIsRegExp = ES.IsRegExp(pattern);
        var calledWithNew = this instanceof RegExp;
        if (
          !calledWithNew &&
          patternIsRegExp &&
          typeof flags === "undefined" &&
          pattern.constructor === RegExp
        ) {
          return pattern;
        }

        var P = pattern;
        var F = flags;
        if (Type.regex(pattern)) {
          P = ES.Call(sourceGetter, pattern);
          F =
            typeof flags === "undefined"
              ? ES.Call(flagsGetter, pattern)
              : flags;
          return new RegExp(P, F);
        } else if (patternIsRegExp) {
          P = pattern.source;
          F = typeof flags === "undefined" ? pattern.flags : flags;
        }
        return new OrigRegExp(pattern, flags);
      };
    })();
    wrapConstructor(OrigRegExp, RegExpShim, {
      $input: true, // Chrome < v39 & Opera < 26 have a nonstandard "$input" property
    });
    RegExp = RegExpShim; // eslint-disable-line no-global-assign
    Value.redefine(globals, "RegExp", RegExpShim);
  }

  if (supportsDescriptors) {
    var regexGlobals = {
      input: "$_",
      lastMatch: "$&",
      lastParen: "$+",
      leftContext: "$`",
      rightContext: "$'",
    };
    _forEach(keys(regexGlobals), function (prop) {
      if (prop in RegExp && !(regexGlobals[prop] in RegExp)) {
        Value.getter(RegExp, regexGlobals[prop], function get() {
          return RegExp[prop];
        });
      }
    });
  }
  addDefaultSpecies(RegExp);

  var inverseEpsilon = 1 / Number.EPSILON;
  var roundTiesToEven = function roundTiesToEven(n) {
    // Even though this reduces down to `return n`, it takes advantage of built-in rounding.
    return n + inverseEpsilon - inverseEpsilon;
  };
  var BINARY_32_EPSILON = Math.pow(2, -23);
  var BINARY_32_MAX_VALUE = Math.pow(2, 127) * (2 - BINARY_32_EPSILON);
  var BINARY_32_MIN_VALUE = Math.pow(2, -126);
  var E = Math.E;
  var LOG2E = Math.LOG2E;
  var LOG10E = Math.LOG10E;
  var numberCLZ = Number.prototype.clz;
  delete Number.prototype.clz; // Safari 8 has Number#clz

  var MathShims = {
    acosh: function acosh(value) {
      var x = Number(value);
      if (numberIsNaN(x) || value < 1) {
        return NaN;
      }
      if (x === 1) {
        return 0;
      }
      if (x === Infinity) {
        return x;
      }

      var xInvSquared = 1 / (x * x);
      if (x < 2) {
        return _log1p(x - 1 + _sqrt(1 - xInvSquared) * x);
      }
      var halfX = x / 2;
      return _log1p(halfX + _sqrt(1 - xInvSquared) * halfX - 1) + 1 / LOG2E;
    },

    asinh: function asinh(value) {
      var x = Number(value);
      if (x === 0 || !globalIsFinite(x)) {
        return x;
      }

      var a = _abs(x);
      var aSquared = a * a;
      var s = _sign(x);
      if (a < 1) {
        return s * _log1p(a + aSquared / (_sqrt(aSquared + 1) + 1));
      }
      return (
        s * (_log1p(a / 2 + (_sqrt(1 + 1 / aSquared) * a) / 2 - 1) + 1 / LOG2E)
      );
    },

    atanh: function atanh(value) {
      var x = Number(value);

      if (x === 0) {
        return x;
      }
      if (x === -1) {
        return -Infinity;
      }
      if (x === 1) {
        return Infinity;
      }
      if (numberIsNaN(x) || x < -1 || x > 1) {
        return NaN;
      }

      var a = _abs(x);
      return (_sign(x) * _log1p((2 * a) / (1 - a))) / 2;
    },

    cbrt: function cbrt(value) {
      var x = Number(value);
      if (x === 0) {
        return x;
      }
      var negate = x < 0;
      var result;
      if (negate) {
        x = -x;
      }
      if (x === Infinity) {
        result = Infinity;
      } else {
        result = _exp(_log(x) / 3);
        // from http://en.wikipedia.org/wiki/Cube_root#Numerical_methods
        result = (x / (result * result) + 2 * result) / 3;
      }
      return negate ? -result : result;
    },

    clz32: function clz32(value) {
      // See https://bugs.ecmascript.org/show_bug.cgi?id=2465
      var x = Number(value);
      var number = ES.ToUint32(x);
      if (number === 0) {
        return 32;
      }
      return numberCLZ
        ? ES.Call(numberCLZ, number)
        : 31 - _floor(_log(number + 0.5) * LOG2E);
    },

    cosh: function cosh(value) {
      var x = Number(value);
      if (x === 0) {
        return 1;
      } // +0 or -0
      if (numberIsNaN(x)) {
        return NaN;
      }
      if (!globalIsFinite(x)) {
        return Infinity;
      }

      var t = _exp(_abs(x) - 1);
      return (t + 1 / (t * E * E)) * (E / 2);
    },

    expm1: function expm1(value) {
      var x = Number(value);
      if (x === -Infinity) {
        return -1;
      }
      if (!globalIsFinite(x) || x === 0) {
        return x;
      }
      if (_abs(x) > 0.5) {
        return _exp(x) - 1;
      }
      // A more precise approximation using Taylor series expansion
      // from https://github.com/paulmillr/es6-shim/issues/314#issuecomment-70293986
      var t = x;
      var sum = 0;
      var n = 1;
      while (sum + t !== sum) {
        sum += t;
        n += 1;
        t *= x / n;
      }
      return sum;
    },

    hypot: function hypot(x, y) {
      var result = 0;
      var largest = 0;
      for (var i = 0; i < arguments.length; ++i) {
        var value = _abs(Number(arguments[i]));
        if (largest < value) {
          result *= (largest / value) * (largest / value);
          result += 1;
          largest = value;
        } else {
          result += value > 0 ? (value / largest) * (value / largest) : value;
        }
      }
      return largest === Infinity ? Infinity : largest * _sqrt(result);
    },

    log2: function log2(value) {
      return _log(value) * LOG2E;
    },

    log10: function log10(value) {
      return _log(value) * LOG10E;
    },

    log1p: _log1p,

    sign: _sign,

    sinh: function sinh(value) {
      var x = Number(value);
      if (!globalIsFinite(x) || x === 0) {
        return x;
      }

      var a = _abs(x);
      if (a < 1) {
        var u = Math.expm1(a);
        return (_sign(x) * u * (1 + 1 / (u + 1))) / 2;
      }
      var t = _exp(a - 1);
      return _sign(x) * (t - 1 / (t * E * E)) * (E / 2);
    },

    tanh: function tanh(value) {
      var x = Number(value);
      if (numberIsNaN(x) || x === 0) {
        return x;
      }
      // can exit early at +-20 as JS loses precision for true value at this integer
      if (x >= 20) {
        return 1;
      }
      if (x <= -20) {
        return -1;
      }

      return (Math.expm1(x) - Math.expm1(-x)) / (_exp(x) + _exp(-x));
    },

    trunc: function trunc(value) {
      var x = Number(value);
      return x < 0 ? -_floor(-x) : _floor(x);
    },

    imul: function imul(x, y) {
      // taken from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul
      var a = ES.ToUint32(x);
      var b = ES.ToUint32(y);
      var ah = (a >>> 16) & 0xffff;
      var al = a & 0xffff;
      var bh = (b >>> 16) & 0xffff;
      var bl = b & 0xffff;
      // the shift by 0 fixes the sign on the high part
      // the final |0 converts the unsigned value into a signed value
      return (al * bl + (((ah * bl + al * bh) << 16) >>> 0)) | 0;
    },

    fround: function fround(x) {
      var v = Number(x);
      if (v === 0 || v === Infinity || v === -Infinity || numberIsNaN(v)) {
        return v;
      }
      var sign = _sign(v);
      var abs = _abs(v);
      if (abs < BINARY_32_MIN_VALUE) {
        return (
          sign *
          roundTiesToEven(abs / BINARY_32_MIN_VALUE / BINARY_32_EPSILON) *
          BINARY_32_MIN_VALUE *
          BINARY_32_EPSILON
        );
      }
      // Veltkamp's splitting (?)
      var a = (1 + BINARY_32_EPSILON / Number.EPSILON) * abs;
      var result = a - (a - abs);
      if (result > BINARY_32_MAX_VALUE || numberIsNaN(result)) {
        return sign * Infinity;
      }
      return sign * result;
    },
  };

  var withinULPDistance = function withinULPDistance(
    result,
    expected,
    distance
  ) {
    return _abs(1 - result / expected) / Number.EPSILON < (distance || 8);
  };

  defineProperties(Math, MathShims);
  // Chrome < 40 sinh returns ∞ for large numbers
  defineProperty(Math, "sinh", MathShims.sinh, Math.sinh(710) === Infinity);
  // Chrome < 40 cosh returns ∞ for large numbers
  defineProperty(Math, "cosh", MathShims.cosh, Math.cosh(710) === Infinity);
  // IE 11 TP has an imprecise log1p: reports Math.log1p(-1e-17) as 0
  defineProperty(Math, "log1p", MathShims.log1p, Math.log1p(-1e-17) !== -1e-17);
  // IE 11 TP has an imprecise asinh: reports Math.asinh(-1e7) as not exactly equal to -Math.asinh(1e7)
  defineProperty(
    Math,
    "asinh",
    MathShims.asinh,
    Math.asinh(-1e7) !== -Math.asinh(1e7)
  );
  // Chrome < 54 asinh returns ∞ for large numbers and should not
  defineProperty(
    Math,
    "asinh",
    MathShims.asinh,
    Math.asinh(1e300) === Infinity
  );
  // Chrome < 54 atanh incorrectly returns 0 for large numbers
  defineProperty(Math, "atanh", MathShims.atanh, Math.atanh(1e-300) === 0);
  // Chrome 40 has an imprecise Math.tanh with very small numbers
  defineProperty(Math, "tanh", MathShims.tanh, Math.tanh(-2e-17) !== -2e-17);
  // Chrome 40 loses Math.acosh precision with high numbers
  defineProperty(
    Math,
    "acosh",
    MathShims.acosh,
    Math.acosh(Number.MAX_VALUE) === Infinity
  );
  // Chrome < 54 has an inaccurate acosh for EPSILON deltas
  defineProperty(
    Math,
    "acosh",
    MathShims.acosh,
    !withinULPDistance(
      Math.acosh(1 + Number.EPSILON),
      Math.sqrt(2 * Number.EPSILON)
    )
  );
  // Firefox 38 on Windows
  defineProperty(
    Math,
    "cbrt",
    MathShims.cbrt,
    !withinULPDistance(Math.cbrt(1e-300), 1e-100)
  );
  // node 0.11 has an imprecise Math.sinh with very small numbers
  defineProperty(Math, "sinh", MathShims.sinh, Math.sinh(-2e-17) !== -2e-17);
  // FF 35 on Linux reports 22025.465794806725 for Math.expm1(10)
  var expm1OfTen = Math.expm1(10);
  defineProperty(
    Math,
    "expm1",
    MathShims.expm1,
    expm1OfTen > 22025.465794806719 || expm1OfTen < 22025.4657948067165168
  );
  // node v12.11 - v12.15 report NaN
  defineProperty(
    Math,
    "hypot",
    MathShims.hypot,
    Math.hypot(Infinity, NaN) !== Infinity
  );

  var origMathRound = Math.round;
  // breaks in e.g. Safari 8, Internet Explorer 11, Opera 12
  var roundHandlesBoundaryConditions =
    Math.round(0.5 - Number.EPSILON / 4) === 0 &&
    Math.round(-0.5 + Number.EPSILON / 3.99) === 1;

  // When engines use Math.floor(x + 0.5) internally, Math.round can be buggy for large integers.
  // This behavior should be governed by "round to nearest, ties to even mode"
  // see http://www.ecma-international.org/ecma-262/6.0/#sec-terms-and-definitions-number-type
  // These are the boundary cases where it breaks.
  var smallestPositiveNumberWhereRoundBreaks = inverseEpsilon + 1;
  var largestPositiveNumberWhereRoundBreaks = 2 * inverseEpsilon - 1;
  var roundDoesNotIncreaseIntegers = [
    smallestPositiveNumberWhereRoundBreaks,
    largestPositiveNumberWhereRoundBreaks,
  ].every(function (num) {
    return Math.round(num) === num;
  });
  defineProperty(
    Math,
    "round",
    function round(x) {
      var floor = _floor(x);
      var ceil = floor === -1 ? -0 : floor + 1;
      return x - floor < 0.5 ? floor : ceil;
    },
    !roundHandlesBoundaryConditions || !roundDoesNotIncreaseIntegers
  );
  Value.preserveToString(Math.round, origMathRound);

  var origImul = Math.imul;
  if (Math.imul(0xffffffff, 5) !== -5) {
    // Safari 6.1, at least, reports "0" for this value
    Math.imul = MathShims.imul;
    Value.preserveToString(Math.imul, origImul);
  }
  if (Math.imul.length !== 2) {
    // Safari 8.0.4 has a length of 1
    // fixed in https://bugs.webkit.org/show_bug.cgi?id=143658
    overrideNative(Math, "imul", function imul(x, y) {
      return ES.Call(origImul, Math, arguments);
    });
  }

  var throwUnlessTargetIsObject = function throwUnlessTargetIsObject(target) {
    if (!ES.TypeIsObject(target)) {
      throw new TypeError("target must be an object");
    }
  };

  // Some Reflect methods are basically the same as
  // those on the Object global, except that a TypeError is thrown if
  // target isn't an object. As well as returning a boolean indicating
  // the success of the operation.
  var ReflectShims = {
    // Apply method in a functional form.
    apply: function apply() {
      return ES.Call(ES.Call, null, arguments);
    },

    // New operator in a functional form.
    construct: function construct(constructor, args) {
      if (!ES.IsConstructor(constructor)) {
        throw new TypeError("First argument must be a constructor.");
      }
      var newTarget = arguments.length > 2 ? arguments[2] : constructor;
      if (!ES.IsConstructor(newTarget)) {
        throw new TypeError("new.target must be a constructor.");
      }
      return ES.Construct(constructor, args, newTarget, "internal");
    },

    // When deleting a non-existent or configurable property,
    // true is returned.
    // When attempting to delete a non-configurable property,
    // it will return false.
    deleteProperty: function deleteProperty(target, key) {
      throwUnlessTargetIsObject(target);
      if (supportsDescriptors) {
        var desc = Object.getOwnPropertyDescriptor(target, key);

        if (desc && !desc.configurable) {
          return false;
        }
      }

      // Will return true.
      return delete target[key];
    },

    has: function has(target, key) {
      throwUnlessTargetIsObject(target);
      return key in target;
    },
  };

  if (Object.getOwnPropertyNames) {
    Object.assign(ReflectShims, {
      // Basically the result of calling the internal [[OwnPropertyKeys]].
      // Concatenating propertyNames and propertySymbols should do the trick.
      // This should continue to work together with a Symbol shim
      // which overrides Object.getOwnPropertyNames and implements
      // Object.getOwnPropertySymbols.
      ownKeys: function ownKeys(target) {
        throwUnlessTargetIsObject(target);
        var keys = Object.getOwnPropertyNames(target);

        if (ES.IsCallable(Object.getOwnPropertySymbols)) {
          _pushApply(keys, Object.getOwnPropertySymbols(target));
        }

        return keys;
      },
    });
  }

  var callAndCatchException = function ConvertExceptionToBoolean(func) {
    return !throwsError(func);
  };

  if (Object.preventExtensions) {
    Object.assign(ReflectShims, {
      isExtensible: function isExtensible(target) {
        throwUnlessTargetIsObject(target);
        return Object.isExtensible(target);
      },
      preventExtensions: function preventExtensions(target) {
        throwUnlessTargetIsObject(target);
        return callAndCatchException(function () {
          return Object.preventExtensions(target);
        });
      },
    });
  }

  if (supportsDescriptors) {
    var internalGet = function get(target, key, receiver) {
      var desc = Object.getOwnPropertyDescriptor(target, key);

      if (!desc) {
        var parent = Object.getPrototypeOf(target);

        if (parent === null) {
          return void 0;
        }

        return internalGet(parent, key, receiver);
      }

      if ("value" in desc) {
        return desc.value;
      }

      if (desc.get) {
        return ES.Call(desc.get, receiver);
      }

      return void 0;
    };

    var internalSet = function set(target, key, value, receiver) {
      var desc = Object.getOwnPropertyDescriptor(target, key);

      if (!desc) {
        var parent = Object.getPrototypeOf(target);

        if (parent !== null) {
          return internalSet(parent, key, value, receiver);
        }

        desc = {
          value: void 0,
          writable: true,
          enumerable: true,
          configurable: true,
        };
      }

      if ("value" in desc) {
        if (!desc.writable) {
          return false;
        }

        if (!ES.TypeIsObject(receiver)) {
          return false;
        }

        var existingDesc = Object.getOwnPropertyDescriptor(receiver, key);

        if (existingDesc) {
          return Reflect.defineProperty(receiver, key, {
            value: value,
          });
        }
        return Reflect.defineProperty(receiver, key, {
          value: value,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }

      if (desc.set) {
        _call(desc.set, receiver, value);
        return true;
      }

      return false;
    };

    Object.assign(ReflectShims, {
      defineProperty: function defineProperty(target, propertyKey, attributes) {
        throwUnlessTargetIsObject(target);
        return callAndCatchException(function () {
          return Object.defineProperty(target, propertyKey, attributes);
        });
      },

      getOwnPropertyDescriptor: function getOwnPropertyDescriptor(
        target,
        propertyKey
      ) {
        throwUnlessTargetIsObject(target);
        return Object.getOwnPropertyDescriptor(target, propertyKey);
      },

      // Syntax in a functional form.
      get: function get(target, key) {
        throwUnlessTargetIsObject(target);
        var receiver = arguments.length > 2 ? arguments[2] : target;

        return internalGet(target, key, receiver);
      },

      set: function set(target, key, value) {
        throwUnlessTargetIsObject(target);
        var receiver = arguments.length > 3 ? arguments[3] : target;

        return internalSet(target, key, value, receiver);
      },
    });
  }

  if (Object.getPrototypeOf) {
    var objectDotGetPrototypeOf = Object.getPrototypeOf;
    ReflectShims.getPrototypeOf = function getPrototypeOf(target) {
      throwUnlessTargetIsObject(target);
      return objectDotGetPrototypeOf(target);
    };
  }

  if (Object.setPrototypeOf && ReflectShims.getPrototypeOf) {
    var willCreateCircularPrototype = function (object, lastProto) {
      var proto = lastProto;
      while (proto) {
        if (object === proto) {
          return true;
        }
        proto = ReflectShims.getPrototypeOf(proto);
      }
      return false;
    };

    Object.assign(ReflectShims, {
      // Sets the prototype of the given object.
      // Returns true on success, otherwise false.
      setPrototypeOf: function setPrototypeOf(object, proto) {
        throwUnlessTargetIsObject(object);
        if (proto !== null && !ES.TypeIsObject(proto)) {
          throw new TypeError("proto must be an object or null");
        }

        // If they already are the same, we're done.
        if (proto === Reflect.getPrototypeOf(object)) {
          return true;
        }

        // Cannot alter prototype if object not extensible.
        if (Reflect.isExtensible && !Reflect.isExtensible(object)) {
          return false;
        }

        // Ensure that we do not create a circular prototype chain.
        if (willCreateCircularPrototype(object, proto)) {
          return false;
        }

        Object.setPrototypeOf(object, proto);

        return true;
      },
    });
  }
  var defineOrOverrideReflectProperty = function (key, shim) {
    if (!ES.IsCallable(globals.Reflect[key])) {
      defineProperty(globals.Reflect, key, shim);
    } else {
      var acceptsPrimitives = valueOrFalseIfThrows(function () {
        globals.Reflect[key](1);
        globals.Reflect[key](NaN);
        globals.Reflect[key](true);
        return true;
      });
      if (acceptsPrimitives) {
        overrideNative(globals.Reflect, key, shim);
      }
    }
  };
  Object.keys(ReflectShims).forEach(function (key) {
    defineOrOverrideReflectProperty(key, ReflectShims[key]);
  });
  var originalReflectGetProto = globals.Reflect.getPrototypeOf;
  if (
    functionsHaveNames &&
    originalReflectGetProto &&
    originalReflectGetProto.name !== "getPrototypeOf"
  ) {
    overrideNative(
      globals.Reflect,
      "getPrototypeOf",
      function getPrototypeOf(target) {
        return _call(originalReflectGetProto, globals.Reflect, target);
      }
    );
  }
  if (globals.Reflect.setPrototypeOf) {
    if (
      valueOrFalseIfThrows(function () {
        globals.Reflect.setPrototypeOf(1, {});
        return true;
      })
    ) {
      overrideNative(
        globals.Reflect,
        "setPrototypeOf",
        ReflectShims.setPrototypeOf
      );
    }
  }
  if (globals.Reflect.defineProperty) {
    if (
      !valueOrFalseIfThrows(function () {
        var basic = !globals.Reflect.defineProperty(1, "test", { value: 1 });
        // "extensible" fails on Edge 0.12
        var extensible =
          typeof Object.preventExtensions !== "function" ||
          !globals.Reflect.defineProperty(
            Object.preventExtensions({}),
            "test",
            {}
          );
        return basic && extensible;
      })
    ) {
      overrideNative(
        globals.Reflect,
        "defineProperty",
        ReflectShims.defineProperty
      );
    }
  }
  if (globals.Reflect.construct) {
    if (
      !valueOrFalseIfThrows(function () {
        var F = function F() {};
        return globals.Reflect.construct(function () {}, [], F) instanceof F;
      })
    ) {
      overrideNative(globals.Reflect, "construct", ReflectShims.construct);
    }
  }

  if (String(new Date(NaN)) !== "Invalid Date") {
    var dateToString = Date.prototype.toString;
    var shimmedDateToString = function toString() {
      var valueOf = +this;
      if (valueOf !== valueOf) {
        return "Invalid Date";
      }
      return ES.Call(dateToString, this);
    };
    overrideNative(Date.prototype, "toString", shimmedDateToString);
  }

  // Annex B HTML methods
  // http://www.ecma-international.org/ecma-262/6.0/#sec-additional-properties-of-the-string.prototype-object
  var stringHTMLshims = {
    anchor: function anchor(name) {
      return ES.CreateHTML(this, "a", "name", name);
    },
    big: function big() {
      return ES.CreateHTML(this, "big", "", "");
    },
    blink: function blink() {
      return ES.CreateHTML(this, "blink", "", "");
    },
    bold: function bold() {
      return ES.CreateHTML(this, "b", "", "");
    },
    fixed: function fixed() {
      return ES.CreateHTML(this, "tt", "", "");
    },
    fontcolor: function fontcolor(color) {
      return ES.CreateHTML(this, "font", "color", color);
    },
    fontsize: function fontsize(size) {
      return ES.CreateHTML(this, "font", "size", size);
    },
    italics: function italics() {
      return ES.CreateHTML(this, "i", "", "");
    },
    link: function link(url) {
      return ES.CreateHTML(this, "a", "href", url);
    },
    small: function small() {
      return ES.CreateHTML(this, "small", "", "");
    },
    strike: function strike() {
      return ES.CreateHTML(this, "strike", "", "");
    },
    sub: function sub() {
      return ES.CreateHTML(this, "sub", "", "");
    },
    sup: function sub() {
      return ES.CreateHTML(this, "sup", "", "");
    },
  };
  _forEach(Object.keys(stringHTMLshims), function (key) {
    var method = String.prototype[key];
    var shouldOverwrite = false;
    if (ES.IsCallable(method)) {
      var output = _call(method, "", ' " ');
      var quotesCount = _concat([], output.match(/"/g)).length;
      shouldOverwrite = output !== output.toLowerCase() || quotesCount > 2;
    } else {
      shouldOverwrite = true;
    }
    if (shouldOverwrite) {
      overrideNative(String.prototype, key, stringHTMLshims[key]);
    }
  });

  var JSONstringifiesSymbols = (function () {
    // Microsoft Edge v0.12 stringifies Symbols incorrectly
    if (!hasSymbols) {
      return false;
    } // Symbols are not supported
    var stringify =
      typeof JSON === "object" && typeof JSON.stringify === "function"
        ? JSON.stringify
        : null;
    if (!stringify) {
      return false;
    } // JSON.stringify is not supported
    if (typeof stringify(Symbol()) !== "undefined") {
      return true;
    } // Symbols should become `undefined`
    if (stringify([Symbol()]) !== "[null]") {
      return true;
    } // Symbols in arrays should become `null`
    var obj = { a: Symbol() };
    obj[Symbol()] = true;
    if (stringify(obj) !== "{}") {
      return true;
    } // Symbol-valued keys *and* Symbol-valued properties should be omitted
    return false;
  })();
  var JSONstringifyAcceptsObjectSymbol = valueOrFalseIfThrows(function () {
    // Chrome 45 throws on stringifying object symbols
    if (!hasSymbols) {
      return true;
    } // Symbols are not supported
    return (
      JSON.stringify(Object(Symbol())) === "{}" &&
      JSON.stringify([Object(Symbol())]) === "[{}]"
    );
  });
  if (JSONstringifiesSymbols || !JSONstringifyAcceptsObjectSymbol) {
    var origStringify = JSON.stringify;
    overrideNative(JSON, "stringify", function stringify(value) {
      if (typeof value === "symbol") {
        return;
      }
      var replacer;
      if (arguments.length > 1) {
        replacer = arguments[1];
      }
      var args = [value];
      if (!isArray(replacer)) {
        var replaceFn = ES.IsCallable(replacer) ? replacer : null;
        var wrappedReplacer = function (key, val) {
          var parsedValue = replaceFn ? _call(replaceFn, this, key, val) : val;
          if (typeof parsedValue !== "symbol") {
            if (Type.symbol(parsedValue)) {
              return assignTo({})(parsedValue);
            }
            return parsedValue;
          }
        };
        args.push(wrappedReplacer);
      } else {
        // create wrapped replacer that handles an array replacer?
        args.push(replacer);
      }
      if (arguments.length > 2) {
        args.push(arguments[2]);
      }
      return origStringify.apply(this, args);
    });
  }

  return globals;
});
