(() => {
  function RequireObjectCoercible(value) {
    if (value == null) {
      throw new TypeError(
        (arguments.length > 0 && arguments[1]) ||
          "Cannot call method on " + value
      );
    }
    return value;
  }
  function ToObject(value) {
    RequireObjectCoercible(value);
    return Object(value);
  }

  function ToIntegerOrInfinity(value) {
    var number = Number(value);
    if (isNaN(number) || number === 0) {
      return 0;
    }
    if (!isFinite(number)) {
      return number;
    }
    return Math.trunc(number);
  }

  function ToLength(argument) {
    var len = ToIntegerOrInfinity(argument);
    if (len <= 0) {
      return 0;
    }
    if (len > Number.MAX_SAFE_INTEGER) {
      return Number.MAX_SAFE_INTEGER;
    }
    return len;
  }

  function SameValueZero(x, y) {
    return x === y || (isNaN(x) && isNaN(y));
  }
  function isString(value) {
    if (typeof value === "string") {
      return true;
    }
    return false;
  }

  function Get(O, P) {
    if (typeof O !== "object")
      throw new TypeError("Assertion failed: Type(O) is not Object");
    if (typeof P !== "string")
      throw new TypeError(
        "Assertion failed: P is not a Property Key, got " + inspect(P)
      );

    return O[P];
  }

  function HasProperty(O, P) {
    if (typeof O !== "object" || O === null) {
      throw new TypeError("Assertion failed: `O` must be an Object");
    }
    if (typeof P !== "string") {
      throw new TypeError("Assertion failed: `P` must be a Property Key");
    }
    return P in O;
  }

  function LengthOfArrayLike(obj) {
    if (typeof obj !== "object" || obj === null) {
      throw new TypeError("Assertion failed: `obj` must be an Object");
    }
    return ToLength(Get(obj, "length"));
  }

  function Call(F, V) {
    var argumentsList = arguments.length > 2 ? arguments[2] : [];
    if (!Array.isArray(argumentsList)) {
      throw new TypeError(
        "Assertion failed: optional `argumentsList`, if provided, must be a List"
      );
    }
    return Function.apply(F, V, argumentsList);
  }

  function FlattenIntoArray(target, source, sourceLen, start, depth) {
    var mapperFunction;
    if (arguments.length > 5) {
      mapperFunction = arguments[5];
    }

    var targetIndex = start;
    var sourceIndex = 0;
    while (sourceIndex < sourceLen) {
      var P = sourceIndex.toString();
      var exists = HasProperty(source, P);
      if (exists === true) {
        var element = Get(source, P);
        if (typeof mapperFunction !== "undefined") {
          if (arguments.length <= 6) {
            throw new TypeError(
              "Assertion failed: thisArg is required when mapperFunction is provided"
            );
          }
          element = Call(mapperFunction, arguments[6], [
            element,
            sourceIndex,
            source,
          ]);
        }
        var shouldFlatten = false;
        if (depth > 0) {
          shouldFlatten = Array.isArray(element);
        }
        if (shouldFlatten) {
          var elementLen = LengthOfArrayLike(element);
          targetIndex = FlattenIntoArray(
            target,
            element,
            elementLen,
            targetIndex,
            depth - 1
          );
        } else {
          if (targetIndex >= Number.MAX_SAFE_INTEGER) {
            throw new TypeError("index too large");
          }
          // CreateDataPropertyOrThrow(target, targetIndex.toString(), element);
          targetIndex += 1;
        }
      }
      sourceIndex += 1;
    }

    return targetIndex;
  }

  if (!Array.prototype.includes) {
    Array.prototype.includes = function (searchElement) {
      var fromIndex =
        arguments.length > 1 ? ToIntegerOrInfinity(arguments[1]) : 0;
      if (
        !isNaN(searchElement) &&
        isFinite(fromIndex) &&
        typeof searchElement !== "undefined"
      ) {
        return this.indexOf(arguments) > -1;
      }

      var O = ToObject(this);
      var length = ToLength(O.length);
      if (length === 0) {
        return false;
      }
      var k = fromIndex >= 0 ? fromIndex : Math.max(0, length + fromIndex);
      while (k < length) {
        if (SameValueZero(searchElement, isString(O) ? O.charAt(k) : O[k])) {
          return true;
        }
        k += 1;
      }
      return false;
    };
  }
  if (!Array.prototype.flat) {
    Array.prototype.flat = function () {
      var O = ToObject(this);
      var sourceLen = ToLength(Get(O, "length"));

      var depthNum = 1;
      if (arguments.length > 0 && typeof arguments[0] !== "undefined") {
        depthNum = ToIntegerOrInfinity(arguments[0]);
      }

      // var A = ArraySpeciesCreate(O, 0);
      var A = new Array(0);
      FlattenIntoArray(A, O, sourceLen, 0, depthNum);
      return A;
    };
  }
  if (!Array.prototype.flatMap) {
    Array.prototype.flatMap = function (mapperFunction) {
      var O = ToObject(this);
      var sourceLen = ToLength(Get(O, "length"));

      if (typeof mapperFunction !== "function") {
        throw new TypeError("mapperFunction must be a function");
      }

      var T;
      if (arguments.length > 1) {
        T = arguments[1];
      }

      // var A = ArraySpeciesCreate(O, 0);
      var A = new Array(0);
      FlattenIntoArray(A, O, sourceLen, 0, 1, mapperFunction, T);
      return A;
    };
  }

  if (!Object.entries) {
    Object.entries = function (O) {
      var obj = RequireObjectCoercible(O);
      var entries = [];
      for (var key in obj) {
        if (obj.propertyIsEnumerable(key)) {
          entries.push([key, obj[key]]);
        }
      }
      return entries;
    };
  }

  if (!Object.values) {
    Object.values = function (O) {
      var obj = RequireObjectCoercible(O);
      var vals = [];
      for (var key in obj) {
        if (obj.propertyIsEnumerable(key)) {
          vals.push(obj[key]);
        }
      }
      return vals;
    };
  }

  if (!String.prototype.at) {
    String.prototype.at = function (index) {
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }
      var O = this;
      var S = O.toString();
      var len = S.length;
      var relativeIndex = ToIntegerOrInfinity(index);
      var k = relativeIndex >= 0 ? relativeIndex : len + relativeIndex;

      if (k < 0 || k >= len) {
        return void undefined;
      }

      return S.charAt(k);
    };
  }

  var startWhitespace = /^\s$/.test("\u180E")
    ? /^[\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF]+/
    : /^[\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF]+/;
  var endWhitespace = /^\s$/.test("\u180E")
    ? /[\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF]+$/
    : /[\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF]+$/;

  if (!String.prototype.trimLeft) {
    String.prototype.trimLeft = function () {
      return this.replace(startWhitespace, "");
    };
  }
  if (!String.prototype.trimStart) {
    String.prototype.trimStart = function () {
      return this.replace(startWhitespace, "");
    };
  }

  if (!String.prototype.trimRight) {
    String.prototype.trimRight = function () {
      return this.replace(endWhitespace, "");
    };
  }
  if (!String.prototype.trimEnd) {
    String.prototype.trimEnd = function () {
      return this.replace(endWhitespace, "");
    };
  }

  if (!String.prototype.padStart) {
    String.prototype.padStart = function (maxLength) {
      var O = RequireObjectCoercible(this);
      var S = String(O);
      var stringLength = ToLength(S.length);
      var fillString;
      if (arguments.length > 1) {
        fillString = arguments[1];
      }
      var filler = typeof fillString === "undefined" ? "" : String(fillString);
      if (filler === "") {
        filler = " ";
      }
      var intMaxLength = ToLength(maxLength);
      if (intMaxLength <= stringLength) {
        return S;
      }
      var fillLen = intMaxLength - stringLength;
      while (filler.length < fillLen) {
        var fLen = filler.length;
        var remainingCodeUnits = fillLen - fLen;
        filler +=
          fLen > remainingCodeUnits
            ? filler.slice(0, remainingCodeUnits)
            : filler;
      }

      var truncatedStringFiller =
        filler.length > fillLen ? filler.slice(0, fillLen) : filler;
      return truncatedStringFiller + S;
    };
  }

  if (!String.prototype.padEnd) {
    String.prototype.padEnd = function (maxLength) {
      var O = RequireObjectCoercible(this);
      var S = String(O);
      var stringLength = ToLength(S.length);
      var fillString;
      if (arguments.length > 1) {
        fillString = arguments[1];
      }
      var filler = typeof fillString === "undefined" ? "" : String(fillString);
      if (filler === "") {
        filler = " ";
      }
      var intMaxLength = ToLength(maxLength);
      if (intMaxLength <= stringLength) {
        return S;
      }
      var fillLen = intMaxLength - stringLength;
      while (filler.length < fillLen) {
        var fLen = filler.length;
        var remainingCodeUnits = fillLen - fLen;
        filler +=
          fLen > remainingCodeUnits
            ? filler.slice(0, remainingCodeUnits)
            : filler;
      }

      var truncatedStringFiller =
        filler.length > fillLen ? filler.slice(0, fillLen) : filler;
      return S + truncatedStringFiller;
    };
  }
})();
