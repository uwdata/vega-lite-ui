;(function() {
/*!
 * JSON3 with compact stringify -- Modified by Kanit Wongsuphasawat.   https://github.com/kanitw/json3
 *
 * Forked from JSON v3.3.2 | https://bestiejs.github.io/json3 | Copyright 2012-2014, Kit Cambridge | http://kit.mit-license.org
 */
;(function () {
  // Detect the `define` function exposed by asynchronous module loaders. The
  // strict `define` check is necessary for compatibility with `r.js`.
  var isLoader = typeof define === "function" && define.amd;

  // A set of types used to distinguish objects from primitives.
  var objectTypes = {
    "function": true,
    "object": true
  };

  // Detect the `exports` object exposed by CommonJS implementations.
  var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;

  // Use the `global` object exposed by Node (including Browserify via
  // `insert-module-globals`), Narwhal, and Ringo as the default context,
  // and the `window` object in browsers. Rhino exports a `global` function
  // instead.
  var root = objectTypes[typeof window] && window || this,
      freeGlobal = freeExports && objectTypes[typeof module] && module && !module.nodeType && typeof global == "object" && global;

  if (freeGlobal && (freeGlobal["global"] === freeGlobal || freeGlobal["window"] === freeGlobal || freeGlobal["self"] === freeGlobal)) {
    root = freeGlobal;
  }

  // Public: Initializes JSON 3 using the given `context` object, attaching the
  // `stringify` and `parse` functions to the specified `exports` object.
  function runInContext(context, exports) {
    context || (context = root["Object"]());
    exports || (exports = root["Object"]());

    // Native constructor aliases.
    var Number = context["Number"] || root["Number"],
        String = context["String"] || root["String"],
        Object = context["Object"] || root["Object"],
        Date = context["Date"] || root["Date"],
        SyntaxError = context["SyntaxError"] || root["SyntaxError"],
        TypeError = context["TypeError"] || root["TypeError"],
        Math = context["Math"] || root["Math"],
        nativeJSON = context["JSON"] || root["JSON"];

    // Delegate to the native `stringify` and `parse` implementations.
    if (typeof nativeJSON == "object" && nativeJSON) {
      exports.stringify = nativeJSON.stringify;
      exports.parse = nativeJSON.parse;
    }

    // Convenience aliases.
    var objectProto = Object.prototype,
        getClass = objectProto.toString,
        isProperty, forEach, undef;

    // Test the `Date#getUTC*` methods. Based on work by @Yaffle.
    var isExtended = new Date(-3509827334573292);
    try {
      // The `getUTCFullYear`, `Month`, and `Date` methods return nonsensical
      // results for certain dates in Opera >= 10.53.
      isExtended = isExtended.getUTCFullYear() == -109252 && isExtended.getUTCMonth() === 0 && isExtended.getUTCDate() === 1 &&
        // Safari < 2.0.2 stores the internal millisecond time value correctly,
        // but clips the values returned by the date methods to the range of
        // signed 32-bit integers ([-2 ** 31, 2 ** 31 - 1]).
        isExtended.getUTCHours() == 10 && isExtended.getUTCMinutes() == 37 && isExtended.getUTCSeconds() == 6 && isExtended.getUTCMilliseconds() == 708;
    } catch (exception) {}

    // Internal: Determines whether the native `JSON.stringify` and `parse`
    // implementations are spec-compliant. Based on work by Ken Snyder.
    function has(name) {
      if (has[name] !== undef) {
        // Return cached feature test result.
        return has[name];
      }
      var isSupported;
      if (name == "bug-string-char-index") {
        // IE <= 7 doesn't support accessing string characters using square
        // bracket notation. IE 8 only supports this for primitives.
        isSupported = "a"[0] != "a";
      } else if (name == "json") {
        // Indicates whether both `JSON.stringify` and `JSON.parse` are
        // supported.
        isSupported = has("json-stringify") && has("json-parse");
      } else {
        var value, serialized = '{"a":[1,true,false,null,"\\u0000\\b\\n\\f\\r\\t"]}';
        // Test `JSON.stringify`.
        if (name == "json-stringify") {
          var stringify = exports.stringify, stringifySupported = typeof stringify == "function" && isExtended;
          if (stringifySupported) {
            // A test function object with a custom `toJSON` method.
            (value = function () {
              return 1;
            }).toJSON = value;
            try {
              stringifySupported =
                // Firefox 3.1b1 and b2 serialize string, number, and boolean
                // primitives as object literals.
                stringify(0) === "0" &&
                // FF 3.1b1, b2, and JSON 2 serialize wrapped primitives as object
                // literals.
                stringify(new Number()) === "0" &&
                stringify(new String()) == '""' &&
                // FF 3.1b1, 2 throw an error if the value is `null`, `undefined`, or
                // does not define a canonical JSON representation (this applies to
                // objects with `toJSON` properties as well, *unless* they are nested
                // within an object or array).
                stringify(getClass) === undef &&
                // IE 8 serializes `undefined` as `"undefined"`. Safari <= 5.1.7 and
                // FF 3.1b3 pass this test.
                stringify(undef) === undef &&
                // Safari <= 5.1.7 and FF 3.1b3 throw `Error`s and `TypeError`s,
                // respectively, if the value is omitted entirely.
                stringify() === undef &&
                // FF 3.1b1, 2 throw an error if the given value is not a number,
                // string, array, object, Boolean, or `null` literal. This applies to
                // objects with custom `toJSON` methods as well, unless they are nested
                // inside object or array literals. YUI 3.0.0b1 ignores custom `toJSON`
                // methods entirely.
                stringify(value) === "1" &&
                stringify([value]) == "[1]" &&
                // Prototype <= 1.6.1 serializes `[undefined]` as `"[]"` instead of
                // `"[null]"`.
                stringify([undef]) == "[null]" &&
                // YUI 3.0.0b1 fails to serialize `null` literals.
                stringify(null) == "null" &&
                // FF 3.1b1, 2 halts serialization if an array contains a function:
                // `[1, true, getClass, 1]` serializes as "[1,true,],". FF 3.1b3
                // elides non-JSON values from objects and arrays, unless they
                // define custom `toJSON` methods.
                stringify([undef, getClass, null]) == "[null,null,null]" &&
                // Simple serialization test. FF 3.1b1 uses Unicode escape sequences
                // where character escape codes are expected (e.g., `\b` => `\u0008`).
                stringify({ "a": [value, true, false, null, "\x00\b\n\f\r\t"] }) == serialized &&
                // FF 3.1b1 and b2 ignore the `filter` and `width` arguments.
                stringify(null, value) === "1" &&
                stringify([1, 2], null, 1) == "[\n 1,\n 2\n]" &&
                // JSON 2, Prototype <= 1.7, and older WebKit builds incorrectly
                // serialize extended years.
                stringify(new Date(-8.64e15)) == '"-271821-04-20T00:00:00.000Z"' &&
                // The milliseconds are optional in ES 5, but required in 5.1.
                stringify(new Date(8.64e15)) == '"+275760-09-13T00:00:00.000Z"' &&
                // Firefox <= 11.0 incorrectly serializes years prior to 0 as negative
                // four-digit years instead of six-digit years. Credits: @Yaffle.
                stringify(new Date(-621987552e5)) == '"-000001-01-01T00:00:00.000Z"' &&
                // Safari <= 5.1.5 and Opera >= 10.53 incorrectly serialize millisecond
                // values less than 1000. Credits: @Yaffle.
                stringify(new Date(-1)) == '"1969-12-31T23:59:59.999Z"';
            } catch (exception) {
              stringifySupported = false;
            }
          }
          isSupported = stringifySupported;
        }
        // Test `JSON.parse`.
        if (name == "json-parse") {
          var parse = exports.parse;
          if (typeof parse == "function") {
            try {
              // FF 3.1b1, b2 will throw an exception if a bare literal is provided.
              // Conforming implementations should also coerce the initial argument to
              // a string prior to parsing.
              if (parse("0") === 0 && !parse(false)) {
                // Simple parsing test.
                value = parse(serialized);
                var parseSupported = value["a"].length == 5 && value["a"][0] === 1;
                if (parseSupported) {
                  try {
                    // Safari <= 5.1.2 and FF 3.1b1 allow unescaped tabs in strings.
                    parseSupported = !parse('"\t"');
                  } catch (exception) {}
                  if (parseSupported) {
                    try {
                      // FF 4.0 and 4.0.1 allow leading `+` signs and leading
                      // decimal points. FF 4.0, 4.0.1, and IE 9-10 also allow
                      // certain octal literals.
                      parseSupported = parse("01") !== 1;
                    } catch (exception) {}
                  }
                  if (parseSupported) {
                    try {
                      // FF 4.0, 4.0.1, and Rhino 1.7R3-R4 allow trailing decimal
                      // points. These environments, along with FF 3.1b1 and 2,
                      // also allow trailing commas in JSON objects and arrays.
                      parseSupported = parse("1.") !== 1;
                    } catch (exception) {}
                  }
                }
              }
            } catch (exception) {
              parseSupported = false;
            }
          }
          isSupported = parseSupported;
        }
      }
      return has[name] = !!isSupported;
    }

    if (true) { // used to be !has("json")
      // Common `[[Class]]` name aliases.
      var functionClass = "[object Function]",
          dateClass = "[object Date]",
          numberClass = "[object Number]",
          stringClass = "[object String]",
          arrayClass = "[object Array]",
          booleanClass = "[object Boolean]";

      // Detect incomplete support for accessing string characters by index.
      var charIndexBuggy = has("bug-string-char-index");

      // Define additional utility methods if the `Date` methods are buggy.
      if (!isExtended) {
        var floor = Math.floor;
        // A mapping between the months of the year and the number of days between
        // January 1st and the first of the respective month.
        var Months = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        // Internal: Calculates the number of days between the Unix epoch and the
        // first day of the given month.
        var getDay = function (year, month) {
          return Months[month] + 365 * (year - 1970) + floor((year - 1969 + (month = +(month > 1))) / 4) - floor((year - 1901 + month) / 100) + floor((year - 1601 + month) / 400);
        };
      }

      // Internal: Determines if a property is a direct property of the given
      // object. Delegates to the native `Object#hasOwnProperty` method.
      if (!(isProperty = objectProto.hasOwnProperty)) {
        isProperty = function (property) {
          var members = {}, constructor;
          if ((members.__proto__ = null, members.__proto__ = {
            // The *proto* property cannot be set multiple times in recent
            // versions of Firefox and SeaMonkey.
            "toString": 1
          }, members).toString != getClass) {
            // Safari <= 2.0.3 doesn't implement `Object#hasOwnProperty`, but
            // supports the mutable *proto* property.
            isProperty = function (property) {
              // Capture and break the object's prototype chain (see section 8.6.2
              // of the ES 5.1 spec). The parenthesized expression prevents an
              // unsafe transformation by the Closure Compiler.
              var original = this.__proto__, result = property in (this.__proto__ = null, this);
              // Restore the original prototype chain.
              this.__proto__ = original;
              return result;
            };
          } else {
            // Capture a reference to the top-level `Object` constructor.
            constructor = members.constructor;
            // Use the `constructor` property to simulate `Object#hasOwnProperty` in
            // other environments.
            isProperty = function (property) {
              var parent = (this.constructor || constructor).prototype;
              return property in this && !(property in parent && this[property] === parent[property]);
            };
          }
          members = null;
          return isProperty.call(this, property);
        };
      }

      // Internal: Normalizes the `for...in` iteration algorithm across
      // environments. Each enumerated key is yielded to a `callback` function.
      forEach = function (object, callback) {
        var size = 0, Properties, members, property;

        // Tests for bugs in the current environment's `for...in` algorithm. The
        // `valueOf` property inherits the non-enumerable flag from
        // `Object.prototype` in older versions of IE, Netscape, and Mozilla.
        (Properties = function () {
          this.valueOf = 0;
        }).prototype.valueOf = 0;

        // Iterate over a new instance of the `Properties` class.
        members = new Properties();
        for (property in members) {
          // Ignore all properties inherited from `Object.prototype`.
          if (isProperty.call(members, property)) {
            size++;
          }
        }
        Properties = members = null;

        // Normalize the iteration algorithm.
        if (!size) {
          // A list of non-enumerable properties inherited from `Object.prototype`.
          members = ["valueOf", "toString", "toLocaleString", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"];
          // IE <= 8, Mozilla 1.0, and Netscape 6.2 ignore shadowed non-enumerable
          // properties.
          forEach = function (object, callback) {
            var isFunction = getClass.call(object) == functionClass, property, length;
            var hasProperty = !isFunction && typeof object.constructor != "function" && objectTypes[typeof object.hasOwnProperty] && object.hasOwnProperty || isProperty;
            for (property in object) {
              // Gecko <= 1.0 enumerates the `prototype` property of functions under
              // certain conditions; IE does not.
              if (!(isFunction && property == "prototype") && hasProperty.call(object, property)) {
                callback(property);
              }
            }
            // Manually invoke the callback for each non-enumerable property.
            for (length = members.length; property = members[--length]; hasProperty.call(object, property) && callback(property));
          };
        } else if (size == 2) {
          // Safari <= 2.0.4 enumerates shadowed properties twice.
          forEach = function (object, callback) {
            // Create a set of iterated properties.
            var members = {}, isFunction = getClass.call(object) == functionClass, property;
            for (property in object) {
              // Store each property name to prevent double enumeration. The
              // `prototype` property of functions is not enumerated due to cross-
              // environment inconsistencies.
              if (!(isFunction && property == "prototype") && !isProperty.call(members, property) && (members[property] = 1) && isProperty.call(object, property)) {
                callback(property);
              }
            }
          };
        } else {
          // No bugs detected; use the standard `for...in` algorithm.
          forEach = function (object, callback) {
            var isFunction = getClass.call(object) == functionClass, property, isConstructor;
            for (property in object) {
              if (!(isFunction && property == "prototype") && isProperty.call(object, property) && !(isConstructor = property === "constructor")) {
                callback(property);
              }
            }
            // Manually invoke the callback for the `constructor` property due to
            // cross-environment inconsistencies.
            if (isConstructor || isProperty.call(object, (property = "constructor"))) {
              callback(property);
            }
          };
        }
        return forEach(object, callback);
      };

      // Public: Serializes a JavaScript `value` as a JSON string. The optional
      // `filter` argument may specify either a function that alters how object and
      // array members are serialized, or an array of strings and numbers that
      // indicates which properties should be serialized. The optional `width`
      // argument may be either a string or number that specifies the indentation
      // level of the output.
      if (true) {
        // Internal: A map of control characters and their escaped equivalents.
        var Escapes = {
          92: "\\\\",
          34: '\\"',
          8: "\\b",
          12: "\\f",
          10: "\\n",
          13: "\\r",
          9: "\\t"
        };

        // Internal: Converts `value` into a zero-padded string such that its
        // length is at least equal to `width`. The `width` must be <= 6.
        var leadingZeroes = "000000";
        var toPaddedString = function (width, value) {
          // The `|| 0` expression is necessary to work around a bug in
          // Opera <= 7.54u2 where `0 == -0`, but `String(-0) !== "0"`.
          return (leadingZeroes + (value || 0)).slice(-width);
        };

        // Internal: Double-quotes a string `value`, replacing all ASCII control
        // characters (characters with code unit values between 0 and 31) with
        // their escaped equivalents. This is an implementation of the
        // `Quote(value)` operation defined in ES 5.1 section 15.12.3.
        var unicodePrefix = "\\u00";
        var quote = function (value) {
          var result = '"', index = 0, length = value.length, useCharIndex = !charIndexBuggy || length > 10;
          var symbols = useCharIndex && (charIndexBuggy ? value.split("") : value);
          for (; index < length; index++) {
            var charCode = value.charCodeAt(index);
            // If the character is a control character, append its Unicode or
            // shorthand escape sequence; otherwise, append the character as-is.
            switch (charCode) {
              case 8: case 9: case 10: case 12: case 13: case 34: case 92:
                result += Escapes[charCode];
                break;
              default:
                if (charCode < 32) {
                  result += unicodePrefix + toPaddedString(2, charCode.toString(16));
                  break;
                }
                result += useCharIndex ? symbols[index] : value.charAt(index);
            }
          }
          return result + '"';
        };

        // Internal: Recursively serializes an object. Implements the
        // `Str(key, holder)`, `JO(value)`, and `JA(value)` operations.
        var serialize = function (property, object, callback, properties, whitespace, indentation, stack, maxLineLength) {
          var value, className, year, month, date, time, hours, minutes, seconds, milliseconds, results, element, index, length, prefix, result;

          maxLineLength = maxLineLength || 0;

          try {
            // Necessary for host object support.
            value = object[property];
          } catch (exception) {}
          if (typeof value == "object" && value) {
            className = getClass.call(value);
            if (className == dateClass && !isProperty.call(value, "toJSON")) {
              if (value > -1 / 0 && value < 1 / 0) {
                // Dates are serialized according to the `Date#toJSON` method
                // specified in ES 5.1 section 15.9.5.44. See section 15.9.1.15
                // for the ISO 8601 date time string format.
                if (getDay) {
                  // Manually compute the year, month, date, hours, minutes,
                  // seconds, and milliseconds if the `getUTC*` methods are
                  // buggy. Adapted from @Yaffle's `date-shim` project.
                  date = floor(value / 864e5);
                  for (year = floor(date / 365.2425) + 1970 - 1; getDay(year + 1, 0) <= date; year++);
                  for (month = floor((date - getDay(year, 0)) / 30.42); getDay(year, month + 1) <= date; month++);
                  date = 1 + date - getDay(year, month);
                  // The `time` value specifies the time within the day (see ES
                  // 5.1 section 15.9.1.2). The formula `(A % B + B) % B` is used
                  // to compute `A modulo B`, as the `%` operator does not
                  // correspond to the `modulo` operation for negative numbers.
                  time = (value % 864e5 + 864e5) % 864e5;
                  // The hours, minutes, seconds, and milliseconds are obtained by
                  // decomposing the time within the day. See section 15.9.1.10.
                  hours = floor(time / 36e5) % 24;
                  minutes = floor(time / 6e4) % 60;
                  seconds = floor(time / 1e3) % 60;
                  milliseconds = time % 1e3;
                } else {
                  year = value.getUTCFullYear();
                  month = value.getUTCMonth();
                  date = value.getUTCDate();
                  hours = value.getUTCHours();
                  minutes = value.getUTCMinutes();
                  seconds = value.getUTCSeconds();
                  milliseconds = value.getUTCMilliseconds();
                }
                // Serialize extended years correctly.
                value = (year <= 0 || year >= 1e4 ? (year < 0 ? "-" : "+") + toPaddedString(6, year < 0 ? -year : year) : toPaddedString(4, year)) +
                  "-" + toPaddedString(2, month + 1) + "-" + toPaddedString(2, date) +
                  // Months, dates, hours, minutes, and seconds should have two
                  // digits; milliseconds should have three.
                  "T" + toPaddedString(2, hours) + ":" + toPaddedString(2, minutes) + ":" + toPaddedString(2, seconds) +
                  // Milliseconds are optional in ES 5.0, but required in 5.1.
                  "." + toPaddedString(3, milliseconds) + "Z";
              } else {
                value = null;
              }
            } else if (typeof value.toJSON == "function" && ((className != numberClass && className != stringClass && className != arrayClass) || isProperty.call(value, "toJSON"))) {
              // Prototype <= 1.6.1 adds non-standard `toJSON` methods to the
              // `Number`, `String`, `Date`, and `Array` prototypes. JSON 3
              // ignores all `toJSON` methods on these objects unless they are
              // defined directly on an instance.
              value = value.toJSON(property);
            }
          }
          if (callback) {
            // If a replacement function was provided, call it to obtain the value
            // for serialization.
            value = callback.call(object, property, value);
          }
          if (value === null) {
            return "null";
          }
          className = getClass.call(value);
          if (className == booleanClass) {
            // Booleans are represented literally.
            return "" + value;
          } else if (className == numberClass) {
            // JSON numbers must be finite. `Infinity` and `NaN` are serialized as
            // `"null"`.
            return value > -1 / 0 && value < 1 / 0 ? "" + value : "null";
          } else if (className == stringClass) {
            // Strings are double-quoted and escaped.
            return quote("" + value);
          }
          // Recursively serialize objects and arrays.
          if (typeof value == "object") {
            // Check for cyclic structures. This is a linear search; performance
            // is inversely proportional to the number of unique nested objects.
            for (length = stack.length; length--;) {
              if (stack[length] === value) {
                // Cyclic structures cannot be serialized by `JSON.stringify`.
                throw TypeError();
              }
            }
            // Add the object to the stack of traversed objects.
            stack.push(value);
            results = [];
            // Save the current indentation level and indent one additional level.
            prefix = indentation;
            indentation += whitespace;
            if (className == arrayClass) {
              var totalLength = indentation.length, result;
              // Recursively serialize array elements.
              for (index = 0, length = value.length; index < length; index++) {
                element = serialize(index, value, callback, properties, whitespace, indentation,
                  stack, maxLineLength);
                result = element === undef ? "null" : element;
                totalLength += result.length + (index > 0 ? 1 : 0);
                results.push(result);
              }
              result = results.length ?
                (
                  whitespace && (totalLength > maxLineLength) ?
                  "[\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "]" :
                  "[" + results.join(",") + "]"
                )
                : "[]";
            } else {
              var totalLength = indentation.length, index=0;
              // Recursively serialize object members. Members are selected from
              // either a user-specified list of property names, or the object
              // itself.
              forEach(properties || value, function (property) {
                var result, element = serialize(property, value, callback, properties, whitespace, indentation,
                                        stack, maxLineLength);

                if (element !== undef) {
                  // According to ES 5.1 section 15.12.3: "If `gap` {whitespace}
                  // is not the empty string, let `member` {quote(property) + ":"}
                  // be the concatenation of `member` and the `space` character."
                  // The "`space` character" refers to the literal space
                  // character, not the `space` {width} argument provided to
                  // `JSON.stringify`.
                  result = quote(property) + ":" + (whitespace ? " " : "") + element;
                  totalLength += result.length + (index++ > 0 ? 1 : 0);
                  results.push(result);
                }
              });
              result = results.length ?
                (
                  whitespace && (totalLength > maxLineLength) ?
                  "{\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "}" :
                  "{" + results.join(",") + "}"
                )
                : "{}";
            }
            // Remove the object from the traversed object stack.
            stack.pop();
            return result;
          }
        };

        // Public: `JSON.stringify`. See ES 5.1 section 15.12.3.

        exports.stringify = function (source, filter, width, maxLineLength) {
          var whitespace, callback, properties, className;
          if (objectTypes[typeof filter] && filter) {
            if ((className = getClass.call(filter)) == functionClass) {
              callback = filter;
            } else if (className == arrayClass) {
              // Convert the property names array into a makeshift set.
              properties = {};
              for (var index = 0, length = filter.length, value; index < length; value = filter[index++], ((className = getClass.call(value)), className == stringClass || className == numberClass) && (properties[value] = 1));
            }
          }
          if (width) {
            if ((className = getClass.call(width)) == numberClass) {
              // Convert the `width` to an integer and create a string containing
              // `width` number of space characters.
              if ((width -= width % 1) > 0) {
                for (whitespace = "", width > 10 && (width = 10); whitespace.length < width; whitespace += " ");
              }
            } else if (className == stringClass) {
              whitespace = width.length <= 10 ? width : width.slice(0, 10);
            }
          }
          // Opera <= 7.54u2 discards the values associated with empty string keys
          // (`""`) only if they are used directly within an object member list
          // (e.g., `!("" in { "": 1})`).
          return serialize("", (value = {}, value[""] = source, value), callback, properties, whitespace, "", [], maxLineLength);
        };

        exports.compactStringify = function (source, filter, width){
          return exports.stringify(source, filter, width, 60);
        }
      }

      // Public: Parses a JSON source string.
      if (!has("json-parse")) {
        var fromCharCode = String.fromCharCode;

        // Internal: A map of escaped control characters and their unescaped
        // equivalents.
        var Unescapes = {
          92: "\\",
          34: '"',
          47: "/",
          98: "\b",
          116: "\t",
          110: "\n",
          102: "\f",
          114: "\r"
        };

        // Internal: Stores the parser state.
        var Index, Source;

        // Internal: Resets the parser state and throws a `SyntaxError`.
        var abort = function () {
          Index = Source = null;
          throw SyntaxError();
        };

        // Internal: Returns the next token, or `"$"` if the parser has reached
        // the end of the source string. A token may be a string, number, `null`
        // literal, or Boolean literal.
        var lex = function () {
          var source = Source, length = source.length, value, begin, position, isSigned, charCode;
          while (Index < length) {
            charCode = source.charCodeAt(Index);
            switch (charCode) {
              case 9: case 10: case 13: case 32:
                // Skip whitespace tokens, including tabs, carriage returns, line
                // feeds, and space characters.
                Index++;
                break;
              case 123: case 125: case 91: case 93: case 58: case 44:
                // Parse a punctuator token (`{`, `}`, `[`, `]`, `:`, or `,`) at
                // the current position.
                value = charIndexBuggy ? source.charAt(Index) : source[Index];
                Index++;
                return value;
              case 34:
                // `"` delimits a JSON string; advance to the next character and
                // begin parsing the string. String tokens are prefixed with the
                // sentinel `@` character to distinguish them from punctuators and
                // end-of-string tokens.
                for (value = "@", Index++; Index < length;) {
                  charCode = source.charCodeAt(Index);
                  if (charCode < 32) {
                    // Unescaped ASCII control characters (those with a code unit
                    // less than the space character) are not permitted.
                    abort();
                  } else if (charCode == 92) {
                    // A reverse solidus (`\`) marks the beginning of an escaped
                    // control character (including `"`, `\`, and `/`) or Unicode
                    // escape sequence.
                    charCode = source.charCodeAt(++Index);
                    switch (charCode) {
                      case 92: case 34: case 47: case 98: case 116: case 110: case 102: case 114:
                        // Revive escaped control characters.
                        value += Unescapes[charCode];
                        Index++;
                        break;
                      case 117:
                        // `\u` marks the beginning of a Unicode escape sequence.
                        // Advance to the first character and validate the
                        // four-digit code point.
                        begin = ++Index;
                        for (position = Index + 4; Index < position; Index++) {
                          charCode = source.charCodeAt(Index);
                          // A valid sequence comprises four hexdigits (case-
                          // insensitive) that form a single hexadecimal value.
                          if (!(charCode >= 48 && charCode <= 57 || charCode >= 97 && charCode <= 102 || charCode >= 65 && charCode <= 70)) {
                            // Invalid Unicode escape sequence.
                            abort();
                          }
                        }
                        // Revive the escaped character.
                        value += fromCharCode("0x" + source.slice(begin, Index));
                        break;
                      default:
                        // Invalid escape sequence.
                        abort();
                    }
                  } else {
                    if (charCode == 34) {
                      // An unescaped double-quote character marks the end of the
                      // string.
                      break;
                    }
                    charCode = source.charCodeAt(Index);
                    begin = Index;
                    // Optimize for the common case where a string is valid.
                    while (charCode >= 32 && charCode != 92 && charCode != 34) {
                      charCode = source.charCodeAt(++Index);
                    }
                    // Append the string as-is.
                    value += source.slice(begin, Index);
                  }
                }
                if (source.charCodeAt(Index) == 34) {
                  // Advance to the next character and return the revived string.
                  Index++;
                  return value;
                }
                // Unterminated string.
                abort();
              default:
                // Parse numbers and literals.
                begin = Index;
                // Advance past the negative sign, if one is specified.
                if (charCode == 45) {
                  isSigned = true;
                  charCode = source.charCodeAt(++Index);
                }
                // Parse an integer or floating-point value.
                if (charCode >= 48 && charCode <= 57) {
                  // Leading zeroes are interpreted as octal literals.
                  if (charCode == 48 && ((charCode = source.charCodeAt(Index + 1)), charCode >= 48 && charCode <= 57)) {
                    // Illegal octal literal.
                    abort();
                  }
                  isSigned = false;
                  // Parse the integer component.
                  for (; Index < length && ((charCode = source.charCodeAt(Index)), charCode >= 48 && charCode <= 57); Index++);
                  // Floats cannot contain a leading decimal point; however, this
                  // case is already accounted for by the parser.
                  if (source.charCodeAt(Index) == 46) {
                    position = ++Index;
                    // Parse the decimal component.
                    for (; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                    if (position == Index) {
                      // Illegal trailing decimal.
                      abort();
                    }
                    Index = position;
                  }
                  // Parse exponents. The `e` denoting the exponent is
                  // case-insensitive.
                  charCode = source.charCodeAt(Index);
                  if (charCode == 101 || charCode == 69) {
                    charCode = source.charCodeAt(++Index);
                    // Skip past the sign following the exponent, if one is
                    // specified.
                    if (charCode == 43 || charCode == 45) {
                      Index++;
                    }
                    // Parse the exponential component.
                    for (position = Index; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                    if (position == Index) {
                      // Illegal empty exponent.
                      abort();
                    }
                    Index = position;
                  }
                  // Coerce the parsed value to a JavaScript number.
                  return +source.slice(begin, Index);
                }
                // A negative sign may only precede numbers.
                if (isSigned) {
                  abort();
                }
                // `true`, `false`, and `null` literals.
                if (source.slice(Index, Index + 4) == "true") {
                  Index += 4;
                  return true;
                } else if (source.slice(Index, Index + 5) == "false") {
                  Index += 5;
                  return false;
                } else if (source.slice(Index, Index + 4) == "null") {
                  Index += 4;
                  return null;
                }
                // Unrecognized token.
                abort();
            }
          }
          // Return the sentinel `$` character if the parser has reached the end
          // of the source string.
          return "$";
        };

        // Internal: Parses a JSON `value` token.
        var get = function (value) {
          var results, hasMembers;
          if (value == "$") {
            // Unexpected end of input.
            abort();
          }
          if (typeof value == "string") {
            if ((charIndexBuggy ? value.charAt(0) : value[0]) == "@") {
              // Remove the sentinel `@` character.
              return value.slice(1);
            }
            // Parse object and array literals.
            if (value == "[") {
              // Parses a JSON array, returning a new JavaScript array.
              results = [];
              for (;; hasMembers || (hasMembers = true)) {
                value = lex();
                // A closing square bracket marks the end of the array literal.
                if (value == "]") {
                  break;
                }
                // If the array literal contains elements, the current token
                // should be a comma separating the previous element from the
                // next.
                if (hasMembers) {
                  if (value == ",") {
                    value = lex();
                    if (value == "]") {
                      // Unexpected trailing `,` in array literal.
                      abort();
                    }
                  } else {
                    // A `,` must separate each array element.
                    abort();
                  }
                }
                // Elisions and leading commas are not permitted.
                if (value == ",") {
                  abort();
                }
                results.push(get(value));
              }
              return results;
            } else if (value == "{") {
              // Parses a JSON object, returning a new JavaScript object.
              results = {};
              for (;; hasMembers || (hasMembers = true)) {
                value = lex();
                // A closing curly brace marks the end of the object literal.
                if (value == "}") {
                  break;
                }
                // If the object literal contains members, the current token
                // should be a comma separator.
                if (hasMembers) {
                  if (value == ",") {
                    value = lex();
                    if (value == "}") {
                      // Unexpected trailing `,` in object literal.
                      abort();
                    }
                  } else {
                    // A `,` must separate each object member.
                    abort();
                  }
                }
                // Leading commas are not permitted, object property names must be
                // double-quoted strings, and a `:` must separate each property
                // name and value.
                if (value == "," || typeof value != "string" || (charIndexBuggy ? value.charAt(0) : value[0]) != "@" || lex() != ":") {
                  abort();
                }
                results[value.slice(1)] = get(lex());
              }
              return results;
            }
            // Unexpected token encountered.
            abort();
          }
          return value;
        };

        // Internal: Updates a traversed object member.
        var update = function (source, property, callback) {
          var element = walk(source, property, callback);
          if (element === undef) {
            delete source[property];
          } else {
            source[property] = element;
          }
        };

        // Internal: Recursively traverses a parsed JSON object, invoking the
        // `callback` function for each value. This is an implementation of the
        // `Walk(holder, name)` operation defined in ES 5.1 section 15.12.2.
        var walk = function (source, property, callback) {
          var value = source[property], length;
          if (typeof value == "object" && value) {
            // `forEach` can't be used to traverse an array in Opera <= 8.54
            // because its `Object#hasOwnProperty` implementation returns `false`
            // for array indices (e.g., `![1, 2, 3].hasOwnProperty("0")`).
            if (getClass.call(value) == arrayClass) {
              for (length = value.length; length--;) {
                update(value, length, callback);
              }
            } else {
              forEach(value, function (property) {
                update(value, property, callback);
              });
            }
          }
          return callback.call(source, property, value);
        };

        // Public: `JSON.parse`. See ES 5.1 section 15.12.2.
        exports.parse = function (source, callback) {
          var result, value;
          Index = 0;
          Source = "" + source;
          result = get(lex());
          // If a JSON string contains multiple tokens, it is invalid.
          if (lex() != "$") {
            abort();
          }
          // Reset the parser state.
          Index = Source = null;
          return callback && getClass.call(callback) == functionClass ? walk((value = {}, value[""] = result, value), "", callback) : result;
        };
      }
    }

    exports["runInContext"] = runInContext;
    return exports;
  }

  if (freeExports && !isLoader) {
    // Export for CommonJS environments.
    runInContext(root, freeExports);
  } else {
    // Export for web browsers and JavaScript engines.
    var nativeJSON = root.JSON,
        previousJSON = root["JSON3"],
        isRestored = false;

    var JSON3 = runInContext(root, (root["JSON3"] = {
      // Public: Restores the original value of the global `JSON` object and
      // returns a reference to the `JSON3` object.
      "noConflict": function () {
        if (!isRestored) {
          isRestored = true;
          root.JSON = nativeJSON;
          root["JSON3"] = previousJSON;
          nativeJSON = previousJSON = null;
        }
        return JSON3;
      }
    }));

    root.JSON = {
      "parse": JSON3.parse,
      "stringify": JSON3.stringify
    };
  }

  // Export for asynchronous module loaders.
  if (isLoader) {
    define(function () {
      return JSON3;
    });
  }
}).call(this);
}());

;(function() {
window.     vlSchema = {
  "oneOf": [
    {
      "$ref": "#/definitions/ExtendedUnitSpec",
      "description": "Schema for a unit Vega-Lite specification, with the syntactic sugar extensions:\n\n- `row` and `column` are included in the encoding.\n\n- (Future) label, box plot\n\n\n\nNote: the spec could contain facet."
    },
    {
      "$ref": "#/definitions/FacetSpec"
    },
    {
      "$ref": "#/definitions/LayerSpec"
    }
  ],
  "definitions": {
    "ExtendedUnitSpec": {
      "type": "object",
      "properties": {
        "mark": {
          "$ref": "#/definitions/Mark",
          "description": "The mark type.\n\nOne of `\"bar\"`, `\"circle\"`, `\"square\"`, `\"tick\"`, `\"line\"`,\n\n`\"area\"`, `\"point\"`, `\"rule\"`, and `\"text\"`."
        },
        "encoding": {
          "$ref": "#/definitions/Encoding",
          "description": "A key-value mapping between encoding channels and definition of fields."
        },
        "name": {
          "description": "Name of the visualization for later reference.",
          "type": "string"
        },
        "description": {
          "description": "An optional description of this mark for commenting purpose.\n\nThis property has no effect on the output visualization.",
          "type": "string"
        },
        "data": {
          "$ref": "#/definitions/Data",
          "description": "An object describing the data source"
        },
        "transform": {
          "$ref": "#/definitions/Transform",
          "description": "An object describing filter and new field calculation."
        },
        "config": {
          "$ref": "#/definitions/Config",
          "description": "Configuration object"
        }
      },
      "required": [
        "mark"
      ]
    },
    "Mark": {
      "type": "string",
      "enum": [
        "area",
        "bar",
        "line",
        "point",
        "text",
        "tick",
        "rule",
        "circle",
        "square",
        "errorBar"
      ]
    },
    "Encoding": {
      "type": "object",
      "properties": {
        "row": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Vertical facets for trellis plots."
        },
        "column": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Horizontal facets for trellis plots."
        },
        "x": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "X coordinates for `point`, `circle`, `square`,\n\n`line`, `rule`, `text`, and `tick`\n\n(or to width and height for `bar` and `area` marks)."
        },
        "y": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Y coordinates for `point`, `circle`, `square`,\n\n`line`, `rule`, `text`, and `tick`\n\n(or to width and height for `bar` and `area` marks)."
        },
        "x2": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "X2 coordinates for ranged `bar`, `rule`, `area`"
        },
        "y2": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Y2 coordinates for ranged `bar`, `rule`, `area`"
        },
        "color": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Color of the marks – either fill or stroke color based on mark type.\n\n(By default, fill color for `area`, `bar`, `tick`, `text`, `circle`, and `square` /\n\nstroke color for `line` and `point`.)"
        },
        "opacity": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Opacity of the marks – either can be a value or in a range."
        },
        "size": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Size of the mark.\n\n- For `point`, `square` and `circle`\n\n– the symbol size, or pixel area of the mark.\n\n- For `bar` and `tick` – the bar and tick's size.\n\n- For `text` – the text's font size.\n\n- Size is currently unsupported for `line` and `area`."
        },
        "shape": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "The symbol's shape (only for `point` marks). The supported values are\n\n`\"circle\"` (default), `\"square\"`, `\"cross\"`, `\"diamond\"`, `\"triangle-up\"`,\n\nor `\"triangle-down\"`, or else a custom SVG path string."
        },
        "detail": {
          "description": "Additional levels of detail for grouping data in aggregate views and\n\nin line and area marks without mapping data to a specific visual channel.",
          "oneOf": [
            {
              "$ref": "#/definitions/FieldDef",
              "description": "Interface for any kind of FieldDef;\n\nFor simplicity, we do not declare multiple interfaces of FieldDef like\n\nwe do for JSON schema."
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/FieldDef",
                "description": "Interface for any kind of FieldDef;\n\nFor simplicity, we do not declare multiple interfaces of FieldDef like\n\nwe do for JSON schema."
              }
            }
          ]
        },
        "text": {
          "$ref": "#/definitions/FieldDef",
          "description": "Text of the `text` mark."
        },
        "label": {
          "$ref": "#/definitions/FieldDef"
        },
        "path": {
          "description": "Order of data points in line marks.",
          "oneOf": [
            {
              "$ref": "#/definitions/OrderChannelDef"
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OrderChannelDef"
              }
            }
          ]
        },
        "order": {
          "description": "Layer order for non-stacked marks, or stack order for stacked marks.",
          "oneOf": [
            {
              "$ref": "#/definitions/OrderChannelDef"
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OrderChannelDef"
              }
            }
          ]
        }
      }
    },
    "PositionChannelDef": {
      "type": "object",
      "properties": {
        "axis": {
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/Axis"
            }
          ]
        },
        "scale": {
          "$ref": "#/definitions/Scale"
        },
        "sort": {
          "oneOf": [
            {
              "$ref": "#/definitions/SortField"
            },
            {
              "$ref": "#/definitions/SortOrder"
            }
          ]
        },
        "field": {
          "description": "Name of the field from which to pull a data value.",
          "type": "string"
        },
        "type": {
          "$ref": "#/definitions/Type",
          "description": "The encoded field's type of measurement. This can be either a full type\n\nname (`\"quantitative\"`, `\"temporal\"`, `\"ordinal\"`,  and `\"nominal\"`)\n\nor an initial character of the type name (`\"Q\"`, `\"T\"`, `\"O\"`, `\"N\"`).\n\nThis property is case insensitive."
        },
        "value": {
          "description": "A constant value in visual domain.",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            },
            {
              "type": "boolean"
            }
          ]
        },
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "Time unit for a `temporal` field  (e.g., `year`, `yearmonth`, `month`, `hour`)."
        },
        "bin": {
          "description": "Flag for binning a `quantitative` field, or a bin property object\n\nfor binning parameters.",
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/Bin",
              "description": "Binning properties or boolean flag for determining whether to bin data or not."
            }
          ]
        },
        "aggregate": {
          "$ref": "#/definitions/AggregateOp",
          "description": "Aggregation function for the field\n\n(e.g., `mean`, `sum`, `median`, `min`, `max`, `count`)."
        },
        "title": {
          "description": "Title for axis or legend.",
          "type": "string"
        }
      }
    },
    "Axis": {
      "type": "object",
      "properties": {
        "labelAngle": {
          "description": "The rotation angle of the axis labels.",
          "type": "number"
        },
        "format": {
          "description": "The formatting pattern for axis labels.",
          "type": "string"
        },
        "orient": {
          "$ref": "#/definitions/AxisOrient",
          "description": "The orientation of the axis. One of top, bottom, left or right. The orientation can be used to further specialize the axis type (e.g., a y axis oriented for the right edge of the chart)."
        },
        "title": {
          "description": "A title for the axis. Shows field name and its function by default.",
          "type": "string"
        },
        "values": {
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "axisWidth": {
          "description": "Width of the axis line",
          "type": "number"
        },
        "layer": {
          "description": "A string indicating if the axis (and any gridlines) should be placed above or below the data marks.",
          "type": "string"
        },
        "offset": {
          "description": "The offset, in pixels, by which to displace the axis from the edge of the enclosing group or data rectangle.",
          "type": "number"
        },
        "axisColor": {
          "description": "Color of axis line.",
          "type": "string"
        },
        "grid": {
          "description": "A flag indicate if gridlines should be created in addition to ticks. If `grid` is unspecified, the default value is `true` for ROW and COL. For X and Y, the default value is `true` for quantitative and time fields and `false` otherwise.",
          "type": "boolean"
        },
        "gridColor": {
          "description": "Color of gridlines.",
          "type": "string"
        },
        "gridDash": {
          "description": "The offset (in pixels) into which to begin drawing with the grid dash array.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "gridOpacity": {
          "description": "The stroke opacity of grid (value between [0,1])",
          "type": "number"
        },
        "gridWidth": {
          "description": "The grid width, in pixels.",
          "type": "number"
        },
        "labels": {
          "description": "Enable or disable labels.",
          "type": "boolean"
        },
        "labelAlign": {
          "description": "Text alignment for the Label.",
          "type": "string"
        },
        "labelBaseline": {
          "description": "Text baseline for the label.",
          "type": "string"
        },
        "labelMaxLength": {
          "description": "Truncate labels that are too long.",
          "minimum": 1,
          "type": "number"
        },
        "shortTimeLabels": {
          "description": "Whether month and day names should be abbreviated.",
          "type": "boolean"
        },
        "subdivide": {
          "description": "If provided, sets the number of minor ticks between major ticks (the value 9 results in decimal subdivision). Only applicable for axes visualizing quantitative scales.",
          "type": "number"
        },
        "ticks": {
          "description": "A desired number of ticks, for axes visualizing quantitative scales. The resulting number may be different so that values are \"nice\" (multiples of 2, 5, 10) and lie within the underlying scale's range.",
          "minimum": 0,
          "type": "number"
        },
        "tickColor": {
          "description": "The color of the axis's tick.",
          "type": "string"
        },
        "tickLabelColor": {
          "description": "The color of the tick label, can be in hex color code or regular color name.",
          "type": "string"
        },
        "tickLabelFont": {
          "description": "The font of the tick label.",
          "type": "string"
        },
        "tickLabelFontSize": {
          "description": "The font size of label, in pixels.",
          "type": "number"
        },
        "tickPadding": {
          "description": "The padding, in pixels, between ticks and text labels.",
          "type": "number"
        },
        "tickSize": {
          "description": "The size, in pixels, of major, minor and end ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeMajor": {
          "description": "The size, in pixels, of major ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeMinor": {
          "description": "The size, in pixels, of minor ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeEnd": {
          "description": "The size, in pixels, of end ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickWidth": {
          "description": "The width, in pixels, of ticks.",
          "type": "number"
        },
        "titleColor": {
          "description": "Color of the title, can be in hex color code or regular color name.",
          "type": "string"
        },
        "titleFont": {
          "description": "Font of the title.",
          "type": "string"
        },
        "titleFontSize": {
          "description": "Size of the title.",
          "type": "number"
        },
        "titleFontWeight": {
          "description": "Weight of the title.",
          "type": "string"
        },
        "titleOffset": {
          "description": "A title offset value for the axis.",
          "type": "number"
        },
        "titleMaxLength": {
          "description": "Max length for axis title if the title is automatically generated from the field's description. By default, this is automatically based on cell size and characterWidth property.",
          "minimum": 0,
          "type": "number"
        },
        "characterWidth": {
          "description": "Character width for automatically determining title max length.",
          "type": "number"
        },
        "properties": {
          "description": "Optional mark property definitions for custom axis styling."
        }
      }
    },
    "AxisOrient": {
      "type": "string",
      "enum": [
        "top",
        "right",
        "left",
        "bottom"
      ]
    },
    "Scale": {
      "type": "object",
      "properties": {
        "type": {
          "$ref": "#/definitions/ScaleType"
        },
        "domain": {
          "description": "The domain of the scale, representing the set of data values. For quantitative data, this can take the form of a two-element array with minimum and maximum values. For ordinal/categorical data, this may be an array of valid input values.",
          "oneOf": [
            {
              "type": "array",
              "items": {
                "type": "number"
              }
            },
            {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          ]
        },
        "range": {
          "description": "The range of the scale, representing the set of visual values. For numeric values, the range can take the form of a two-element array with minimum and maximum values. For ordinal or quantized data, the range may by an array of desired output values, which are mapped to elements in the specified domain. For ordinal scales only, the range can be defined using a DataRef: the range values are then drawn dynamically from a backing data set.",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "array",
              "items": {
                "type": "number"
              }
            },
            {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          ]
        },
        "round": {
          "description": "If true, rounds numeric output values to integers. This can be helpful for snapping to the pixel grid.",
          "type": "boolean"
        },
        "bandSize": {
          "minimum": 0,
          "type": "number"
        },
        "padding": {
          "description": "Applies spacing among ordinal elements in the scale range. The actual effect depends on how the scale is configured. If the __points__ parameter is `true`, the padding value is interpreted as a multiple of the spacing between points. A reasonable value is 1.0, such that the first and last point will be offset from the minimum and maximum value by half the distance between points. Otherwise, padding is typically in the range [0, 1] and corresponds to the fraction of space in the range interval to allocate to padding. A value of 0.5 means that the range band width will be equal to the padding width. For more, see the [D3 ordinal scale documentation](https://github.com/mbostock/d3/wiki/Ordinal-Scales).",
          "type": "number"
        },
        "clamp": {
          "description": "If true, values that exceed the data domain are clamped to either the minimum or maximum range value",
          "type": "boolean"
        },
        "nice": {
          "description": "If specified, modifies the scale domain to use a more human-friendly value range. If specified as a true boolean, modifies the scale domain to use a more human-friendly number range (e.g., 7 instead of 6.96). If specified as a string, modifies the scale domain to use a more human-friendly value range. For time and utc scale types only, the nice value should be a string indicating the desired time interval.",
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/NiceTime"
            }
          ]
        },
        "exponent": {
          "description": "Sets the exponent of the scale transformation. For pow scale types only, otherwise ignored.",
          "type": "number"
        },
        "zero": {
          "description": "If `true`, ensures that a zero baseline value is included in the scale domain.\n\nDefault value: `true` for `x` and `y` channel if the quantitative field is not binned\n\nand no custom `domain` is provided; `false` otherwise.",
          "type": "boolean"
        },
        "useRawDomain": {
          "description": "Uses the source data range as scale domain instead of aggregated data for aggregate axis.\n\nThis property only works with aggregate functions that produce values within the raw data domain (`\"mean\"`, `\"average\"`, `\"stdev\"`, `\"stdevp\"`, `\"median\"`, `\"q1\"`, `\"q3\"`, `\"min\"`, `\"max\"`). For other aggregations that produce values outside of the raw data domain (e.g. `\"count\"`, `\"sum\"`), this property is ignored.",
          "type": "boolean"
        }
      }
    },
    "ScaleType": {
      "type": "string",
      "enum": [
        "linear",
        "log",
        "pow",
        "sqrt",
        "quantile",
        "quantize",
        "ordinal",
        "time",
        "utc"
      ]
    },
    "NiceTime": {
      "type": "string",
      "enum": [
        "second",
        "minute",
        "hour",
        "day",
        "week",
        "month",
        "year"
      ]
    },
    "SortField": {
      "type": "object",
      "properties": {
        "field": {
          "description": "The field name to aggregate over.",
          "type": "string"
        },
        "op": {
          "$ref": "#/definitions/AggregateOp",
          "description": "The sort aggregation operator"
        },
        "order": {
          "$ref": "#/definitions/SortOrder"
        }
      },
      "required": [
        "field",
        "op"
      ]
    },
    "AggregateOp": {
      "type": "string",
      "enum": [
        "values",
        "count",
        "valid",
        "missing",
        "distinct",
        "sum",
        "mean",
        "average",
        "variance",
        "variancep",
        "stdev",
        "stdevp",
        "median",
        "q1",
        "q3",
        "modeskew",
        "min",
        "max",
        "argmin",
        "argmax"
      ]
    },
    "SortOrder": {
      "type": "string",
      "enum": [
        "ascending",
        "descending",
        "none"
      ]
    },
    "Type": {
      "type": "string",
      "enum": [
        "quantitative",
        "ordinal",
        "temporal",
        "nominal"
      ]
    },
    "TimeUnit": {
      "type": "string",
      "enum": [
        "year",
        "month",
        "day",
        "date",
        "hours",
        "minutes",
        "seconds",
        "milliseconds",
        "yearmonth",
        "yearmonthdate",
        "yearmonthdatehours",
        "yearmonthdatehoursminutes",
        "yearmonthdatehoursminutesseconds",
        "hoursminutes",
        "hoursminutesseconds",
        "minutesseconds",
        "secondsmilliseconds",
        "quarter",
        "yearquarter",
        "quartermonth",
        "yearquartermonth"
      ]
    },
    "Bin": {
      "type": "object",
      "properties": {
        "min": {
          "description": "The minimum bin value to consider. If unspecified, the minimum value of the specified field is used.",
          "type": "number"
        },
        "max": {
          "description": "The maximum bin value to consider. If unspecified, the maximum value of the specified field is used.",
          "type": "number"
        },
        "base": {
          "description": "The number base to use for automatic bin determination (default is base 10).",
          "type": "number"
        },
        "step": {
          "description": "An exact step size to use between bins. If provided, options such as maxbins will be ignored.",
          "type": "number"
        },
        "steps": {
          "description": "An array of allowable step sizes to choose from.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "minstep": {
          "description": "A minimum allowable step size (particularly useful for integer values).",
          "type": "number"
        },
        "div": {
          "description": "Scale factors indicating allowable subdivisions. The default value is [5, 2], which indicates that for base 10 numbers (the default base), the method may consider dividing bin sizes by 5 and/or 2. For example, for an initial step size of 10, the method can check if bin sizes of 2 (= 10/5), 5 (= 10/2), or 1 (= 10/(5*2)) might also satisfy the given constraints.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "maxbins": {
          "description": "Maximum number of bins.",
          "minimum": 2,
          "type": "number"
        }
      }
    },
    "ChannelDefWithLegend": {
      "type": "object",
      "properties": {
        "legend": {
          "$ref": "#/definitions/Legend"
        },
        "scale": {
          "$ref": "#/definitions/Scale"
        },
        "sort": {
          "oneOf": [
            {
              "$ref": "#/definitions/SortField"
            },
            {
              "$ref": "#/definitions/SortOrder"
            }
          ]
        },
        "field": {
          "description": "Name of the field from which to pull a data value.",
          "type": "string"
        },
        "type": {
          "$ref": "#/definitions/Type",
          "description": "The encoded field's type of measurement. This can be either a full type\n\nname (`\"quantitative\"`, `\"temporal\"`, `\"ordinal\"`,  and `\"nominal\"`)\n\nor an initial character of the type name (`\"Q\"`, `\"T\"`, `\"O\"`, `\"N\"`).\n\nThis property is case insensitive."
        },
        "value": {
          "description": "A constant value in visual domain.",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            },
            {
              "type": "boolean"
            }
          ]
        },
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "Time unit for a `temporal` field  (e.g., `year`, `yearmonth`, `month`, `hour`)."
        },
        "bin": {
          "description": "Flag for binning a `quantitative` field, or a bin property object\n\nfor binning parameters.",
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/Bin",
              "description": "Binning properties or boolean flag for determining whether to bin data or not."
            }
          ]
        },
        "aggregate": {
          "$ref": "#/definitions/AggregateOp",
          "description": "Aggregation function for the field\n\n(e.g., `mean`, `sum`, `median`, `min`, `max`, `count`)."
        },
        "title": {
          "description": "Title for axis or legend.",
          "type": "string"
        }
      }
    },
    "Legend": {
      "type": "object",
      "properties": {
        "format": {
          "description": "An optional formatting pattern for legend labels. Vega uses D3\\'s format pattern.",
          "type": "string"
        },
        "title": {
          "description": "A title for the legend. (Shows field name and its function by default.)",
          "type": "string"
        },
        "values": {
          "description": "Explicitly set the visible legend values.",
          "type": "array",
          "items": {}
        },
        "orient": {
          "description": "The orientation of the legend. One of \"left\" or \"right\". This determines how the legend is positioned within the scene. The default is \"right\".",
          "type": "string"
        },
        "offset": {
          "description": "The offset, in pixels, by which to displace the legend from the edge of the enclosing group or data rectangle.",
          "type": "number"
        },
        "padding": {
          "description": "The padding, in pixels, between the lengend and axis.",
          "type": "number"
        },
        "margin": {
          "description": "The margin around the legend, in pixels",
          "type": "number"
        },
        "gradientStrokeColor": {
          "description": "The color of the gradient stroke, can be in hex color code or regular color name.",
          "type": "string"
        },
        "gradientStrokeWidth": {
          "description": "The width of the gradient stroke, in pixels.",
          "type": "number"
        },
        "gradientHeight": {
          "description": "The height of the gradient, in pixels.",
          "type": "number"
        },
        "gradientWidth": {
          "description": "The width of the gradient, in pixels.",
          "type": "number"
        },
        "labelAlign": {
          "description": "The alignment of the legend label, can be left, middle or right.",
          "type": "string"
        },
        "labelBaseline": {
          "description": "The position of the baseline of legend label, can be top, middle or bottom.",
          "type": "string"
        },
        "labelColor": {
          "description": "The color of the legend label, can be in hex color code or regular color name.",
          "type": "string"
        },
        "labelFont": {
          "description": "The font of the lengend label.",
          "type": "string"
        },
        "labelFontSize": {
          "description": "The font size of lengend lable.",
          "type": "number"
        },
        "labelOffset": {
          "description": "The offset of the legend label.",
          "type": "number"
        },
        "shortTimeLabels": {
          "description": "Whether month names and weekday names should be abbreviated.",
          "type": "boolean"
        },
        "symbolColor": {
          "description": "The color of the legend symbol,",
          "type": "string"
        },
        "symbolShape": {
          "description": "The shape of the legend symbol, can be the 'circle', 'square', 'cross', 'diamond',\n\n'triangle-up', 'triangle-down', or else a custom SVG path string.",
          "type": "string"
        },
        "symbolSize": {
          "description": "The size of the lengend symbol, in pixels.",
          "type": "number"
        },
        "symbolStrokeWidth": {
          "description": "The width of the symbol's stroke.",
          "type": "number"
        },
        "titleColor": {
          "description": "Optional mark property definitions for custom legend styling.\n\nThe color of the legend title, can be in hex color code or regular color name.",
          "type": "string"
        },
        "titleFont": {
          "description": "The font of the legend title.",
          "type": "string"
        },
        "titleFontSize": {
          "description": "The font size of the legend title.",
          "type": "number"
        },
        "titleFontWeight": {
          "description": "The font weight of the legend title.",
          "type": "string"
        },
        "properties": {
          "description": "Optional mark property definitions for custom legend styling."
        }
      }
    },
    "FieldDef": {
      "type": "object",
      "properties": {
        "field": {
          "description": "Name of the field from which to pull a data value.",
          "type": "string"
        },
        "type": {
          "$ref": "#/definitions/Type",
          "description": "The encoded field's type of measurement. This can be either a full type\n\nname (`\"quantitative\"`, `\"temporal\"`, `\"ordinal\"`,  and `\"nominal\"`)\n\nor an initial character of the type name (`\"Q\"`, `\"T\"`, `\"O\"`, `\"N\"`).\n\nThis property is case insensitive."
        },
        "value": {
          "description": "A constant value in visual domain.",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            },
            {
              "type": "boolean"
            }
          ]
        },
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "Time unit for a `temporal` field  (e.g., `year`, `yearmonth`, `month`, `hour`)."
        },
        "bin": {
          "description": "Flag for binning a `quantitative` field, or a bin property object\n\nfor binning parameters.",
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/Bin",
              "description": "Binning properties or boolean flag for determining whether to bin data or not."
            }
          ]
        },
        "aggregate": {
          "$ref": "#/definitions/AggregateOp",
          "description": "Aggregation function for the field\n\n(e.g., `mean`, `sum`, `median`, `min`, `max`, `count`)."
        },
        "title": {
          "description": "Title for axis or legend.",
          "type": "string"
        }
      }
    },
    "OrderChannelDef": {
      "type": "object",
      "properties": {
        "sort": {
          "$ref": "#/definitions/SortOrder"
        },
        "field": {
          "description": "Name of the field from which to pull a data value.",
          "type": "string"
        },
        "type": {
          "$ref": "#/definitions/Type",
          "description": "The encoded field's type of measurement. This can be either a full type\n\nname (`\"quantitative\"`, `\"temporal\"`, `\"ordinal\"`,  and `\"nominal\"`)\n\nor an initial character of the type name (`\"Q\"`, `\"T\"`, `\"O\"`, `\"N\"`).\n\nThis property is case insensitive."
        },
        "value": {
          "description": "A constant value in visual domain.",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            },
            {
              "type": "boolean"
            }
          ]
        },
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "Time unit for a `temporal` field  (e.g., `year`, `yearmonth`, `month`, `hour`)."
        },
        "bin": {
          "description": "Flag for binning a `quantitative` field, or a bin property object\n\nfor binning parameters.",
          "oneOf": [
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/Bin",
              "description": "Binning properties or boolean flag for determining whether to bin data or not."
            }
          ]
        },
        "aggregate": {
          "$ref": "#/definitions/AggregateOp",
          "description": "Aggregation function for the field\n\n(e.g., `mean`, `sum`, `median`, `min`, `max`, `count`)."
        },
        "title": {
          "description": "Title for axis or legend.",
          "type": "string"
        }
      }
    },
    "Data": {
      "type": "object",
      "properties": {
        "format": {
          "$ref": "#/definitions/DataFormat",
          "description": "An object that specifies the format for the data file or values."
        },
        "url": {
          "description": "A URL from which to load the data set. Use the format.type property\n\nto ensure the loaded data is correctly parsed.",
          "type": "string"
        },
        "values": {
          "description": "Pass array of objects instead of a url to a file.",
          "type": "array",
          "items": {}
        }
      }
    },
    "DataFormat": {
      "type": "object",
      "properties": {
        "type": {
          "$ref": "#/definitions/DataFormatType",
          "description": "Type of input data: `\"json\"`, `\"csv\"`, `\"tsv\"`.\n\nThe default format type is determined by the extension of the file url.\n\nIf no extension is detected, `\"json\"` will be used by default."
        },
        "property": {
          "description": "JSON only) The JSON property containing the desired data.\n\nThis parameter can be used when the loaded JSON file may have surrounding structure or meta-data.\n\nFor example `\"property\": \"values.features\"` is equivalent to retrieving `json.values.features`\n\nfrom the loaded JSON object.",
          "type": "string"
        },
        "feature": {
          "description": "The name of the TopoJSON object set to convert to a GeoJSON feature collection.\n\nFor example, in a map of the world, there may be an object set named `\"countries\"`.\n\nUsing the feature property, we can extract this set and generate a GeoJSON feature object for each country.",
          "type": "string"
        },
        "mesh": {
          "description": "The name of the TopoJSON object set to convert to a mesh.\n\nSimilar to the `feature` option, `mesh` extracts a named TopoJSON object set.\n\nUnlike the `feature` option, the corresponding geo data is returned as a single, unified mesh instance, not as inidividual GeoJSON features.\n\nExtracting a mesh is useful for more efficiently drawing borders or other geographic elements that you do not need to associate with specific regions such as individual countries, states or counties.",
          "type": "string"
        }
      }
    },
    "DataFormatType": {
      "type": "string",
      "enum": [
        "json",
        "csv",
        "tsv",
        "topojson"
      ]
    },
    "Transform": {
      "type": "object",
      "properties": {
        "filter": {
          "description": "A string containing the filter Vega expression. Use `datum` to refer to the current data object.",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "$ref": "#/definitions/EqualFilter"
            },
            {
              "$ref": "#/definitions/RangeFilter"
            },
            {
              "$ref": "#/definitions/InFilter"
            },
            {
              "type": "array",
              "items": {
                "oneOf": [
                  {
                    "type": "string"
                  },
                  {
                    "$ref": "#/definitions/EqualFilter"
                  },
                  {
                    "$ref": "#/definitions/RangeFilter"
                  },
                  {
                    "$ref": "#/definitions/InFilter"
                  }
                ]
              }
            }
          ]
        },
        "filterInvalid": {
          "description": "Whether to filter invalid values (`null` and `NaN`) from the data. By default (`undefined`), only quantitative and temporal fields are filtered. If set to `true`, all data items with null values are filtered. If `false`, all data items are included.",
          "type": "boolean"
        },
        "calculate": {
          "description": "Calculate new field(s) using the provided expresssion(s). Calculation are applied before filter.",
          "type": "array",
          "items": {
            "$ref": "#/definitions/Formula",
            "description": "Formula object for calculate."
          }
        }
      }
    },
    "EqualFilter": {
      "type": "object",
      "properties": {
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "Time unit for the field to be filtered."
        },
        "field": {
          "description": "Field to be filtered.",
          "type": "string"
        },
        "equal": {
          "description": "Value that the field should be equal to.",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "number"
            },
            {
              "type": "boolean"
            },
            {
              "$ref": "#/definitions/DateTime",
              "description": "Object for defining datetime in Vega-Lite Filter.\n\nIf both month and quarter are provided, month has higher precedence.\n\n`day` cannot be combined with other date.\n\nWe accept string for month and day names."
            }
          ]
        }
      },
      "required": [
        "field",
        "equal"
      ]
    },
    "DateTime": {
      "type": "object",
      "properties": {
        "year": {
          "description": "Integer value representing the year.",
          "type": "number"
        },
        "quarter": {
          "description": "Integer value representing the quarter of the year (from 1-4).",
          "type": "number"
        },
        "month": {
          "description": "One of: (1) integer value representing the month from `1`-`12`. `1` represents January;  (2) case-insensitive month name (e.g., `\"January\"`);  (3) case-insensitive, 3-character short month name (e.g., `\"Jan\"`).",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            }
          ]
        },
        "date": {
          "description": "Integer value representing the date from 1-31.",
          "type": "number"
        },
        "day": {
          "description": "Value representing the day of week.  This can be one of: (1) integer value -- `1` represents Monday; (2) case-insensitive day name (e.g., `\"Monday\"`);  (3) case-insensitive, 3-character short day name (e.g., `\"Mon\"`).   <br/> **Warning:** A DateTime definition object with `day`** should not be combined with `year`, `quarter`, `month`, or `date`.",
          "oneOf": [
            {
              "type": "number"
            },
            {
              "type": "string"
            }
          ]
        },
        "hours": {
          "description": "Integer value representing the hour of day from 0-23.",
          "type": "number"
        },
        "minutes": {
          "description": "Integer value representing minute segment of a time from 0-59.",
          "type": "number"
        },
        "seconds": {
          "description": "Integer value representing second segment of a time from 0-59.",
          "type": "number"
        },
        "milliseconds": {
          "description": "Integer value representing millisecond segment of a time.",
          "type": "number"
        }
      }
    },
    "RangeFilter": {
      "type": "object",
      "properties": {
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "time unit for the field to be filtered."
        },
        "field": {
          "description": "Field to be filtered",
          "type": "string"
        },
        "range": {
          "description": "Array of inclusive minimum and maximum values\n\nfor a field value of a data item to be included in the filtered data.",
          "maxItems": 2,
          "minItems": 2,
          "type": "array",
          "items": {
            "oneOf": [
              {
                "type": "number"
              },
              {
                "$ref": "#/definitions/DateTime",
                "description": "Object for defining datetime in Vega-Lite Filter.\n\nIf both month and quarter are provided, month has higher precedence.\n\n`day` cannot be combined with other date.\n\nWe accept string for month and day names."
              }
            ]
          }
        }
      },
      "required": [
        "field",
        "range"
      ]
    },
    "InFilter": {
      "type": "object",
      "properties": {
        "timeUnit": {
          "$ref": "#/definitions/TimeUnit",
          "description": "time unit for the field to be filtered."
        },
        "field": {
          "description": "Field to be filtered",
          "type": "string"
        },
        "in": {
          "description": "A set of values that the `field`'s value should be a member of,\n\nfor a data item included in the filtered data.",
          "type": "array",
          "items": {
            "oneOf": [
              {
                "type": "string"
              },
              {
                "type": "number"
              },
              {
                "type": "boolean"
              },
              {
                "$ref": "#/definitions/DateTime",
                "description": "Object for defining datetime in Vega-Lite Filter.\n\nIf both month and quarter are provided, month has higher precedence.\n\n`day` cannot be combined with other date.\n\nWe accept string for month and day names."
              }
            ]
          }
        }
      },
      "required": [
        "field",
        "in"
      ]
    },
    "Formula": {
      "type": "object",
      "properties": {
        "field": {
          "description": "The field in which to store the computed formula value.",
          "type": "string"
        },
        "expr": {
          "description": "A string containing an expression for the formula. Use the variable `datum` to to refer to the current data object.",
          "type": "string"
        }
      },
      "required": [
        "field",
        "expr"
      ]
    },
    "Config": {
      "type": "object",
      "properties": {
        "viewport": {
          "description": "The width and height of the on-screen viewport, in pixels. If necessary, clipping and scrolling will be applied.",
          "type": "number"
        },
        "background": {
          "description": "CSS color property to use as background of visualization. Default is `\"transparent\"`.",
          "type": "string"
        },
        "numberFormat": {
          "description": "D3 Number format for axis labels and text tables. For example \"s\" for SI units.",
          "type": "string"
        },
        "timeFormat": {
          "description": "Default datetime format for axis and legend labels. The format can be set directly on each axis and legend.",
          "type": "string"
        },
        "countTitle": {
          "description": "Default axis and legend title for count fields.",
          "type": "string"
        },
        "cell": {
          "$ref": "#/definitions/CellConfig",
          "description": "Cell Config"
        },
        "mark": {
          "$ref": "#/definitions/MarkConfig",
          "description": "Mark Config"
        },
        "overlay": {
          "$ref": "#/definitions/OverlayConfig",
          "description": "Mark Overlay Config"
        },
        "scale": {
          "$ref": "#/definitions/ScaleConfig",
          "description": "Scale Config"
        },
        "axis": {
          "$ref": "#/definitions/AxisConfig",
          "description": "Axis Config"
        },
        "legend": {
          "$ref": "#/definitions/LegendConfig",
          "description": "Legend Config"
        },
        "facet": {
          "$ref": "#/definitions/FacetConfig",
          "description": "Facet Config"
        }
      }
    },
    "CellConfig": {
      "type": "object",
      "properties": {
        "width": {
          "type": "number"
        },
        "height": {
          "type": "number"
        },
        "clip": {
          "type": "boolean"
        },
        "fill": {
          "description": "The fill color.",
          "format": "color",
          "type": "string"
        },
        "fillOpacity": {
          "description": "The fill opacity (value between [0,1]).",
          "type": "number"
        },
        "stroke": {
          "description": "The stroke color.",
          "type": "string"
        },
        "strokeOpacity": {
          "description": "The stroke opacity (value between [0,1]).",
          "type": "number"
        },
        "strokeWidth": {
          "description": "The stroke width, in pixels.",
          "type": "number"
        },
        "strokeDash": {
          "description": "An array of alternating stroke, space lengths for creating dashed or dotted lines.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "strokeDashOffset": {
          "description": "The offset (in pixels) into which to begin drawing with the stroke dash array.",
          "type": "number"
        }
      }
    },
    "MarkConfig": {
      "type": "object",
      "properties": {
        "filled": {
          "description": "Whether the shape\\'s color should be used as fill color instead of stroke color.\n\nThis is only applicable for \"bar\", \"point\", and \"area\".\n\nAll marks except \"point\" marks are filled by default.\n\nSee Mark Documentation (http://vega.github.io/vega-lite/docs/marks.html)\n\nfor usage example.",
          "type": "boolean"
        },
        "color": {
          "description": "Default color.",
          "format": "color",
          "type": "string"
        },
        "fill": {
          "description": "Default Fill Color.  This has higher precedence than config.color",
          "format": "color",
          "type": "string"
        },
        "stroke": {
          "description": "Default Stroke Color.  This has higher precedence than config.color",
          "format": "color",
          "type": "string"
        },
        "opacity": {
          "minimum": 0,
          "maximum": 1,
          "type": "number"
        },
        "fillOpacity": {
          "minimum": 0,
          "maximum": 1,
          "type": "number"
        },
        "strokeOpacity": {
          "minimum": 0,
          "maximum": 1,
          "type": "number"
        },
        "strokeWidth": {
          "minimum": 0,
          "type": "number"
        },
        "strokeDash": {
          "description": "An array of alternating stroke, space lengths for creating dashed or dotted lines.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "strokeDashOffset": {
          "description": "The offset (in pixels) into which to begin drawing with the stroke dash array.",
          "type": "number"
        },
        "stacked": {
          "$ref": "#/definitions/StackOffset"
        },
        "orient": {
          "$ref": "#/definitions/Orient",
          "description": "The orientation of a non-stacked bar, tick, area, and line charts.\n\nThe value is either horizontal (default) or vertical.\n\n- For bar, rule and tick, this determines whether the size of the bar and tick\n\nshould be applied to x or y dimension.\n\n- For area, this property determines the orient property of the Vega output.\n\n- For line, this property determines the sort order of the points in the line\n\nif `config.sortLineBy` is not specified.\n\nFor stacked charts, this is always determined by the orientation of the stack;\n\ntherefore explicitly specified value will be ignored."
        },
        "interpolate": {
          "$ref": "#/definitions/Interpolate",
          "description": "The line interpolation method to use. One of linear, step-before, step-after, basis, basis-open, cardinal, cardinal-open, monotone."
        },
        "tension": {
          "description": "Depending on the interpolation type, sets the tension parameter.",
          "type": "number"
        },
        "lineSize": {
          "description": "Size of line mark.",
          "type": "number"
        },
        "ruleSize": {
          "description": "Size of rule mark.",
          "type": "number"
        },
        "barSize": {
          "description": "The size of the bars.  If unspecified, the default size is  `bandSize-1`,\n\nwhich provides 1 pixel offset between bars.",
          "type": "number"
        },
        "barThinSize": {
          "description": "The size of the bars on continuous scales.",
          "type": "number"
        },
        "shape": {
          "description": "The symbol shape to use. One of circle (default), square, cross, diamond, triangle-up, or triangle-down, or a custom SVG path.",
          "oneOf": [
            {
              "$ref": "#/definitions/Shape"
            },
            {
              "type": "string"
            }
          ]
        },
        "size": {
          "description": "The pixel area each the point. For example: in the case of circles, the radius is determined in part by the square root of the size value.",
          "type": "number"
        },
        "tickSize": {
          "description": "The width of the ticks.",
          "type": "number"
        },
        "tickThickness": {
          "description": "Thickness of the tick mark.",
          "type": "number"
        },
        "align": {
          "$ref": "#/definitions/HorizontalAlign",
          "description": "The horizontal alignment of the text. One of left, right, center."
        },
        "angle": {
          "description": "The rotation angle of the text, in degrees.",
          "type": "number"
        },
        "baseline": {
          "$ref": "#/definitions/VerticalAlign",
          "description": "The vertical alignment of the text. One of top, middle, bottom."
        },
        "dx": {
          "description": "The horizontal offset, in pixels, between the text label and its anchor point. The offset is applied after rotation by the angle property.",
          "type": "number"
        },
        "dy": {
          "description": "The vertical offset, in pixels, between the text label and its anchor point. The offset is applied after rotation by the angle property.",
          "type": "number"
        },
        "radius": {
          "description": "Polar coordinate radial offset, in pixels, of the text label from the origin determined by the x and y properties.",
          "type": "number"
        },
        "theta": {
          "description": "Polar coordinate angle, in radians, of the text label from the origin determined by the x and y properties. Values for theta follow the same convention of arc mark startAngle and endAngle properties: angles are measured in radians, with 0 indicating \"north\".",
          "type": "number"
        },
        "font": {
          "description": "The typeface to set the text in (e.g., Helvetica Neue).",
          "type": "string"
        },
        "fontSize": {
          "description": "The font size, in pixels.",
          "type": "number"
        },
        "fontStyle": {
          "$ref": "#/definitions/FontStyle",
          "description": "The font style (e.g., italic)."
        },
        "fontWeight": {
          "$ref": "#/definitions/FontWeight",
          "description": "The font weight (e.g., bold)."
        },
        "format": {
          "description": "The formatting pattern for text value. If not defined, this will be determined automatically.",
          "type": "string"
        },
        "shortTimeLabels": {
          "description": "Whether month names and weekday names should be abbreviated.",
          "type": "boolean"
        },
        "text": {
          "description": "Placeholder Text",
          "type": "string"
        },
        "applyColorToBackground": {
          "description": "Apply color field to background color instead of the text.",
          "type": "boolean"
        }
      }
    },
    "StackOffset": {
      "type": "string",
      "enum": [
        "zero",
        "center",
        "normalize",
        "none"
      ]
    },
    "Orient": {
      "type": "string",
      "enum": [
        "horizontal",
        "vertical"
      ]
    },
    "Interpolate": {
      "type": "string",
      "enum": [
        "linear",
        "linear-closed",
        "step",
        "step-before",
        "step-after",
        "basis",
        "basis-open",
        "basis-closed",
        "cardinal",
        "cardinal-open",
        "cardinal-closed",
        "bundle",
        "monotone"
      ]
    },
    "Shape": {
      "type": "string",
      "enum": [
        "circle",
        "square",
        "cross",
        "diamond",
        "triangle-up",
        "triangle-down"
      ]
    },
    "HorizontalAlign": {
      "type": "string",
      "enum": [
        "left",
        "right",
        "center"
      ]
    },
    "VerticalAlign": {
      "type": "string",
      "enum": [
        "top",
        "middle",
        "bottom"
      ]
    },
    "FontStyle": {
      "type": "string",
      "enum": [
        "normal",
        "italic"
      ]
    },
    "FontWeight": {
      "type": "string",
      "enum": [
        "normal",
        "bold"
      ]
    },
    "OverlayConfig": {
      "type": "object",
      "properties": {
        "line": {
          "description": "Whether to overlay line with point.",
          "type": "boolean"
        },
        "area": {
          "$ref": "#/definitions/AreaOverlay",
          "description": "Type of overlay for area mark (line or linepoint)"
        },
        "pointStyle": {
          "$ref": "#/definitions/MarkConfig",
          "description": "Default style for the overlayed point."
        },
        "lineStyle": {
          "$ref": "#/definitions/MarkConfig",
          "description": "Default style for the overlayed point."
        }
      }
    },
    "AreaOverlay": {
      "type": "string",
      "enum": [
        "line",
        "linepoint",
        "none"
      ]
    },
    "ScaleConfig": {
      "type": "object",
      "properties": {
        "round": {
          "description": "If true, rounds numeric output values to integers.\n\nThis can be helpful for snapping to the pixel grid.\n\n(Only available for `x`, `y`, `size`, `row`, and `column` scales.)",
          "type": "boolean"
        },
        "textBandWidth": {
          "description": "Default band width for `x` ordinal scale when is mark is `text`.",
          "minimum": 0,
          "type": "number"
        },
        "bandSize": {
          "description": "Default band size for (1) `y` ordinal scale,\n\nand (2) `x` ordinal scale when the mark is not `text`.",
          "minimum": 0,
          "type": "number"
        },
        "opacity": {
          "description": "Default range for opacity.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "padding": {
          "description": "Default padding for `x` and `y` ordinal scales.",
          "type": "number"
        },
        "useRawDomain": {
          "description": "Uses the source data range as scale domain instead of aggregated data for aggregate axis.\n\nThis property only works with aggregate functions that produce values within the raw data domain (`\"mean\"`, `\"average\"`, `\"stdev\"`, `\"stdevp\"`, `\"median\"`, `\"q1\"`, `\"q3\"`, `\"min\"`, `\"max\"`). For other aggregations that produce values outside of the raw data domain (e.g. `\"count\"`, `\"sum\"`), this property is ignored.",
          "type": "boolean"
        },
        "nominalColorRange": {
          "description": "Default range for nominal color scale",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          ]
        },
        "sequentialColorRange": {
          "description": "Default range for ordinal / continuous color scale",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          ]
        },
        "shapeRange": {
          "description": "Default range for shape",
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          ]
        },
        "barSizeRange": {
          "description": "Default range for bar size scale",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "fontSizeRange": {
          "description": "Default range for font size scale",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "ruleSizeRange": {
          "description": "Default range for rule stroke widths",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "tickSizeRange": {
          "description": "Default range for tick spans",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "pointSizeRange": {
          "description": "Default range for bar size scale",
          "type": "array",
          "items": {
            "type": "number"
          }
        }
      }
    },
    "AxisConfig": {
      "type": "object",
      "properties": {
        "axisWidth": {
          "description": "Width of the axis line",
          "type": "number"
        },
        "layer": {
          "description": "A string indicating if the axis (and any gridlines) should be placed above or below the data marks.",
          "type": "string"
        },
        "offset": {
          "description": "The offset, in pixels, by which to displace the axis from the edge of the enclosing group or data rectangle.",
          "type": "number"
        },
        "axisColor": {
          "description": "Color of axis line.",
          "type": "string"
        },
        "grid": {
          "description": "A flag indicate if gridlines should be created in addition to ticks. If `grid` is unspecified, the default value is `true` for ROW and COL. For X and Y, the default value is `true` for quantitative and time fields and `false` otherwise.",
          "type": "boolean"
        },
        "gridColor": {
          "description": "Color of gridlines.",
          "type": "string"
        },
        "gridDash": {
          "description": "The offset (in pixels) into which to begin drawing with the grid dash array.",
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "gridOpacity": {
          "description": "The stroke opacity of grid (value between [0,1])",
          "type": "number"
        },
        "gridWidth": {
          "description": "The grid width, in pixels.",
          "type": "number"
        },
        "labels": {
          "description": "Enable or disable labels.",
          "type": "boolean"
        },
        "labelAngle": {
          "description": "The rotation angle of the axis labels.",
          "type": "number"
        },
        "labelAlign": {
          "description": "Text alignment for the Label.",
          "type": "string"
        },
        "labelBaseline": {
          "description": "Text baseline for the label.",
          "type": "string"
        },
        "labelMaxLength": {
          "description": "Truncate labels that are too long.",
          "minimum": 1,
          "type": "number"
        },
        "shortTimeLabels": {
          "description": "Whether month and day names should be abbreviated.",
          "type": "boolean"
        },
        "subdivide": {
          "description": "If provided, sets the number of minor ticks between major ticks (the value 9 results in decimal subdivision). Only applicable for axes visualizing quantitative scales.",
          "type": "number"
        },
        "ticks": {
          "description": "A desired number of ticks, for axes visualizing quantitative scales. The resulting number may be different so that values are \"nice\" (multiples of 2, 5, 10) and lie within the underlying scale's range.",
          "minimum": 0,
          "type": "number"
        },
        "tickColor": {
          "description": "The color of the axis's tick.",
          "type": "string"
        },
        "tickLabelColor": {
          "description": "The color of the tick label, can be in hex color code or regular color name.",
          "type": "string"
        },
        "tickLabelFont": {
          "description": "The font of the tick label.",
          "type": "string"
        },
        "tickLabelFontSize": {
          "description": "The font size of label, in pixels.",
          "type": "number"
        },
        "tickPadding": {
          "description": "The padding, in pixels, between ticks and text labels.",
          "type": "number"
        },
        "tickSize": {
          "description": "The size, in pixels, of major, minor and end ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeMajor": {
          "description": "The size, in pixels, of major ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeMinor": {
          "description": "The size, in pixels, of minor ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickSizeEnd": {
          "description": "The size, in pixels, of end ticks.",
          "minimum": 0,
          "type": "number"
        },
        "tickWidth": {
          "description": "The width, in pixels, of ticks.",
          "type": "number"
        },
        "titleColor": {
          "description": "Color of the title, can be in hex color code or regular color name.",
          "type": "string"
        },
        "titleFont": {
          "description": "Font of the title.",
          "type": "string"
        },
        "titleFontSize": {
          "description": "Size of the title.",
          "type": "number"
        },
        "titleFontWeight": {
          "description": "Weight of the title.",
          "type": "string"
        },
        "titleOffset": {
          "description": "A title offset value for the axis.",
          "type": "number"
        },
        "titleMaxLength": {
          "description": "Max length for axis title if the title is automatically generated from the field's description. By default, this is automatically based on cell size and characterWidth property.",
          "minimum": 0,
          "type": "number"
        },
        "characterWidth": {
          "description": "Character width for automatically determining title max length.",
          "type": "number"
        },
        "properties": {
          "description": "Optional mark property definitions for custom axis styling."
        }
      }
    },
    "LegendConfig": {
      "type": "object",
      "properties": {
        "orient": {
          "description": "The orientation of the legend. One of \"left\" or \"right\". This determines how the legend is positioned within the scene. The default is \"right\".",
          "type": "string"
        },
        "offset": {
          "description": "The offset, in pixels, by which to displace the legend from the edge of the enclosing group or data rectangle.",
          "type": "number"
        },
        "padding": {
          "description": "The padding, in pixels, between the lengend and axis.",
          "type": "number"
        },
        "margin": {
          "description": "The margin around the legend, in pixels",
          "type": "number"
        },
        "gradientStrokeColor": {
          "description": "The color of the gradient stroke, can be in hex color code or regular color name.",
          "type": "string"
        },
        "gradientStrokeWidth": {
          "description": "The width of the gradient stroke, in pixels.",
          "type": "number"
        },
        "gradientHeight": {
          "description": "The height of the gradient, in pixels.",
          "type": "number"
        },
        "gradientWidth": {
          "description": "The width of the gradient, in pixels.",
          "type": "number"
        },
        "labelAlign": {
          "description": "The alignment of the legend label, can be left, middle or right.",
          "type": "string"
        },
        "labelBaseline": {
          "description": "The position of the baseline of legend label, can be top, middle or bottom.",
          "type": "string"
        },
        "labelColor": {
          "description": "The color of the legend label, can be in hex color code or regular color name.",
          "type": "string"
        },
        "labelFont": {
          "description": "The font of the lengend label.",
          "type": "string"
        },
        "labelFontSize": {
          "description": "The font size of lengend lable.",
          "type": "number"
        },
        "labelOffset": {
          "description": "The offset of the legend label.",
          "type": "number"
        },
        "shortTimeLabels": {
          "description": "Whether month names and weekday names should be abbreviated.",
          "type": "boolean"
        },
        "symbolColor": {
          "description": "The color of the legend symbol,",
          "type": "string"
        },
        "symbolShape": {
          "description": "The shape of the legend symbol, can be the 'circle', 'square', 'cross', 'diamond',\n\n'triangle-up', 'triangle-down', or else a custom SVG path string.",
          "type": "string"
        },
        "symbolSize": {
          "description": "The size of the lengend symbol, in pixels.",
          "type": "number"
        },
        "symbolStrokeWidth": {
          "description": "The width of the symbol's stroke.",
          "type": "number"
        },
        "titleColor": {
          "description": "Optional mark property definitions for custom legend styling.\n\nThe color of the legend title, can be in hex color code or regular color name.",
          "type": "string"
        },
        "titleFont": {
          "description": "The font of the legend title.",
          "type": "string"
        },
        "titleFontSize": {
          "description": "The font size of the legend title.",
          "type": "number"
        },
        "titleFontWeight": {
          "description": "The font weight of the legend title.",
          "type": "string"
        },
        "properties": {
          "description": "Optional mark property definitions for custom legend styling."
        }
      }
    },
    "FacetConfig": {
      "type": "object",
      "properties": {
        "scale": {
          "$ref": "#/definitions/FacetScaleConfig",
          "description": "Facet Scale Config"
        },
        "axis": {
          "$ref": "#/definitions/AxisConfig",
          "description": "Facet Axis Config"
        },
        "grid": {
          "$ref": "#/definitions/FacetGridConfig",
          "description": "Facet Grid Config"
        },
        "cell": {
          "$ref": "#/definitions/CellConfig",
          "description": "Facet Cell Config"
        }
      }
    },
    "FacetScaleConfig": {
      "type": "object",
      "properties": {
        "round": {
          "type": "boolean"
        },
        "padding": {
          "type": "number"
        }
      }
    },
    "FacetGridConfig": {
      "type": "object",
      "properties": {
        "color": {
          "format": "color",
          "type": "string"
        },
        "opacity": {
          "type": "number"
        },
        "offset": {
          "type": "number"
        }
      }
    },
    "FacetSpec": {
      "type": "object",
      "properties": {
        "facet": {
          "$ref": "#/definitions/Facet"
        },
        "spec": {
          "oneOf": [
            {
              "$ref": "#/definitions/LayerSpec"
            },
            {
              "$ref": "#/definitions/UnitSpec"
            }
          ]
        },
        "name": {
          "description": "Name of the visualization for later reference.",
          "type": "string"
        },
        "description": {
          "description": "An optional description of this mark for commenting purpose.\n\nThis property has no effect on the output visualization.",
          "type": "string"
        },
        "data": {
          "$ref": "#/definitions/Data",
          "description": "An object describing the data source"
        },
        "transform": {
          "$ref": "#/definitions/Transform",
          "description": "An object describing filter and new field calculation."
        },
        "config": {
          "$ref": "#/definitions/Config",
          "description": "Configuration object"
        }
      },
      "required": [
        "facet",
        "spec"
      ]
    },
    "Facet": {
      "type": "object",
      "properties": {
        "row": {
          "$ref": "#/definitions/PositionChannelDef"
        },
        "column": {
          "$ref": "#/definitions/PositionChannelDef"
        }
      }
    },
    "LayerSpec": {
      "type": "object",
      "properties": {
        "layers": {
          "description": "Unit specs that will be layered.",
          "type": "array",
          "items": {
            "$ref": "#/definitions/UnitSpec"
          }
        },
        "name": {
          "description": "Name of the visualization for later reference.",
          "type": "string"
        },
        "description": {
          "description": "An optional description of this mark for commenting purpose.\n\nThis property has no effect on the output visualization.",
          "type": "string"
        },
        "data": {
          "$ref": "#/definitions/Data",
          "description": "An object describing the data source"
        },
        "transform": {
          "$ref": "#/definitions/Transform",
          "description": "An object describing filter and new field calculation."
        },
        "config": {
          "$ref": "#/definitions/Config",
          "description": "Configuration object"
        }
      },
      "required": [
        "layers"
      ]
    },
    "UnitSpec": {
      "type": "object",
      "properties": {
        "mark": {
          "$ref": "#/definitions/Mark",
          "description": "The mark type.\n\nOne of `\"bar\"`, `\"circle\"`, `\"square\"`, `\"tick\"`, `\"line\"`,\n\n`\"area\"`, `\"point\"`, `\"rule\"`, and `\"text\"`."
        },
        "encoding": {
          "$ref": "#/definitions/UnitEncoding",
          "description": "A key-value mapping between encoding channels and definition of fields."
        },
        "name": {
          "description": "Name of the visualization for later reference.",
          "type": "string"
        },
        "description": {
          "description": "An optional description of this mark for commenting purpose.\n\nThis property has no effect on the output visualization.",
          "type": "string"
        },
        "data": {
          "$ref": "#/definitions/Data",
          "description": "An object describing the data source"
        },
        "transform": {
          "$ref": "#/definitions/Transform",
          "description": "An object describing filter and new field calculation."
        },
        "config": {
          "$ref": "#/definitions/Config",
          "description": "Configuration object"
        }
      },
      "required": [
        "mark"
      ]
    },
    "UnitEncoding": {
      "type": "object",
      "properties": {
        "x": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "X coordinates for `point`, `circle`, `square`,\n\n`line`, `rule`, `text`, and `tick`\n\n(or to width and height for `bar` and `area` marks)."
        },
        "y": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Y coordinates for `point`, `circle`, `square`,\n\n`line`, `rule`, `text`, and `tick`\n\n(or to width and height for `bar` and `area` marks)."
        },
        "x2": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "X2 coordinates for ranged `bar`, `rule`, `area`"
        },
        "y2": {
          "$ref": "#/definitions/PositionChannelDef",
          "description": "Y2 coordinates for ranged `bar`, `rule`, `area`"
        },
        "color": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Color of the marks – either fill or stroke color based on mark type.\n\n(By default, fill color for `area`, `bar`, `tick`, `text`, `circle`, and `square` /\n\nstroke color for `line` and `point`.)"
        },
        "opacity": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Opacity of the marks – either can be a value or in a range."
        },
        "size": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "Size of the mark.\n\n- For `point`, `square` and `circle`\n\n– the symbol size, or pixel area of the mark.\n\n- For `bar` and `tick` – the bar and tick's size.\n\n- For `text` – the text's font size.\n\n- Size is currently unsupported for `line` and `area`."
        },
        "shape": {
          "$ref": "#/definitions/ChannelDefWithLegend",
          "description": "The symbol's shape (only for `point` marks). The supported values are\n\n`\"circle\"` (default), `\"square\"`, `\"cross\"`, `\"diamond\"`, `\"triangle-up\"`,\n\nor `\"triangle-down\"`, or else a custom SVG path string."
        },
        "detail": {
          "description": "Additional levels of detail for grouping data in aggregate views and\n\nin line and area marks without mapping data to a specific visual channel.",
          "oneOf": [
            {
              "$ref": "#/definitions/FieldDef",
              "description": "Interface for any kind of FieldDef;\n\nFor simplicity, we do not declare multiple interfaces of FieldDef like\n\nwe do for JSON schema."
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/FieldDef",
                "description": "Interface for any kind of FieldDef;\n\nFor simplicity, we do not declare multiple interfaces of FieldDef like\n\nwe do for JSON schema."
              }
            }
          ]
        },
        "text": {
          "$ref": "#/definitions/FieldDef",
          "description": "Text of the `text` mark."
        },
        "label": {
          "$ref": "#/definitions/FieldDef"
        },
        "path": {
          "description": "Order of data points in line marks.",
          "oneOf": [
            {
              "$ref": "#/definitions/OrderChannelDef"
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OrderChannelDef"
              }
            }
          ]
        },
        "order": {
          "description": "Layer order for non-stacked marks, or stack order for stacked marks.",
          "oneOf": [
            {
              "$ref": "#/definitions/OrderChannelDef"
            },
            {
              "type": "array",
              "items": {
                "$ref": "#/definitions/OrderChannelDef"
              }
            }
          ]
        }
      }
    }
  },
  "$schema": "http://json-schema.org/draft-04/schema#"
};
}());

;(function() {
'use strict';
/* globals window, angular */

angular.module('vlui', [
    'LocalStorageModule',
    'angular-google-analytics',
    'angular-sortable-view',
    'angular-websql'
  ])
  .constant('_', window._)
  // datalib, vegalite, vega
  .constant('vl', window.vl)
  .constant('cql', window.cql)
  .constant('vlSchema', window.vlSchema)
  .constant('vg', window.vg)
  .constant('util', window.vg.util)
  // other libraries
  .constant('jQuery', window.$)
  .constant('Papa', window.Papa)
  .constant('Blob', window.Blob)
  .constant('URL', window.URL)
  .constant('Drop', window.Drop)
  .constant('Heap', window.Heap)
  // Use the customized vendor/json3-compactstringify
  .constant('JSON3', window.JSON3.noConflict())
  .constant('ANY', '__ANY__')
  // constants
  .constant('consts', {
    addCount: true, // add count field to Dataset.dataschema
    debug: true,
    useUrl: true,
    logging: true,
    logLevel: 'INFO',
    logPrintLevel: 'INFO',
    logToWebSql: false, // in user studies, set this to true
    defaultConfigSet: 'large',
    appId: 'vlui',
    // embedded polestar and voyager with known data
    embeddedData: window.vguiData || undefined,
    priority: {
      bookmark: 0,
      popup: 0,
      vislist: 1000
    },
    myriaRest: 'http://ec2-52-1-38-182.compute-1.amazonaws.com:8753',
    defaultTimeFn: 'year'
  });
}());

;(function() {
angular.module("vlui").run(["$templateCache", function($templateCache) {$templateCache.put("dataset/addmyriadataset.html","<div class=\"add-myria-dataset\"><p>Select a dataset from the Myria instance at <input ng-model=\"myriaRestUrl\"><button ng-click=\"loadDatasets(\'\')\">update</button>.</p><form ng-submit=\"addDataset(myriaDataset)\"><div><select name=\"myria-dataset\" id=\"select-myria-dataset\" ng-disabled=\"disabled\" ng-model=\"myriaDataset\" ng-options=\"optionName(dataset) for dataset in myriaDatasets track by dataset.relationName\"><option value=\"\">Select Dataset...</option></select></div><button type=\"submit\">Add dataset</button></form></div>");
$templateCache.put("dataset/addurldataset.html","<div class=\"add-url-dataset\"><p>Add the name of the dataset and the URL to a <b>JSON</b> or <b>CSV</b> (with header) file. Make sure that the formatting is correct and clean the data before adding it. The added dataset is only visible to you.</p><form ng-submit=\"addFromUrl(addedDataset)\"><div class=\"form-group\"><label for=\"dataset-name\">Name</label> <input ng-model=\"addedDataset.name\" id=\"dataset-name\" type=\"text\"></div><div class=\"form-group\"><label for=\"dataset-url\">URL</label> <input ng-model=\"addedDataset.url\" id=\"dataset-url\" type=\"url\"><p>Make sure that you host the file on a server that has <code>Access-Control-Allow-Origin: *</code> set.</p></div><button type=\"submit\">Add dataset</button></form></div>");
$templateCache.put("dataset/changeloadeddataset.html","<div class=\"change-loaded-dataset\"><div ng-if=\"userData.length\"><h3>Uploaded Datasets</h3><ul><li ng-repeat=\"dataset in userData track by dataset.id\" ng-class=\"{selected: Dataset.currentDataset.id === dataset.id}\"><a class=\"dataset\" ng-click=\"selectDataset(dataset)\" ng-disabled=\"Dataset.currentDataset.id === dataset.id\"><i class=\"fa fa-database\"></i> <strong>{{dataset.name}}</strong></a> <span ng-if=\"dataset.description\">{{dataset.description}}</span> <strong ng-if=\"Dataset.currentDataset === dataset\">(selected)</strong></li></ul></div><h3>Explore a Sample Dataset</h3><ul class=\"loaded-dataset-list\"><li ng-repeat=\"dataset in sampleData track by dataset.id\" ng-class=\"{selected: Dataset.currentDataset.id === dataset.id}\"><a class=\"dataset\" ng-click=\"selectDataset(dataset)\" ng-disabled=\"Dataset.currentDataset.id === dataset.id\"><i class=\"fa fa-database\"></i> <strong>{{dataset.name}}</strong></a> <strong ng-if=\"Dataset.currentDataset === dataset\">(selected)</strong> <em ng-if=\"dataset.description\">{{dataset.description}}</em></li></ul></div>");
$templateCache.put("dataset/datasetmodal.html","<modal id=\"dataset-modal\" max-width=\"800px\"><div class=\"modal-header\"><modal-close-button></modal-close-button><h2>Add Dataset</h2></div><div class=\"modal-main\"><tabset><tab heading=\"Change Dataset\"><change-loaded-dataset></change-loaded-dataset></tab><tab heading=\"Paste or Upload Data\"><paste-dataset></paste-dataset></tab><tab heading=\"From URL\"><add-url-dataset></add-url-dataset></tab><tab heading=\"From Myria\"><add-myria-dataset></add-myria-dataset></tab></tabset></div></modal>");
$templateCache.put("dataset/datasetselector.html","<button id=\"select-data\" class=\"small-button select-data\" ng-click=\"loadDataset();\">Change</button>");
$templateCache.put("dataset/filedropzone.html","<div class=\"dropzone\" ng-transclude=\"\"></div>");
$templateCache.put("dataset/pastedataset.html","<div class=\"paste-data\"><file-dropzone dataset=\"dataset\" max-file-size=\"10\" valid-mime-types=\"[text/csv, text/json, text/tsv]\"><div class=\"upload-data\"><div class=\"form-group\"><label for=\"dataset-file\">File</label> <input type=\"file\" id=\"dataset-file\" accept=\"text/csv,text/tsv\"></div><p>Upload a CSV, or paste data in <a href=\"https://en.wikipedia.org/wiki/Comma-separated_values\">CSV</a> format into the fields.</p><div class=\"dropzone-target\"><p>Drop CSV file here</p></div></div><form ng-submit=\"addDataset()\"><div class=\"form-group\"><label for=\"dataset-name\">Name</label> <input type=\"name\" ng-model=\"dataset.name\" id=\"dataset-name\" required=\"\"></div><div class=\"form-group\"><textarea ng-model=\"dataset.data\" ng-model-options=\"{ updateOn: \'default blur\', debounce: { \'default\': 17, \'blur\': 0 }}\" required=\"\">\n      </textarea></div><button type=\"submit\">Add data</button></form></file-dropzone></div>");
$templateCache.put("components/alertmessages/alertmessages.html","<div class=\"alert-box\" ng-show=\"Alerts.alerts.length > 0\"><div class=\"alert-item\" ng-repeat=\"alert in Alerts.alerts\">{{ alert.msg }} <a class=\"close\" ng-click=\"Alerts.closeAlert($index)\">&times;</a></div></div>");
$templateCache.put("components/bookmarklist/bookmarklist.html","<modal id=\"bookmark-list\" ng-if=\"Bookmarks.isSupported\"><div class=\"modal-header card no-top-margin no-right-margin\"><modal-close-button close-action=\"Bookmarks.logBookmarksClosed()\"></modal-close-button><h2 class=\"no-bottom-margin\">Bookmarks ({{ Bookmarks.list.length }})</h2><a class=\"bookmark-list-util\" ng-click=\"Bookmarks.clear()\"><i class=\"fa fa-trash-o\"></i> Clear all</a> <a class=\"bookmark-list-util\" ng-click=\"Bookmarks.export()\"><i class=\"fa fa-clipboard\"></i> Export</a></div><div class=\"flex-grow-1 scroll-y\"><div ng-if=\"Bookmarks.list.length > 0\" class=\"hflex flex-wrap\" sv-root=\"\" sv-part=\"Bookmarks.list\" sv-on-sort=\"Bookmarks.reorder()\"><vl-plot-group ng-repeat=\"bookmark in Bookmarks.list | orderObjectBy : \'timeAdded\' : false\" class=\"wrapped-vl-plot-group card\" list-title=\"\'Bookmark\'\" chart=\"bookmark.chart\" field-set=\"bookmark.chart.fieldSet\" show-bookmark=\"true\" show-debug=\"consts.debug\" show-expand=\"false\" always-selected=\"true\" highlighted=\"highlighted\" overflow=\"true\" tooltip=\"true\" priority=\"consts.priority.bookmark\" show-select=\"true\" sv-element=\"\"></vl-plot-group><div sv-placeholder=\"\"></div></div><div class=\"vis-list-empty\" ng-if=\"Bookmarks.list.length === 0\">You have no bookmarks</div></div></modal>");
$templateCache.put("components/channelshelf/channelshelf.html","<div class=\"shelf-group\"><div class=\"shelf\" ng-class=\"{disabled: disabled || !supportMark(channelId, mark), \'any\': isAnyChannel}\"><div class=\"shelf-label\" ng-class=\"{expanded: propsExpanded}\">{{ isAnyChannel ? \'any\' : channelId }}</div><div class=\"field-drop\" ng-model=\"pills[channelId]\" data-drop=\"!disabled && supportMark(channelId, mark)\" jqyoui-droppable=\"{onDrop:\'fieldDropped\'}\" data-jqyoui-options=\"{activeClass: \'drop-active\'}\"><field-info ng-show=\"encoding[channelId].field\" ng-class=\"{ expanded: funcsExpanded, any: isAnyField, \'enumerated-field\': isEnumeratedField, \'enumerated-channel\': isEnumeratedChannel, highlighted: isHighlighted(channelId) }\" field-def=\"encoding[channelId]\" show-type=\"true\" show-caret=\"true\" disable-caret=\"encoding[channelId].aggregate===\'count\'\" popup-content=\"fieldInfoPopupContent\" show-remove=\"true\" remove-action=\"removeField()\" class=\"selected draggable full-width\" data-drag=\"true\" ng-model=\"pills[channelId]\" jqyoui-draggable=\"{onStart: \'fieldDragStart\', onStop:\'fieldDragStop\'}\" data-jqyoui-options=\"{revert: \'invalid\', helper: \'clone\'}\"></field-info><span class=\"placeholder\" ng-if=\"!encoding[channelId].field\">drop a field here</span></div></div><div class=\"drop-container\"><div class=\"popup-menu shelf-properties shelf-properties-{{channelId}}\"></div><div class=\"popup-menu shelf-functions shelf-functions-{{channelId}}\"><function-select ng-if=\"!preview\" field-def=\"encoding[channelId]\" channel-id=\"channelId\"></function-select></div></div></div>");
$templateCache.put("components/fieldinfo/fieldinfo.html","<span class=\"field-info\"><span class=\"hflex full-width\" ng-click=\"clicked($event)\"><span class=\"type-caret\" ng-class=\"{active: !disableCaret}\"><i class=\"fa fa-caret-down\" ng-show=\"showCaret\"></i> <span class=\"type fa {{icon}}\" ng-show=\"showType\" title=\"{{typeName}}\"></span></span> <span ng-if=\"fieldDef.aggregate!==\'count\'\" class=\"field-info-text\"><span ng-if=\"func(fieldDef)\" class=\"field-func\" title=\"{{ func(fieldDef) }}\" ng-class=\"{any: fieldDef._any}\">{{ func(fieldDef) }}</span><span class=\"field-name\" ng-class=\"{hasfunc: func(fieldDef), any: fieldDef._any}\">{{ (fieldDef.title || fieldDef.field) | underscore2space }}</span></span> <span ng-if=\"fieldDef.aggregate===\'count\' || fieldDef.autoCount\" class=\"field-count field-info-text\"><span class=\"field-name\">COUNT</span></span> <span class=\"no-shrink remove\" ng-show=\"showRemove\"><a class=\"remove-field\" ng-click=\"removeAction()\"><i class=\"fa fa-times\"></i></a></span> <span class=\"no-shrink add\" ng-show=\"showAdd\"><a class=\"add-field\" ng-click=\"addAction()\"><i class=\"fa fa-plus\"></i></a></span></span></span>");
$templateCache.put("components/functionselect/functionselect.html","<div class=\"mb5\" ng-if=\"func.list.aboveFold.length > 1 || func.list.aboveFold[0] !== undefined\"><h4>Function</h4><div><label class=\"func-label field-func\" ng-repeat=\"f in func.list.aboveFold\" ng-class=\"{none: !f}\"><input type=\"radio\" ng-value=\"f\" ng-model=\"func.selected\" ng-change=\"selectChanged()\"> {{f || \'NONE\'}}</label></div><div ng-show=\"showAllFunctions\"><label class=\"func-label field-func\" ng-class=\"{\'single-column\': func.isTemporal}\" ng-repeat=\"f in func.list.belowFold\"><input type=\"radio\" ng-value=\"f\" ng-model=\"func.selected\" ng-change=\"selectChanged()\"> {{f}}</label></div><div ng-hide=\"func.isCount || func.list.belowFold.length == 0\" class=\"expand-collapse\"><a ng-click=\"showAllFunctions=!showAllFunctions\"><span ng-show=\"!showAllFunctions\">more <i class=\"fa fa-angle-down\" aria-hidden=\"true\"></i></span> <span ng-show=\"showAllFunctions\">less <i class=\"fa fa-angle-up\" aria-hidden=\"true\"></i></span></a></div></div>");
$templateCache.put("components/modal/modal.html","<div class=\"modal\" ng-if=\"isOpen\"><div class=\"modal-wrapper\" style=\"{{wrapperStyle}}\" ng-transclude=\"\"></div></div>");
$templateCache.put("components/modal/modalclosebutton.html","<div class=\"right\"><a ng-click=\"closeModal()\" class=\"right\">Close</a></div>");
$templateCache.put("components/propertyeditor/propertyeditor.html","<div><label class=\"prop-label\" for=\"{{ id }}\"><span class=\"name\" title=\"{{ propName }}\">{{ propName }}</span> <span ng-if=\"description\" class=\"fa fa-info-circle\" tooltips=\"\" tooltip-size=\"small\" tooltip-html=\"<strong>{{ propName }}</strong><div class=\'tooltip-content\'>{{ description }}</div>\" tooltip-side=\"right\"></span></label><form class=\"inline-block\" ng-switch=\"type + (enum !== undefined ? \'list\' : \'\')\"><input id=\"{{ id }}\" ng-switch-when=\"boolean\" type=\"checkbox\" ng-model=\"group[propName]\" ng-hide=\"automodel.value\"><select id=\"{{ id }}\" ng-switch-when=\"stringlist\" ng-model=\"group[propName]\" ng-options=\"choice for choice in enum track by choice\" ng-hide=\"automodel.value\"></select><input id=\"{{ id }}\" ng-switch-when=\"integer\" ng-attr-type=\"{{ isRange ? \'range\' : \'number\'}}\" ng-model=\"group[propName]\" ng-model-options=\"{debounce: 200}\" ng-attr-min=\"{{min}}\" ng-attr-max=\"{{max}}\" ng-hide=\"automodel.value\" ng-attr-title=\"{{ isRange ? group[propName] : undefined }}\"> <input id=\"{{ id }}\" ng-attr-type=\"{{ role === \'color\' ? \'color\' : \'string\' }}\" ng-switch-when=\"string\" ng-model=\"group[propName]\" ng-model-options=\"{debounce: 500}\" ng-hide=\"automodel.value\"> <small ng-if=\"hasAuto\"><label>Auto <input ng-model=\"automodel.value\" type=\"checkbox\"></label></small></form></div>");
$templateCache.put("components/schemalist/schemalist.html","<div class=\"schema no-top-margin full-width\"><schema-list-item ng-repeat=\"fieldDef in fieldDefs | orderBy : orderBy\" field-def=\"fieldDef\" show-add=\"showAdd\"></schema-list-item></div>");
$templateCache.put("components/schemalist/schemalistitem.html","<field-info class=\"pill list-item draggable full-width no-right-margin\" ng-class=\"{any: isEnumSpec(fieldDef.field)}\" ng-dblclick=\"fieldAdd(fieldDef)\" field-def=\"fieldDef\" ng-model=\"pill\" data-drag=\"true\" jqyoui-draggable=\"{placeholder: \'keep\', deepCopy: true, onStart: \'fieldDragStart\', onStop:\'fieldDragStop\'}\" data-jqyoui-options=\"{revert: \'invalid\', helper: \'clone\'}\" show-add=\"showAdd\" show-caret=\"true\" disable-caret=\"fieldDef.immutable || fieldDef.aggregate === \'count\' || allowedTypes.length<=1\" show-type=\"true\" add-action=\"fieldAdd(fieldDef)\" popup-content=\"fieldInfoPopupContent\"></field-info><div class=\"drop-container\"><div class=\"popup-menu schema-menu\"><div class=\"mb5 field-type\" ng-if=\"allowedTypes.length>1 && !isAnyField\"><h4>Type</h4><label class=\"type-label\" ng-repeat=\"type in allowedTypes\"><input type=\"radio\" ng-value=\"type\" ng-model=\"fieldDef.type\"> {{type}}</label></div></div></div>");
$templateCache.put("components/shelves/shelves.html","<div class=\"card shelves no-top-margin no-right-margin abs-100\"><a class=\"right\" ng-click=\"clear()\"><i class=\"fa fa-eraser\"></i> Clear</a><h2>Encoding</h2><div class=\"shelf-pane shelf-encoding-pane full-width\"><h3>Positional</h3><channel-shelf channel-id=\"\'x\'\" preview=\"preview\" encoding=\"spec.encoding\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'y\'\" preview=\"preview\" encoding=\"spec.encoding\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'column\'\" preview=\"preview\" encoding=\"spec.encoding\" mark=\"spec.mark\" disabled=\"!spec.encoding.x.field\">></channel-shelf><channel-shelf channel-id=\"\'row\'\" preview=\"preview\" encoding=\"spec.encoding\" mark=\"spec.mark\" disabled=\"!spec.encoding.y.field\"></channel-shelf></div><div class=\"shelf-pane shelf-marks-pane full-width\"><div class=\"right\"><select class=\"markselect\" ng-model=\"spec.mark\" ng-class=\"{auto: spec.mark === ANY}\" ng-options=\"(type === ANY ? \'auto\' : type) for type in (supportAny ? marksWithAny : marks)\" ng-change=\"markChange()\"></select></div><h3>Marks</h3><channel-shelf channel-id=\"\'size\'\" preview=\"preview\" encoding=\"spec.encoding\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'color\'\" preview=\"preview\" encoding=\"spec.encoding\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'shape\'\" preview=\"preview\" encoding=\"spec.encoding\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'detail\'\" preview=\"preview\" encoding=\"spec.encoding\" mark=\"spec.mark\"></channel-shelf><channel-shelf channel-id=\"\'text\'\" preview=\"preview\" encoding=\"spec.encoding\" mark=\"spec.mark\"></channel-shelf></div><div class=\"shelf-pane shelf-any-pane full-width\" ng-if=\"supportAny && !preview\"><h3>Automatic</h3><channel-shelf ng-repeat=\"channelId in anyChannelIds\" preview=\"preview\" channel-id=\"channelId\" encoding=\"spec.encoding\" mark=\"spec.mark\"></channel-shelf></div></div>");
$templateCache.put("components/tabs/tab.html","<div ng-if=\"active\" ng-transclude=\"\"></div>");
$templateCache.put("components/tabs/tabset.html","<div class=\"tab-container\"><div><a class=\"tab\" ng-repeat=\"tab in tabset.tabs\" ng-class=\"{\'active\': tab.active}\" ng-click=\"tabset.showTab(tab)\">{{tab.heading}}</a></div><div class=\"tab-contents\" ng-transclude=\"\"></div></div>");
$templateCache.put("components/vlplot/vlplot.html","<div class=\"vl-plot\" id=\"vis-{{visId}}\" ng-class=\"{ fit: !alwaysScrollable && !overflow && height > vlPlotHeight() && width > vlPlotWidth(), \'overflow-y\': (alwaysScrollable || overflow) && height > vlPlotHeight(), \'overflow-x\': (alwaysScrollable || overflow) && width > vlPlotWidth(), scroll: alwaysScrollable || unlocked || hoverFocus }\" ng-mousedown=\"unlocked=!thumbnail\" ng-mouseup=\"unlocked=false\" ng-mouseenter=\"mouseenter()\" ng-mouseleave=\"mouseleave()\"></div>");
$templateCache.put("components/vlplotgroup/vlplotgroup.html","<div class=\"vl-plot-group vflex\" ng-dblclick=\"select(chart)\"><div ng-show=\"showExpand || fieldSet || showTranspose || showBookmark && Bookmarks.isSupported || showToggle\" class=\"vl-plot-group-header no-shrink\"><div class=\"field-set-info\" ng-mouseenter=\"enablePreview()\" ng-mouseleave=\"disablePreview()\"><field-info ng-repeat=\"fieldDef in fieldSet\" ng-if=\"fieldSet && (fieldDef.field || fieldDef.autoCount)\" field-def=\"fieldDef\" enum-spec-index=\"chart.enumSpecIndex\" show-type=\"true\" ng-class=\"{ selected: alwaysSelected || (isSelected && isSelected(fieldDef.field)), unselected: isSelected && !isSelected(fieldDef.field), highlighted: (highlighted||{})[fieldDef.field], \'enumerated-field\': isEnumeratedField(chart, $index), \'enumerated-channel\': isEnumeratedChannel(chart, $index) }\" ng-mouseenter=\"fieldInfoMouseover(fieldDef, $index)\" ng-mouseleave=\"fieldInfoMouseout(fieldDef, $index)\"></field-info></div><div style=\"flex-grow:1\"></div><div class=\"toolbox\"><a ng-if=\"consts.debug && showDebug\" class=\"command debug\"><i class=\"fa fa-wrench\" ng-click=\"shCopied=\'\'; vlCopied=\'\'; vgCopied=\'\';\"></i></a><vl-plot-group-popup ng-if=\"consts.debug && showDebug && renderPopup\"></vl-plot-group-popup><a ng-if=\"showLog && chart.vlSpec && log.support(chart.vlSpec, \'x\')\" class=\"command\" title=\"Toggle X-Scale\" ng-click=\"log.toggle(chart.vlSpec, \'x\')\" ng-class=\"{active: log.active(chart.vlSpec, \'x\')}\"><i class=\"fa fa-long-arrow-right\"></i> <small>Log X</small></a> <a ng-if=\"showLog && chart.vlSpec && log.support(chart.vlSpec, \'y\')\" class=\"command\" title=\"Toggle Y-Scale\" ng-click=\"log.toggle(chart.vlSpec, \'y\')\" ng-class=\"{active: log.active(chart.vlSpec, \'y\')}\"><i class=\"fa fa-long-arrow-up\"></i> <small>Log Y</small></a> <a ng-if=\"showSort && chart.vlSpec && toggleSort.support(chart.vlSpec)\" class=\"command\" ng-click=\"toggleSort.toggle(chart.vlSpec)\" title=\"Sort\"><i class=\"fa sort\" ng-class=\"toggleSortClass(chart.vlSpec)\"></i> <small ng-if=\"showLabel\">Sort</small></a> <a ng-if=\"showFilterNull && chart.vlSpec && toggleFilterNull.support(chart.vlSpec)\" class=\"command\" ng-click=\"toggleFilterNull(chart.vlSpec)\" title=\"Filter Null\" ng-class=\"{active: chart.vlSpec && (chart.vlSpec.transform||{}).filterInvalid}\"><i class=\"fa fa-filter\"></i> <small ng-if=\"showLabel\">Filter</small> <small>NULL</small></a> <a ng-if=\"showTranspose\" title=\"Swap X/Y\" class=\"command\" ng-click=\"transpose()\"><i class=\"fa fa-refresh transpose\"></i> <small ng-if=\"showLabel\">Swap X/Y</small></a> <a ng-if=\"showBookmark && Bookmarks.isSupported\" class=\"command\" title=\"Bookmark\" ng-click=\"toggleBookmark(chart)\" ng-class=\"{disabled: !chart.vlSpec.encoding, active: Bookmarks.isBookmarked(chart.shorthand)}\"><i class=\"fa fa-bookmark\"></i> <small ng-if=\"showLabel\">Bookmark</small></a> <a ng-if=\"showExpand\" ng-click=\"expandAction()\" class=\"command\"><i class=\"fa fa-expand\"></i></a> <a ng-if=\"showSelect\" title=\"Set encoding to this chart\" ng-click=\"select(chart)\" class=\"command select\"><i class=\"fa fa-server\"></i></a><div ng-if=\"showBookmarkAlert\" class=\"bookmark-alert\"><div>Remove bookmark?</div><small>Your notes will be lost.</small><div><a ng-click=\"removeBookmark(chart)\"><i class=\"fa fa-trash-o\"></i> remove it</a> <a ng-click=\"keepBookmark()\"><i class=\"fa fa-bookmark\"></i> keep it</a></div></div></div></div><vl-plot class=\"flex-grow-1\" chart=\"chart\" disabled=\"disabled\" is-in-list=\"isInList\" list-title=\"listTitle\" always-scrollable=\"alwaysScrollable\" config-set=\"{{configSet||\'small\'}}\" overflow=\"overflow\" priority=\"priority\" rescale=\"rescale\" thumbnail=\"thumbnail\" tooltip=\"tooltip\"></vl-plot><textarea class=\"annotation\" ng-if=\"Bookmarks.isBookmarked(chart.shorthand)\" ng-model=\"Bookmarks.dict[chart.shorthand].annotation\" ng-change=\"Bookmarks.saveAnnotations(chart.shorthand)\" placeholder=\"notes\"></textarea></div>");
$templateCache.put("components/vlplotgroup/vlplotgrouppopup.html","<div class=\"drop-container\"><div class=\"popup-menu popup-command no-shrink dev-tool\"><div class=\"command debug\"><span class=\"debug\">Vl</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"vlCopied=\'(Copied)\'\" zeroclip-model=\"chart.cleanSpec | compactJSON\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'Vega-Lite\', chart.cleanSpec); vlCopied=\'(Logged)\';\">Log</a> <span>{{vlCopied}}</span></div><div class=\"command debug\"><span class=\"debug\">Vg</span> <a class=\"debug\" ui-zeroclip=\"\" zeroclip-copied=\"vgCopied=\'(Copied)\'\" zeroclip-model=\"chart.vgSpec | compactJSON\">Copy</a> / <a class=\"debug\" ng-click=\"logCode(\'Vega\', chart.vgSpec); vgCopied=\'(Logged)\';\">Log</a> <span>{{vgCopied}}</span></div><a class=\"command debug\" ng-href=\"{{ {type:\'vl\', spec: chart.cleanSpec} | reportUrl }}\" target=\"_blank\">Report Bad Render</a> <a ng-click=\"showFeature=!showFeature\" class=\"command debug\">{{chart.score}}</a><div ng-repeat=\"f in chart.scoreFeatures track by f.reason\">[{{f.score}}] {{f.reason}}</div></div></div>");
$templateCache.put("components/vlplotgrouplist/vlplotgrouplist.html","<div class=\"vl-plot-group-list-container\"><div class=\"vis-list-header\" ng-show=\"listTitle && !hideListTitle\"><h3>{{listTitle}}</h3><span class=\"description\"></span></div><div class=\"vis-list hflex flex-wrap\"><vl-plot-group ng-repeat=\"chart in charts | limitTo: limit\" class=\"wrapped-vl-plot-group card\" chart=\"chart\" is-in-list=\"isInList\" list-title=\"listTitle\" enable-pills-preview=\"enablePillsPreview\" field-set=\"chart.fieldSet\" show-bookmark=\"true\" show-debug=\"consts.debug && consts.debugInList\" show-select=\"true\" show-filter-null=\"true\" show-log=\"true\" show-sort=\"true\" overflow=\"true\" tooltip=\"true\" highlighted=\"Pills.highlighted\" priority=\"priority + $index\"></vl-plot-group></div><a ng-click=\"increaseLimit()\"><div class=\"vis-list-more\" ng-show=\"limit < charts.length\">Load more...</div></a></div>");}]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:addMyriaDataset
 * @description
 * # addMyriaDataset
 */
angular.module('vlui')
  .directive('addMyriaDataset', ['$http', 'Dataset', 'consts', function ($http, Dataset, consts) {
    return {
      templateUrl: 'dataset/addmyriadataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // Initialize scope variables
        scope.myriaRestUrl = consts.myriaRest;
        scope.myriaDatasets = [];
        scope.myriaDataset = null;

        scope.loadDatasets = function(query) {
          return $http.get(scope.myriaRestUrl + '/dataset/search/?q=' + query)
            .then(function(response) {
              scope.myriaDatasets = response.data;
            });
        };

        // Load the available datasets from Myria
        scope.loadDatasets('');

        scope.optionName = function(dataset) {
          return dataset.userName + ':' + dataset.programName + ':' + dataset.relationName;
        };

        scope.addDataset = function(myriaDataset) {
          var dataset = {
            group: 'myria',
            name: myriaDataset.relationName,
            url: scope.myriaRestUrl + '/dataset/user-' + myriaDataset.userName +
              '/program-' + myriaDataset.programName +
              '/relation-' + myriaDataset.relationName + '/data?format=json'
          };

          Dataset.type = 'json';
          Dataset.dataset = Dataset.add(dataset);
          Dataset.update(Dataset.dataset);

          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:addUrlDataset
 * @description
 * # addUrlDataset
 */
angular.module('vlui')
  .directive('addUrlDataset', ['Dataset', 'Logger', function (Dataset, Logger) {
    return {
      templateUrl: 'dataset/addurldataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // the dataset to add
        scope.addedDataset = {
          group: 'user'
        };

        scope.addFromUrl = function(dataset) {
          Logger.logInteraction(Logger.actions.DATASET_NEW_URL, dataset.url);

          // Register the new dataset
          Dataset.dataset = Dataset.add(dataset);

          // Fetch & activate the newly-registered dataset
          Dataset.update(Dataset.dataset);

          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name vega-lite-ui.filter:inGroup
 * @function
 * @description
 * # inGroup
 * Get datasets in a particular group
 * @param  {String} datasetGroup One of "sample," "user", or "myria"
 * @return {Array} An array of datasets in the specified group
 */
angular.module('vlui')
  .filter('inGroup', ['_', function(_) {
    return function(arr, datasetGroup) {
      return _.filter(arr, {
        group: datasetGroup
      });
    };
  }]);

/**
 * @ngdoc directive
 * @name vlui.directive:changeLoadedDataset
 * @description
 * # changeLoadedDataset
 */
angular.module('vlui')
  .directive('changeLoadedDataset', ['Dataset', '_', function (Dataset, _) {
    return {
      templateUrl: 'dataset/changeloadeddataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // Expose dataset object itself so current dataset can be marked
        scope.Dataset = Dataset;

        scope.userData = _.filter(Dataset.datasets, function(dataset) {
          return dataset.group !== 'sample';
        });

        scope.sampleData = _.filter(Dataset.datasets, {
          group: 'sample'
        });

        var datasetWatcher = scope.$watch(function() {
          return Dataset.datasets.length;
        }, function() {
          scope.userData = _.filter(Dataset.datasets, function(dataset) {
            return dataset.group !== 'sample';
          });
        });

        scope.selectDataset = function(dataset) {
          // Activate the selected dataset
          Dataset.update(dataset);
          closeModal();
        };

        scope.$on('$destroy', function() {
          // Clean up watchers
          datasetWatcher();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .factory('Dataset', ['$http', '$q', 'Alerts', '_', 'util', 'vl', 'cql', 'SampleData', 'Config', 'Logger', function($http, $q, Alerts, _, util, vl, cql, SampleData, Config, Logger) {
    var Dataset = {};

    // Start with the list of sample datasets
    var datasets = SampleData;

    Dataset.datasets = datasets;
    Dataset.dataset = datasets[1];
    Dataset.currentDataset = undefined;  // dataset before update
    Dataset.dataschema = [];
    Dataset.stats = {};
    Dataset.type = undefined;

    var typeOrder = {
      nominal: 0,
      ordinal: 0,
      geographic: 2,
      temporal: 3,
      quantitative: 4
    };

    Dataset.fieldOrderBy = {};

    Dataset.fieldOrderBy.type = function(fieldDef) {
      if (fieldDef.aggregate==='count') return 4;
      return typeOrder[fieldDef.type];
    };

    Dataset.fieldOrderBy.typeThenName = function(fieldDef) {
      return Dataset.fieldOrderBy.type(fieldDef) + '_' +
        (fieldDef.aggregate === 'count' ? '~' : fieldDef.field.toLowerCase());
        // ~ is the last character in ASCII
    };

    Dataset.fieldOrderBy.original = function() {
      return 0; // no swap will occur
    };

    Dataset.fieldOrderBy.field = function(fieldDef) {
      return fieldDef.field;
    };

    Dataset.fieldOrder = Dataset.fieldOrderBy.typeThenName;

    // update the schema and stats
    Dataset.onUpdate = [];

    Dataset.update = function(dataset) {
      var updatePromise;

      Logger.logInteraction(Logger.actions.DATASET_CHANGE, dataset.name);

      if (dataset.values) {
        updatePromise = $q(function(resolve, reject) {
          // jshint unused:false
          Dataset.type = undefined;
          updateFromData(dataset, dataset.values);
          resolve();
        });
      } else {
        updatePromise = $http.get(dataset.url, {cache: true}).then(function(response) {
          var data;

          // first see whether the data is JSON, otherwise try to parse CSV
          if (_.isObject(response.data)) {
             data = response.data;
             Dataset.type = 'json';
          } else {
            data = util.read(response.data, {type: 'csv'});
            Dataset.type = 'csv';
          }

          updateFromData(dataset, data);
        });
      }

      Dataset.onUpdate.forEach(function(listener) {
        updatePromise = updatePromise.then(listener);
      });

      // Copy the dataset into the config service once it is ready
      updatePromise.then(function() {
        Config.updateDataset(dataset, Dataset.type);
      });

      return updatePromise;
    };

    function getFieldDefs(schema, order) {
      var fieldDefs = schema.fields().map(function(field) {
        return {
          field: field,
          type: schema.type(field),
          primitiveType: schema.primitiveType(field)
        };
      });

      fieldDefs = util.stablesort(fieldDefs, order || Dataset.fieldOrderBy.typeThenName, Dataset.fieldOrderBy.field);

      fieldDefs.push({ field: '*', aggregate: vl.aggregate.AggregateOp.COUNT, type: vl.type.QUANTITATIVE});
      return fieldDefs;
    }


    function updateFromData(dataset, data) {
      Dataset.data = data;
      Dataset.currentDataset = dataset;

      Dataset.schema = cql.schema.Schema.build(data);
      // TODO: find all reference of Dataset.stats.sample and replace

      // TODO: find all reference of Dataset.dataschema and replace
      Dataset.dataschema = getFieldDefs(Dataset.schema);
    }

    Dataset.add = function(dataset) {
      if (!dataset.id) {
        dataset.id = dataset.url;
      }
      datasets.push(dataset);

      return dataset;
    };

    return Dataset;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:datasetModal
 * @description
 * # datasetModal
 */
angular.module('vlui')
  .directive('datasetModal', function () {
    return {
      templateUrl: 'dataset/datasetmodal.html',
      restrict: 'E',
      scope: false
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('datasetSelector', ['Modals', 'Logger', function(Modals, Logger) {
    return {
      templateUrl: 'dataset/datasetselector.html',
      restrict: 'E',
      replace: true,
      scope: {},
      link: function postLink(scope/*, element, attrs*/) {
        scope.loadDataset = function() {
          Logger.logInteraction(Logger.actions.DATASET_OPEN);
          Modals.open('dataset-modal');
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fileDropzone
 * @description
 * # fileDropzone
 */
angular.module('vlui')
  // Add the file reader as a named dependency
  .constant('FileReader', window.FileReader)
  .directive('fileDropzone', ['Modals', 'Alerts', 'FileReader', function (Modals, Alerts, FileReader) {

    // Helper methods

    function isSizeValid(size, maxSize) {
      // Size is provided in bytes; maxSize is provided in megabytes
      // Coerce maxSize to a number in case it comes in as a string,
      // & return true when max file size was not specified, is empty,
      // or is sufficiently large
      return !maxSize || ( size / 1024 / 1024 < +maxSize );
    }

    function isTypeValid(type, validMimeTypes) {
        // If no mime type restrictions were provided, or the provided file's
        // type is whitelisted, type is valid
      return !validMimeTypes || ( validMimeTypes.indexOf(type) > -1 );
    }

    return {
      templateUrl: 'dataset/filedropzone.html',
      replace: true,
      restrict: 'E',
      // Permit arbitrary child content
      transclude: true,
      scope: {
        maxFileSize: '@',
        validMimeTypes: '@',
        // Expose this directive's dataset property to parent scopes through
        // two-way databinding
        dataset: '='
      },
      link: function (scope, element/*, attrs*/) {
        scope.dataset = scope.dataset || {};

        element.on('dragover dragenter', function onDragEnter(event) {
          if (event) {
            event.preventDefault();
          }
          event.originalEvent.dataTransfer.effectAllowed = 'copy';
        });

        function readFile(file) {
          if (!isTypeValid(file.type, scope.validMimeTypes)) {
            scope.$apply(function() {
              Alerts.add('Invalid file type. File must be one of following types: ' + scope.validMimeTypes);
            });
            return;
          }
          if (!isSizeValid(file.size, scope.maxFileSize)) {
            scope.$apply(function() {
              Alerts.add('File must be smaller than ' + scope.maxFileSize + ' MB');
            });
            return;
          }
          var reader = new FileReader();

          reader.onload = function(evt) {
            return scope.$apply(function(scope) {
              scope.dataset.data = evt.target.result;
              // Strip file name extensions from the uploaded data
              scope.dataset.name = file.name.replace(/\.\w+$/, '');
            });
          };

          reader.onerror = function() {
            Alerts.add('Error reading file');
          };

          reader.readAsText(file);
        }

        element.on('drop', function onDrop(event) {
          if (event) {
            event.preventDefault();
          }

          readFile(event.originalEvent.dataTransfer.files[0]);
        });

        element.find('input[type="file"]').on('change', function onUpload(/*event*/) {
          // "this" is the input element
          readFile(this.files[0]);
        });
      }

    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:pasteDataset
 * @description
 * # pasteDataset
 */
angular.module('vlui')
  .directive('pasteDataset', ['Dataset', 'Logger', 'Config', '_', 'vg', function (Dataset, Logger, Config, _, vg) {
    return {
      templateUrl: 'dataset/pastedataset.html',
      restrict: 'E',
      require: '?^^modal',
      replace: true,
      scope: true,
      link: function postLink(scope, element, attrs, modalController) {
        // If this directive occurs within a a modal, give ourselves a way to close
        // that modal once the add button has been clicked
        function closeModal() {
          if (modalController) {
            modalController.close();
          }
        }

        // Initialize scope variables
        scope.dataset = {
          name: '',
          data: ''
        };

        scope.addDataset = function() {
          var data = vg.util.read(scope.dataset.data, {
            type: 'csv'
          });

          var pastedDataset = {
            id: Date.now(),  // time as id
            name: scope.dataset.name,
            values: data,
            group: 'pasted'
          };

          // Log that we have pasted data
          Logger.logInteraction(Logger.actions.DATASET_NEW_PASTE, pastedDataset.name);

          // Register the pasted data as a new dataset
          Dataset.dataset = Dataset.add(pastedDataset);

          // Activate the newly-registered dataset
          Dataset.update(Dataset.dataset);

          // Close this directive's containing modal
          closeModal();
        };
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui').constant('SampleData', [{
  name: 'Barley',
  description: 'Barley yield by variety across the upper midwest in 1931 and 1932',
  url: 'data/barley.json',
  id: 'barley',
  group: 'sample'
},{
  name: 'Cars',
  description: 'Automotive statistics for a variety of car models between 1970 & 1982',
  url: 'data/cars.json',
  id: 'cars',
  group: 'sample'
},{
  name: 'Crimea',
  url: 'data/crimea.json',
  id: 'crimea',
  group: 'sample'
},{
  name: 'Driving',
  url: 'data/driving.json',
  id: 'driving',
  group: 'sample'
},{
  name: 'Iris',
  url: 'data/iris.json',
  id: 'iris',
  group: 'sample'
},{
  name: 'Jobs',
  url: 'data/jobs.json',
  id: 'jobs',
  group: 'sample'
},{
  name: 'Population',
  url: 'data/population.json',
  id: 'population',
  group: 'sample'
},{
  name: 'Movies',
  url: 'data/movies.json',
  id: 'movies',
  group: 'sample'
},{
  name: 'Birdstrikes',
  url: 'data/birdstrikes.json',
  id: 'birdstrikes',
  group: 'sample'
},{
  name: 'Burtin',
  url: 'data/burtin.json',
  id: 'burtin',
  group: 'sample'
},{
  name: 'Campaigns',
  url: 'data/weball26.json',
  id: 'weball26',
  group: 'sample'
}]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('alertMessages', ['Alerts', function(Alerts) {
    return {
      templateUrl: 'components/alertmessages/alertmessages.html',
      restrict: 'E',
      scope: {},
      link: function(scope /*, element, attrs*/) {
        scope.Alerts = Alerts;
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:bookmarkList
 * @description
 * # bookmarkList
 */
angular.module('vlui')
  .directive('bookmarkList', ['Bookmarks', 'consts', function (Bookmarks, consts) {
    return {
      templateUrl: 'components/bookmarklist/bookmarklist.html',
      restrict: 'E',
      replace: true,
      scope: {
        highlighted: '=', // This one is really two-way binding.
        postSelectAction: '='
      },
      link: function postLink(scope /*, element, attrs*/) {
        scope.Bookmarks = Bookmarks;
        scope.consts = consts;
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('channelShelf', ['ANY', 'Dataset', 'Pills', '_', 'Drop', 'Logger', 'vl', 'cql', 'Schema', function(ANY, Dataset, Pills, _, Drop, Logger, vl, cql, Schema) {
    return {
      templateUrl: 'components/channelshelf/channelshelf.html',
      restrict: 'E',
      replace: true,
      scope: {
        channelId: '<',
        encoding: '=',
        mark: '<',
        preview: '<',
        disabled: '<'
      },
      link: function(scope, element /*, attrs*/) {
        scope.Dataset = Dataset;
        scope.schema = Schema.getChannelSchema(scope.channelId);
        scope.pills = Pills.pills;

        scope.isHighlighted = function (channelId) {
          var highlighted = Pills.highlighted || {};
          return highlighted[scope.encoding[channelId].field] ||
            highlighted['f' + channelId];
        };

        // These will get updated in the watcher
        scope.isAnyChannel = false;
        scope.isAnyField = false;

        scope.supportMark = function(channelId, mark) {
          if (Pills.isAnyChannel(channelId)) {
            return true;
          }
          if (mark === ANY) { // TODO: support {enum: [...]}
            return true;
          }
          return vl.channel.supportMark(channelId, mark);
        };

        var propsPopup = new Drop({
          content: element.find('.shelf-properties')[0],
          target: element.find('.shelf-label')[0],
          position: 'bottom left',
          openOn: 'click'
        });

        scope.fieldInfoPopupContent =  element.find('.shelf-functions')[0];

        scope.removeField = function() {
          Pills.remove(scope.channelId);
        };

        scope.fieldDragStart = function() {
          Pills.dragStart(Pills.get(scope.channelId), scope.channelId);
        };

        scope.fieldDragStop = function() {
          Pills.dragStop();
        };

        /**
         * Event handler for dropping pill.
         */
        scope.fieldDropped = function() {
          var pill = Pills.get(scope.channelId);

          // validate type
          var types = Schema.schema.definitions.Type.enum;
          if (!_.includes(types, pill.type) && !cql.enumSpec.isEnumSpec(pill.type)) {
            // if existing type is not supported
            pill.type = types[0];
          }

          // TODO validate timeUnit / aggregate

          Pills.dragDrop(scope.channelId);
          Logger.logInteraction(Logger.actions.FIELD_DROP, pill);
        };

        var channelIdWatcher = scope.$watch('channelId', function(channelId) {
          scope.isAnyChannel = Pills.isAnyChannel(channelId);
        }, true);

        // FIXME: remove this confusing 2-way binding logics
        // If some external action changes the fieldDef, we also need to update the pill
        var channelEncodingWatcher = scope.$watch('encoding[channelId]', function(fieldDef) {
          // Preview shelf should not cause side effect
          if (scope.preview) {
            scope.isEnumeratedField = Pills.isEnumeratedField(scope.channelId);
            scope.isEnumeratedChannel = Pills.isEnumeratedChannel(scope.channelId);
          } else {
            Pills.set(scope.channelId, fieldDef ? _.cloneDeep(fieldDef) : {});
            scope.isAnyField = cql.enumSpec.isEnumSpec(fieldDef.field);
          }
        }, true);


        scope.$on('$destroy', function() {
          if (propsPopup && propsPopup.destroy) {
            propsPopup.destroy();
          }

          // Clean up watchers
          channelIdWatcher();
          channelEncodingWatcher();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:fieldInfo
 * @description
 * # fieldInfo
 */
angular.module('vlui')
  .directive('fieldInfo', ['ANY', 'Drop', 'vl', 'cql', function (ANY, Drop, vl, cql) {
    return {
      templateUrl: 'components/fieldinfo/fieldinfo.html',
      restrict: 'E',
      replace: true,
      scope: {
        fieldDef: '<',
        showAdd: '<',
        showCaret: '<',
        showRemove: '<',
        showType: '<',
        popupContent: '<',

        action: '&',
        addAction: '&',
        removeAction: '&',
        disableCaret: '<'
      },
      link: function(scope, element) {
        var funcsPopup;
        scope.vlType = vl.type;
        scope.isEnumSpec = cql.enumSpec.isEnumSpec;

        // Properties that are created by a watcher later
        scope.typeName = null;
        scope.icon = null;
        scope.null = null;

        scope.clicked = function($event){
          if(scope.action && $event.target !== element.find('.fa-caret-down')[0] &&
            $event.target !== element.find('span.type')[0]) {
            scope.action($event);
          }
        };

        scope.func = function(fieldDef) {
          return fieldDef.aggregate || fieldDef.timeUnit ||
            (fieldDef.bin && 'bin') ||
            fieldDef._aggregate || fieldDef._timeUnit ||
            (fieldDef._bin && 'bin') || (fieldDef._any && 'auto');
        };

        var popupContentWatcher = scope.$watch('popupContent', function(popupContent) {
          if (!popupContent) { return; }

          if (funcsPopup) {
            funcsPopup.destroy();
          }

          funcsPopup = new Drop({
            content: popupContent,
            target: element.find('.type-caret')[0],
            position: 'bottom left',
            openOn: 'click'
          });
        });

        var TYPE_NAMES = {
          nominal: 'text',
          ordinal: 'text-ordinal',
          quantitative: 'number',
          temporal: 'time',
          geographic: 'geo'
        };

        var TYPE_ICONS = {
          nominal: 'fa-font',
          ordinal: 'fa-font',
          quantitative: 'icon-hash',
          temporal: 'fa-calendar',
        };
        TYPE_ICONS[ANY] = 'fa-asterisk'; // separate line because we might change what's the string for ANY

        function getTypeDictValue(type, dict) {
          if (cql.enumSpec.isEnumSpec(type)) { // is enumSpec
            var val = null;
            for (var i = 0; i < type.enum.length; i++) {
              var _type = type.enum[i];
              if (val === null) {
                val = dict[_type];
              } else {
                if (val !== dict[_type]) {
                  return ANY; // If there are many conflicting types
                }
              }
            }
            return val;
          }
          return dict[type];
        }

        var fieldDefWatcher = scope.$watch('fieldDef.type', function(type) {
          scope.icon = getTypeDictValue(type, TYPE_ICONS);
          scope.typeName = getTypeDictValue(type, TYPE_NAMES);
        });

        scope.$on('$destroy', function() {
          if (funcsPopup && funcsPopup.destroy) {
            funcsPopup.destroy();
          }

          // unregister watchers
          popupContentWatcher();
          fieldDefWatcher();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('functionSelect', ['_', 'consts', 'vl', 'Pills', 'Logger', 'Dataset', function(_, consts, vl, Pills, Logger, Dataset) {
    return {
      templateUrl: 'components/functionselect/functionselect.html',
      restrict: 'E',
      scope: {
        channelId: '<',
        fieldDef: '='
      },
      link: function(scope /*,element, attrs*/) {
        var BIN='bin', COUNT='count', maxbins;

        scope.func = {
          selected: undefined,
          list: {
            aboveFold: [],
            belowFold: [] // could be empty
          },
          isTemporal: false, // for making belowFold timeUnits single-column
          isCount: false // hide "more" & "less" toggle for COUNT
        };

        // functions for T = timeUnits + undefined
        var temporalFunctions = {
          aboveFold: [
            undefined, 'year',
            'quarter', 'month',
            'date','day',
            'hours', 'minutes',
            'seconds', 'milliseconds',
            'yearmonthdate'
          ],
          belowFold: [
            'yearquarter',
            'yearmonth',
            'yearmonthdatehours',
            'yearmonthdatehoursminutes',
            'yearmonthdatehoursminutesseconds',
            'hoursminutes',
            'hoursminutesseconds',
            'minutesseconds',
            'secondsmilliseconds'
          ]
        };

        var cardinalityFilter = function(timeUnit) {

          var pill =  Pills.get(scope.channelId);
          if (!pill) {
            return true;
          }
          var field = pill.field;
          // Convert 'any' channel to '?'.
          var channel = Pills.isAnyChannel(scope.channelId) ? '?' : scope.channelId;
          return !timeUnit || // Don't filter undefined.
            // Remove timeUnits that do not have variation (cardinality <= 1).
            Dataset.schema.timeUnitHasVariation({field: field, channel: channel, timeUnit: timeUnit});
        };

        // timeUnits = T functions - undefined
        var timeUnits = _.pull(_.concat(temporalFunctions.aboveFold, temporalFunctions.belowFold), undefined);

        // functions for Q = aggregates + BIN + undefined - COUNT
        var quantitativeFunctions = {
          aboveFold: [
            undefined, 'bin',
            'min', 'max',
            'mean', 'median',
            'sum'
          ],
          belowFold: [
            'valid', 'missing',
            'distinct', 'modeskew',
            'q1', 'q3',
            'stdev', 'stdevp',
            'variance', 'variancep'
          ] // hide COUNT for Q in the UI because we dedicate it to a special "# Count" field
        };

        // aggregates = Q Functions + COUNT - BIN - undefined
        var aggregates = _.pull(_.concat(quantitativeFunctions.aboveFold, quantitativeFunctions.belowFold, [COUNT]),
          BIN, undefined);

        scope.selectChanged = function() {
          Logger.logInteraction(Logger.actions.FUNC_CHANGE, scope.func.selected);

          var selectedFunc = scope.func.selected;

          var oldPill = Pills.get(scope.channelId),
            pill = _.clone(oldPill),
            type = pill ? pill.type : '',
            isQ = type === vl.type.QUANTITATIVE,
            isT = type === vl.type.TEMPORAL;

          if(!pill){
            return; // not ready
          }

          // reset field def
          // HACK: we're temporarily storing the maxbins in the pill
          pill.bin = selectedFunc === BIN ? {} : undefined;
          pill.aggregate = (isQ && aggregates.indexOf(selectedFunc) !== -1) ? selectedFunc : undefined;
          pill.timeUnit = (isT && timeUnits.indexOf(selectedFunc) !== -1) ? selectedFunc : undefined;

          if(!_.isEqual(oldPill, pill)){
            Pills.set(scope.channelId, pill, true /* propagate change */);
          }
        };

        // when parent objects modify the field
        var fieldDefWatcher = scope.$watch('fieldDef', function(pill) {
          if (!pill) {
            return;
          }

          var type = pill.field ? pill.type : '';

          // hack: save the maxbins
          if (pill.bin) {
            maxbins = pill.bin.maxbins;
          }

          var isOrdinalShelf = ['row','column','shape'].indexOf(scope.channelId) !== -1,
            isQ = type === vl.type.QUANTITATIVE,
            isT = type === vl.type.TEMPORAL;

          // for making belowFold timeUnits single-column
          scope.func.isTemporal = isT;

          // hide "more" & "less" toggles for COUNT
          scope.func.isCount = pill.field === '*';

          if(pill.field === '*' && pill.aggregate === COUNT){
            scope.func.list.aboveFold=[COUNT];
            scope.func.list.belowFold=[];
            scope.func.selected = COUNT;
          } else {
            // TODO: check supported type based on primitive data?
            if (isT) {
              scope.func.list.aboveFold = temporalFunctions.aboveFold.filter(cardinalityFilter);
              scope.func.list.belowFold = temporalFunctions.belowFold.filter(cardinalityFilter);
            }
            else if (isQ) {
              scope.func.list.aboveFold = quantitativeFunctions.aboveFold;
              scope.func.list.belowFold = quantitativeFunctions.belowFold;
            }

            var defaultVal = (isOrdinalShelf &&
              (isQ && BIN) || (isT && consts.defaultTimeFn)
            ) || undefined;

            var selected = pill.bin ? 'bin' :
              pill.aggregate || pill.timeUnit;

            if (scope.func.list.aboveFold.indexOf(selected) >= 0 || scope.func.list.belowFold.indexOf(selected) >= 0) {
              scope.func.selected = selected;
            } else {
              scope.func.selected = defaultVal;
            }
          }
        }, true);

        scope.$on('$destroy', function() {
          // Clean up watcher(s)
          fieldDefWatcher();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:modal
 * @description
 * # modal
 */
angular.module('vlui')
  .directive('modal', ['$document', 'Modals', function ($document, Modals) {
    return {
      templateUrl: 'components/modal/modal.html',
      restrict: 'E',
      transclude: true,
      scope: {
        autoOpen: '<',
        maxWidth: '@'
      },
      // Provide an interface for child directives to close this modal
      controller: ['$scope', function($scope) {
        this.close = function() {
          $scope.isOpen = false;
        };
      }],
      link: function(scope, element, attrs) {
        var modalId = attrs.id;

        if (scope.maxWidth) {
          scope.wrapperStyle = 'max-width:' + scope.maxWidth;
        }

        // Default to closed unless autoOpen is set
        scope.isOpen = scope.autoOpen;

        // close on esc
        function escape(e) {
          if (e.keyCode === 27 && scope.isOpen) {
            scope.isOpen = false;
            scope.$digest();
          }
        }

        angular.element($document).on('keydown', escape);

        // Register this modal with the service
        Modals.register(modalId, scope);
        scope.$on('$destroy', function() {
          Modals.deregister(modalId);
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:modalCloseButton
 * @description
 * # modalCloseButton
 */
angular.module('vlui')
  .directive('modalCloseButton', function() {
    return {
      templateUrl: 'components/modal/modalclosebutton.html',
      restrict: 'E',
      require: '^^modal',
      scope: {
        closeAction: '&'
      },
      link: function(scope, element, attrs, modalController) {
        scope.closeModal = function() {
          modalController.close();
          if (scope.closeAction) {
            scope.closeAction();
          }
        };
      }
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc service
 * @name vlui.Modals
 * @description
 * # Modals
 * Service used to control modal visibility from anywhere in the application
 */
angular.module('vlui')
  .factory('Modals', ['$cacheFactory', function ($cacheFactory) {

    // TODO: The use of scope here as the method by which a modal directive
    // is registered and controlled may need to change to support retrieving
    // data from a modal as may be needed in #77
    var modalsCache = $cacheFactory('modals');

    // Public API
    return {
      register: function(id, scope) {
        if (modalsCache.get(id)) {
          console.error('Cannot register two modals with id ' + id);
          return;
        }
        modalsCache.put(id, scope);
      },

      deregister: function(id) {
        modalsCache.remove(id);
      },

      // Open a modal
      open: function(id) {
        var modalScope = modalsCache.get(id);
        if (!modalScope) {
          console.error('Unregistered modal id ' + id);
          return;
        }
        modalScope.isOpen = true;
      },

      // Close a modal
      close: function(id) {
        var modalScope = modalsCache.get(id);
        if (!modalScope) {
          console.error('Unregistered modal id ' + id);
          return;
        }
        modalScope.isOpen = false;
      },

      empty: function() {
        modalsCache.removeAll();
      },

      count: function() {
        return modalsCache.info().size;
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vega-lite-ui.directive:propertyEditor
 * @description
 * # propertyEditor
 */
angular.module('vlui')
  .directive('propertyEditor', function () {
    return {
      templateUrl: 'components/propertyeditor/propertyeditor.html',
      restrict: 'E',
      scope: {
        id: '=',
        type: '=',
        enum: '=',
        propName: '=',
        group: '=',
        description: '=',
        default: '=',
        min: '=',
        max: '=',
        role: '=' // for example 'color'
      },
      link: function postLink(scope /*, element, attrs*/) {
        scope.hasAuto = scope.default === undefined;

        //TODO(kanitw): consider renaming
        scope.automodel = { value: false };

        if (scope.hasAuto) {
          scope.automodel.value = scope.group[scope.propName] === undefined;

          // change the value to undefined if auto is true
          var autoModelWatcher = scope.$watch('automodel.value', function() {
            if (scope.automodel.value === true) {
              scope.group[scope.propName] = undefined;
            }
          });

          scope.$on('$destroy', function() {
            // Clean up watcher
            autoModelWatcher();
          });

        }

        scope.isRange = scope.max !== undefined && scope.min !== undefined;
      }
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('schemaList', function() {
    return {
      templateUrl: 'components/schemalist/schemalist.html',
      restrict: 'E',
      scope: {
        orderBy: '<',
        fieldDefs: '<',
        showAdd: '<'
      },
      replace: true
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name polestar.directive:schemaListItem
 * @description
 * # schemaListItem
 */
angular.module('vlui')
  .directive('schemaListItem', ['Dataset', 'Drop', 'Pills', 'cql', 'vl', function (Dataset, Drop, Pills, cql, vl) {
    return {
      templateUrl: 'components/schemalist/schemalistitem.html',
      restrict: 'E',
      replace: false,
      scope: {
        fieldDef: '=', // Two-way
        showAdd:  '<',
      },
      link: function postLink(scope, element) {
        scope.isAnyField = false;

        scope.fieldInfoPopupContent =  element.find('.schema-menu')[0];

        scope.isEnumSpec = cql.enumSpec.isEnumSpec;

        scope.fieldAdd = function(fieldDef) {
          Pills.add(fieldDef);
        };

        scope.fieldDragStart = function() {
          var fieldDef = scope.fieldDef;

          scope.pill = {
            field: fieldDef.field,
            title: fieldDef.title,
            type: fieldDef.type,
            aggregate: fieldDef.aggregate
          };
          Pills.dragStart(scope.pill, null);
        };

        scope.fieldDragStop = Pills.dragStop;

        // TODO(https://github.com/vega/vega-lite-ui/issues/187):
        // consider if we can use validator / cql instead
        var allowedCasting = {
          quantitative: [vl.type.QUANTITATIVE, vl.type.ORDINAL, vl.type.NOMINAL],
          ordinal: [vl.type.ORDINAL, vl.type.NOMINAL],
          nominal: [vl.type.NOMINAL, vl.type.ORDINAL],
          temporal: [vl.type.TEMPORAL, vl.type.ORDINAL, vl.type.NOMINAL],
          all: [vl.type.QUANTITATIVE, vl.type.TEMPORAL, vl.type.ORDINAL, vl.type.NOMINAL]
        };

        var unwatchFieldDef = scope.$watch('fieldDef', function(fieldDef){
          if (cql.enumSpec.isEnumSpec(fieldDef.field)) {
            scope.allowedTypes = allowedCasting.all;
          } else {
            scope.allowedTypes = allowedCasting[Dataset.schema.type(fieldDef.field)];
          }

          scope.isAnyField = cql.enumSpec.isEnumSpec(fieldDef.field);
        });

        scope.$on('$destroy', function() {
          scope.fieldAdd = null;
          scope.fieldDragStop = null;
          scope.isEnumSpec = null;

          unwatchFieldDef();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('shelves', function() {

    return {
      templateUrl: 'components/shelves/shelves.html',
      restrict: 'E',
      scope: {
        spec: '=',
        preview: '<',
        supportAny: '<'
      },
      replace: true,
      controller: ['$scope', 'ANY', 'util', 'vl', 'Config', 'Dataset', 'Logger', 'Pills', function($scope, ANY, util, vl, Config, Dataset, Logger, Pills) {
        $scope.ANY = ANY;
        $scope.anyChannelIds = [];

        $scope.marks = ['point', 'tick', 'bar', 'line', 'area', 'text'];
        $scope.marksWithAny = [ANY].concat($scope.marks);

        $scope.markChange = function() {
          Logger.logInteraction(Logger.actions.MARK_CHANGE, $scope.spec.mark);
        };

        $scope.transpose = function(){
          vl.spec.transpose($scope.spec);
        };

        $scope.clear = function(){
          Logger.logInteraction(Logger.actions.SPEC_CLEAN, $scope.spec);
          Pills.reset();
        };

        var specWatcher = $scope.$watch('spec', function(spec) {
          // populate anyChannelIds so we show all or them
          if ($scope.supportAny) {
            $scope.anyChannelIds = util.keys(spec.encoding).reduce(function(anyChannelIds, channelId) {
              if (Pills.isAnyChannel(channelId)) {
                anyChannelIds.push(channelId);
              }
              return anyChannelIds;
            }, []);
          }
          // Only call Pills.update, which will trigger Spec.spec to update if it's not a preview.
          if (!$scope.preview) {
            Logger.logInteraction(Logger.actions.SPEC_CHANGE, spec);
            Pills.update(spec);
          }
        }, true); //, true /* watch equality rather than reference */);


        $scope.$on('$destroy', function() {
          // Clean up watcher
          specWatcher();
        });
      }]
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:tab
 * @description
 * # tab
 */
angular.module('vlui')
  .directive('tab', function() {
    return {
      templateUrl: 'components/tabs/tab.html',
      restrict: 'E',
      require: '^^tabset',
      replace: true,
      transclude: true,
      scope: {
        heading: '@'
      },
      link: function(scope, element, attrs, tabsetController) {
        tabsetController.addTab(scope);
      }
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vlui.directive:tabset
 * @description
 * # tabset
 */
angular.module('vlui')
  .directive('tabset', function() {
    return {
      templateUrl: 'components/tabs/tabset.html',
      restrict: 'E',
      transclude: true,

      // Interface for tabs to register themselves
      controller: function() {
        var self = this;

        this.tabs = [];

        this.addTab = function(tabScope) {
          // First tab is always auto-activated; others auto-deactivated
          tabScope.active = self.tabs.length === 0;
          self.tabs.push(tabScope);
        };

        this.showTab = function(selectedTab) {
          self.tabs.forEach(function(tab) {
            // Activate the selected tab, deactivate all others
            tab.active = tab === selectedTab;
          });
        };
      },

      // Expose controller to templates as "tabset"
      controllerAs: 'tabset'
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('vlPlot', ['vl', 'vg', 'cql', '$timeout', '$q', 'Dataset', 'Config', 'consts', '_', '$document', 'Logger', 'Heap', '$window', function(vl, vg, cql, $timeout, $q, Dataset, Config, consts, _, $document, Logger, Heap, $window) {
    var counter = 0;
    var MAX_CANVAS_SIZE = 32767/2, MAX_CANVAS_AREA = 268435456/4;

    var renderQueue = new Heap(function(a, b){
        return a.priority - b.priority;
      }),
      rendering = false;

    function getRenderer(width, height) {
      // use canvas by default but use svg if the visualization is too big
      if (width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE || width*height > MAX_CANVAS_AREA) {
        return 'svg';
      }
      return 'canvas';
    }

    return {
      templateUrl: 'components/vlplot/vlplot.html',
      restrict: 'E',
      scope: {
        chart: '=',

        //optional
        disabled: '<',
        /** A function that returns if the plot is still in the view, so it might be omitted from the render queue if necessary. */
        isInList: '<',
        listTitle: '<',

        alwaysScrollable: '<',
        configSet: '@',
        overflow: '<',
        priority: '<',
        rescale: '<',
        thumbnail: '<',
        tooltip: '<'
      },
      replace: true,
      link: function(scope, element) {
        var HOVER_TIMEOUT = 500;
        var view;
        var tooltip;
        var TOOLTIP_DELAY = 200;

        scope.vlPlotHeight = function() {
          return element.height();
        };

        scope.vlPlotWidth = function() {
          return element.width();
        };

        function destroyView() {
          if (view) {
            tooltip.destroy(); // destroy tooltip (promise and event listners)
            view.off('mouseover');
            view.off('mouseout');
            view.destroy();
            view = null;

            var shorthand = getShorthand();
            if (consts.debug && $window.views) {
              delete $window.views[shorthand];
            }
          }
        }

        scope.visId = (counter++);

        var hoverPromise = null;
        var renderQueueNextPromise = null;

        scope.hoverFocus = false;
        scope.destroyed = false;

        scope.mouseenter = function() {
          hoverPromise = $timeout(function(){
            Logger.logInteraction(Logger.actions.CHART_MOUSEOVER, scope.chart.shorthand,{
              list: scope.listTitle
            });
            scope.hoverFocus = !scope.thumbnail;
          }, HOVER_TIMEOUT);
        };

        scope.mouseleave = function() {
          if (scope.hoverFocus) {
            Logger.logInteraction(Logger.actions.CHART_MOUSEOUT, scope.chart.shorthand, {
              list: scope.listTitle
            });
          }

          $timeout.cancel(hoverPromise);
          hoverPromise = null;

          scope.hoverFocus = scope.unlocked = false;
        };

        function onTooltipAppear(event, item) {
          Logger.logInteraction(Logger.actions.CHART_TOOLTIP, item.datum, {
            shorthand: scope.chart.shorthand,
            list: scope.listTitle
          });
        }

        function onTooltipDisappear(event, item) {
          Logger.logInteraction(Logger.actions.CHART_TOOLTIP_END, item.datum, {
            shorthand: scope.chart.shorthand,
            list: scope.listTitle
          });
        }

        function getVgSpec() {
          var configSet = scope.configSet || consts.defaultConfigSet || {};

          if (!scope.chart.vlSpec) {
            return;
          }

          var vlSpec = _.cloneDeep(scope.chart.vlSpec);
          vg.util.extend(vlSpec.config, Config[configSet]());
          return vl.compile(vlSpec).spec;
        }

        function getVisElement() {
          return element.find('.vega > :first-child');
        }

        function rescaleIfEnable() {
          var visElement = getVisElement();
          if (scope.rescale) {
            // have to digest the scope to ensure that
            // element.width() is bound by parent element!
            scope.$digest();

            var xRatio = Math.max(
                0.2,
                element.width() /  /* width of vlplot bounding box */
                scope.width /* width of the vis */
              );

            if (xRatio < 1) {
              visElement.width(scope.width * xRatio)
                        .height(scope.height * xRatio);
            }

          } else {
            visElement.css('transform', null)
                      .css('transform-origin', null);
          }
        }

        function getShorthand() {
          return scope.chart.shorthand || (scope.chart.vlSpec ? cql.query.shorthand.vlSpec(scope.chart.vlSpec) : '');
        }

        function renderQueueNext() {
          // render next item in the queue
          if (renderQueue.size() > 0) {
            var next = renderQueue.pop();
            next.parse();
          } else {
            // or say that no one is rendering
            rendering = false;
          }
        }


        function render(spec) {

          if (!spec) {
            if (view) {
              destroyView();
            }
            return;
          }

          scope.height = spec.height;
          if (!element) {
            console.error('can not find vis element');
          }

          var shorthand = getShorthand();

          function parseVega() {
            // if no longer a part of the list, cancel!
            if (scope.destroyed || scope.disabled || (scope.isInList && scope.chart.fieldSetKey && !scope.isInList(scope.chart))) {
              console.log('cancel rendering', shorthand);
              renderQueueNext();
              return;
            }

            var start = new Date().getTime();
            // render if still a part of the list
            vg.parse.spec(spec, function(error, chart) {
              if (error) {
                console.error('error', error);
                renderQueueNextPromise = $timeout(renderQueueNext, 1);
                return;
              }
              try {
                var endParse = new Date().getTime();
                destroyView();
                view = chart({el: element[0]});

                if (!consts.useUrl) {
                  view.data({raw: Dataset.data});
                }

                view.update();

                // read width / height from layout
                var layout = view.data('layout').values()[0];
                var renderer = getRenderer(layout.width, layout.height);
                if (renderer === 'svg') {
                  view.renderer(renderer);
                }

                var visElement = element.find('.vega > :first-child');
                // read  <canvas>/<svg>’s width and height, which is vega's outer width and height that includes axes and legends
                scope.width =  visElement.width();
                scope.height = visElement.height();

                if (consts.debug) {
                  $window.views = $window.views || {};
                  $window.views[shorthand] = view;
                }

                Logger.logInteraction(Logger.actions.CHART_RENDER, scope.chart.shorthand, {
                  list: scope.listTitle
                });
                rescaleIfEnable();

                var endChart = new Date().getTime();
                console.log('parse spec', (endParse-start), 'charting', (endChart-endParse), shorthand);
                if (scope.tooltip) {
                  // use vega-tooltip
                  tooltip = vl.tooltip(view, scope.chart.vlSpec, {
                    onAppear: onTooltipAppear,
                    onDisappear: onTooltipDisappear,
                    delay: TOOLTIP_DELAY
                  });
                }
              } catch (e) {
                console.error(e, JSON.stringify(spec));
              } finally {
                renderQueueNextPromise = $timeout(renderQueueNext, 1);
              }

            });
          }

          if (!rendering) { // if no instance is being render -- rendering now
            rendering=true;
            parseVega();
          } else {
            // otherwise queue it
            renderQueue.push({
              priority: scope.priority || 0,
              parse: parseVega
            });
          }
        }

        var specWatcher = scope.$watch(function() {
          // Omit data property to speed up deep watch
          return _.omit(scope.chart.vlSpec, 'data');
        }, function() {
          var spec = scope.chart.vgSpec = getVgSpec();
          if (!scope.chart.cleanSpec) {
            // FIXME
            scope.chart.cleanSpec = scope.chart.vlSpec;
          }
          render(spec);
        }, true);

        scope.$on('$destroy', function() {
          console.log('vlplot destroyed');
          if (view) {
            destroyView();
          }

          if (hoverPromise) {
            $timeout.cancel(hoverPromise);
            hoverPromise = null;
          }

          // if (renderQueueNextPromise) {
          //   $timeout.cancel(renderQueueNextPromise);
          //   renderQueueNextPromise = null;
          // }

          scope.destroyed = true;
          // FIXME another way that should eliminate things from memory faster should be removing
          // maybe something like
          // renderQueue.splice(renderQueue.indexOf(parseVega), 1));
          // but without proper testing, this is riskier than setting scope.destroyed.

          // Clean up watcher
          specWatcher();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vega-lite-ui.directive:visListItem
 * @description
 * # visListItem
 */
angular.module('vlui')
  .directive('vlPlotGroup', ['Bookmarks', 'consts', 'vg', 'vl', 'Dataset', 'Logger', '_', 'Pills', 'Chart', '$timeout', 'Modals', function (Bookmarks, consts, vg, vl, Dataset, Logger, _, Pills, Chart, $timeout, Modals) {
    return {
      templateUrl: 'components/vlplotgroup/vlplotgroup.html',
      restrict: 'E',
      replace: true,
      controller: ['$scope', '$element', function($scope, $element) {
        this.getDropTarget = function() {
          return $element.find('.fa-wrench')[0];
        };
      }],
      scope: {
        /* pass to vlplot **/
        chart: '=',

        //optional
        disabled: '<',
        isInList: '<',
        listTitle: '<',

        alwaysScrollable: '<',
        configSet: '@',
        enablePillsPreview: '<',
        overflow: '<',
        priority: '<',
        rescale: '<',
        thumbnail: '<',
        tooltip: '<',

        /* vlplotgroup specific */

        /** Set of fieldDefs for showing field info.  For Voyager2, this might be just a subset of fields that are ambiguous. */
        fieldSet: '<',

        showBookmark: '<',
        showDebug: '<',
        showExpand: '<',
        showFilterNull: '<',
        showLabel: '<',
        showLog: '<',
        showSelect: '<',
        showSort: '<',
        showTranspose: '<',

        /** Whether the log / transpose sort cause side effect to the shelf  */
        toggleShelf: '<',

        alwaysSelected: '<',
        isSelected: '<',
        highlighted: '<',
        expandAction: '&',
        selectAction: '&'
      },
      link: function postLink(scope) {
        scope.Bookmarks = Bookmarks;
        scope.consts = consts;


        // bookmark alert
        scope.showBookmarkAlert = false;
        scope.toggleBookmark = function(chart) {
          if (Bookmarks.isBookmarked(chart.shorthand)) {
            scope.showBookmarkAlert = !scope.showBookmarkAlert; // toggle alert
          }
          else {
            Bookmarks.add(chart, scope.listTitle);
          }
        };

        var fieldHoverPromise = null;
        var previewPromise = null;

        scope.enablePreview = function() {
          previewPromise = $timeout(function() {
            if (scope.enablePillsPreview) {
              Pills.preview(true, scope.chart, scope.listTitle);
            }
          }, 500);

        };

        scope.disablePreview = function() {
          if (previewPromise) {
            $timeout.cancel(previewPromise);
          }
          previewPromise = null;

          if (scope.enablePillsPreview) {
            Pills.preview(false, scope.chart, scope.listTitle);
          }
        };

        scope.fieldInfoMouseover = function(fieldDef, index) {
          fieldHoverPromise = $timeout(function() {
            (scope.highlighted||{})[fieldDef.field] = true;

            // Link to original field in the CQL-based spec
            if (scope.chart.enumSpecIndex) {
              var enumSpecIndex = scope.chart.enumSpecIndex;
              if (enumSpecIndex.encodings && enumSpecIndex.encodings[index] && enumSpecIndex.encodings[index].field) {
                var fieldEnumSpecName = enumSpecIndex.encodings[index].field.name;
                (scope.highlighted||{})[fieldEnumSpecName] = true;
              }
            }

            Logger.logInteraction(Logger.actions.FIELDDEF_HIGHLIGHTED, scope.chart.shorthand, {
              highlightedField: fieldDef.field,
              list: scope.listTitle
            });
          }, 500);
        };

        scope.fieldInfoMouseout = function(fieldDef, index) {
          if (fieldHoverPromise) {
            // if we unhover within
            $timeout.cancel(fieldHoverPromise);
          }
          fieldHoverPromise = null;

          if ((scope.highlighted||{})[fieldDef.field]) {
            // disable preview if it's enabled
            Logger.logInteraction(Logger.actions.FIELDDEF_UNHIGHLIGHTED, scope.chart.shorthand, {
              highlightedField: fieldDef.field,
              list: scope.listTitle
            });

            (scope.highlighted||{})[fieldDef.field] = false;

            // Unlink Link to original field in the CQL-based spec
            if (scope.chart.enumSpecIndex) {
              var enumSpecIndex = scope.chart.enumSpecIndex;
              if (enumSpecIndex.encodings && enumSpecIndex.encodings[index] && enumSpecIndex.encodings[index].field) {
                var fieldEnumSpecName = enumSpecIndex.encodings[index].field.name;
                delete (scope.highlighted||{})[fieldEnumSpecName];
              }
            }
          }
        };

        scope.isEnumeratedField = function(chart, index) {
          if (chart.enumSpecIndex) {
            if (chart.enumSpecIndex.encodings && chart.enumSpecIndex.encodings[index]) {
              return chart.enumSpecIndex.encodings[index].field;
            }
          }
          return false;
        };

        scope.isEnumeratedChannel = function(chart, index) {
          if (chart.enumSpecIndex) {
            if (chart.enumSpecIndex.encodings && chart.enumSpecIndex.encodings[index]) {
              return chart.enumSpecIndex.encodings[index].channel;
            }
          }
          return false;
        };

        scope.select = function(chart) {
          Logger.logInteraction(Logger.actions.SPEC_SELECT, chart.shorthand, {
            list: scope.listTitle
          });
          Pills.parse(chart.vlSpec);
          if (scope.$parent.postSelectAction) {
            scope.$parent.postSelectAction();
          }
          Modals.close('bookmark-list'); // HACK: this line is only necessary when this function is called from bookmark list
        };

        scope.removeBookmark = function(chart) {
          Bookmarks.remove(chart);
          scope.showBookmarkAlert = false;
        };

        scope.keepBookmark = function() {
          scope.showBookmarkAlert = false;
        };

        // Defer rendering the debug Drop popup until it is requested
        scope.renderPopup = false;
        // Use _.once because the popup only needs to be initialized once
        scope.initializePopup = _.once(function() {
          scope.renderPopup = true;
        });

        scope.logCode = function(name, value) {
          console.log(name+':\n\n', JSON.stringify(value));
        };

        // TOGGLE LOG

        scope.log = {};
        scope.log.support = function(spec, channel) {
          if (!spec) { return false; }
          var encoding = spec.encoding,
            fieldDef = encoding[channel];

          return fieldDef && fieldDef.type === vl.type.QUANTITATIVE && !fieldDef.bin;
        };

        scope.log.toggle = function(spec, channel) {
          if (!scope.log.support(spec, channel)) { return; }

          var fieldDef = spec.encoding[channel],
            scale = fieldDef.scale = fieldDef.scale || {};

          if (scope.toggleShelf) {
            Pills.rescale(channel, scale.type === 'log' ? 'linear' : 'log');
          } else {
            scale.type = scale.type === 'log' ? 'linear' : 'log';
          }

          Logger.logInteraction(Logger.actions.LOG_TOGGLE, scope.chart.shorthand, {
            list: scope.listTitle
          });
        };

        scope.log.active = function(spec, channel) {
          if (!scope.log.support(spec, channel)) { return; }

          var fieldDef = spec.encoding[channel],
            scale = fieldDef.scale;

          return scale && scale.type === 'log';
        };

        // TOGGLE FILTER
        // TODO: extract toggleFilterNull to be its own class

        scope.toggleFilterNull = function(spec) {
          Logger.logInteraction(Logger.actions.NULL_FILTER_TOGGLE, scope.chart.shorthand, {
            list: scope.listTitle
          });

          if (scope.toggleShelf) {
            Pills.toggleFilterInvalid();
          } else {
            spec.transform = spec.transform || {};
            spec.transform.filterInvalid = spec.transform.filterInvalid === true ? undefined : true;
          }
        };

        scope.toggleFilterNull.support = function(spec) {
          var fieldDefs = vl.spec.fieldDefs(spec);
          for (var i in fieldDefs) {
            var fieldDef = fieldDefs[i];
            if (_.includes([vl.type.ORDINAL, vl.type.NOMINAL], fieldDef.type) && Dataset.schema.stats(fieldDef).missing > 0) {
              return true;
            }
          }
          return false;
        };

        // TOGGLE SORT
        // TODO: extract toggleSort to be its own class

        var toggleSort = scope.toggleSort = {};

        toggleSort.modes = ['ordinal-ascending', 'ordinal-descending',
          'quantitative-ascending', 'quantitative-descending', 'custom'];

        toggleSort.toggle = function(spec) {

          var currentMode = toggleSort.mode(spec);
          var currentModeIndex = toggleSort.modes.indexOf(currentMode);

          var newModeIndex = (currentModeIndex + 1) % (toggleSort.modes.length - 1);
          var newMode = toggleSort.modes[newModeIndex];

          Logger.logInteraction(Logger.actions.SORT_TOGGLE, scope.chart.shorthand, {
            currentMode: currentMode,
            newMode: newMode,
            list: scope.listTitle
          });

          var channels = toggleSort.channels(spec);

          if (scope.toggleShelf) {
            Pills.sort(channels.ordinal, toggleSort.getSort(newMode, spec));
          } else {
            spec.encoding[channels.ordinal].sort = toggleSort.getSort(newMode, spec);
          }
        };

        /** Get sort property definition that matches each mode. */
        toggleSort.getSort = function(mode, spec) {
          if (mode === 'ordinal-ascending') {
            return 'ascending';
          }

          if (mode === 'ordinal-descending') {
            return 'descending';
          }

          var channels = toggleSort.channels(spec);
          var qEncDef = spec.encoding[channels.quantitative];

          if (mode === 'quantitative-ascending') {
            return {
              op: qEncDef.aggregate,
              field: qEncDef.field,
              order: 'ascending'
            };
          }

          if (mode === 'quantitative-descending') {
            return {
              op: qEncDef.aggregate,
              field: qEncDef.field,
              order: 'descending'
            };
          }

          return null;
        };

        toggleSort.mode = function(spec) {
          var channels = toggleSort.channels(spec);
          var sort = spec.encoding[channels.ordinal].sort;

          if (sort === undefined) {
            return 'ordinal-ascending';
          }

          for (var i = 0; i < toggleSort.modes.length - 1 ; i++) {
            // check if sort matches any of the sort for each mode except 'custom'.
            var mode = toggleSort.modes[i];
            var sortOfMode = toggleSort.getSort(mode, spec);

            if (_.isEqual(sort, sortOfMode)) {
              return mode;
            }
          }

          if (vg.util.isObject(sort) && sort.op && sort.field) {
            return 'custom';
          }
          console.error('invalid mode');
          return null;
        };

        toggleSort.channels = function(spec) {
          return spec.encoding.x.type === vl.type.NOMINAL || spec.encoding.x.type === vl.type.ORDINAL ?
                  {ordinal: 'x', quantitative: 'y'} :
                  {ordinal: 'y', quantitative: 'x'};
        };

        toggleSort.support = function(spec) {
          var encoding = spec.encoding;

          if (vl.encoding.has(encoding, 'row') || vl.encoding.has(encoding, 'column') ||
            !vl.encoding.has(encoding, 'x') || !vl.encoding.has(encoding, 'y') ||
            !vl.encoding.isAggregate(spec.encoding)) { // FIXME replace this proper alwaysNoOcclusion method
            return false;
          }

          return (
              (encoding.x.type === vl.type.NOMINAL || encoding.x.type === vl.type.ORDINAL) &&
              vl.fieldDef.isMeasure(encoding.y)
            ) ? 'x' :
            (
              (encoding.y.type === vl.type.NOMINAL || encoding.y.type === vl.type.ORDINAL) &&
              vl.fieldDef.isMeasure(encoding.x)
            ) ? 'y' : false;
        };

        scope.toggleSortClass = function(vlSpec) {
          if (!vlSpec || !toggleSort.support(vlSpec)) {
            return 'invisible';
          }

          var ordinalChannel = vlSpec && toggleSort.channels(vlSpec).ordinal,
            mode = vlSpec && toggleSort.mode(vlSpec);

          var directionClass = ordinalChannel === 'x' ? 'sort-x ' : '';

          switch (mode) {
            case 'ordinal-ascending':
              return directionClass + 'fa-sort-alpha-asc';
            case 'ordinal-descending':
              return directionClass + 'fa-sort-alpha-desc';
            case 'quantitative-ascending':
              return directionClass + 'fa-sort-amount-asc';
            case 'quantitative-descending':
              return directionClass + 'fa-sort-amount-desc';
            default: // custom
              return directionClass + 'fa-sort';
          }
        };

        scope.transpose = function() {
          Logger.logInteraction(Logger.actions.TRANSPOSE_TOGGLE, scope.chart.shorthand, {
            list: scope.listTitle
          });
          if (scope.toggleShelf) {
            Pills.transpose();
          } else {
            Chart.transpose(scope.chart.vlSpec);
          }
        };

        scope.$on('$destroy', function() {
          scope.chart = null;
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc directive
 * @name vega-lite-ui.directive:visListItem
 * @description
 * # visListItem
 */
angular.module('vlui')
  .directive('vlPlotGroupPopup', ['Drop', function (Drop) {
    return {
      templateUrl: 'components/vlplotgroup/vlplotgrouppopup.html',
      restrict: 'E',
      require: '^^vlPlotGroup',
      scope: false,
      link: function postLink(scope, element, attrs, vlPlotGroupController) {
        var debugPopup = new Drop({
          content: element.find('.dev-tool')[0],
          target: vlPlotGroupController.getDropTarget(),
          position: 'bottom right',
          openOn: 'click',
          constrainToWindow: true
        });

        scope.$on('$destroy', function() {
          debugPopup.destroy();
        });
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .directive('vlPlotGroupList', ['vl', 'cql', 'jQuery', 'consts', '_', 'Logger', 'Pills', 'Chart', function (vl, cql, jQuery, consts, _, Logger, Pills, Chart) {
    return {
      templateUrl: 'components/vlplotgrouplist/vlplotgrouplist.html',
      restrict: 'E',
      replace: true,
      scope: {
        /** An instance of specQueryModelGroup */
        enablePillsPreview: '<',
        initialLimit: '<',
        listTitle: '<',
        hideListTitle: '<',
        charts: '<',
        priority: '<',
        showMore: '<',
        postSelectAction: '&'
      },
      link: function postLink(scope /*, element, attrs*/) {
        scope.consts = consts;
        scope.limit = scope.initialLimit || 3;

        // Functions
        scope.getChart = Chart.getChart;
        scope.increaseLimit = increaseLimit;
        scope.isInlist = isInList;
        scope.Pills = Pills;

        // element.bind('scroll', function(){
        //    if(jQuery(this).scrollTop() + jQuery(this).innerHeight() >= jQuery(this)[0].scrollHeight){
        //     if (scope.limit < scope.modelGroup.charts.length) {
        //       scope.increaseLimit();
        //     }
        //    }
        // });

        function increaseLimit() {
          scope.limit += 5;
          Logger.logInteraction(Logger.actions.LOAD_MORE, scope.limit, {
            list: scope.listTitle
          });
        }

        /** return if the plot is still in the view, so it might be omitted from the render queue if necessary. */
        function isInList(chart) {
          for (var i = 0; i < scope.charts.length; i++) {
            if(chart.shorthand === scope.charts[i].shorthand) {
              return true;
            }
          }
          return false;
        }
      }
    };
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .filter('compactJSON', ['JSON3', function(JSON3) {
    return function(input) {
      return JSON3.stringify(input, null, '  ', 80);
    };
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name vega-lite-ui.filter:encodeUri
 * @function
 * @description
 * # encodeUri
 * Filter in the vega-lite-ui.
 */
angular.module('vlui')
  .filter('encodeURI', function () {
    return function (input) {
      return window.encodeURI(input);
    };
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name facetedviz.filter:reportUrl
 * @function
 * @description
 * # reportUrl
 * Filter in the facetedviz.
 */
angular.module('vlui')
  .filter('reportUrl', ['compactJSONFilter', '_', 'consts', function (compactJSONFilter, _, consts) {
    function voyagerReport(params) {
      var url = 'https://docs.google.com/forms/d/1T9ZA14F3mmzrHR7JJVUKyPXzrMqF54CjLIOjv2E7ZEM/viewform?';

      if (params.fields) {
        var query = encodeURI(compactJSONFilter(_.values(params.fields)));
        url += 'entry.1245199477=' + query + '&';
      }

      if (params.spec) {
        var spec = _.omit(params.spec, 'config');
        spec = encodeURI(compactJSONFilter(spec));
        url += 'entry.1323680136=' + spec + '&';
      }

      if (params.spec2) {
        var spec2 = _.omit(params.spec2, 'config');
        spec2 = encodeURI(compactJSONFilter(spec2));
        url += 'entry.853137786=' + spec2 + '&';
      }

      var typeProp = 'entry.1940292677=';
      switch (params.type) {
        case 'vl':
          url += typeProp + 'Visualization+Rendering+(Vegalite)&';
          break;
        case 'vr':
          url += typeProp + 'Recommender+Algorithm+(Visrec)&';
          break;
        case 'fv':
          url += typeProp + 'Recommender+UI+(FacetedViz)&';
          break;

      }
      return url;
    }

    function vluiReport(params) {
      var url = 'https://docs.google.com/forms/d/1xKs-qGaLZEUfbTmhdmSoS13OKOEpuu_NNWE5TAAml_Y/viewform?';
      if (params.spec) {
        var spec = _.omit(params.spec, 'config');
        spec = encodeURI(compactJSONFilter(spec));
        url += 'entry.1245199477=' + spec + '&';
      }
      return url;
    }

    return consts.appId === 'voyager' ? voyagerReport : vluiReport;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc filter
 * @name vega-lite-ui.filter:underscore2space
 * @function
 * @description
 * # underscore2space
 * Filter in the vega-lite-ui.
 */
angular.module('vlui')
  .filter('underscore2space', function () {
    return function (input) {
      return input ? input.replace(/_+/g, ' ') : '';
    };
  });
}());

;(function() {
'use strict';

angular.module('vlui')
  .service('Alerts', ['$timeout', '_', function($timeout, _) {
    var Alerts = {};

    Alerts.alerts = [];

    Alerts.add = function(msg, dismiss) {
      var message = {msg: msg};
      Alerts.alerts.push(message);
      if (dismiss) {
        $timeout(function() {
          var index = _.findIndex(Alerts.alerts, message);
          Alerts.closeAlert(index);
        }, dismiss);
      }
    };

    Alerts.closeAlert = function(index) {
      Alerts.alerts.splice(index, 1);
    };

    return Alerts;
  }]);
}());

;(function() {
'use strict';

/**
 * @ngdoc service
 * @name vlui.Bookmarks
 * @description
 * # Bookmarks
 * Service in the vlui.
 */
angular.module('vlui')
  .service('Bookmarks', ['_', 'vl', 'localStorageService', 'Logger', 'Dataset', function(_, vl, localStorageService, Logger, Dataset) {
    var Bookmarks = function() {
      this.list = [];
      this.dict = {};
      this.isSupported = localStorageService.isSupported;
    };

    var proto = Bookmarks.prototype;

    proto.save = function() {
      localStorageService.set('bookmarkList', this.list);
    };

    proto.saveAnnotations = _.throttle(function(shorthand) {
      _.find(this.list, function(bookmark) { return bookmark.shorthand === shorthand; })
        .chart.annotation = this.dict[shorthand].annotation;
      this.save();
    }, 1000, {"trailing": true});

    // export all bookmarks and annotations
    proto.export = function() {
      var dictionary = this.dict;

      // prepare export data
      var exportSpecs = [];
      _.forEach(this.list, function(bookmark) {
        var spec = bookmark.chart.vlSpec;
        spec.description = dictionary[bookmark.shorthand].annotation;
        exportSpecs.push(spec);
      });

      // write export data in a new tab
      var exportWindow = window.open();
      exportWindow.document.open();
      exportWindow.document.write('<html><body><pre>' + JSON.stringify(exportSpecs, null, 2) + '</pre></body></html>');
      exportWindow.document.close();
    };

    proto.load = function() {
      this.list = localStorageService.get('bookmarkList') || [];

      // populate this.dict
      var dictionary = this.dict;
      _.forEach(this.list, function(bookmark) {
        dictionary[bookmark.shorthand] = _.cloneDeep(bookmark.chart);
      });
    };

    proto.clear = function() {
      this.list.splice(0, this.list.length);
      this.dict = {};
      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_CLEAR);
    };

    proto.add = function(chart, listTitle) {
      var shorthand = chart.shorthand;
      chart.timeAdded = (new Date().getTime());

      // FIXME: this is not always a good idea
      chart.schema = Dataset.schema;

      this.dict[chart.shorthand] = _.cloneDeep(chart);

      this.list.push({
        shorthand: shorthand,
        list: listTitle,
        chart: _.cloneDeep(chart)
      });

      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_ADD, shorthand, {
        list: listTitle
      });
    };

    proto.remove = function(chart) {
      var shorthand = chart.shorthand;

      // remove bookmark from this.list
      var index = this.list.findIndex(function(bookmark) { return bookmark.shorthand === shorthand; });
      var removed;
      if (index >= 0) {
        removed = this.list.splice(index, 1)[0];
      }

      // remove bookmark from this.dict
      delete this.dict[chart.shorthand];

      this.save();

      Logger.logInteraction(Logger.actions.BOOKMARK_REMOVE, shorthand, {
        list: (removed || {}).list
      });
    };

    proto.reorder = function() {
      this.save();
    };

    proto.isBookmarked = function(shorthand) {
      return this.dict.hasOwnProperty(shorthand);
    };

    proto.logBookmarksClosed = function() {
      Logger.logInteraction(Logger.actions.BOOKMARK_CLOSE);
    };

    return new Bookmarks();
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .service('Chart', ['cql', '_', function (cql, _) {
    var Chart = {
      getChart: getChart,
      transpose: transpose
    };

    /**
     *
     * @param {SpecQueryModelGroup | SpecQueryModel} item
     */
    function getChart(item) {
      if (!item) {
        return {
          /** @type {Object} concise spec generated */
          vlSpec: null,
          fieldSet: null,

          /** @type {String} generated vl shorthand */
          shorthand: null,
          enumSpecIndex: null
        };
      }

      var specM = item instanceof cql.model.SpecQueryModelGroup ?
        item.getTopSpecQueryModel():
        item;
      return {
        enumSpecIndex: specM.enumSpecIndex,
        fieldSet: specM.specQuery.encodings,
        vlSpec: specM.toSpec(),
        shorthand: specM.toShorthand()
      };
    }

    function transpose(spec) {
      var encoding = _.clone(spec.encoding);
      var oldXEnc = encoding.x;
      var oldYEnc = encoding.y;
      encoding.y = oldXEnc;
      encoding.x = oldYEnc;

      var oldRowEnc = encoding.row;
      var oldColEnc = encoding.column;
      encoding.row = oldColEnc;
      encoding.column = oldRowEnc;

      spec.encoding = encoding;
    }

    return Chart;
  }]);
}());

;(function() {
'use strict';

// Service for the spec config.
// We keep this separate so that changes are kept even if the spec changes.
angular.module('vlui')
  .factory('Config', function() {
    var Config = {};

    Config.data = {};
    Config.config = {};

    Config.getConfig = function() {
      return {};
    };

    Config.getData = function() {
      return Config.data;
    };

    Config.large = function() {
      return {
        cell: {
          width: 400,
          height: 400
        },
        facet: {
          cell: {
            width: 200,
            height: 200
          }
        }
      };
    };

    Config.small = function() {
      return {
        facet: {
          cell: {
            width: 150,
            height: 150
          }
        }
      };
    };

    Config.updateDataset = function(dataset, type) {
      if (dataset.values) {
        Config.data.values = dataset.values;
        delete Config.data.url;
        Config.data.formatType = undefined;
      } else {
        Config.data.url = dataset.url;
        delete Config.data.values;
        Config.data.formatType = type;
      }
    };

    return Config;
  });
}());

;(function() {
'use strict';

/**
 * @ngdoc service
 * @name vega-lite-ui.logger
 * @description
 * # logger
 * Service in the vega-lite-ui.
 */
angular.module('vlui')
  .service('Logger', ['$location', '$window', '$webSql', '_', 'consts', 'Analytics', 'Papa', 'Blob', 'URL', function ($location, $window, $webSql, _, consts, Analytics, Papa, Blob, URL) {

    var service = {};

    service.levels = {
      OFF: {id:'OFF', rank:0},
      TRACE: {id:'TRACE', rank:1},
      DEBUG: {id:'DEBUG', rank:2},
      INFO: {id:'INFO', rank:3},
      WARN: {id:'WARN', rank:4},
      ERROR: {id:'ERROR', rank:5},
      FATAL: {id:'FATAL', rank:6}
    };

    service.actions = {
      // DATA
      INITIALIZE: {category: 'DATA', id: 'INITIALIZE', level: service.levels.DEBUG},
      UNDO: {category: 'DATA', id: 'UNDO', level: service.levels.INFO},
      REDO: {category: 'DATA', id: 'REDO', level: service.levels.INFO},
      DATASET_CHANGE: {category: 'DATA', id: 'DATASET_CHANGE', level: service.levels.INFO},
      DATASET_OPEN: {category: 'DATA', id: 'DATASET_OPEN', level: service.levels.INFO},
      DATASET_NEW_PASTE: {category: 'DATA', id: 'DATASET_NEW_PASTE', level: service.levels.INFO},
      DATASET_NEW_URL: {category: 'DATA', id: 'DATASET_NEW_URL', level: service.levels.INFO},
      // BOOKMARK
      BOOKMARK_ADD: {category: 'BOOKMARK', id:'BOOKMARK_ADD', level: service.levels.INFO},
      BOOKMARK_REMOVE: {category: 'BOOKMARK', id:'BOOKMARK_REMOVE', level: service.levels.INFO},
      BOOKMARK_OPEN: {category: 'BOOKMARK', id:'BOOKMARK_OPEN', level: service.levels.INFO},
      BOOKMARK_CLOSE: {category: 'BOOKMARK', id:'BOOKMARK_CLOSE', level: service.levels.INFO},
      BOOKMARK_CLEAR: {category: 'BOOKMARK', id: 'BOOKMARK_CLEAR', level: service.levels.INFO},
      // CHART
      CHART_MOUSEOVER: {category: 'CHART', id:'CHART_MOUSEOVER', level: service.levels.DEBUG},
      CHART_MOUSEOUT: {category: 'CHART', id:'CHART_MOUSEOUT', level: service.levels.DEBUG},
      CHART_RENDER: {category: 'CHART', id:'CHART_RENDER', level: service.levels.DEBUG},
      CHART_EXPOSE: {category: 'CHART', id:'CHART_EXPOSE', level: service.levels.DEBUG},
      CHART_TOOLTIP: {category: 'CHART', id:'CHART_TOOLTIP', level: service.levels.DEBUG},
      CHART_TOOLTIP_END: {category: 'CHART', id:'CHART_TOOLTIP_END', level: service.levels.DEBUG},

      SORT_TOGGLE: {category: 'CHART', id:'SORT_TOGGLE', level: service.levels.INFO},
      MARK_TOGGLE: {category: 'CHART', id:'MARK_TOGGLE', level: service.levels.INFO},
      DRILL_DOWN_OPEN: {category: 'CHART', id:'DRILL_DOWN_OPEN', level: service.levels.INFO},
      DRILL_DOWN_CLOSE: {category: 'CHART', id: 'DRILL_DOWN_CLOSE', level: service.levels.INFO},
      LOG_TOGGLE: {category: 'CHART', id: 'LOG_TOGGLE', level: service.levels.INFO},
      TRANSPOSE_TOGGLE: {category: 'CHART', id: 'TRANSPOSE_TOGGLE', level: service.levels.INFO},
      NULL_FILTER_TOGGLE: {category: 'CHART', id:'NULL_FILTER_TOGGLE', level: service.levels.INFO},

      CLUSTER_SELECT: {category: 'CHART', id:'CLUSTER_SELECT', level: service.levels.INFO},
      LOAD_MORE: {category: 'CHART', id:'LOAD_MORE', level: service.levels.INFO},

      // FIELDS
      FIELDS_CHANGE: {category: 'FIELDS', id: 'FIELDS_CHANGE', level: service.levels.INFO},
      FIELDS_RESET: {category: 'FIELDS', id: 'FIELDS_RESET', level: service.levels.INFO},
      FUNC_CHANGE: {category: 'FIELDS', id: 'FUNC_CHANGE', level: service.levels.INFO},
      ADD_FIELD: {category: 'FIELDS', id: 'ADD_FIELD', level: service.levels.INFO},

      // Field Info
      FIELDDEF_HIGHLIGHTED: {category: 'FIELDINFO', id: 'FIELDDEF_HIGHLIGHTED', level: service.levels.INFO},
      FIELDDEF_UNHIGHLIGHTED: {category: 'FIELDINFO', id: 'FIELDDEF_UNHIGHLIGHTED', level: service.levels.INFO},

      //POLESTAR
      SPEC_CLEAN: {category:'POLESTAR', id: 'SPEC_CLEAN', level: service.levels.INFO},
      SPEC_CHANGE: {category:'POLESTAR', id: 'SPEC_CHANGE', level: service.levels.INFO},
      FIELD_DROP: {category: 'POLESTAR', id: 'FIELD_DROP', level: service.levels.INFO},
      MARK_CHANGE: {category: 'POLESTAR', id: 'MARK_CHANGE', level: service.levels.INFO},

      // Voyager 2
      SPEC_SELECT: {category:'VOYAGER2', id: 'SPEC_SELECT', level: service.levels.INFO},

      // Alternatives
      SET_ALTERNATIVES_TYPE: {category:'ALTERNATIVES', id: 'SET_ALTERNATIVES_TYPE', level: service.levels.INFO},
      TOGGLE_SHOW_ALTERNATIVES: {category:'ALTERNATIVES', id: 'TOGGLE_SHOW_ALTERNATIVES', level: service.levels.INFO},
      TOGGLE_HIDE_ALTERNATIVES: {category:'ALTERNATIVES', id: 'TOGGLE_HIDE_ALTERNATIVES', level: service.levels.INFO},

      // Preview
      SPEC_PREVIEW_ENABLED: {category:'PREVIEW', id: 'SPEC_PREVIEW_ENABLED', level: service.levels.INFO},
      SPEC_PREVIEW_DISABLED: {category:'PREVIEW', id: 'SPEC_PREVIEW_DISABLED', level: service.levels.INFO}
    };

    // create noop service if websql is not supported
    if ($window.openDatabase === undefined) {
      console.warn('No websql support and thus no logging.');
      service.logInteraction = function() {};
      return service;
    }

    // get user id once in the beginning
    var userid = service.userid = $location.search().userid;

    service.db = $webSql.openDatabase('logs', '1.0', 'Logs', 2 * 1024 * 1024);

    service.tableName = 'Logs_' + consts.appId;

    // (zening) TODO: check if the table is correct, do we really need time? will time be automatically added?
    service.createTableIfNotExists = function() {
      service.db.createTable(service.tableName, {
        'userid': {
          'type': 'INTEGER',
          'null': 'NOT NULL'
        },
        'time': {
          'type': 'TIMESTAMP',
          'null': 'NOT NULL'
        },
        'actionCategory': {
          'type': 'TEXT',
          'null': 'NOT NULL'
        },
        'actionId': {
          'type': 'TEXT',
          'null': 'NOT NULL'
        },
        'label': {
          'type': 'TEXT',
          'null': 'NOT NULL'
        },
        'data': {
          'type': 'TEXT'
        }
      });
    };

    service.clear = function() {
      var r = $window.confirm('Really clear the logs?');
      if (r === true) {
        service.db.dropTable(service.tableName);
        service.createTableIfNotExists();
      }
    };

    service.export = function() {
      service.db.selectAll(service.tableName).then(function(results) {
        if (results.rows.length === 0) {
          console.warn('No logs');
          return;
        }

        var rows = [];

        for(var i=0; i < results.rows.length; i++) {
          rows.push(results.rows.item(i));
        }

        var csv = Papa.unparse(rows);

        var csvData = new Blob([csv], { type: 'text/csv' });
        var csvUrl = URL.createObjectURL(csvData);

        var element = angular.element('<a/>');
        element.attr({
          href: csvUrl,
          target: '_blank',
          download: service.tableName + '_' + userid + '_' + new Date().toISOString() + '.csv'
        })[0].click();
      });
    };


    service.logInteraction = function(action, label, data) {
      if (!consts.logging) {
        return;
      }
      var value = data ? data.value : undefined;
      if(action.level.rank >= service.levels[consts.logLevel || 'INFO'].rank) {
        Analytics.trackEvent(action.category, action.id, label, value);

        if (consts.logToWebSql) {
          var row = {
            userid: userid,
            time: new Date().toISOString(),
            actionCategory: action.category,
            actionId: action.id,
            label: _.isObject(label) ? JSON.stringify(label) : label,
            data: data ? JSON.stringify(data) : undefined
          };
          service.db.insert(service.tableName, row);
        }

        if (action.level.rank >= service.levels[consts.logPrintLevel || 'INFO'].rank) {
          console.log('[Logging] ', action.id, label, data);
        }
      }
    };

    service.createTableIfNotExists();
    console.log('app:', consts.appId, 'started');
    service.logInteraction(service.actions.INITIALIZE, consts.appId);

    return service;
  }]);
}());

;(function() {
'use strict';

angular.module('vlui')
  .service('Pills', ['ANY', 'consts', 'util', function (ANY, consts, util) {
    var Pills = {
      // Functions
      isAnyChannel: isAnyChannel,
      getNextAnyChannelId: getNextAnyChannelId,
      getEmptyAnyChannelId: getEmptyAnyChannelId,
      isEnumeratedChannel: isEnumeratedChannel,
      isEnumeratedField: isEnumeratedField,

      get: get,
      // Event
      dragStart: dragStart,
      dragStop: dragStop,
      // Event, with handler in the listener

      /** Set a fieldDef for a channel */
      set: set,

      /** Remove a fieldDef from a channel */
      remove: remove,

      /** Add new field to the pills */
      add: add,

      /** Pass message to toggler listeners */
      rescale: rescale,
      sort: sort,
      toggleFilterInvalid: toggleFilterInvalid,
      transpose: transpose,

      /** Parse a new spec */
      parse: parse,

      /** Preview a spec */
      preview: preview,

      /** If the spec/query gets updated */
      update: update,

      reset: reset,
      dragDrop: dragDrop,

      // Data
      // TODO: split between encoding related and non-encoding related
      pills: {},
      highlighted: {},
      /** pill being dragged */
      dragging: null,
      /** channelId that's the pill is being dragged from */
      cidDragFrom: null,
      /** Listener  */
      listener: null
    };

    /**
     * Returns whether the given channel id is an "any" channel
     *
     * @param {any} channelId
     */
    function isAnyChannel(channelId) {
      return channelId && channelId.indexOf(ANY) === 0; // prefix by ANY
    }

    function getEmptyAnyChannelId() {
      var anyChannels = util.keys(Pills.pills).filter(function(channelId) {
        return channelId.indexOf(ANY) === 0;
      });
      for (var i=0 ; i < anyChannels.length; i++) {
        var channelId = anyChannels[i];
        if (!Pills.pills[channelId].field) {
          return channelId;
        }
      }
      throw new Error('No empty any channel available!');
    }

    function getNextAnyChannelId() {
      var i = 0;
      while (Pills.pills[ANY + i]) {
        i++;
      }

      if (!consts.maxAnyShelf || i >= consts.maxAnyShelf) {
        return null;
      }

      return ANY + i;
    }

    /**
     * Set a fieldDef of a pill of a given channelId
     * @param channelId channel id of the pill to be updated
     * @param fieldDef fieldDef to to be updated
     * @param update whether to propagate change to the channel update listener
     */
    function set(channelId, fieldDef, update) {
      Pills.pills[channelId] = fieldDef;

      if (update && Pills.listener) {
        Pills.listener.set(channelId, fieldDef);
      }
    }

    /**
     * Get a fieldDef of a pill of a given channelId
     */
    function get(channelId) {
      return Pills.pills[channelId];
    }

    function add(fieldDef) {
      if (Pills.listener && Pills.listener.add) {
        Pills.listener.add(fieldDef);
      }
    }

    function isEnumeratedChannel(channelId) {
      if (Pills.listener && Pills.listener.isEnumeratedChannel) {
        return Pills.listener.isEnumeratedChannel(channelId, Pills.pills[channelId]);
      }
      return false;
    }

    function isEnumeratedField(channelId) {
      if (Pills.listener && Pills.listener.isEnumeratedField) {
        return Pills.listener.isEnumeratedField(channelId, Pills.pills[channelId]);
      }
      return false;
    }

    function remove(channelId) {
      delete Pills.pills[channelId];
      if (Pills.listener) {
        Pills.listener.remove(channelId);
      }
    }

    function sort(channelId, sort) {
      if (Pills.listener && Pills.listener.sort) {
        Pills.listener.sort(channelId, sort);
      }
    }

    function rescale(channelId, scaleType) {
      if (Pills.listener && Pills.listener.rescale) {
        Pills.listener.rescale(channelId, scaleType);
      }
    }

    function toggleFilterInvalid() {
      if (Pills.listener && Pills.listener.toggleFilterInvalid) {
        Pills.listener.toggleFilterInvalid();
      }
    }

    function transpose() {
      if (Pills.listener && Pills.listener.transpose) {
        Pills.listener.transpose();
      }
    }

    /**
     * Re-parse the spec.
     *
     * @param {any} spec
     */
    function parse(spec) {
      if (Pills.listener) {
        Pills.listener.parse(spec);
      }
    }

    /**
     * Add Spec to be previewed (for Voyager2)
     *
     * @param {any} spec
     */
    function preview(enable, chart, listTitle) {
      if (Pills.listener) {
        Pills.listener.preview(enable, chart, listTitle);
      }
    }

    /**
     * Update the whole pill set
     *
     * @param {any} spec
     */
    function update(spec) {
      if (Pills.listener) {
        Pills.listener.update(spec);
      }
    }


    /** Reset Pills */
    function reset() {
      if (Pills.listener) {
        Pills.listener.reset();
      }
    }

    /**
     * @param {any} pill pill being dragged
     * @param {any} cidDragFrom channel id that the pill is dragged from
     */
    function dragStart(pill, cidDragFrom) {
      Pills.dragging = pill;
      Pills.cidDragFrom = cidDragFrom;
    }

    /** Stop pill dragging */
    function dragStop() {
      Pills.dragging = null;
    }

    /**
     * When a pill is dropped
     * @param cidDragTo  channelId that's the pill is being dragged to
     */
    function dragDrop(cidDragTo) {
      if (Pills.listener) {
        Pills.listener.dragDrop(cidDragTo, Pills.cidDragFrom);
      }
    }

    return Pills;
  }]);
}());

;(function() {
'use strict';

// Service for serving VL Schema
angular.module('vlui')
  .factory('Schema', ['vg', 'vl', 'vlSchema', function(vg, vl, vlSchema) {
    var Schema = {};

    Schema.schema = vlSchema;

    Schema.getChannelSchema = function(channel) {
      var def = null;
      var encodingChannelProp = Schema.schema.definitions.Encoding.properties[channel];
      // for detail, just get the flat version
      var ref = encodingChannelProp ?
        (encodingChannelProp.$ref || encodingChannelProp.oneOf[0].$ref) :
        'FieldDef'; // just use the generic version for ANY channel
      def = ref.slice(ref.lastIndexOf('/')+1);
      return Schema.schema.definitions[def];
    };

    return Schema;
  }]);
}());

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImpzb24zLWNvbXBhY3RzdHJpbmdpZnkuanMiLCJ2bC1zY2hlbWEuanMiLCJpbmRleC5qcyIsInRlbXBsYXRlQ2FjaGVIdG1sLmpzIiwiZGF0YXNldC9hZGRteXJpYWRhdGFzZXQuanMiLCJkYXRhc2V0L2FkZHVybGRhdGFzZXQuanMiLCJkYXRhc2V0L2NoYW5nZWxvYWRlZGRhdGFzZXQuanMiLCJkYXRhc2V0L2RhdGFzZXQuc2VydmljZS5qcyIsImRhdGFzZXQvZGF0YXNldG1vZGFsLmpzIiwiZGF0YXNldC9kYXRhc2V0c2VsZWN0b3IuanMiLCJkYXRhc2V0L2ZpbGVkcm9wem9uZS5qcyIsImRhdGFzZXQvcGFzdGVkYXRhc2V0LmpzIiwiZGF0YXNldC9zYW1wbGVkYXRhLmpzIiwiY29tcG9uZW50cy9hbGVydG1lc3NhZ2VzL2FsZXJ0bWVzc2FnZXMuanMiLCJjb21wb25lbnRzL2Jvb2ttYXJrbGlzdC9ib29rbWFya2xpc3QuanMiLCJjb21wb25lbnRzL2NoYW5uZWxzaGVsZi9jaGFubmVsc2hlbGYuanMiLCJjb21wb25lbnRzL2ZpZWxkaW5mby9maWVsZGluZm8uanMiLCJjb21wb25lbnRzL2Z1bmN0aW9uc2VsZWN0L2Z1bmN0aW9uc2VsZWN0LmpzIiwiY29tcG9uZW50cy9tb2RhbC9tb2RhbC5qcyIsImNvbXBvbmVudHMvbW9kYWwvbW9kYWxjbG9zZWJ1dHRvbi5qcyIsImNvbXBvbmVudHMvbW9kYWwvbW9kYWxzLnNlcnZpY2UuanMiLCJjb21wb25lbnRzL3Byb3BlcnR5ZWRpdG9yL3Byb3BlcnR5ZWRpdG9yLmpzIiwiY29tcG9uZW50cy9zY2hlbWFsaXN0L3NjaGVtYWxpc3QuanMiLCJjb21wb25lbnRzL3NjaGVtYWxpc3Qvc2NoZW1hbGlzdGl0ZW0uanMiLCJjb21wb25lbnRzL3NoZWx2ZXMvc2hlbHZlcy5qcyIsImNvbXBvbmVudHMvdGFicy90YWIuanMiLCJjb21wb25lbnRzL3RhYnMvdGFic2V0LmpzIiwiY29tcG9uZW50cy92bHBsb3QvdmxwbG90LmpzIiwiY29tcG9uZW50cy92bHBsb3Rncm91cC92bHBsb3Rncm91cC5qcyIsImNvbXBvbmVudHMvdmxwbG90Z3JvdXAvdmxwbG90Z3JvdXBwb3B1cC5qcyIsImNvbXBvbmVudHMvdmxwbG90Z3JvdXBsaXN0L3ZscGxvdGdyb3VwbGlzdC5qcyIsImZpbHRlcnMvY29tcGFjdGpzb24vY29tcGFjdGpzb24uZmlsdGVyLmpzIiwiZmlsdGVycy9lbmNvZGV1cmkvZW5jb2RldXJpLmZpbHRlci5qcyIsImZpbHRlcnMvcmVwb3J0dXJsL3JlcG9ydHVybC5maWx0ZXIuanMiLCJmaWx0ZXJzL3VuZGVyc2NvcmUyc3BhY2UvdW5kZXJzY29yZTJzcGFjZS5maWx0ZXIuanMiLCJzZXJ2aWNlcy9hbGVydHMvYWxlcnRzLnNlcnZpY2UuanMiLCJzZXJ2aWNlcy9ib29rbWFya3MvYm9va21hcmtzLnNlcnZpY2UuanMiLCJzZXJ2aWNlcy9jaGFydC9jaGFydC5zZXJ2aWNlLmpzIiwic2VydmljZXMvY29uZmlnL2NvbmZpZy5zZXJ2aWNlLmpzIiwic2VydmljZXMvbG9nZ2VyL2xvZ2dlci5zZXJ2aWNlLmpzIiwic2VydmljZXMvcGlsbHMvcGlsbHMuc2VydmljZS5qcyIsInNlcnZpY2VzL3NjaGVtYS9zY2hlbWEuc2VydmljZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7QUFLQSxDQUFDLENBQUMsWUFBWTs7O0VBR1osSUFBSSxXQUFXLE9BQU8sV0FBVyxjQUFjLE9BQU87OztFQUd0RCxJQUFJLGNBQWM7SUFDaEIsWUFBWTtJQUNaLFVBQVU7Ozs7RUFJWixJQUFJLGNBQWMsWUFBWSxPQUFPLFlBQVksV0FBVyxDQUFDLFFBQVEsWUFBWTs7Ozs7O0VBTWpGLElBQUksT0FBTyxZQUFZLE9BQU8sV0FBVyxVQUFVO01BQy9DLGFBQWEsZUFBZSxZQUFZLE9BQU8sV0FBVyxVQUFVLENBQUMsT0FBTyxZQUFZLE9BQU8sVUFBVSxZQUFZOztFQUV6SCxJQUFJLGVBQWUsV0FBVyxjQUFjLGNBQWMsV0FBVyxjQUFj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T0FBTztHQUNaLFFBQVEsbUNBQVUsU0FBUyxJQUFJLElBQUksVUFBVTtJQUM1QyxJQUFJLFNBQVM7O0lBRWIsT0FBTyxTQUFTOztJQUVoQixPQUFPLG1CQUFtQixTQUFTLFNBQVM7TUFDMUMsSUFBSSxNQUFNO01BQ1YsSUFBSSxzQkFBc0IsT0FBTyxPQUFPLFlBQVksU0FBUyxXQUFXOztNQUV4RSxJQUFJLE1BQU07U0FDUCxvQkFBb0IsUUFBUSxvQkFBb0IsTUFBTSxHQUFHO1FBQzFEO01BQ0YsTUFBTSxJQUFJLE1BQU0sSUFBSSxZQUFZLEtBQUs7TUFDckMsT0FBTyxPQUFPLE9BQU8sWUFBWTs7O0lBR25DLE9BQU87O0FBRVgiLCJmaWxlIjoidmx1aS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIVxuICogSlNPTjMgd2l0aCBjb21wYWN0IHN0cmluZ2lmeSAtLSBNb2RpZmllZCBieSBLYW5pdCBXb25nc3VwaGFzYXdhdC4gICBodHRwczovL2dpdGh1Yi5jb20va2FuaXR3L2pzb24zXG4gKlxuICogRm9ya2VkIGZyb20gSlNPTiB2My4zLjIgfCBodHRwczovL2Jlc3RpZWpzLmdpdGh1Yi5pby9qc29uMyB8IENvcHlyaWdodCAyMDEyLTIwMTQsIEtpdCBDYW1icmlkZ2UgfCBodHRwOi8va2l0Lm1pdC1saWNlbnNlLm9yZ1xuICovXG47KGZ1bmN0aW9uICgpIHtcbiAgLy8gRGV0ZWN0IHRoZSBgZGVmaW5lYCBmdW5jdGlvbiBleHBvc2VkIGJ5IGFzeW5jaHJvbm91cyBtb2R1bGUgbG9hZGVycy4gVGhlXG4gIC8vIHN0cmljdCBgZGVmaW5lYCBjaGVjayBpcyBuZWNlc3NhcnkgZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBgci5qc2AuXG4gIHZhciBpc0xvYWRlciA9IHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmUuYW1kO1xuXG4gIC8vIEEgc2V0IG9mIHR5cGVzIHVzZWQgdG8gZGlzdGluZ3Vpc2ggb2JqZWN0cyBmcm9tIHByaW1pdGl2ZXMuXG4gIHZhciBvYmplY3RUeXBlcyA9IHtcbiAgICBcImZ1bmN0aW9uXCI6IHRydWUsXG4gICAgXCJvYmplY3RcIjogdHJ1ZVxuICB9O1xuXG4gIC8vIERldGVjdCB0aGUgYGV4cG9ydHNgIG9iamVjdCBleHBvc2VkIGJ5IENvbW1vbkpTIGltcGxlbWVudGF0aW9ucy5cbiAgdmFyIGZyZWVFeHBvcnRzID0gb2JqZWN0VHlwZXNbdHlwZW9mIGV4cG9ydHNdICYmIGV4cG9ydHMgJiYgIWV4cG9ydHMubm9kZVR5cGUgJiYgZXhwb3J0cztcblxuICAvLyBVc2UgdGhlIGBnbG9iYWxgIG9iamVjdCBleHBvc2VkIGJ5IE5vZGUgKGluY2x1ZGluZyBCcm93c2VyaWZ5IHZpYVxuICAvLyBgaW5zZXJ0LW1vZHVsZS1nbG9iYWxzYCksIE5hcndoYWwsIGFuZCBSaW5nbyBhcyB0aGUgZGVmYXVsdCBjb250ZXh0LFxuICAvLyBhbmQgdGhlIGB3aW5kb3dgIG9iamVjdCBpbiBicm93c2Vycy4gUmhpbm8gZXhwb3J0cyBhIGBnbG9iYWxgIGZ1bmN0aW9uXG4gIC8vIGluc3RlYWQuXG4gIHZhciByb290ID0gb2JqZWN0VHlwZXNbdHlwZW9mIHdpbmRvd10gJiYgd2luZG93IHx8IHRoaXMsXG4gICAgICBmcmVlR2xvYmFsID0gZnJlZUV4cG9ydHMgJiYgb2JqZWN0VHlwZXNbdHlwZW9mIG1vZHVsZV0gJiYgbW9kdWxlICYmICFtb2R1bGUubm9kZVR5cGUgJiYgdHlwZW9mIGdsb2JhbCA9PSBcIm9iamVjdFwiICYmIGdsb2JhbDtcblxuICBpZiAoZnJlZUdsb2JhbCAmJiAoZnJlZUdsb2JhbFtcImdsb2JhbFwiXSA9PT0gZnJlZUdsb2JhbCB8fCBmcmVlR2xvYmFsW1wid2luZG93XCJdID09PSBmcmVlR2xvYmFsIHx8IGZyZWVHbG9iYWxbXCJzZWxmXCJdID09PSBmcmVlR2xvYmFsKSkge1xuICAgIHJvb3QgPSBmcmVlR2xvYmFsO1xuICB9XG5cbiAgLy8gUHVibGljOiBJbml0aWFsaXplcyBKU09OIDMgdXNpbmcgdGhlIGdpdmVuIGBjb250ZXh0YCBvYmplY3QsIGF0dGFjaGluZyB0aGVcbiAgLy8gYHN0cmluZ2lmeWAgYW5kIGBwYXJzZWAgZnVuY3Rpb25zIHRvIHRoZSBzcGVjaWZpZWQgYGV4cG9ydHNgIG9iamVjdC5cbiAgZnVuY3Rpb24gcnVuSW5Db250ZXh0KGNvbnRleHQsIGV4cG9ydHMpIHtcbiAgICBjb250ZXh0IHx8IChjb250ZXh0ID0gcm9vdFtcIk9iamVjdFwiXSgpKTtcbiAgICBleHBvcnRzIHx8IChleHBvcnRzID0gcm9vdFtcIk9iamVjdFwiXSgpKTtcblxuICAgIC8vIE5hdGl2ZSBjb25zdHJ1Y3RvciBhbGlhc2VzLlxuICAgIHZhciBOdW1iZXIgPSBjb250ZXh0W1wiTnVtYmVyXCJdIHx8IHJvb3RbXCJOdW1iZXJcIl0sXG4gICAgICAgIFN0cmluZyA9IGNvbnRleHRbXCJTdHJpbmdcIl0gfHwgcm9vdFtcIlN0cmluZ1wiXSxcbiAgICAgICAgT2JqZWN0ID0gY29udGV4dFtcIk9iamVjdFwiXSB8fCByb290W1wiT2JqZWN0XCJdLFxuICAgICAgICBEYXRlID0gY29udGV4dFtcIkRhdGVcIl0gfHwgcm9vdFtcIkRhdGVcIl0sXG4gICAgICAgIFN5bnRheEVycm9yID0gY29udGV4dFtcIlN5bnRheEVycm9yXCJdIHx8IHJvb3RbXCJTeW50YXhFcnJvclwiXSxcbiAgICAgICAgVHlwZUVycm9yID0gY29udGV4dFtcIlR5cGVFcnJvclwiXSB8fCByb290W1wiVHlwZUVycm9yXCJdLFxuICAgICAgICBNYXRoID0gY29udGV4dFtcIk1hdGhcIl0gfHwgcm9vdFtcIk1hdGhcIl0sXG4gICAgICAgIG5hdGl2ZUpTT04gPSBjb250ZXh0W1wiSlNPTlwiXSB8fCByb290W1wiSlNPTlwiXTtcblxuICAgIC8vIERlbGVnYXRlIHRvIHRoZSBuYXRpdmUgYHN0cmluZ2lmeWAgYW5kIGBwYXJzZWAgaW1wbGVtZW50YXRpb25zLlxuICAgIGlmICh0eXBlb2YgbmF0aXZlSlNPTiA9PSBcIm9iamVjdFwiICYmIG5hdGl2ZUpTT04pIHtcbiAgICAgIGV4cG9ydHMuc3RyaW5naWZ5ID0gbmF0aXZlSlNPTi5zdHJpbmdpZnk7XG4gICAgICBleHBvcnRzLnBhcnNlID0gbmF0aXZlSlNPTi5wYXJzZTtcbiAgICB9XG5cbiAgICAvLyBDb252ZW5pZW5jZSBhbGlhc2VzLlxuICAgIHZhciBvYmplY3RQcm90byA9IE9iamVjdC5wcm90b3R5cGUsXG4gICAgICAgIGdldENsYXNzID0gb2JqZWN0UHJvdG8udG9TdHJpbmcsXG4gICAgICAgIGlzUHJvcGVydHksIGZvckVhY2gsIHVuZGVmO1xuXG4gICAgLy8gVGVzdCB0aGUgYERhdGUjZ2V0VVRDKmAgbWV0aG9kcy4gQmFzZWQgb24gd29yayBieSBAWWFmZmxlLlxuICAgIHZhciBpc0V4dGVuZGVkID0gbmV3IERhdGUoLTM1MDk4MjczMzQ1NzMyOTIpO1xuICAgIHRyeSB7XG4gICAgICAvLyBUaGUgYGdldFVUQ0Z1bGxZZWFyYCwgYE1vbnRoYCwgYW5kIGBEYXRlYCBtZXRob2RzIHJldHVybiBub25zZW5zaWNhbFxuICAgICAgLy8gcmVzdWx0cyBmb3IgY2VydGFpbiBkYXRlcyBpbiBPcGVyYSA+PSAxMC41My5cbiAgICAgIGlzRXh0ZW5kZWQgPSBpc0V4dGVuZGVkLmdldFVUQ0Z1bGxZZWFyKCkgPT0gLTEwOTI1MiAmJiBpc0V4dGVuZGVkLmdldFVUQ01vbnRoKCkgPT09IDAgJiYgaXNFeHRlbmRlZC5nZXRVVENEYXRlKCkgPT09IDEgJiZcbiAgICAgICAgLy8gU2FmYXJpIDwgMi4wLjIgc3RvcmVzIHRoZSBpbnRlcm5hbCBtaWxsaXNlY29uZCB0aW1lIHZhbHVlIGNvcnJlY3RseSxcbiAgICAgICAgLy8gYnV0IGNsaXBzIHRoZSB2YWx1ZXMgcmV0dXJuZWQgYnkgdGhlIGRhdGUgbWV0aG9kcyB0byB0aGUgcmFuZ2Ugb2ZcbiAgICAgICAgLy8gc2lnbmVkIDMyLWJpdCBpbnRlZ2VycyAoWy0yICoqIDMxLCAyICoqIDMxIC0gMV0pLlxuICAgICAgICBpc0V4dGVuZGVkLmdldFVUQ0hvdXJzKCkgPT0gMTAgJiYgaXNFeHRlbmRlZC5nZXRVVENNaW51dGVzKCkgPT0gMzcgJiYgaXNFeHRlbmRlZC5nZXRVVENTZWNvbmRzKCkgPT0gNiAmJiBpc0V4dGVuZGVkLmdldFVUQ01pbGxpc2Vjb25kcygpID09IDcwODtcbiAgICB9IGNhdGNoIChleGNlcHRpb24pIHt9XG5cbiAgICAvLyBJbnRlcm5hbDogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBuYXRpdmUgYEpTT04uc3RyaW5naWZ5YCBhbmQgYHBhcnNlYFxuICAgIC8vIGltcGxlbWVudGF0aW9ucyBhcmUgc3BlYy1jb21wbGlhbnQuIEJhc2VkIG9uIHdvcmsgYnkgS2VuIFNueWRlci5cbiAgICBmdW5jdGlvbiBoYXMobmFtZSkge1xuICAgICAgaWYgKGhhc1tuYW1lXSAhPT0gdW5kZWYpIHtcbiAgICAgICAgLy8gUmV0dXJuIGNhY2hlZCBmZWF0dXJlIHRlc3QgcmVzdWx0LlxuICAgICAgICByZXR1cm4gaGFzW25hbWVdO1xuICAgICAgfVxuICAgICAgdmFyIGlzU3VwcG9ydGVkO1xuICAgICAgaWYgKG5hbWUgPT0gXCJidWctc3RyaW5nLWNoYXItaW5kZXhcIikge1xuICAgICAgICAvLyBJRSA8PSA3IGRvZXNuJ3Qgc3VwcG9ydCBhY2Nlc3Npbmcgc3RyaW5nIGNoYXJhY3RlcnMgdXNpbmcgc3F1YXJlXG4gICAgICAgIC8vIGJyYWNrZXQgbm90YXRpb24uIElFIDggb25seSBzdXBwb3J0cyB0aGlzIGZvciBwcmltaXRpdmVzLlxuICAgICAgICBpc1N1cHBvcnRlZCA9IFwiYVwiWzBdICE9IFwiYVwiO1xuICAgICAgfSBlbHNlIGlmIChuYW1lID09IFwianNvblwiKSB7XG4gICAgICAgIC8vIEluZGljYXRlcyB3aGV0aGVyIGJvdGggYEpTT04uc3RyaW5naWZ5YCBhbmQgYEpTT04ucGFyc2VgIGFyZVxuICAgICAgICAvLyBzdXBwb3J0ZWQuXG4gICAgICAgIGlzU3VwcG9ydGVkID0gaGFzKFwianNvbi1zdHJpbmdpZnlcIikgJiYgaGFzKFwianNvbi1wYXJzZVwiKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB2YWx1ZSwgc2VyaWFsaXplZCA9ICd7XCJhXCI6WzEsdHJ1ZSxmYWxzZSxudWxsLFwiXFxcXHUwMDAwXFxcXGJcXFxcblxcXFxmXFxcXHJcXFxcdFwiXX0nO1xuICAgICAgICAvLyBUZXN0IGBKU09OLnN0cmluZ2lmeWAuXG4gICAgICAgIGlmIChuYW1lID09IFwianNvbi1zdHJpbmdpZnlcIikge1xuICAgICAgICAgIHZhciBzdHJpbmdpZnkgPSBleHBvcnRzLnN0cmluZ2lmeSwgc3RyaW5naWZ5U3VwcG9ydGVkID0gdHlwZW9mIHN0cmluZ2lmeSA9PSBcImZ1bmN0aW9uXCIgJiYgaXNFeHRlbmRlZDtcbiAgICAgICAgICBpZiAoc3RyaW5naWZ5U3VwcG9ydGVkKSB7XG4gICAgICAgICAgICAvLyBBIHRlc3QgZnVuY3Rpb24gb2JqZWN0IHdpdGggYSBjdXN0b20gYHRvSlNPTmAgbWV0aG9kLlxuICAgICAgICAgICAgKHZhbHVlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgIH0pLnRvSlNPTiA9IHZhbHVlO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgc3RyaW5naWZ5U3VwcG9ydGVkID1cbiAgICAgICAgICAgICAgICAvLyBGaXJlZm94IDMuMWIxIGFuZCBiMiBzZXJpYWxpemUgc3RyaW5nLCBudW1iZXIsIGFuZCBib29sZWFuXG4gICAgICAgICAgICAgICAgLy8gcHJpbWl0aXZlcyBhcyBvYmplY3QgbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KDApID09PSBcIjBcIiAmJlxuICAgICAgICAgICAgICAgIC8vIEZGIDMuMWIxLCBiMiwgYW5kIEpTT04gMiBzZXJpYWxpemUgd3JhcHBlZCBwcmltaXRpdmVzIGFzIG9iamVjdFxuICAgICAgICAgICAgICAgIC8vIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgTnVtYmVyKCkpID09PSBcIjBcIiAmJlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgU3RyaW5nKCkpID09ICdcIlwiJyAmJlxuICAgICAgICAgICAgICAgIC8vIEZGIDMuMWIxLCAyIHRocm93IGFuIGVycm9yIGlmIHRoZSB2YWx1ZSBpcyBgbnVsbGAsIGB1bmRlZmluZWRgLCBvclxuICAgICAgICAgICAgICAgIC8vIGRvZXMgbm90IGRlZmluZSBhIGNhbm9uaWNhbCBKU09OIHJlcHJlc2VudGF0aW9uICh0aGlzIGFwcGxpZXMgdG9cbiAgICAgICAgICAgICAgICAvLyBvYmplY3RzIHdpdGggYHRvSlNPTmAgcHJvcGVydGllcyBhcyB3ZWxsLCAqdW5sZXNzKiB0aGV5IGFyZSBuZXN0ZWRcbiAgICAgICAgICAgICAgICAvLyB3aXRoaW4gYW4gb2JqZWN0IG9yIGFycmF5KS5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoZ2V0Q2xhc3MpID09PSB1bmRlZiAmJlxuICAgICAgICAgICAgICAgIC8vIElFIDggc2VyaWFsaXplcyBgdW5kZWZpbmVkYCBhcyBgXCJ1bmRlZmluZWRcImAuIFNhZmFyaSA8PSA1LjEuNyBhbmRcbiAgICAgICAgICAgICAgICAvLyBGRiAzLjFiMyBwYXNzIHRoaXMgdGVzdC5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkodW5kZWYpID09PSB1bmRlZiAmJlxuICAgICAgICAgICAgICAgIC8vIFNhZmFyaSA8PSA1LjEuNyBhbmQgRkYgMy4xYjMgdGhyb3cgYEVycm9yYHMgYW5kIGBUeXBlRXJyb3JgcyxcbiAgICAgICAgICAgICAgICAvLyByZXNwZWN0aXZlbHksIGlmIHRoZSB2YWx1ZSBpcyBvbWl0dGVkIGVudGlyZWx5LlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeSgpID09PSB1bmRlZiAmJlxuICAgICAgICAgICAgICAgIC8vIEZGIDMuMWIxLCAyIHRocm93IGFuIGVycm9yIGlmIHRoZSBnaXZlbiB2YWx1ZSBpcyBub3QgYSBudW1iZXIsXG4gICAgICAgICAgICAgICAgLy8gc3RyaW5nLCBhcnJheSwgb2JqZWN0LCBCb29sZWFuLCBvciBgbnVsbGAgbGl0ZXJhbC4gVGhpcyBhcHBsaWVzIHRvXG4gICAgICAgICAgICAgICAgLy8gb2JqZWN0cyB3aXRoIGN1c3RvbSBgdG9KU09OYCBtZXRob2RzIGFzIHdlbGwsIHVubGVzcyB0aGV5IGFyZSBuZXN0ZWRcbiAgICAgICAgICAgICAgICAvLyBpbnNpZGUgb2JqZWN0IG9yIGFycmF5IGxpdGVyYWxzLiBZVUkgMy4wLjBiMSBpZ25vcmVzIGN1c3RvbSBgdG9KU09OYFxuICAgICAgICAgICAgICAgIC8vIG1ldGhvZHMgZW50aXJlbHkuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KHZhbHVlKSA9PT0gXCIxXCIgJiZcbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoW3ZhbHVlXSkgPT0gXCJbMV1cIiAmJlxuICAgICAgICAgICAgICAgIC8vIFByb3RvdHlwZSA8PSAxLjYuMSBzZXJpYWxpemVzIGBbdW5kZWZpbmVkXWAgYXMgYFwiW11cImAgaW5zdGVhZCBvZlxuICAgICAgICAgICAgICAgIC8vIGBcIltudWxsXVwiYC5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoW3VuZGVmXSkgPT0gXCJbbnVsbF1cIiAmJlxuICAgICAgICAgICAgICAgIC8vIFlVSSAzLjAuMGIxIGZhaWxzIHRvIHNlcmlhbGl6ZSBgbnVsbGAgbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG51bGwpID09IFwibnVsbFwiICYmXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIDIgaGFsdHMgc2VyaWFsaXphdGlvbiBpZiBhbiBhcnJheSBjb250YWlucyBhIGZ1bmN0aW9uOlxuICAgICAgICAgICAgICAgIC8vIGBbMSwgdHJ1ZSwgZ2V0Q2xhc3MsIDFdYCBzZXJpYWxpemVzIGFzIFwiWzEsdHJ1ZSxdLFwiLiBGRiAzLjFiM1xuICAgICAgICAgICAgICAgIC8vIGVsaWRlcyBub24tSlNPTiB2YWx1ZXMgZnJvbSBvYmplY3RzIGFuZCBhcnJheXMsIHVubGVzcyB0aGV5XG4gICAgICAgICAgICAgICAgLy8gZGVmaW5lIGN1c3RvbSBgdG9KU09OYCBtZXRob2RzLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShbdW5kZWYsIGdldENsYXNzLCBudWxsXSkgPT0gXCJbbnVsbCxudWxsLG51bGxdXCIgJiZcbiAgICAgICAgICAgICAgICAvLyBTaW1wbGUgc2VyaWFsaXphdGlvbiB0ZXN0LiBGRiAzLjFiMSB1c2VzIFVuaWNvZGUgZXNjYXBlIHNlcXVlbmNlc1xuICAgICAgICAgICAgICAgIC8vIHdoZXJlIGNoYXJhY3RlciBlc2NhcGUgY29kZXMgYXJlIGV4cGVjdGVkIChlLmcuLCBgXFxiYCA9PiBgXFx1MDAwOGApLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeSh7IFwiYVwiOiBbdmFsdWUsIHRydWUsIGZhbHNlLCBudWxsLCBcIlxceDAwXFxiXFxuXFxmXFxyXFx0XCJdIH0pID09IHNlcmlhbGl6ZWQgJiZcbiAgICAgICAgICAgICAgICAvLyBGRiAzLjFiMSBhbmQgYjIgaWdub3JlIHRoZSBgZmlsdGVyYCBhbmQgYHdpZHRoYCBhcmd1bWVudHMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG51bGwsIHZhbHVlKSA9PT0gXCIxXCIgJiZcbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoWzEsIDJdLCBudWxsLCAxKSA9PSBcIltcXG4gMSxcXG4gMlxcbl1cIiAmJlxuICAgICAgICAgICAgICAgIC8vIEpTT04gMiwgUHJvdG90eXBlIDw9IDEuNywgYW5kIG9sZGVyIFdlYktpdCBidWlsZHMgaW5jb3JyZWN0bHlcbiAgICAgICAgICAgICAgICAvLyBzZXJpYWxpemUgZXh0ZW5kZWQgeWVhcnMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBEYXRlKC04LjY0ZTE1KSkgPT0gJ1wiLTI3MTgyMS0wNC0yMFQwMDowMDowMC4wMDBaXCInICYmXG4gICAgICAgICAgICAgICAgLy8gVGhlIG1pbGxpc2Vjb25kcyBhcmUgb3B0aW9uYWwgaW4gRVMgNSwgYnV0IHJlcXVpcmVkIGluIDUuMS5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobmV3IERhdGUoOC42NGUxNSkpID09ICdcIisyNzU3NjAtMDktMTNUMDA6MDA6MDAuMDAwWlwiJyAmJlxuICAgICAgICAgICAgICAgIC8vIEZpcmVmb3ggPD0gMTEuMCBpbmNvcnJlY3RseSBzZXJpYWxpemVzIHllYXJzIHByaW9yIHRvIDAgYXMgbmVnYXRpdmVcbiAgICAgICAgICAgICAgICAvLyBmb3VyLWRpZ2l0IHllYXJzIGluc3RlYWQgb2Ygc2l4LWRpZ2l0IHllYXJzLiBDcmVkaXRzOiBAWWFmZmxlLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgRGF0ZSgtNjIxOTg3NTUyZTUpKSA9PSAnXCItMDAwMDAxLTAxLTAxVDAwOjAwOjAwLjAwMFpcIicgJiZcbiAgICAgICAgICAgICAgICAvLyBTYWZhcmkgPD0gNS4xLjUgYW5kIE9wZXJhID49IDEwLjUzIGluY29ycmVjdGx5IHNlcmlhbGl6ZSBtaWxsaXNlY29uZFxuICAgICAgICAgICAgICAgIC8vIHZhbHVlcyBsZXNzIHRoYW4gMTAwMC4gQ3JlZGl0czogQFlhZmZsZS5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobmV3IERhdGUoLTEpKSA9PSAnXCIxOTY5LTEyLTMxVDIzOjU5OjU5Ljk5OVpcIic7XG4gICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcbiAgICAgICAgICAgICAgc3RyaW5naWZ5U3VwcG9ydGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlzU3VwcG9ydGVkID0gc3RyaW5naWZ5U3VwcG9ydGVkO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRlc3QgYEpTT04ucGFyc2VgLlxuICAgICAgICBpZiAobmFtZSA9PSBcImpzb24tcGFyc2VcIikge1xuICAgICAgICAgIHZhciBwYXJzZSA9IGV4cG9ydHMucGFyc2U7XG4gICAgICAgICAgaWYgKHR5cGVvZiBwYXJzZSA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIC8vIEZGIDMuMWIxLCBiMiB3aWxsIHRocm93IGFuIGV4Y2VwdGlvbiBpZiBhIGJhcmUgbGl0ZXJhbCBpcyBwcm92aWRlZC5cbiAgICAgICAgICAgICAgLy8gQ29uZm9ybWluZyBpbXBsZW1lbnRhdGlvbnMgc2hvdWxkIGFsc28gY29lcmNlIHRoZSBpbml0aWFsIGFyZ3VtZW50IHRvXG4gICAgICAgICAgICAgIC8vIGEgc3RyaW5nIHByaW9yIHRvIHBhcnNpbmcuXG4gICAgICAgICAgICAgIGlmIChwYXJzZShcIjBcIikgPT09IDAgJiYgIXBhcnNlKGZhbHNlKSkge1xuICAgICAgICAgICAgICAgIC8vIFNpbXBsZSBwYXJzaW5nIHRlc3QuXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBwYXJzZShzZXJpYWxpemVkKTtcbiAgICAgICAgICAgICAgICB2YXIgcGFyc2VTdXBwb3J0ZWQgPSB2YWx1ZVtcImFcIl0ubGVuZ3RoID09IDUgJiYgdmFsdWVbXCJhXCJdWzBdID09PSAxO1xuICAgICAgICAgICAgICAgIGlmIChwYXJzZVN1cHBvcnRlZCkge1xuICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2FmYXJpIDw9IDUuMS4yIGFuZCBGRiAzLjFiMSBhbGxvdyB1bmVzY2FwZWQgdGFicyBpbiBzdHJpbmdzLlxuICAgICAgICAgICAgICAgICAgICBwYXJzZVN1cHBvcnRlZCA9ICFwYXJzZSgnXCJcXHRcIicpO1xuICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7fVxuICAgICAgICAgICAgICAgICAgaWYgKHBhcnNlU3VwcG9ydGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gRkYgNC4wIGFuZCA0LjAuMSBhbGxvdyBsZWFkaW5nIGArYCBzaWducyBhbmQgbGVhZGluZ1xuICAgICAgICAgICAgICAgICAgICAgIC8vIGRlY2ltYWwgcG9pbnRzLiBGRiA0LjAsIDQuMC4xLCBhbmQgSUUgOS0xMCBhbHNvIGFsbG93XG4gICAgICAgICAgICAgICAgICAgICAgLy8gY2VydGFpbiBvY3RhbCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICAgICAgICBwYXJzZVN1cHBvcnRlZCA9IHBhcnNlKFwiMDFcIikgIT09IDE7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge31cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlmIChwYXJzZVN1cHBvcnRlZCkge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIEZGIDQuMCwgNC4wLjEsIGFuZCBSaGlubyAxLjdSMy1SNCBhbGxvdyB0cmFpbGluZyBkZWNpbWFsXG4gICAgICAgICAgICAgICAgICAgICAgLy8gcG9pbnRzLiBUaGVzZSBlbnZpcm9ubWVudHMsIGFsb25nIHdpdGggRkYgMy4xYjEgYW5kIDIsXG4gICAgICAgICAgICAgICAgICAgICAgLy8gYWxzbyBhbGxvdyB0cmFpbGluZyBjb21tYXMgaW4gSlNPTiBvYmplY3RzIGFuZCBhcnJheXMuXG4gICAgICAgICAgICAgICAgICAgICAgcGFyc2VTdXBwb3J0ZWQgPSBwYXJzZShcIjEuXCIpICE9PSAxO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHt9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcbiAgICAgICAgICAgICAgcGFyc2VTdXBwb3J0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaXNTdXBwb3J0ZWQgPSBwYXJzZVN1cHBvcnRlZDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGhhc1tuYW1lXSA9ICEhaXNTdXBwb3J0ZWQ7XG4gICAgfVxuXG4gICAgaWYgKHRydWUpIHsgLy8gdXNlZCB0byBiZSAhaGFzKFwianNvblwiKVxuICAgICAgLy8gQ29tbW9uIGBbW0NsYXNzXV1gIG5hbWUgYWxpYXNlcy5cbiAgICAgIHZhciBmdW5jdGlvbkNsYXNzID0gXCJbb2JqZWN0IEZ1bmN0aW9uXVwiLFxuICAgICAgICAgIGRhdGVDbGFzcyA9IFwiW29iamVjdCBEYXRlXVwiLFxuICAgICAgICAgIG51bWJlckNsYXNzID0gXCJbb2JqZWN0IE51bWJlcl1cIixcbiAgICAgICAgICBzdHJpbmdDbGFzcyA9IFwiW29iamVjdCBTdHJpbmddXCIsXG4gICAgICAgICAgYXJyYXlDbGFzcyA9IFwiW29iamVjdCBBcnJheV1cIixcbiAgICAgICAgICBib29sZWFuQ2xhc3MgPSBcIltvYmplY3QgQm9vbGVhbl1cIjtcblxuICAgICAgLy8gRGV0ZWN0IGluY29tcGxldGUgc3VwcG9ydCBmb3IgYWNjZXNzaW5nIHN0cmluZyBjaGFyYWN0ZXJzIGJ5IGluZGV4LlxuICAgICAgdmFyIGNoYXJJbmRleEJ1Z2d5ID0gaGFzKFwiYnVnLXN0cmluZy1jaGFyLWluZGV4XCIpO1xuXG4gICAgICAvLyBEZWZpbmUgYWRkaXRpb25hbCB1dGlsaXR5IG1ldGhvZHMgaWYgdGhlIGBEYXRlYCBtZXRob2RzIGFyZSBidWdneS5cbiAgICAgIGlmICghaXNFeHRlbmRlZCkge1xuICAgICAgICB2YXIgZmxvb3IgPSBNYXRoLmZsb29yO1xuICAgICAgICAvLyBBIG1hcHBpbmcgYmV0d2VlbiB0aGUgbW9udGhzIG9mIHRoZSB5ZWFyIGFuZCB0aGUgbnVtYmVyIG9mIGRheXMgYmV0d2VlblxuICAgICAgICAvLyBKYW51YXJ5IDFzdCBhbmQgdGhlIGZpcnN0IG9mIHRoZSByZXNwZWN0aXZlIG1vbnRoLlxuICAgICAgICB2YXIgTW9udGhzID0gWzAsIDMxLCA1OSwgOTAsIDEyMCwgMTUxLCAxODEsIDIxMiwgMjQzLCAyNzMsIDMwNCwgMzM0XTtcbiAgICAgICAgLy8gSW50ZXJuYWw6IENhbGN1bGF0ZXMgdGhlIG51bWJlciBvZiBkYXlzIGJldHdlZW4gdGhlIFVuaXggZXBvY2ggYW5kIHRoZVxuICAgICAgICAvLyBmaXJzdCBkYXkgb2YgdGhlIGdpdmVuIG1vbnRoLlxuICAgICAgICB2YXIgZ2V0RGF5ID0gZnVuY3Rpb24gKHllYXIsIG1vbnRoKSB7XG4gICAgICAgICAgcmV0dXJuIE1vbnRoc1ttb250aF0gKyAzNjUgKiAoeWVhciAtIDE5NzApICsgZmxvb3IoKHllYXIgLSAxOTY5ICsgKG1vbnRoID0gKyhtb250aCA+IDEpKSkgLyA0KSAtIGZsb29yKCh5ZWFyIC0gMTkwMSArIG1vbnRoKSAvIDEwMCkgKyBmbG9vcigoeWVhciAtIDE2MDEgKyBtb250aCkgLyA0MDApO1xuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICAvLyBJbnRlcm5hbDogRGV0ZXJtaW5lcyBpZiBhIHByb3BlcnR5IGlzIGEgZGlyZWN0IHByb3BlcnR5IG9mIHRoZSBnaXZlblxuICAgICAgLy8gb2JqZWN0LiBEZWxlZ2F0ZXMgdG8gdGhlIG5hdGl2ZSBgT2JqZWN0I2hhc093blByb3BlcnR5YCBtZXRob2QuXG4gICAgICBpZiAoIShpc1Byb3BlcnR5ID0gb2JqZWN0UHJvdG8uaGFzT3duUHJvcGVydHkpKSB7XG4gICAgICAgIGlzUHJvcGVydHkgPSBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgICB2YXIgbWVtYmVycyA9IHt9LCBjb25zdHJ1Y3RvcjtcbiAgICAgICAgICBpZiAoKG1lbWJlcnMuX19wcm90b19fID0gbnVsbCwgbWVtYmVycy5fX3Byb3RvX18gPSB7XG4gICAgICAgICAgICAvLyBUaGUgKnByb3RvKiBwcm9wZXJ0eSBjYW5ub3QgYmUgc2V0IG11bHRpcGxlIHRpbWVzIGluIHJlY2VudFxuICAgICAgICAgICAgLy8gdmVyc2lvbnMgb2YgRmlyZWZveCBhbmQgU2VhTW9ua2V5LlxuICAgICAgICAgICAgXCJ0b1N0cmluZ1wiOiAxXG4gICAgICAgICAgfSwgbWVtYmVycykudG9TdHJpbmcgIT0gZ2V0Q2xhc3MpIHtcbiAgICAgICAgICAgIC8vIFNhZmFyaSA8PSAyLjAuMyBkb2Vzbid0IGltcGxlbWVudCBgT2JqZWN0I2hhc093blByb3BlcnR5YCwgYnV0XG4gICAgICAgICAgICAvLyBzdXBwb3J0cyB0aGUgbXV0YWJsZSAqcHJvdG8qIHByb3BlcnR5LlxuICAgICAgICAgICAgaXNQcm9wZXJ0eSA9IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAvLyBDYXB0dXJlIGFuZCBicmVhayB0aGUgb2JqZWN0J3MgcHJvdG90eXBlIGNoYWluIChzZWUgc2VjdGlvbiA4LjYuMlxuICAgICAgICAgICAgICAvLyBvZiB0aGUgRVMgNS4xIHNwZWMpLiBUaGUgcGFyZW50aGVzaXplZCBleHByZXNzaW9uIHByZXZlbnRzIGFuXG4gICAgICAgICAgICAgIC8vIHVuc2FmZSB0cmFuc2Zvcm1hdGlvbiBieSB0aGUgQ2xvc3VyZSBDb21waWxlci5cbiAgICAgICAgICAgICAgdmFyIG9yaWdpbmFsID0gdGhpcy5fX3Byb3RvX18sIHJlc3VsdCA9IHByb3BlcnR5IGluICh0aGlzLl9fcHJvdG9fXyA9IG51bGwsIHRoaXMpO1xuICAgICAgICAgICAgICAvLyBSZXN0b3JlIHRoZSBvcmlnaW5hbCBwcm90b3R5cGUgY2hhaW4uXG4gICAgICAgICAgICAgIHRoaXMuX19wcm90b19fID0gb3JpZ2luYWw7XG4gICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBDYXB0dXJlIGEgcmVmZXJlbmNlIHRvIHRoZSB0b3AtbGV2ZWwgYE9iamVjdGAgY29uc3RydWN0b3IuXG4gICAgICAgICAgICBjb25zdHJ1Y3RvciA9IG1lbWJlcnMuY29uc3RydWN0b3I7XG4gICAgICAgICAgICAvLyBVc2UgdGhlIGBjb25zdHJ1Y3RvcmAgcHJvcGVydHkgdG8gc2ltdWxhdGUgYE9iamVjdCNoYXNPd25Qcm9wZXJ0eWAgaW5cbiAgICAgICAgICAgIC8vIG90aGVyIGVudmlyb25tZW50cy5cbiAgICAgICAgICAgIGlzUHJvcGVydHkgPSBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgdmFyIHBhcmVudCA9ICh0aGlzLmNvbnN0cnVjdG9yIHx8IGNvbnN0cnVjdG9yKS5wcm90b3R5cGU7XG4gICAgICAgICAgICAgIHJldHVybiBwcm9wZXJ0eSBpbiB0aGlzICYmICEocHJvcGVydHkgaW4gcGFyZW50ICYmIHRoaXNbcHJvcGVydHldID09PSBwYXJlbnRbcHJvcGVydHldKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICAgIG1lbWJlcnMgPSBudWxsO1xuICAgICAgICAgIHJldHVybiBpc1Byb3BlcnR5LmNhbGwodGhpcywgcHJvcGVydHkpO1xuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICAvLyBJbnRlcm5hbDogTm9ybWFsaXplcyB0aGUgYGZvci4uLmluYCBpdGVyYXRpb24gYWxnb3JpdGhtIGFjcm9zc1xuICAgICAgLy8gZW52aXJvbm1lbnRzLiBFYWNoIGVudW1lcmF0ZWQga2V5IGlzIHlpZWxkZWQgdG8gYSBgY2FsbGJhY2tgIGZ1bmN0aW9uLlxuICAgICAgZm9yRWFjaCA9IGZ1bmN0aW9uIChvYmplY3QsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBzaXplID0gMCwgUHJvcGVydGllcywgbWVtYmVycywgcHJvcGVydHk7XG5cbiAgICAgICAgLy8gVGVzdHMgZm9yIGJ1Z3MgaW4gdGhlIGN1cnJlbnQgZW52aXJvbm1lbnQncyBgZm9yLi4uaW5gIGFsZ29yaXRobS4gVGhlXG4gICAgICAgIC8vIGB2YWx1ZU9mYCBwcm9wZXJ0eSBpbmhlcml0cyB0aGUgbm9uLWVudW1lcmFibGUgZmxhZyBmcm9tXG4gICAgICAgIC8vIGBPYmplY3QucHJvdG90eXBlYCBpbiBvbGRlciB2ZXJzaW9ucyBvZiBJRSwgTmV0c2NhcGUsIGFuZCBNb3ppbGxhLlxuICAgICAgICAoUHJvcGVydGllcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB0aGlzLnZhbHVlT2YgPSAwO1xuICAgICAgICB9KS5wcm90b3R5cGUudmFsdWVPZiA9IDA7XG5cbiAgICAgICAgLy8gSXRlcmF0ZSBvdmVyIGEgbmV3IGluc3RhbmNlIG9mIHRoZSBgUHJvcGVydGllc2AgY2xhc3MuXG4gICAgICAgIG1lbWJlcnMgPSBuZXcgUHJvcGVydGllcygpO1xuICAgICAgICBmb3IgKHByb3BlcnR5IGluIG1lbWJlcnMpIHtcbiAgICAgICAgICAvLyBJZ25vcmUgYWxsIHByb3BlcnRpZXMgaW5oZXJpdGVkIGZyb20gYE9iamVjdC5wcm90b3R5cGVgLlxuICAgICAgICAgIGlmIChpc1Byb3BlcnR5LmNhbGwobWVtYmVycywgcHJvcGVydHkpKSB7XG4gICAgICAgICAgICBzaXplKys7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFByb3BlcnRpZXMgPSBtZW1iZXJzID0gbnVsbDtcblxuICAgICAgICAvLyBOb3JtYWxpemUgdGhlIGl0ZXJhdGlvbiBhbGdvcml0aG0uXG4gICAgICAgIGlmICghc2l6ZSkge1xuICAgICAgICAgIC8vIEEgbGlzdCBvZiBub24tZW51bWVyYWJsZSBwcm9wZXJ0aWVzIGluaGVyaXRlZCBmcm9tIGBPYmplY3QucHJvdG90eXBlYC5cbiAgICAgICAgICBtZW1iZXJzID0gW1widmFsdWVPZlwiLCBcInRvU3RyaW5nXCIsIFwidG9Mb2NhbGVTdHJpbmdcIiwgXCJwcm9wZXJ0eUlzRW51bWVyYWJsZVwiLCBcImlzUHJvdG90eXBlT2ZcIiwgXCJoYXNPd25Qcm9wZXJ0eVwiLCBcImNvbnN0cnVjdG9yXCJdO1xuICAgICAgICAgIC8vIElFIDw9IDgsIE1vemlsbGEgMS4wLCBhbmQgTmV0c2NhcGUgNi4yIGlnbm9yZSBzaGFkb3dlZCBub24tZW51bWVyYWJsZVxuICAgICAgICAgIC8vIHByb3BlcnRpZXMuXG4gICAgICAgICAgZm9yRWFjaCA9IGZ1bmN0aW9uIChvYmplY3QsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB2YXIgaXNGdW5jdGlvbiA9IGdldENsYXNzLmNhbGwob2JqZWN0KSA9PSBmdW5jdGlvbkNsYXNzLCBwcm9wZXJ0eSwgbGVuZ3RoO1xuICAgICAgICAgICAgdmFyIGhhc1Byb3BlcnR5ID0gIWlzRnVuY3Rpb24gJiYgdHlwZW9mIG9iamVjdC5jb25zdHJ1Y3RvciAhPSBcImZ1bmN0aW9uXCIgJiYgb2JqZWN0VHlwZXNbdHlwZW9mIG9iamVjdC5oYXNPd25Qcm9wZXJ0eV0gJiYgb2JqZWN0Lmhhc093blByb3BlcnR5IHx8IGlzUHJvcGVydHk7XG4gICAgICAgICAgICBmb3IgKHByb3BlcnR5IGluIG9iamVjdCkge1xuICAgICAgICAgICAgICAvLyBHZWNrbyA8PSAxLjAgZW51bWVyYXRlcyB0aGUgYHByb3RvdHlwZWAgcHJvcGVydHkgb2YgZnVuY3Rpb25zIHVuZGVyXG4gICAgICAgICAgICAgIC8vIGNlcnRhaW4gY29uZGl0aW9uczsgSUUgZG9lcyBub3QuXG4gICAgICAgICAgICAgIGlmICghKGlzRnVuY3Rpb24gJiYgcHJvcGVydHkgPT0gXCJwcm90b3R5cGVcIikgJiYgaGFzUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHByb3BlcnR5KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gTWFudWFsbHkgaW52b2tlIHRoZSBjYWxsYmFjayBmb3IgZWFjaCBub24tZW51bWVyYWJsZSBwcm9wZXJ0eS5cbiAgICAgICAgICAgIGZvciAobGVuZ3RoID0gbWVtYmVycy5sZW5ndGg7IHByb3BlcnR5ID0gbWVtYmVyc1stLWxlbmd0aF07IGhhc1Byb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSkgJiYgY2FsbGJhY2socHJvcGVydHkpKTtcbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2UgaWYgKHNpemUgPT0gMikge1xuICAgICAgICAgIC8vIFNhZmFyaSA8PSAyLjAuNCBlbnVtZXJhdGVzIHNoYWRvd2VkIHByb3BlcnRpZXMgdHdpY2UuXG4gICAgICAgICAgZm9yRWFjaCA9IGZ1bmN0aW9uIChvYmplY3QsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgYSBzZXQgb2YgaXRlcmF0ZWQgcHJvcGVydGllcy5cbiAgICAgICAgICAgIHZhciBtZW1iZXJzID0ge30sIGlzRnVuY3Rpb24gPSBnZXRDbGFzcy5jYWxsKG9iamVjdCkgPT0gZnVuY3Rpb25DbGFzcywgcHJvcGVydHk7XG4gICAgICAgICAgICBmb3IgKHByb3BlcnR5IGluIG9iamVjdCkge1xuICAgICAgICAgICAgICAvLyBTdG9yZSBlYWNoIHByb3BlcnR5IG5hbWUgdG8gcHJldmVudCBkb3VibGUgZW51bWVyYXRpb24uIFRoZVxuICAgICAgICAgICAgICAvLyBgcHJvdG90eXBlYCBwcm9wZXJ0eSBvZiBmdW5jdGlvbnMgaXMgbm90IGVudW1lcmF0ZWQgZHVlIHRvIGNyb3NzLVxuICAgICAgICAgICAgICAvLyBlbnZpcm9ubWVudCBpbmNvbnNpc3RlbmNpZXMuXG4gICAgICAgICAgICAgIGlmICghKGlzRnVuY3Rpb24gJiYgcHJvcGVydHkgPT0gXCJwcm90b3R5cGVcIikgJiYgIWlzUHJvcGVydHkuY2FsbChtZW1iZXJzLCBwcm9wZXJ0eSkgJiYgKG1lbWJlcnNbcHJvcGVydHldID0gMSkgJiYgaXNQcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socHJvcGVydHkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBObyBidWdzIGRldGVjdGVkOyB1c2UgdGhlIHN0YW5kYXJkIGBmb3IuLi5pbmAgYWxnb3JpdGhtLlxuICAgICAgICAgIGZvckVhY2ggPSBmdW5jdGlvbiAob2JqZWN0LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIGlzRnVuY3Rpb24gPSBnZXRDbGFzcy5jYWxsKG9iamVjdCkgPT0gZnVuY3Rpb25DbGFzcywgcHJvcGVydHksIGlzQ29uc3RydWN0b3I7XG4gICAgICAgICAgICBmb3IgKHByb3BlcnR5IGluIG9iamVjdCkge1xuICAgICAgICAgICAgICBpZiAoIShpc0Z1bmN0aW9uICYmIHByb3BlcnR5ID09IFwicHJvdG90eXBlXCIpICYmIGlzUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KSAmJiAhKGlzQ29uc3RydWN0b3IgPSBwcm9wZXJ0eSA9PT0gXCJjb25zdHJ1Y3RvclwiKSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHByb3BlcnR5KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gTWFudWFsbHkgaW52b2tlIHRoZSBjYWxsYmFjayBmb3IgdGhlIGBjb25zdHJ1Y3RvcmAgcHJvcGVydHkgZHVlIHRvXG4gICAgICAgICAgICAvLyBjcm9zcy1lbnZpcm9ubWVudCBpbmNvbnNpc3RlbmNpZXMuXG4gICAgICAgICAgICBpZiAoaXNDb25zdHJ1Y3RvciB8fCBpc1Byb3BlcnR5LmNhbGwob2JqZWN0LCAocHJvcGVydHkgPSBcImNvbnN0cnVjdG9yXCIpKSkge1xuICAgICAgICAgICAgICBjYWxsYmFjayhwcm9wZXJ0eSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZm9yRWFjaChvYmplY3QsIGNhbGxiYWNrKTtcbiAgICAgIH07XG5cbiAgICAgIC8vIFB1YmxpYzogU2VyaWFsaXplcyBhIEphdmFTY3JpcHQgYHZhbHVlYCBhcyBhIEpTT04gc3RyaW5nLiBUaGUgb3B0aW9uYWxcbiAgICAgIC8vIGBmaWx0ZXJgIGFyZ3VtZW50IG1heSBzcGVjaWZ5IGVpdGhlciBhIGZ1bmN0aW9uIHRoYXQgYWx0ZXJzIGhvdyBvYmplY3QgYW5kXG4gICAgICAvLyBhcnJheSBtZW1iZXJzIGFyZSBzZXJpYWxpemVkLCBvciBhbiBhcnJheSBvZiBzdHJpbmdzIGFuZCBudW1iZXJzIHRoYXRcbiAgICAgIC8vIGluZGljYXRlcyB3aGljaCBwcm9wZXJ0aWVzIHNob3VsZCBiZSBzZXJpYWxpemVkLiBUaGUgb3B0aW9uYWwgYHdpZHRoYFxuICAgICAgLy8gYXJndW1lbnQgbWF5IGJlIGVpdGhlciBhIHN0cmluZyBvciBudW1iZXIgdGhhdCBzcGVjaWZpZXMgdGhlIGluZGVudGF0aW9uXG4gICAgICAvLyBsZXZlbCBvZiB0aGUgb3V0cHV0LlxuICAgICAgaWYgKHRydWUpIHtcbiAgICAgICAgLy8gSW50ZXJuYWw6IEEgbWFwIG9mIGNvbnRyb2wgY2hhcmFjdGVycyBhbmQgdGhlaXIgZXNjYXBlZCBlcXVpdmFsZW50cy5cbiAgICAgICAgdmFyIEVzY2FwZXMgPSB7XG4gICAgICAgICAgOTI6IFwiXFxcXFxcXFxcIixcbiAgICAgICAgICAzNDogJ1xcXFxcIicsXG4gICAgICAgICAgODogXCJcXFxcYlwiLFxuICAgICAgICAgIDEyOiBcIlxcXFxmXCIsXG4gICAgICAgICAgMTA6IFwiXFxcXG5cIixcbiAgICAgICAgICAxMzogXCJcXFxcclwiLFxuICAgICAgICAgIDk6IFwiXFxcXHRcIlxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBDb252ZXJ0cyBgdmFsdWVgIGludG8gYSB6ZXJvLXBhZGRlZCBzdHJpbmcgc3VjaCB0aGF0IGl0c1xuICAgICAgICAvLyBsZW5ndGggaXMgYXQgbGVhc3QgZXF1YWwgdG8gYHdpZHRoYC4gVGhlIGB3aWR0aGAgbXVzdCBiZSA8PSA2LlxuICAgICAgICB2YXIgbGVhZGluZ1plcm9lcyA9IFwiMDAwMDAwXCI7XG4gICAgICAgIHZhciB0b1BhZGRlZFN0cmluZyA9IGZ1bmN0aW9uICh3aWR0aCwgdmFsdWUpIHtcbiAgICAgICAgICAvLyBUaGUgYHx8IDBgIGV4cHJlc3Npb24gaXMgbmVjZXNzYXJ5IHRvIHdvcmsgYXJvdW5kIGEgYnVnIGluXG4gICAgICAgICAgLy8gT3BlcmEgPD0gNy41NHUyIHdoZXJlIGAwID09IC0wYCwgYnV0IGBTdHJpbmcoLTApICE9PSBcIjBcImAuXG4gICAgICAgICAgcmV0dXJuIChsZWFkaW5nWmVyb2VzICsgKHZhbHVlIHx8IDApKS5zbGljZSgtd2lkdGgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBEb3VibGUtcXVvdGVzIGEgc3RyaW5nIGB2YWx1ZWAsIHJlcGxhY2luZyBhbGwgQVNDSUkgY29udHJvbFxuICAgICAgICAvLyBjaGFyYWN0ZXJzIChjaGFyYWN0ZXJzIHdpdGggY29kZSB1bml0IHZhbHVlcyBiZXR3ZWVuIDAgYW5kIDMxKSB3aXRoXG4gICAgICAgIC8vIHRoZWlyIGVzY2FwZWQgZXF1aXZhbGVudHMuIFRoaXMgaXMgYW4gaW1wbGVtZW50YXRpb24gb2YgdGhlXG4gICAgICAgIC8vIGBRdW90ZSh2YWx1ZSlgIG9wZXJhdGlvbiBkZWZpbmVkIGluIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjMuXG4gICAgICAgIHZhciB1bmljb2RlUHJlZml4ID0gXCJcXFxcdTAwXCI7XG4gICAgICAgIHZhciBxdW90ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgIHZhciByZXN1bHQgPSAnXCInLCBpbmRleCA9IDAsIGxlbmd0aCA9IHZhbHVlLmxlbmd0aCwgdXNlQ2hhckluZGV4ID0gIWNoYXJJbmRleEJ1Z2d5IHx8IGxlbmd0aCA+IDEwO1xuICAgICAgICAgIHZhciBzeW1ib2xzID0gdXNlQ2hhckluZGV4ICYmIChjaGFySW5kZXhCdWdneSA/IHZhbHVlLnNwbGl0KFwiXCIpIDogdmFsdWUpO1xuICAgICAgICAgIGZvciAoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICAgICAgdmFyIGNoYXJDb2RlID0gdmFsdWUuY2hhckNvZGVBdChpbmRleCk7XG4gICAgICAgICAgICAvLyBJZiB0aGUgY2hhcmFjdGVyIGlzIGEgY29udHJvbCBjaGFyYWN0ZXIsIGFwcGVuZCBpdHMgVW5pY29kZSBvclxuICAgICAgICAgICAgLy8gc2hvcnRoYW5kIGVzY2FwZSBzZXF1ZW5jZTsgb3RoZXJ3aXNlLCBhcHBlbmQgdGhlIGNoYXJhY3RlciBhcy1pcy5cbiAgICAgICAgICAgIHN3aXRjaCAoY2hhckNvZGUpIHtcbiAgICAgICAgICAgICAgY2FzZSA4OiBjYXNlIDk6IGNhc2UgMTA6IGNhc2UgMTI6IGNhc2UgMTM6IGNhc2UgMzQ6IGNhc2UgOTI6XG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IEVzY2FwZXNbY2hhckNvZGVdO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA8IDMyKSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQgKz0gdW5pY29kZVByZWZpeCArIHRvUGFkZGVkU3RyaW5nKDIsIGNoYXJDb2RlLnRvU3RyaW5nKDE2KSk7XG4gICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IHVzZUNoYXJJbmRleCA/IHN5bWJvbHNbaW5kZXhdIDogdmFsdWUuY2hhckF0KGluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdCArICdcIic7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFJlY3Vyc2l2ZWx5IHNlcmlhbGl6ZXMgYW4gb2JqZWN0LiBJbXBsZW1lbnRzIHRoZVxuICAgICAgICAvLyBgU3RyKGtleSwgaG9sZGVyKWAsIGBKTyh2YWx1ZSlgLCBhbmQgYEpBKHZhbHVlKWAgb3BlcmF0aW9ucy5cbiAgICAgICAgdmFyIHNlcmlhbGl6ZSA9IGZ1bmN0aW9uIChwcm9wZXJ0eSwgb2JqZWN0LCBjYWxsYmFjaywgcHJvcGVydGllcywgd2hpdGVzcGFjZSwgaW5kZW50YXRpb24sIHN0YWNrLCBtYXhMaW5lTGVuZ3RoKSB7XG4gICAgICAgICAgdmFyIHZhbHVlLCBjbGFzc05hbWUsIHllYXIsIG1vbnRoLCBkYXRlLCB0aW1lLCBob3VycywgbWludXRlcywgc2Vjb25kcywgbWlsbGlzZWNvbmRzLCByZXN1bHRzLCBlbGVtZW50LCBpbmRleCwgbGVuZ3RoLCBwcmVmaXgsIHJlc3VsdDtcblxuICAgICAgICAgIG1heExpbmVMZW5ndGggPSBtYXhMaW5lTGVuZ3RoIHx8IDA7XG5cbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gTmVjZXNzYXJ5IGZvciBob3N0IG9iamVjdCBzdXBwb3J0LlxuICAgICAgICAgICAgdmFsdWUgPSBvYmplY3RbcHJvcGVydHldO1xuICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge31cbiAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09IFwib2JqZWN0XCIgJiYgdmFsdWUpIHtcbiAgICAgICAgICAgIGNsYXNzTmFtZSA9IGdldENsYXNzLmNhbGwodmFsdWUpO1xuICAgICAgICAgICAgaWYgKGNsYXNzTmFtZSA9PSBkYXRlQ2xhc3MgJiYgIWlzUHJvcGVydHkuY2FsbCh2YWx1ZSwgXCJ0b0pTT05cIikpIHtcbiAgICAgICAgICAgICAgaWYgKHZhbHVlID4gLTEgLyAwICYmIHZhbHVlIDwgMSAvIDApIHtcbiAgICAgICAgICAgICAgICAvLyBEYXRlcyBhcmUgc2VyaWFsaXplZCBhY2NvcmRpbmcgdG8gdGhlIGBEYXRlI3RvSlNPTmAgbWV0aG9kXG4gICAgICAgICAgICAgICAgLy8gc3BlY2lmaWVkIGluIEVTIDUuMSBzZWN0aW9uIDE1LjkuNS40NC4gU2VlIHNlY3Rpb24gMTUuOS4xLjE1XG4gICAgICAgICAgICAgICAgLy8gZm9yIHRoZSBJU08gODYwMSBkYXRlIHRpbWUgc3RyaW5nIGZvcm1hdC5cbiAgICAgICAgICAgICAgICBpZiAoZ2V0RGF5KSB7XG4gICAgICAgICAgICAgICAgICAvLyBNYW51YWxseSBjb21wdXRlIHRoZSB5ZWFyLCBtb250aCwgZGF0ZSwgaG91cnMsIG1pbnV0ZXMsXG4gICAgICAgICAgICAgICAgICAvLyBzZWNvbmRzLCBhbmQgbWlsbGlzZWNvbmRzIGlmIHRoZSBgZ2V0VVRDKmAgbWV0aG9kcyBhcmVcbiAgICAgICAgICAgICAgICAgIC8vIGJ1Z2d5LiBBZGFwdGVkIGZyb20gQFlhZmZsZSdzIGBkYXRlLXNoaW1gIHByb2plY3QuXG4gICAgICAgICAgICAgICAgICBkYXRlID0gZmxvb3IodmFsdWUgLyA4NjRlNSk7XG4gICAgICAgICAgICAgICAgICBmb3IgKHllYXIgPSBmbG9vcihkYXRlIC8gMzY1LjI0MjUpICsgMTk3MCAtIDE7IGdldERheSh5ZWFyICsgMSwgMCkgPD0gZGF0ZTsgeWVhcisrKTtcbiAgICAgICAgICAgICAgICAgIGZvciAobW9udGggPSBmbG9vcigoZGF0ZSAtIGdldERheSh5ZWFyLCAwKSkgLyAzMC40Mik7IGdldERheSh5ZWFyLCBtb250aCArIDEpIDw9IGRhdGU7IG1vbnRoKyspO1xuICAgICAgICAgICAgICAgICAgZGF0ZSA9IDEgKyBkYXRlIC0gZ2V0RGF5KHllYXIsIG1vbnRoKTtcbiAgICAgICAgICAgICAgICAgIC8vIFRoZSBgdGltZWAgdmFsdWUgc3BlY2lmaWVzIHRoZSB0aW1lIHdpdGhpbiB0aGUgZGF5IChzZWUgRVNcbiAgICAgICAgICAgICAgICAgIC8vIDUuMSBzZWN0aW9uIDE1LjkuMS4yKS4gVGhlIGZvcm11bGEgYChBICUgQiArIEIpICUgQmAgaXMgdXNlZFxuICAgICAgICAgICAgICAgICAgLy8gdG8gY29tcHV0ZSBgQSBtb2R1bG8gQmAsIGFzIHRoZSBgJWAgb3BlcmF0b3IgZG9lcyBub3RcbiAgICAgICAgICAgICAgICAgIC8vIGNvcnJlc3BvbmQgdG8gdGhlIGBtb2R1bG9gIG9wZXJhdGlvbiBmb3IgbmVnYXRpdmUgbnVtYmVycy5cbiAgICAgICAgICAgICAgICAgIHRpbWUgPSAodmFsdWUgJSA4NjRlNSArIDg2NGU1KSAlIDg2NGU1O1xuICAgICAgICAgICAgICAgICAgLy8gVGhlIGhvdXJzLCBtaW51dGVzLCBzZWNvbmRzLCBhbmQgbWlsbGlzZWNvbmRzIGFyZSBvYnRhaW5lZCBieVxuICAgICAgICAgICAgICAgICAgLy8gZGVjb21wb3NpbmcgdGhlIHRpbWUgd2l0aGluIHRoZSBkYXkuIFNlZSBzZWN0aW9uIDE1LjkuMS4xMC5cbiAgICAgICAgICAgICAgICAgIGhvdXJzID0gZmxvb3IodGltZSAvIDM2ZTUpICUgMjQ7XG4gICAgICAgICAgICAgICAgICBtaW51dGVzID0gZmxvb3IodGltZSAvIDZlNCkgJSA2MDtcbiAgICAgICAgICAgICAgICAgIHNlY29uZHMgPSBmbG9vcih0aW1lIC8gMWUzKSAlIDYwO1xuICAgICAgICAgICAgICAgICAgbWlsbGlzZWNvbmRzID0gdGltZSAlIDFlMztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgeWVhciA9IHZhbHVlLmdldFVUQ0Z1bGxZZWFyKCk7XG4gICAgICAgICAgICAgICAgICBtb250aCA9IHZhbHVlLmdldFVUQ01vbnRoKCk7XG4gICAgICAgICAgICAgICAgICBkYXRlID0gdmFsdWUuZ2V0VVRDRGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgaG91cnMgPSB2YWx1ZS5nZXRVVENIb3VycygpO1xuICAgICAgICAgICAgICAgICAgbWludXRlcyA9IHZhbHVlLmdldFVUQ01pbnV0ZXMoKTtcbiAgICAgICAgICAgICAgICAgIHNlY29uZHMgPSB2YWx1ZS5nZXRVVENTZWNvbmRzKCk7XG4gICAgICAgICAgICAgICAgICBtaWxsaXNlY29uZHMgPSB2YWx1ZS5nZXRVVENNaWxsaXNlY29uZHMoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gU2VyaWFsaXplIGV4dGVuZGVkIHllYXJzIGNvcnJlY3RseS5cbiAgICAgICAgICAgICAgICB2YWx1ZSA9ICh5ZWFyIDw9IDAgfHwgeWVhciA+PSAxZTQgPyAoeWVhciA8IDAgPyBcIi1cIiA6IFwiK1wiKSArIHRvUGFkZGVkU3RyaW5nKDYsIHllYXIgPCAwID8gLXllYXIgOiB5ZWFyKSA6IHRvUGFkZGVkU3RyaW5nKDQsIHllYXIpKSArXG4gICAgICAgICAgICAgICAgICBcIi1cIiArIHRvUGFkZGVkU3RyaW5nKDIsIG1vbnRoICsgMSkgKyBcIi1cIiArIHRvUGFkZGVkU3RyaW5nKDIsIGRhdGUpICtcbiAgICAgICAgICAgICAgICAgIC8vIE1vbnRocywgZGF0ZXMsIGhvdXJzLCBtaW51dGVzLCBhbmQgc2Vjb25kcyBzaG91bGQgaGF2ZSB0d29cbiAgICAgICAgICAgICAgICAgIC8vIGRpZ2l0czsgbWlsbGlzZWNvbmRzIHNob3VsZCBoYXZlIHRocmVlLlxuICAgICAgICAgICAgICAgICAgXCJUXCIgKyB0b1BhZGRlZFN0cmluZygyLCBob3VycykgKyBcIjpcIiArIHRvUGFkZGVkU3RyaW5nKDIsIG1pbnV0ZXMpICsgXCI6XCIgKyB0b1BhZGRlZFN0cmluZygyLCBzZWNvbmRzKSArXG4gICAgICAgICAgICAgICAgICAvLyBNaWxsaXNlY29uZHMgYXJlIG9wdGlvbmFsIGluIEVTIDUuMCwgYnV0IHJlcXVpcmVkIGluIDUuMS5cbiAgICAgICAgICAgICAgICAgIFwiLlwiICsgdG9QYWRkZWRTdHJpbmcoMywgbWlsbGlzZWNvbmRzKSArIFwiWlwiO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gbnVsbDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUudG9KU09OID09IFwiZnVuY3Rpb25cIiAmJiAoKGNsYXNzTmFtZSAhPSBudW1iZXJDbGFzcyAmJiBjbGFzc05hbWUgIT0gc3RyaW5nQ2xhc3MgJiYgY2xhc3NOYW1lICE9IGFycmF5Q2xhc3MpIHx8IGlzUHJvcGVydHkuY2FsbCh2YWx1ZSwgXCJ0b0pTT05cIikpKSB7XG4gICAgICAgICAgICAgIC8vIFByb3RvdHlwZSA8PSAxLjYuMSBhZGRzIG5vbi1zdGFuZGFyZCBgdG9KU09OYCBtZXRob2RzIHRvIHRoZVxuICAgICAgICAgICAgICAvLyBgTnVtYmVyYCwgYFN0cmluZ2AsIGBEYXRlYCwgYW5kIGBBcnJheWAgcHJvdG90eXBlcy4gSlNPTiAzXG4gICAgICAgICAgICAgIC8vIGlnbm9yZXMgYWxsIGB0b0pTT05gIG1ldGhvZHMgb24gdGhlc2Ugb2JqZWN0cyB1bmxlc3MgdGhleSBhcmVcbiAgICAgICAgICAgICAgLy8gZGVmaW5lZCBkaXJlY3RseSBvbiBhbiBpbnN0YW5jZS5cbiAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS50b0pTT04ocHJvcGVydHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgIC8vIElmIGEgcmVwbGFjZW1lbnQgZnVuY3Rpb24gd2FzIHByb3ZpZGVkLCBjYWxsIGl0IHRvIG9idGFpbiB0aGUgdmFsdWVcbiAgICAgICAgICAgIC8vIGZvciBzZXJpYWxpemF0aW9uLlxuICAgICAgICAgICAgdmFsdWUgPSBjYWxsYmFjay5jYWxsKG9iamVjdCwgcHJvcGVydHksIHZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJudWxsXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNsYXNzTmFtZSA9IGdldENsYXNzLmNhbGwodmFsdWUpO1xuICAgICAgICAgIGlmIChjbGFzc05hbWUgPT0gYm9vbGVhbkNsYXNzKSB7XG4gICAgICAgICAgICAvLyBCb29sZWFucyBhcmUgcmVwcmVzZW50ZWQgbGl0ZXJhbGx5LlxuICAgICAgICAgICAgcmV0dXJuIFwiXCIgKyB2YWx1ZTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGNsYXNzTmFtZSA9PSBudW1iZXJDbGFzcykge1xuICAgICAgICAgICAgLy8gSlNPTiBudW1iZXJzIG11c3QgYmUgZmluaXRlLiBgSW5maW5pdHlgIGFuZCBgTmFOYCBhcmUgc2VyaWFsaXplZCBhc1xuICAgICAgICAgICAgLy8gYFwibnVsbFwiYC5cbiAgICAgICAgICAgIHJldHVybiB2YWx1ZSA+IC0xIC8gMCAmJiB2YWx1ZSA8IDEgLyAwID8gXCJcIiArIHZhbHVlIDogXCJudWxsXCI7XG4gICAgICAgICAgfSBlbHNlIGlmIChjbGFzc05hbWUgPT0gc3RyaW5nQ2xhc3MpIHtcbiAgICAgICAgICAgIC8vIFN0cmluZ3MgYXJlIGRvdWJsZS1xdW90ZWQgYW5kIGVzY2FwZWQuXG4gICAgICAgICAgICByZXR1cm4gcXVvdGUoXCJcIiArIHZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gUmVjdXJzaXZlbHkgc2VyaWFsaXplIG9iamVjdHMgYW5kIGFycmF5cy5cbiAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGZvciBjeWNsaWMgc3RydWN0dXJlcy4gVGhpcyBpcyBhIGxpbmVhciBzZWFyY2g7IHBlcmZvcm1hbmNlXG4gICAgICAgICAgICAvLyBpcyBpbnZlcnNlbHkgcHJvcG9ydGlvbmFsIHRvIHRoZSBudW1iZXIgb2YgdW5pcXVlIG5lc3RlZCBvYmplY3RzLlxuICAgICAgICAgICAgZm9yIChsZW5ndGggPSBzdGFjay5sZW5ndGg7IGxlbmd0aC0tOykge1xuICAgICAgICAgICAgICBpZiAoc3RhY2tbbGVuZ3RoXSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBDeWNsaWMgc3RydWN0dXJlcyBjYW5ub3QgYmUgc2VyaWFsaXplZCBieSBgSlNPTi5zdHJpbmdpZnlgLlxuICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcigpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBBZGQgdGhlIG9iamVjdCB0byB0aGUgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHMuXG4gICAgICAgICAgICBzdGFjay5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgICAgIC8vIFNhdmUgdGhlIGN1cnJlbnQgaW5kZW50YXRpb24gbGV2ZWwgYW5kIGluZGVudCBvbmUgYWRkaXRpb25hbCBsZXZlbC5cbiAgICAgICAgICAgIHByZWZpeCA9IGluZGVudGF0aW9uO1xuICAgICAgICAgICAgaW5kZW50YXRpb24gKz0gd2hpdGVzcGFjZTtcbiAgICAgICAgICAgIGlmIChjbGFzc05hbWUgPT0gYXJyYXlDbGFzcykge1xuICAgICAgICAgICAgICB2YXIgdG90YWxMZW5ndGggPSBpbmRlbnRhdGlvbi5sZW5ndGgsIHJlc3VsdDtcbiAgICAgICAgICAgICAgLy8gUmVjdXJzaXZlbHkgc2VyaWFsaXplIGFycmF5IGVsZW1lbnRzLlxuICAgICAgICAgICAgICBmb3IgKGluZGV4ID0gMCwgbGVuZ3RoID0gdmFsdWUubGVuZ3RoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBzZXJpYWxpemUoaW5kZXgsIHZhbHVlLCBjYWxsYmFjaywgcHJvcGVydGllcywgd2hpdGVzcGFjZSwgaW5kZW50YXRpb24sXG4gICAgICAgICAgICAgICAgICBzdGFjaywgbWF4TGluZUxlbmd0aCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZWxlbWVudCA9PT0gdW5kZWYgPyBcIm51bGxcIiA6IGVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgdG90YWxMZW5ndGggKz0gcmVzdWx0Lmxlbmd0aCArIChpbmRleCA+IDAgPyAxIDogMCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHJlc3VsdCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmVzdWx0ID0gcmVzdWx0cy5sZW5ndGggP1xuICAgICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICAgIHdoaXRlc3BhY2UgJiYgKHRvdGFsTGVuZ3RoID4gbWF4TGluZUxlbmd0aCkgP1xuICAgICAgICAgICAgICAgICAgXCJbXFxuXCIgKyBpbmRlbnRhdGlvbiArIHJlc3VsdHMuam9pbihcIixcXG5cIiArIGluZGVudGF0aW9uKSArIFwiXFxuXCIgKyBwcmVmaXggKyBcIl1cIiA6XG4gICAgICAgICAgICAgICAgICBcIltcIiArIHJlc3VsdHMuam9pbihcIixcIikgKyBcIl1cIlxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICA6IFwiW11cIjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHZhciB0b3RhbExlbmd0aCA9IGluZGVudGF0aW9uLmxlbmd0aCwgaW5kZXg9MDtcbiAgICAgICAgICAgICAgLy8gUmVjdXJzaXZlbHkgc2VyaWFsaXplIG9iamVjdCBtZW1iZXJzLiBNZW1iZXJzIGFyZSBzZWxlY3RlZCBmcm9tXG4gICAgICAgICAgICAgIC8vIGVpdGhlciBhIHVzZXItc3BlY2lmaWVkIGxpc3Qgb2YgcHJvcGVydHkgbmFtZXMsIG9yIHRoZSBvYmplY3RcbiAgICAgICAgICAgICAgLy8gaXRzZWxmLlxuICAgICAgICAgICAgICBmb3JFYWNoKHByb3BlcnRpZXMgfHwgdmFsdWUsIGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHQsIGVsZW1lbnQgPSBzZXJpYWxpemUocHJvcGVydHksIHZhbHVlLCBjYWxsYmFjaywgcHJvcGVydGllcywgd2hpdGVzcGFjZSwgaW5kZW50YXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhY2ssIG1heExpbmVMZW5ndGgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQgIT09IHVuZGVmKSB7XG4gICAgICAgICAgICAgICAgICAvLyBBY2NvcmRpbmcgdG8gRVMgNS4xIHNlY3Rpb24gMTUuMTIuMzogXCJJZiBgZ2FwYCB7d2hpdGVzcGFjZX1cbiAgICAgICAgICAgICAgICAgIC8vIGlzIG5vdCB0aGUgZW1wdHkgc3RyaW5nLCBsZXQgYG1lbWJlcmAge3F1b3RlKHByb3BlcnR5KSArIFwiOlwifVxuICAgICAgICAgICAgICAgICAgLy8gYmUgdGhlIGNvbmNhdGVuYXRpb24gb2YgYG1lbWJlcmAgYW5kIHRoZSBgc3BhY2VgIGNoYXJhY3Rlci5cIlxuICAgICAgICAgICAgICAgICAgLy8gVGhlIFwiYHNwYWNlYCBjaGFyYWN0ZXJcIiByZWZlcnMgdG8gdGhlIGxpdGVyYWwgc3BhY2VcbiAgICAgICAgICAgICAgICAgIC8vIGNoYXJhY3Rlciwgbm90IHRoZSBgc3BhY2VgIHt3aWR0aH0gYXJndW1lbnQgcHJvdmlkZWQgdG9cbiAgICAgICAgICAgICAgICAgIC8vIGBKU09OLnN0cmluZ2lmeWAuXG4gICAgICAgICAgICAgICAgICByZXN1bHQgPSBxdW90ZShwcm9wZXJ0eSkgKyBcIjpcIiArICh3aGl0ZXNwYWNlID8gXCIgXCIgOiBcIlwiKSArIGVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgICB0b3RhbExlbmd0aCArPSByZXN1bHQubGVuZ3RoICsgKGluZGV4KysgPiAwID8gMSA6IDApO1xuICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgcmVzdWx0ID0gcmVzdWx0cy5sZW5ndGggP1xuICAgICAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgICAgIHdoaXRlc3BhY2UgJiYgKHRvdGFsTGVuZ3RoID4gbWF4TGluZUxlbmd0aCkgP1xuICAgICAgICAgICAgICAgICAgXCJ7XFxuXCIgKyBpbmRlbnRhdGlvbiArIHJlc3VsdHMuam9pbihcIixcXG5cIiArIGluZGVudGF0aW9uKSArIFwiXFxuXCIgKyBwcmVmaXggKyBcIn1cIiA6XG4gICAgICAgICAgICAgICAgICBcIntcIiArIHJlc3VsdHMuam9pbihcIixcIikgKyBcIn1cIlxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICA6IFwie31cIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgb2JqZWN0IGZyb20gdGhlIHRyYXZlcnNlZCBvYmplY3Qgc3RhY2suXG4gICAgICAgICAgICBzdGFjay5wb3AoKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFB1YmxpYzogYEpTT04uc3RyaW5naWZ5YC4gU2VlIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjMuXG5cbiAgICAgICAgZXhwb3J0cy5zdHJpbmdpZnkgPSBmdW5jdGlvbiAoc291cmNlLCBmaWx0ZXIsIHdpZHRoLCBtYXhMaW5lTGVuZ3RoKSB7XG4gICAgICAgICAgdmFyIHdoaXRlc3BhY2UsIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCBjbGFzc05hbWU7XG4gICAgICAgICAgaWYgKG9iamVjdFR5cGVzW3R5cGVvZiBmaWx0ZXJdICYmIGZpbHRlcikge1xuICAgICAgICAgICAgaWYgKChjbGFzc05hbWUgPSBnZXRDbGFzcy5jYWxsKGZpbHRlcikpID09IGZ1bmN0aW9uQ2xhc3MpIHtcbiAgICAgICAgICAgICAgY2FsbGJhY2sgPSBmaWx0ZXI7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNsYXNzTmFtZSA9PSBhcnJheUNsYXNzKSB7XG4gICAgICAgICAgICAgIC8vIENvbnZlcnQgdGhlIHByb3BlcnR5IG5hbWVzIGFycmF5IGludG8gYSBtYWtlc2hpZnQgc2V0LlxuICAgICAgICAgICAgICBwcm9wZXJ0aWVzID0ge307XG4gICAgICAgICAgICAgIGZvciAodmFyIGluZGV4ID0gMCwgbGVuZ3RoID0gZmlsdGVyLmxlbmd0aCwgdmFsdWU7IGluZGV4IDwgbGVuZ3RoOyB2YWx1ZSA9IGZpbHRlcltpbmRleCsrXSwgKChjbGFzc05hbWUgPSBnZXRDbGFzcy5jYWxsKHZhbHVlKSksIGNsYXNzTmFtZSA9PSBzdHJpbmdDbGFzcyB8fCBjbGFzc05hbWUgPT0gbnVtYmVyQ2xhc3MpICYmIChwcm9wZXJ0aWVzW3ZhbHVlXSA9IDEpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHdpZHRoKSB7XG4gICAgICAgICAgICBpZiAoKGNsYXNzTmFtZSA9IGdldENsYXNzLmNhbGwod2lkdGgpKSA9PSBudW1iZXJDbGFzcykge1xuICAgICAgICAgICAgICAvLyBDb252ZXJ0IHRoZSBgd2lkdGhgIHRvIGFuIGludGVnZXIgYW5kIGNyZWF0ZSBhIHN0cmluZyBjb250YWluaW5nXG4gICAgICAgICAgICAgIC8vIGB3aWR0aGAgbnVtYmVyIG9mIHNwYWNlIGNoYXJhY3RlcnMuXG4gICAgICAgICAgICAgIGlmICgod2lkdGggLT0gd2lkdGggJSAxKSA+IDApIHtcbiAgICAgICAgICAgICAgICBmb3IgKHdoaXRlc3BhY2UgPSBcIlwiLCB3aWR0aCA+IDEwICYmICh3aWR0aCA9IDEwKTsgd2hpdGVzcGFjZS5sZW5ndGggPCB3aWR0aDsgd2hpdGVzcGFjZSArPSBcIiBcIik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2xhc3NOYW1lID09IHN0cmluZ0NsYXNzKSB7XG4gICAgICAgICAgICAgIHdoaXRlc3BhY2UgPSB3aWR0aC5sZW5ndGggPD0gMTAgPyB3aWR0aCA6IHdpZHRoLnNsaWNlKDAsIDEwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gT3BlcmEgPD0gNy41NHUyIGRpc2NhcmRzIHRoZSB2YWx1ZXMgYXNzb2NpYXRlZCB3aXRoIGVtcHR5IHN0cmluZyBrZXlzXG4gICAgICAgICAgLy8gKGBcIlwiYCkgb25seSBpZiB0aGV5IGFyZSB1c2VkIGRpcmVjdGx5IHdpdGhpbiBhbiBvYmplY3QgbWVtYmVyIGxpc3RcbiAgICAgICAgICAvLyAoZS5nLiwgYCEoXCJcIiBpbiB7IFwiXCI6IDF9KWApLlxuICAgICAgICAgIHJldHVybiBzZXJpYWxpemUoXCJcIiwgKHZhbHVlID0ge30sIHZhbHVlW1wiXCJdID0gc291cmNlLCB2YWx1ZSksIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCB3aGl0ZXNwYWNlLCBcIlwiLCBbXSwgbWF4TGluZUxlbmd0aCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgZXhwb3J0cy5jb21wYWN0U3RyaW5naWZ5ID0gZnVuY3Rpb24gKHNvdXJjZSwgZmlsdGVyLCB3aWR0aCl7XG4gICAgICAgICAgcmV0dXJuIGV4cG9ydHMuc3RyaW5naWZ5KHNvdXJjZSwgZmlsdGVyLCB3aWR0aCwgNjApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIFB1YmxpYzogUGFyc2VzIGEgSlNPTiBzb3VyY2Ugc3RyaW5nLlxuICAgICAgaWYgKCFoYXMoXCJqc29uLXBhcnNlXCIpKSB7XG4gICAgICAgIHZhciBmcm9tQ2hhckNvZGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlO1xuXG4gICAgICAgIC8vIEludGVybmFsOiBBIG1hcCBvZiBlc2NhcGVkIGNvbnRyb2wgY2hhcmFjdGVycyBhbmQgdGhlaXIgdW5lc2NhcGVkXG4gICAgICAgIC8vIGVxdWl2YWxlbnRzLlxuICAgICAgICB2YXIgVW5lc2NhcGVzID0ge1xuICAgICAgICAgIDkyOiBcIlxcXFxcIixcbiAgICAgICAgICAzNDogJ1wiJyxcbiAgICAgICAgICA0NzogXCIvXCIsXG4gICAgICAgICAgOTg6IFwiXFxiXCIsXG4gICAgICAgICAgMTE2OiBcIlxcdFwiLFxuICAgICAgICAgIDExMDogXCJcXG5cIixcbiAgICAgICAgICAxMDI6IFwiXFxmXCIsXG4gICAgICAgICAgMTE0OiBcIlxcclwiXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFN0b3JlcyB0aGUgcGFyc2VyIHN0YXRlLlxuICAgICAgICB2YXIgSW5kZXgsIFNvdXJjZTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogUmVzZXRzIHRoZSBwYXJzZXIgc3RhdGUgYW5kIHRocm93cyBhIGBTeW50YXhFcnJvcmAuXG4gICAgICAgIHZhciBhYm9ydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBJbmRleCA9IFNvdXJjZSA9IG51bGw7XG4gICAgICAgICAgdGhyb3cgU3ludGF4RXJyb3IoKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogUmV0dXJucyB0aGUgbmV4dCB0b2tlbiwgb3IgYFwiJFwiYCBpZiB0aGUgcGFyc2VyIGhhcyByZWFjaGVkXG4gICAgICAgIC8vIHRoZSBlbmQgb2YgdGhlIHNvdXJjZSBzdHJpbmcuIEEgdG9rZW4gbWF5IGJlIGEgc3RyaW5nLCBudW1iZXIsIGBudWxsYFxuICAgICAgICAvLyBsaXRlcmFsLCBvciBCb29sZWFuIGxpdGVyYWwuXG4gICAgICAgIHZhciBsZXggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIHNvdXJjZSA9IFNvdXJjZSwgbGVuZ3RoID0gc291cmNlLmxlbmd0aCwgdmFsdWUsIGJlZ2luLCBwb3NpdGlvbiwgaXNTaWduZWQsIGNoYXJDb2RlO1xuICAgICAgICAgIHdoaWxlIChJbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCk7XG4gICAgICAgICAgICBzd2l0Y2ggKGNoYXJDb2RlKSB7XG4gICAgICAgICAgICAgIGNhc2UgOTogY2FzZSAxMDogY2FzZSAxMzogY2FzZSAzMjpcbiAgICAgICAgICAgICAgICAvLyBTa2lwIHdoaXRlc3BhY2UgdG9rZW5zLCBpbmNsdWRpbmcgdGFicywgY2FycmlhZ2UgcmV0dXJucywgbGluZVxuICAgICAgICAgICAgICAgIC8vIGZlZWRzLCBhbmQgc3BhY2UgY2hhcmFjdGVycy5cbiAgICAgICAgICAgICAgICBJbmRleCsrO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlIDEyMzogY2FzZSAxMjU6IGNhc2UgOTE6IGNhc2UgOTM6IGNhc2UgNTg6IGNhc2UgNDQ6XG4gICAgICAgICAgICAgICAgLy8gUGFyc2UgYSBwdW5jdHVhdG9yIHRva2VuIChge2AsIGB9YCwgYFtgLCBgXWAsIGA6YCwgb3IgYCxgKSBhdFxuICAgICAgICAgICAgICAgIC8vIHRoZSBjdXJyZW50IHBvc2l0aW9uLlxuICAgICAgICAgICAgICAgIHZhbHVlID0gY2hhckluZGV4QnVnZ3kgPyBzb3VyY2UuY2hhckF0KEluZGV4KSA6IHNvdXJjZVtJbmRleF07XG4gICAgICAgICAgICAgICAgSW5kZXgrKztcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICAgIGNhc2UgMzQ6XG4gICAgICAgICAgICAgICAgLy8gYFwiYCBkZWxpbWl0cyBhIEpTT04gc3RyaW5nOyBhZHZhbmNlIHRvIHRoZSBuZXh0IGNoYXJhY3RlciBhbmRcbiAgICAgICAgICAgICAgICAvLyBiZWdpbiBwYXJzaW5nIHRoZSBzdHJpbmcuIFN0cmluZyB0b2tlbnMgYXJlIHByZWZpeGVkIHdpdGggdGhlXG4gICAgICAgICAgICAgICAgLy8gc2VudGluZWwgYEBgIGNoYXJhY3RlciB0byBkaXN0aW5ndWlzaCB0aGVtIGZyb20gcHVuY3R1YXRvcnMgYW5kXG4gICAgICAgICAgICAgICAgLy8gZW5kLW9mLXN0cmluZyB0b2tlbnMuXG4gICAgICAgICAgICAgICAgZm9yICh2YWx1ZSA9IFwiQFwiLCBJbmRleCsrOyBJbmRleCA8IGxlbmd0aDspIHtcbiAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlIDwgMzIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVW5lc2NhcGVkIEFTQ0lJIGNvbnRyb2wgY2hhcmFjdGVycyAodGhvc2Ugd2l0aCBhIGNvZGUgdW5pdFxuICAgICAgICAgICAgICAgICAgICAvLyBsZXNzIHRoYW4gdGhlIHNwYWNlIGNoYXJhY3RlcikgYXJlIG5vdCBwZXJtaXR0ZWQuXG4gICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoYXJDb2RlID09IDkyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEEgcmV2ZXJzZSBzb2xpZHVzIChgXFxgKSBtYXJrcyB0aGUgYmVnaW5uaW5nIG9mIGFuIGVzY2FwZWRcbiAgICAgICAgICAgICAgICAgICAgLy8gY29udHJvbCBjaGFyYWN0ZXIgKGluY2x1ZGluZyBgXCJgLCBgXFxgLCBhbmQgYC9gKSBvciBVbmljb2RlXG4gICAgICAgICAgICAgICAgICAgIC8vIGVzY2FwZSBzZXF1ZW5jZS5cbiAgICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdCgrK0luZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChjaGFyQ29kZSkge1xuICAgICAgICAgICAgICAgICAgICAgIGNhc2UgOTI6IGNhc2UgMzQ6IGNhc2UgNDc6IGNhc2UgOTg6IGNhc2UgMTE2OiBjYXNlIDExMDogY2FzZSAxMDI6IGNhc2UgMTE0OlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmV2aXZlIGVzY2FwZWQgY29udHJvbCBjaGFyYWN0ZXJzLlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgKz0gVW5lc2NhcGVzW2NoYXJDb2RlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIEluZGV4Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICBjYXNlIDExNzpcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGBcXHVgIG1hcmtzIHRoZSBiZWdpbm5pbmcgb2YgYSBVbmljb2RlIGVzY2FwZSBzZXF1ZW5jZS5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFkdmFuY2UgdG8gdGhlIGZpcnN0IGNoYXJhY3RlciBhbmQgdmFsaWRhdGUgdGhlXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBmb3VyLWRpZ2l0IGNvZGUgcG9pbnQuXG4gICAgICAgICAgICAgICAgICAgICAgICBiZWdpbiA9ICsrSW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHBvc2l0aW9uID0gSW5kZXggKyA0OyBJbmRleCA8IHBvc2l0aW9uOyBJbmRleCsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBIHZhbGlkIHNlcXVlbmNlIGNvbXByaXNlcyBmb3VyIGhleGRpZ2l0cyAoY2FzZS1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaW5zZW5zaXRpdmUpIHRoYXQgZm9ybSBhIHNpbmdsZSBoZXhhZGVjaW1hbCB2YWx1ZS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEoY2hhckNvZGUgPj0gNDggJiYgY2hhckNvZGUgPD0gNTcgfHwgY2hhckNvZGUgPj0gOTcgJiYgY2hhckNvZGUgPD0gMTAyIHx8IGNoYXJDb2RlID49IDY1ICYmIGNoYXJDb2RlIDw9IDcwKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEludmFsaWQgVW5pY29kZSBlc2NhcGUgc2VxdWVuY2UuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmV2aXZlIHRoZSBlc2NhcGVkIGNoYXJhY3Rlci5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlICs9IGZyb21DaGFyQ29kZShcIjB4XCIgKyBzb3VyY2Uuc2xpY2UoYmVnaW4sIEluZGV4KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW52YWxpZCBlc2NhcGUgc2VxdWVuY2UuXG4gICAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPT0gMzQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBBbiB1bmVzY2FwZWQgZG91YmxlLXF1b3RlIGNoYXJhY3RlciBtYXJrcyB0aGUgZW5kIG9mIHRoZVxuICAgICAgICAgICAgICAgICAgICAgIC8vIHN0cmluZy5cbiAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgYmVnaW4gPSBJbmRleDtcbiAgICAgICAgICAgICAgICAgICAgLy8gT3B0aW1pemUgZm9yIHRoZSBjb21tb24gY2FzZSB3aGVyZSBhIHN0cmluZyBpcyB2YWxpZC5cbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGNoYXJDb2RlID49IDMyICYmIGNoYXJDb2RlICE9IDkyICYmIGNoYXJDb2RlICE9IDM0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdCgrK0luZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBBcHBlbmQgdGhlIHN0cmluZyBhcy1pcy5cbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgKz0gc291cmNlLnNsaWNlKGJlZ2luLCBJbmRleCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzb3VyY2UuY2hhckNvZGVBdChJbmRleCkgPT0gMzQpIHtcbiAgICAgICAgICAgICAgICAgIC8vIEFkdmFuY2UgdG8gdGhlIG5leHQgY2hhcmFjdGVyIGFuZCByZXR1cm4gdGhlIHJldml2ZWQgc3RyaW5nLlxuICAgICAgICAgICAgICAgICAgSW5kZXgrKztcbiAgICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gVW50ZXJtaW5hdGVkIHN0cmluZy5cbiAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vIFBhcnNlIG51bWJlcnMgYW5kIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgIGJlZ2luID0gSW5kZXg7XG4gICAgICAgICAgICAgICAgLy8gQWR2YW5jZSBwYXN0IHRoZSBuZWdhdGl2ZSBzaWduLCBpZiBvbmUgaXMgc3BlY2lmaWVkLlxuICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA9PSA0NSkge1xuICAgICAgICAgICAgICAgICAgaXNTaWduZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdCgrK0luZGV4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gUGFyc2UgYW4gaW50ZWdlciBvciBmbG9hdGluZy1wb2ludCB2YWx1ZS5cbiAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPj0gNDggJiYgY2hhckNvZGUgPD0gNTcpIHtcbiAgICAgICAgICAgICAgICAgIC8vIExlYWRpbmcgemVyb2VzIGFyZSBpbnRlcnByZXRlZCBhcyBvY3RhbCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA9PSA0OCAmJiAoKGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXggKyAxKSksIGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbGxlZ2FsIG9jdGFsIGxpdGVyYWwuXG4gICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpc1NpZ25lZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgLy8gUGFyc2UgdGhlIGludGVnZXIgY29tcG9uZW50LlxuICAgICAgICAgICAgICAgICAgZm9yICg7IEluZGV4IDwgbGVuZ3RoICYmICgoY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCkpLCBjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1Nyk7IEluZGV4KyspO1xuICAgICAgICAgICAgICAgICAgLy8gRmxvYXRzIGNhbm5vdCBjb250YWluIGEgbGVhZGluZyBkZWNpbWFsIHBvaW50OyBob3dldmVyLCB0aGlzXG4gICAgICAgICAgICAgICAgICAvLyBjYXNlIGlzIGFscmVhZHkgYWNjb3VudGVkIGZvciBieSB0aGUgcGFyc2VyLlxuICAgICAgICAgICAgICAgICAgaWYgKHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KSA9PSA0Nikge1xuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbiA9ICsrSW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIC8vIFBhcnNlIHRoZSBkZWNpbWFsIGNvbXBvbmVudC5cbiAgICAgICAgICAgICAgICAgICAgZm9yICg7IHBvc2l0aW9uIDwgbGVuZ3RoICYmICgoY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChwb3NpdGlvbikpLCBjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1Nyk7IHBvc2l0aW9uKyspO1xuICAgICAgICAgICAgICAgICAgICBpZiAocG9zaXRpb24gPT0gSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBJbGxlZ2FsIHRyYWlsaW5nIGRlY2ltYWwuXG4gICAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBJbmRleCA9IHBvc2l0aW9uO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgLy8gUGFyc2UgZXhwb25lbnRzLiBUaGUgYGVgIGRlbm90aW5nIHRoZSBleHBvbmVudCBpc1xuICAgICAgICAgICAgICAgICAgLy8gY2FzZS1pbnNlbnNpdGl2ZS5cbiAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID09IDEwMSB8fCBjaGFyQ29kZSA9PSA2OSkge1xuICAgICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KCsrSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICAvLyBTa2lwIHBhc3QgdGhlIHNpZ24gZm9sbG93aW5nIHRoZSBleHBvbmVudCwgaWYgb25lIGlzXG4gICAgICAgICAgICAgICAgICAgIC8vIHNwZWNpZmllZC5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID09IDQzIHx8IGNoYXJDb2RlID09IDQ1KSB7XG4gICAgICAgICAgICAgICAgICAgICAgSW5kZXgrKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBQYXJzZSB0aGUgZXhwb25lbnRpYWwgY29tcG9uZW50LlxuICAgICAgICAgICAgICAgICAgICBmb3IgKHBvc2l0aW9uID0gSW5kZXg7IHBvc2l0aW9uIDwgbGVuZ3RoICYmICgoY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChwb3NpdGlvbikpLCBjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1Nyk7IHBvc2l0aW9uKyspO1xuICAgICAgICAgICAgICAgICAgICBpZiAocG9zaXRpb24gPT0gSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBJbGxlZ2FsIGVtcHR5IGV4cG9uZW50LlxuICAgICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgSW5kZXggPSBwb3NpdGlvbjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIC8vIENvZXJjZSB0aGUgcGFyc2VkIHZhbHVlIHRvIGEgSmF2YVNjcmlwdCBudW1iZXIuXG4gICAgICAgICAgICAgICAgICByZXR1cm4gK3NvdXJjZS5zbGljZShiZWdpbiwgSW5kZXgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBBIG5lZ2F0aXZlIHNpZ24gbWF5IG9ubHkgcHJlY2VkZSBudW1iZXJzLlxuICAgICAgICAgICAgICAgIGlmIChpc1NpZ25lZCkge1xuICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gYHRydWVgLCBgZmFsc2VgLCBhbmQgYG51bGxgIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgIGlmIChzb3VyY2Uuc2xpY2UoSW5kZXgsIEluZGV4ICsgNCkgPT0gXCJ0cnVlXCIpIHtcbiAgICAgICAgICAgICAgICAgIEluZGV4ICs9IDQ7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNvdXJjZS5zbGljZShJbmRleCwgSW5kZXggKyA1KSA9PSBcImZhbHNlXCIpIHtcbiAgICAgICAgICAgICAgICAgIEluZGV4ICs9IDU7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzb3VyY2Uuc2xpY2UoSW5kZXgsIEluZGV4ICsgNCkgPT0gXCJudWxsXCIpIHtcbiAgICAgICAgICAgICAgICAgIEluZGV4ICs9IDQ7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gVW5yZWNvZ25pemVkIHRva2VuLlxuICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFJldHVybiB0aGUgc2VudGluZWwgYCRgIGNoYXJhY3RlciBpZiB0aGUgcGFyc2VyIGhhcyByZWFjaGVkIHRoZSBlbmRcbiAgICAgICAgICAvLyBvZiB0aGUgc291cmNlIHN0cmluZy5cbiAgICAgICAgICByZXR1cm4gXCIkXCI7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFBhcnNlcyBhIEpTT04gYHZhbHVlYCB0b2tlbi5cbiAgICAgICAgdmFyIGdldCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgIHZhciByZXN1bHRzLCBoYXNNZW1iZXJzO1xuICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIiRcIikge1xuICAgICAgICAgICAgLy8gVW5leHBlY3RlZCBlbmQgb2YgaW5wdXQuXG4gICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIGlmICgoY2hhckluZGV4QnVnZ3kgPyB2YWx1ZS5jaGFyQXQoMCkgOiB2YWx1ZVswXSkgPT0gXCJAXCIpIHtcbiAgICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBzZW50aW5lbCBgQGAgY2hhcmFjdGVyLlxuICAgICAgICAgICAgICByZXR1cm4gdmFsdWUuc2xpY2UoMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBQYXJzZSBvYmplY3QgYW5kIGFycmF5IGxpdGVyYWxzLlxuICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiW1wiKSB7XG4gICAgICAgICAgICAgIC8vIFBhcnNlcyBhIEpTT04gYXJyYXksIHJldHVybmluZyBhIG5ldyBKYXZhU2NyaXB0IGFycmF5LlxuICAgICAgICAgICAgICByZXN1bHRzID0gW107XG4gICAgICAgICAgICAgIGZvciAoOzsgaGFzTWVtYmVycyB8fCAoaGFzTWVtYmVycyA9IHRydWUpKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBsZXgoKTtcbiAgICAgICAgICAgICAgICAvLyBBIGNsb3Npbmcgc3F1YXJlIGJyYWNrZXQgbWFya3MgdGhlIGVuZCBvZiB0aGUgYXJyYXkgbGl0ZXJhbC5cbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJdXCIpIHtcbiAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgYXJyYXkgbGl0ZXJhbCBjb250YWlucyBlbGVtZW50cywgdGhlIGN1cnJlbnQgdG9rZW5cbiAgICAgICAgICAgICAgICAvLyBzaG91bGQgYmUgYSBjb21tYSBzZXBhcmF0aW5nIHRoZSBwcmV2aW91cyBlbGVtZW50IGZyb20gdGhlXG4gICAgICAgICAgICAgICAgLy8gbmV4dC5cbiAgICAgICAgICAgICAgICBpZiAoaGFzTWVtYmVycykge1xuICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiLFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gbGV4KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIl1cIikge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIFVuZXhwZWN0ZWQgdHJhaWxpbmcgYCxgIGluIGFycmF5IGxpdGVyYWwuXG4gICAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQSBgLGAgbXVzdCBzZXBhcmF0ZSBlYWNoIGFycmF5IGVsZW1lbnQuXG4gICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIEVsaXNpb25zIGFuZCBsZWFkaW5nIGNvbW1hcyBhcmUgbm90IHBlcm1pdHRlZC5cbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCIsXCIpIHtcbiAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaChnZXQodmFsdWUpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsdWUgPT0gXCJ7XCIpIHtcbiAgICAgICAgICAgICAgLy8gUGFyc2VzIGEgSlNPTiBvYmplY3QsIHJldHVybmluZyBhIG5ldyBKYXZhU2NyaXB0IG9iamVjdC5cbiAgICAgICAgICAgICAgcmVzdWx0cyA9IHt9O1xuICAgICAgICAgICAgICBmb3IgKDs7IGhhc01lbWJlcnMgfHwgKGhhc01lbWJlcnMgPSB0cnVlKSkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gbGV4KCk7XG4gICAgICAgICAgICAgICAgLy8gQSBjbG9zaW5nIGN1cmx5IGJyYWNlIG1hcmtzIHRoZSBlbmQgb2YgdGhlIG9iamVjdCBsaXRlcmFsLlxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIn1cIikge1xuICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIElmIHRoZSBvYmplY3QgbGl0ZXJhbCBjb250YWlucyBtZW1iZXJzLCB0aGUgY3VycmVudCB0b2tlblxuICAgICAgICAgICAgICAgIC8vIHNob3VsZCBiZSBhIGNvbW1hIHNlcGFyYXRvci5cbiAgICAgICAgICAgICAgICBpZiAoaGFzTWVtYmVycykge1xuICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiLFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gbGV4KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIn1cIikge1xuICAgICAgICAgICAgICAgICAgICAgIC8vIFVuZXhwZWN0ZWQgdHJhaWxpbmcgYCxgIGluIG9iamVjdCBsaXRlcmFsLlxuICAgICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEEgYCxgIG11c3Qgc2VwYXJhdGUgZWFjaCBvYmplY3QgbWVtYmVyLlxuICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBMZWFkaW5nIGNvbW1hcyBhcmUgbm90IHBlcm1pdHRlZCwgb2JqZWN0IHByb3BlcnR5IG5hbWVzIG11c3QgYmVcbiAgICAgICAgICAgICAgICAvLyBkb3VibGUtcXVvdGVkIHN0cmluZ3MsIGFuZCBhIGA6YCBtdXN0IHNlcGFyYXRlIGVhY2ggcHJvcGVydHlcbiAgICAgICAgICAgICAgICAvLyBuYW1lIGFuZCB2YWx1ZS5cbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCIsXCIgfHwgdHlwZW9mIHZhbHVlICE9IFwic3RyaW5nXCIgfHwgKGNoYXJJbmRleEJ1Z2d5ID8gdmFsdWUuY2hhckF0KDApIDogdmFsdWVbMF0pICE9IFwiQFwiIHx8IGxleCgpICE9IFwiOlwiKSB7XG4gICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHRzW3ZhbHVlLnNsaWNlKDEpXSA9IGdldChsZXgoKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBVbmV4cGVjdGVkIHRva2VuIGVuY291bnRlcmVkLlxuICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBVcGRhdGVzIGEgdHJhdmVyc2VkIG9iamVjdCBtZW1iZXIuXG4gICAgICAgIHZhciB1cGRhdGUgPSBmdW5jdGlvbiAoc291cmNlLCBwcm9wZXJ0eSwgY2FsbGJhY2spIHtcbiAgICAgICAgICB2YXIgZWxlbWVudCA9IHdhbGsoc291cmNlLCBwcm9wZXJ0eSwgY2FsbGJhY2spO1xuICAgICAgICAgIGlmIChlbGVtZW50ID09PSB1bmRlZikge1xuICAgICAgICAgICAgZGVsZXRlIHNvdXJjZVtwcm9wZXJ0eV07XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNvdXJjZVtwcm9wZXJ0eV0gPSBlbGVtZW50O1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogUmVjdXJzaXZlbHkgdHJhdmVyc2VzIGEgcGFyc2VkIEpTT04gb2JqZWN0LCBpbnZva2luZyB0aGVcbiAgICAgICAgLy8gYGNhbGxiYWNrYCBmdW5jdGlvbiBmb3IgZWFjaCB2YWx1ZS4gVGhpcyBpcyBhbiBpbXBsZW1lbnRhdGlvbiBvZiB0aGVcbiAgICAgICAgLy8gYFdhbGsoaG9sZGVyLCBuYW1lKWAgb3BlcmF0aW9uIGRlZmluZWQgaW4gRVMgNS4xIHNlY3Rpb24gMTUuMTIuMi5cbiAgICAgICAgdmFyIHdhbGsgPSBmdW5jdGlvbiAoc291cmNlLCBwcm9wZXJ0eSwgY2FsbGJhY2spIHtcbiAgICAgICAgICB2YXIgdmFsdWUgPSBzb3VyY2VbcHJvcGVydHldLCBsZW5ndGg7XG4gICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSBcIm9iamVjdFwiICYmIHZhbHVlKSB7XG4gICAgICAgICAgICAvLyBgZm9yRWFjaGAgY2FuJ3QgYmUgdXNlZCB0byB0cmF2ZXJzZSBhbiBhcnJheSBpbiBPcGVyYSA8PSA4LjU0XG4gICAgICAgICAgICAvLyBiZWNhdXNlIGl0cyBgT2JqZWN0I2hhc093blByb3BlcnR5YCBpbXBsZW1lbnRhdGlvbiByZXR1cm5zIGBmYWxzZWBcbiAgICAgICAgICAgIC8vIGZvciBhcnJheSBpbmRpY2VzIChlLmcuLCBgIVsxLCAyLCAzXS5oYXNPd25Qcm9wZXJ0eShcIjBcIilgKS5cbiAgICAgICAgICAgIGlmIChnZXRDbGFzcy5jYWxsKHZhbHVlKSA9PSBhcnJheUNsYXNzKSB7XG4gICAgICAgICAgICAgIGZvciAobGVuZ3RoID0gdmFsdWUubGVuZ3RoOyBsZW5ndGgtLTspIHtcbiAgICAgICAgICAgICAgICB1cGRhdGUodmFsdWUsIGxlbmd0aCwgY2FsbGJhY2spO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBmb3JFYWNoKHZhbHVlLCBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICB1cGRhdGUodmFsdWUsIHByb3BlcnR5LCBjYWxsYmFjayk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2suY2FsbChzb3VyY2UsIHByb3BlcnR5LCB2YWx1ZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUHVibGljOiBgSlNPTi5wYXJzZWAuIFNlZSBFUyA1LjEgc2VjdGlvbiAxNS4xMi4yLlxuICAgICAgICBleHBvcnRzLnBhcnNlID0gZnVuY3Rpb24gKHNvdXJjZSwgY2FsbGJhY2spIHtcbiAgICAgICAgICB2YXIgcmVzdWx0LCB2YWx1ZTtcbiAgICAgICAgICBJbmRleCA9IDA7XG4gICAgICAgICAgU291cmNlID0gXCJcIiArIHNvdXJjZTtcbiAgICAgICAgICByZXN1bHQgPSBnZXQobGV4KCkpO1xuICAgICAgICAgIC8vIElmIGEgSlNPTiBzdHJpbmcgY29udGFpbnMgbXVsdGlwbGUgdG9rZW5zLCBpdCBpcyBpbnZhbGlkLlxuICAgICAgICAgIGlmIChsZXgoKSAhPSBcIiRcIikge1xuICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gUmVzZXQgdGhlIHBhcnNlciBzdGF0ZS5cbiAgICAgICAgICBJbmRleCA9IFNvdXJjZSA9IG51bGw7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrICYmIGdldENsYXNzLmNhbGwoY2FsbGJhY2spID09IGZ1bmN0aW9uQ2xhc3MgPyB3YWxrKCh2YWx1ZSA9IHt9LCB2YWx1ZVtcIlwiXSA9IHJlc3VsdCwgdmFsdWUpLCBcIlwiLCBjYWxsYmFjaykgOiByZXN1bHQ7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgZXhwb3J0c1tcInJ1bkluQ29udGV4dFwiXSA9IHJ1bkluQ29udGV4dDtcbiAgICByZXR1cm4gZXhwb3J0cztcbiAgfVxuXG4gIGlmIChmcmVlRXhwb3J0cyAmJiAhaXNMb2FkZXIpIHtcbiAgICAvLyBFeHBvcnQgZm9yIENvbW1vbkpTIGVudmlyb25tZW50cy5cbiAgICBydW5JbkNvbnRleHQocm9vdCwgZnJlZUV4cG9ydHMpO1xuICB9IGVsc2Uge1xuICAgIC8vIEV4cG9ydCBmb3Igd2ViIGJyb3dzZXJzIGFuZCBKYXZhU2NyaXB0IGVuZ2luZXMuXG4gICAgdmFyIG5hdGl2ZUpTT04gPSByb290LkpTT04sXG4gICAgICAgIHByZXZpb3VzSlNPTiA9IHJvb3RbXCJKU09OM1wiXSxcbiAgICAgICAgaXNSZXN0b3JlZCA9IGZhbHNlO1xuXG4gICAgdmFyIEpTT04zID0gcnVuSW5Db250ZXh0KHJvb3QsIChyb290W1wiSlNPTjNcIl0gPSB7XG4gICAgICAvLyBQdWJsaWM6IFJlc3RvcmVzIHRoZSBvcmlnaW5hbCB2YWx1ZSBvZiB0aGUgZ2xvYmFsIGBKU09OYCBvYmplY3QgYW5kXG4gICAgICAvLyByZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSBgSlNPTjNgIG9iamVjdC5cbiAgICAgIFwibm9Db25mbGljdFwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghaXNSZXN0b3JlZCkge1xuICAgICAgICAgIGlzUmVzdG9yZWQgPSB0cnVlO1xuICAgICAgICAgIHJvb3QuSlNPTiA9IG5hdGl2ZUpTT047XG4gICAgICAgICAgcm9vdFtcIkpTT04zXCJdID0gcHJldmlvdXNKU09OO1xuICAgICAgICAgIG5hdGl2ZUpTT04gPSBwcmV2aW91c0pTT04gPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBKU09OMztcbiAgICAgIH1cbiAgICB9KSk7XG5cbiAgICByb290LkpTT04gPSB7XG4gICAgICBcInBhcnNlXCI6IEpTT04zLnBhcnNlLFxuICAgICAgXCJzdHJpbmdpZnlcIjogSlNPTjMuc3RyaW5naWZ5XG4gICAgfTtcbiAgfVxuXG4gIC8vIEV4cG9ydCBmb3IgYXN5bmNocm9ub3VzIG1vZHVsZSBsb2FkZXJzLlxuICBpZiAoaXNMb2FkZXIpIHtcbiAgICBkZWZpbmUoZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIEpTT04zO1xuICAgIH0pO1xuICB9XG59KS5jYWxsKHRoaXMpO1xuIiwid2luZG93LiAgICAgdmxTY2hlbWEgPSB7XG4gIFwib25lT2ZcIjogW1xuICAgIHtcbiAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRXh0ZW5kZWRVbml0U3BlY1wiLFxuICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlNjaGVtYSBmb3IgYSB1bml0IFZlZ2EtTGl0ZSBzcGVjaWZpY2F0aW9uLCB3aXRoIHRoZSBzeW50YWN0aWMgc3VnYXIgZXh0ZW5zaW9uczpcXG5cXG4tIGByb3dgIGFuZCBgY29sdW1uYCBhcmUgaW5jbHVkZWQgaW4gdGhlIGVuY29kaW5nLlxcblxcbi0gKEZ1dHVyZSkgbGFiZWwsIGJveCBwbG90XFxuXFxuXFxuXFxuTm90ZTogdGhlIHNwZWMgY291bGQgY29udGFpbiBmYWNldC5cIlxuICAgIH0sXG4gICAge1xuICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9GYWNldFNwZWNcIlxuICAgIH0sXG4gICAge1xuICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9MYXllclNwZWNcIlxuICAgIH1cbiAgXSxcbiAgXCJkZWZpbml0aW9uc1wiOiB7XG4gICAgXCJFeHRlbmRlZFVuaXRTcGVjXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJtYXJrXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL01hcmtcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG1hcmsgdHlwZS5cXG5cXG5PbmUgb2YgYFxcXCJiYXJcXFwiYCwgYFxcXCJjaXJjbGVcXFwiYCwgYFxcXCJzcXVhcmVcXFwiYCwgYFxcXCJ0aWNrXFxcImAsIGBcXFwibGluZVxcXCJgLFxcblxcbmBcXFwiYXJlYVxcXCJgLCBgXFxcInBvaW50XFxcImAsIGBcXFwicnVsZVxcXCJgLCBhbmQgYFxcXCJ0ZXh0XFxcImAuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJlbmNvZGluZ1wiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9FbmNvZGluZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIGtleS12YWx1ZSBtYXBwaW5nIGJldHdlZW4gZW5jb2RpbmcgY2hhbm5lbHMgYW5kIGRlZmluaXRpb24gb2YgZmllbGRzLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibmFtZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk5hbWUgb2YgdGhlIHZpc3VhbGl6YXRpb24gZm9yIGxhdGVyIHJlZmVyZW5jZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImRlc2NyaXB0aW9uXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb3B0aW9uYWwgZGVzY3JpcHRpb24gb2YgdGhpcyBtYXJrIGZvciBjb21tZW50aW5nIHB1cnBvc2UuXFxuXFxuVGhpcyBwcm9wZXJ0eSBoYXMgbm8gZWZmZWN0IG9uIHRoZSBvdXRwdXQgdmlzdWFsaXphdGlvbi5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImRhdGFcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRGF0YVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvYmplY3QgZGVzY3JpYmluZyB0aGUgZGF0YSBzb3VyY2VcIlxuICAgICAgICB9LFxuICAgICAgICBcInRyYW5zZm9ybVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UcmFuc2Zvcm1cIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb2JqZWN0IGRlc2NyaWJpbmcgZmlsdGVyIGFuZCBuZXcgZmllbGQgY2FsY3VsYXRpb24uXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjb25maWdcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNvbmZpZ3VyYXRpb24gb2JqZWN0XCJcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwicmVxdWlyZWRcIjogW1xuICAgICAgICBcIm1hcmtcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJNYXJrXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJhcmVhXCIsXG4gICAgICAgIFwiYmFyXCIsXG4gICAgICAgIFwibGluZVwiLFxuICAgICAgICBcInBvaW50XCIsXG4gICAgICAgIFwidGV4dFwiLFxuICAgICAgICBcInRpY2tcIixcbiAgICAgICAgXCJydWxlXCIsXG4gICAgICAgIFwiY2lyY2xlXCIsXG4gICAgICAgIFwic3F1YXJlXCIsXG4gICAgICAgIFwiZXJyb3JCYXJcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJFbmNvZGluZ1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwicm93XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1Bvc2l0aW9uQ2hhbm5lbERlZlwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJWZXJ0aWNhbCBmYWNldHMgZm9yIHRyZWxsaXMgcGxvdHMuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjb2x1bW5cIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUG9zaXRpb25DaGFubmVsRGVmXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkhvcml6b250YWwgZmFjZXRzIGZvciB0cmVsbGlzIHBsb3RzLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwieFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Qb3NpdGlvbkNoYW5uZWxEZWZcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiWCBjb29yZGluYXRlcyBmb3IgYHBvaW50YCwgYGNpcmNsZWAsIGBzcXVhcmVgLFxcblxcbmBsaW5lYCwgYHJ1bGVgLCBgdGV4dGAsIGFuZCBgdGlja2BcXG5cXG4ob3IgdG8gd2lkdGggYW5kIGhlaWdodCBmb3IgYGJhcmAgYW5kIGBhcmVhYCBtYXJrcykuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ5XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1Bvc2l0aW9uQ2hhbm5lbERlZlwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJZIGNvb3JkaW5hdGVzIGZvciBgcG9pbnRgLCBgY2lyY2xlYCwgYHNxdWFyZWAsXFxuXFxuYGxpbmVgLCBgcnVsZWAsIGB0ZXh0YCwgYW5kIGB0aWNrYFxcblxcbihvciB0byB3aWR0aCBhbmQgaGVpZ2h0IGZvciBgYmFyYCBhbmQgYGFyZWFgIG1hcmtzKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcIngyXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1Bvc2l0aW9uQ2hhbm5lbERlZlwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJYMiBjb29yZGluYXRlcyBmb3IgcmFuZ2VkIGBiYXJgLCBgcnVsZWAsIGBhcmVhYFwiXG4gICAgICAgIH0sXG4gICAgICAgIFwieTJcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUG9zaXRpb25DaGFubmVsRGVmXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlkyIGNvb3JkaW5hdGVzIGZvciByYW5nZWQgYGJhcmAsIGBydWxlYCwgYGFyZWFgXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjb2xvclwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9DaGFubmVsRGVmV2l0aExlZ2VuZFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDb2xvciBvZiB0aGUgbWFya3Mg4oCTIGVpdGhlciBmaWxsIG9yIHN0cm9rZSBjb2xvciBiYXNlZCBvbiBtYXJrIHR5cGUuXFxuXFxuKEJ5IGRlZmF1bHQsIGZpbGwgY29sb3IgZm9yIGBhcmVhYCwgYGJhcmAsIGB0aWNrYCwgYHRleHRgLCBgY2lyY2xlYCwgYW5kIGBzcXVhcmVgIC9cXG5cXG5zdHJva2UgY29sb3IgZm9yIGBsaW5lYCBhbmQgYHBvaW50YC4pXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJvcGFjaXR5XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NoYW5uZWxEZWZXaXRoTGVnZW5kXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk9wYWNpdHkgb2YgdGhlIG1hcmtzIOKAkyBlaXRoZXIgY2FuIGJlIGEgdmFsdWUgb3IgaW4gYSByYW5nZS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInNpemVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ2hhbm5lbERlZldpdGhMZWdlbmRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiU2l6ZSBvZiB0aGUgbWFyay5cXG5cXG4tIEZvciBgcG9pbnRgLCBgc3F1YXJlYCBhbmQgYGNpcmNsZWBcXG5cXG7igJMgdGhlIHN5bWJvbCBzaXplLCBvciBwaXhlbCBhcmVhIG9mIHRoZSBtYXJrLlxcblxcbi0gRm9yIGBiYXJgIGFuZCBgdGlja2Ag4oCTIHRoZSBiYXIgYW5kIHRpY2sncyBzaXplLlxcblxcbi0gRm9yIGB0ZXh0YCDigJMgdGhlIHRleHQncyBmb250IHNpemUuXFxuXFxuLSBTaXplIGlzIGN1cnJlbnRseSB1bnN1cHBvcnRlZCBmb3IgYGxpbmVgIGFuZCBgYXJlYWAuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzaGFwZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9DaGFubmVsRGVmV2l0aExlZ2VuZFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc3ltYm9sJ3Mgc2hhcGUgKG9ubHkgZm9yIGBwb2ludGAgbWFya3MpLiBUaGUgc3VwcG9ydGVkIHZhbHVlcyBhcmVcXG5cXG5gXFxcImNpcmNsZVxcXCJgIChkZWZhdWx0KSwgYFxcXCJzcXVhcmVcXFwiYCwgYFxcXCJjcm9zc1xcXCJgLCBgXFxcImRpYW1vbmRcXFwiYCwgYFxcXCJ0cmlhbmdsZS11cFxcXCJgLFxcblxcbm9yIGBcXFwidHJpYW5nbGUtZG93blxcXCJgLCBvciBlbHNlIGEgY3VzdG9tIFNWRyBwYXRoIHN0cmluZy5cIlxuICAgICAgICB9LFxuICAgICAgICBcImRldGFpbFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFkZGl0aW9uYWwgbGV2ZWxzIG9mIGRldGFpbCBmb3IgZ3JvdXBpbmcgZGF0YSBpbiBhZ2dyZWdhdGUgdmlld3MgYW5kXFxuXFxuaW4gbGluZSBhbmQgYXJlYSBtYXJrcyB3aXRob3V0IG1hcHBpbmcgZGF0YSB0byBhIHNwZWNpZmljIHZpc3VhbCBjaGFubmVsLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZpZWxkRGVmXCIsXG4gICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJbnRlcmZhY2UgZm9yIGFueSBraW5kIG9mIEZpZWxkRGVmO1xcblxcbkZvciBzaW1wbGljaXR5LCB3ZSBkbyBub3QgZGVjbGFyZSBtdWx0aXBsZSBpbnRlcmZhY2VzIG9mIEZpZWxkRGVmIGxpa2VcXG5cXG53ZSBkbyBmb3IgSlNPTiBzY2hlbWEuXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRmllbGREZWZcIixcbiAgICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSW50ZXJmYWNlIGZvciBhbnkga2luZCBvZiBGaWVsZERlZjtcXG5cXG5Gb3Igc2ltcGxpY2l0eSwgd2UgZG8gbm90IGRlY2xhcmUgbXVsdGlwbGUgaW50ZXJmYWNlcyBvZiBGaWVsZERlZiBsaWtlXFxuXFxud2UgZG8gZm9yIEpTT04gc2NoZW1hLlwiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwidGV4dFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9GaWVsZERlZlwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUZXh0IG9mIHRoZSBgdGV4dGAgbWFyay5cIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZpZWxkRGVmXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJwYXRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT3JkZXIgb2YgZGF0YSBwb2ludHMgaW4gbGluZSBtYXJrcy5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9PcmRlckNoYW5uZWxEZWZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9PcmRlckNoYW5uZWxEZWZcIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcIm9yZGVyXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTGF5ZXIgb3JkZXIgZm9yIG5vbi1zdGFja2VkIG1hcmtzLCBvciBzdGFjayBvcmRlciBmb3Igc3RhY2tlZCBtYXJrcy5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9PcmRlckNoYW5uZWxEZWZcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9PcmRlckNoYW5uZWxEZWZcIlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIlBvc2l0aW9uQ2hhbm5lbERlZlwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwiYXhpc1wiOiB7XG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9BeGlzXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwic2NhbGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvU2NhbGVcIlxuICAgICAgICB9LFxuICAgICAgICBcInNvcnRcIjoge1xuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1NvcnRGaWVsZFwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1NvcnRPcmRlclwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcImZpZWxkXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiTmFtZSBvZiB0aGUgZmllbGQgZnJvbSB3aGljaCB0byBwdWxsIGEgZGF0YSB2YWx1ZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInR5cGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVHlwZVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZW5jb2RlZCBmaWVsZCdzIHR5cGUgb2YgbWVhc3VyZW1lbnQuIFRoaXMgY2FuIGJlIGVpdGhlciBhIGZ1bGwgdHlwZVxcblxcbm5hbWUgKGBcXFwicXVhbnRpdGF0aXZlXFxcImAsIGBcXFwidGVtcG9yYWxcXFwiYCwgYFxcXCJvcmRpbmFsXFxcImAsICBhbmQgYFxcXCJub21pbmFsXFxcImApXFxuXFxub3IgYW4gaW5pdGlhbCBjaGFyYWN0ZXIgb2YgdGhlIHR5cGUgbmFtZSAoYFxcXCJRXFxcImAsIGBcXFwiVFxcXCJgLCBgXFxcIk9cXFwiYCwgYFxcXCJOXFxcImApLlxcblxcblRoaXMgcHJvcGVydHkgaXMgY2FzZSBpbnNlbnNpdGl2ZS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInZhbHVlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBjb25zdGFudCB2YWx1ZSBpbiB2aXN1YWwgZG9tYWluLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aW1lVW5pdFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UaW1lVW5pdFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaW1lIHVuaXQgZm9yIGEgYHRlbXBvcmFsYCBmaWVsZCAgKGUuZy4sIGB5ZWFyYCwgYHllYXJtb250aGAsIGBtb250aGAsIGBob3VyYCkuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJiaW5cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGbGFnIGZvciBiaW5uaW5nIGEgYHF1YW50aXRhdGl2ZWAgZmllbGQsIG9yIGEgYmluIHByb3BlcnR5IG9iamVjdFxcblxcbmZvciBiaW5uaW5nIHBhcmFtZXRlcnMuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9CaW5cIixcbiAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkJpbm5pbmcgcHJvcGVydGllcyBvciBib29sZWFuIGZsYWcgZm9yIGRldGVybWluaW5nIHdoZXRoZXIgdG8gYmluIGRhdGEgb3Igbm90LlwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcImFnZ3JlZ2F0ZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9BZ2dyZWdhdGVPcFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBZ2dyZWdhdGlvbiBmdW5jdGlvbiBmb3IgdGhlIGZpZWxkXFxuXFxuKGUuZy4sIGBtZWFuYCwgYHN1bWAsIGBtZWRpYW5gLCBgbWluYCwgYG1heGAsIGBjb3VudGApLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaXRsZSBmb3IgYXhpcyBvciBsZWdlbmQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJBeGlzXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJsYWJlbEFuZ2xlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHJvdGF0aW9uIGFuZ2xlIG9mIHRoZSBheGlzIGxhYmVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImZvcm1hdFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb3JtYXR0aW5nIHBhdHRlcm4gZm9yIGF4aXMgbGFiZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwib3JpZW50XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0F4aXNPcmllbnRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9yaWVudGF0aW9uIG9mIHRoZSBheGlzLiBPbmUgb2YgdG9wLCBib3R0b20sIGxlZnQgb3IgcmlnaHQuIFRoZSBvcmllbnRhdGlvbiBjYW4gYmUgdXNlZCB0byBmdXJ0aGVyIHNwZWNpYWxpemUgdGhlIGF4aXMgdHlwZSAoZS5nLiwgYSB5IGF4aXMgb3JpZW50ZWQgZm9yIHRoZSByaWdodCBlZGdlIG9mIHRoZSBjaGFydCkuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgdGl0bGUgZm9yIHRoZSBheGlzLiBTaG93cyBmaWVsZCBuYW1lIGFuZCBpdHMgZnVuY3Rpb24gYnkgZGVmYXVsdC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInZhbHVlc1wiOiB7XG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImF4aXNXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIldpZHRoIG9mIHRoZSBheGlzIGxpbmVcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImxheWVyXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBzdHJpbmcgaW5kaWNhdGluZyBpZiB0aGUgYXhpcyAoYW5kIGFueSBncmlkbGluZXMpIHNob3VsZCBiZSBwbGFjZWQgYWJvdmUgb3IgYmVsb3cgdGhlIGRhdGEgbWFya3MuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJvZmZzZXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb2Zmc2V0LCBpbiBwaXhlbHMsIGJ5IHdoaWNoIHRvIGRpc3BsYWNlIHRoZSBheGlzIGZyb20gdGhlIGVkZ2Ugb2YgdGhlIGVuY2xvc2luZyBncm91cCBvciBkYXRhIHJlY3RhbmdsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImF4aXNDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNvbG9yIG9mIGF4aXMgbGluZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImdyaWRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIGZsYWcgaW5kaWNhdGUgaWYgZ3JpZGxpbmVzIHNob3VsZCBiZSBjcmVhdGVkIGluIGFkZGl0aW9uIHRvIHRpY2tzLiBJZiBgZ3JpZGAgaXMgdW5zcGVjaWZpZWQsIHRoZSBkZWZhdWx0IHZhbHVlIGlzIGB0cnVlYCBmb3IgUk9XIGFuZCBDT0wuIEZvciBYIGFuZCBZLCB0aGUgZGVmYXVsdCB2YWx1ZSBpcyBgdHJ1ZWAgZm9yIHF1YW50aXRhdGl2ZSBhbmQgdGltZSBmaWVsZHMgYW5kIGBmYWxzZWAgb3RoZXJ3aXNlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcImdyaWRDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNvbG9yIG9mIGdyaWRsaW5lcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImdyaWREYXNoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9mZnNldCAoaW4gcGl4ZWxzKSBpbnRvIHdoaWNoIHRvIGJlZ2luIGRyYXdpbmcgd2l0aCB0aGUgZ3JpZCBkYXNoIGFycmF5LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJncmlkT3BhY2l0eVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzdHJva2Ugb3BhY2l0eSBvZiBncmlkICh2YWx1ZSBiZXR3ZWVuIFswLDFdKVwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JpZFdpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGdyaWQgd2lkdGgsIGluIHBpeGVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkVuYWJsZSBvciBkaXNhYmxlIGxhYmVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbEFsaWduXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGV4dCBhbGlnbm1lbnQgZm9yIHRoZSBMYWJlbC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsQmFzZWxpbmVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUZXh0IGJhc2VsaW5lIGZvciB0aGUgbGFiZWwuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbE1heExlbmd0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRydW5jYXRlIGxhYmVscyB0aGF0IGFyZSB0b28gbG9uZy5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMSxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInNob3J0VGltZUxhYmVsc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIldoZXRoZXIgbW9udGggYW5kIGRheSBuYW1lcyBzaG91bGQgYmUgYWJicmV2aWF0ZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3ViZGl2aWRlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSWYgcHJvdmlkZWQsIHNldHMgdGhlIG51bWJlciBvZiBtaW5vciB0aWNrcyBiZXR3ZWVuIG1ham9yIHRpY2tzICh0aGUgdmFsdWUgOSByZXN1bHRzIGluIGRlY2ltYWwgc3ViZGl2aXNpb24pLiBPbmx5IGFwcGxpY2FibGUgZm9yIGF4ZXMgdmlzdWFsaXppbmcgcXVhbnRpdGF0aXZlIHNjYWxlcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBkZXNpcmVkIG51bWJlciBvZiB0aWNrcywgZm9yIGF4ZXMgdmlzdWFsaXppbmcgcXVhbnRpdGF0aXZlIHNjYWxlcy4gVGhlIHJlc3VsdGluZyBudW1iZXIgbWF5IGJlIGRpZmZlcmVudCBzbyB0aGF0IHZhbHVlcyBhcmUgXFxcIm5pY2VcXFwiIChtdWx0aXBsZXMgb2YgMiwgNSwgMTApIGFuZCBsaWUgd2l0aGluIHRoZSB1bmRlcmx5aW5nIHNjYWxlJ3MgcmFuZ2UuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgY29sb3Igb2YgdGhlIGF4aXMncyB0aWNrLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja0xhYmVsQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgY29sb3Igb2YgdGhlIHRpY2sgbGFiZWwsIGNhbiBiZSBpbiBoZXggY29sb3IgY29kZSBvciByZWd1bGFyIGNvbG9yIG5hbWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrTGFiZWxGb250XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGZvbnQgb2YgdGhlIHRpY2sgbGFiZWwuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrTGFiZWxGb250U2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IHNpemUgb2YgbGFiZWwsIGluIHBpeGVscy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tQYWRkaW5nXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHBhZGRpbmcsIGluIHBpeGVscywgYmV0d2VlbiB0aWNrcyBhbmQgdGV4dCBsYWJlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrU2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplLCBpbiBwaXhlbHMsIG9mIG1ham9yLCBtaW5vciBhbmQgZW5kIHRpY2tzLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1NpemVNYWpvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplLCBpbiBwaXhlbHMsIG9mIG1ham9yIHRpY2tzLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1NpemVNaW5vclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplLCBpbiBwaXhlbHMsIG9mIG1pbm9yIHRpY2tzLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1NpemVFbmRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc2l6ZSwgaW4gcGl4ZWxzLCBvZiBlbmQgdGlja3MuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgd2lkdGgsIGluIHBpeGVscywgb2YgdGlja3MuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUNvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ29sb3Igb2YgdGhlIHRpdGxlLCBjYW4gYmUgaW4gaGV4IGNvbG9yIGNvZGUgb3IgcmVndWxhciBjb2xvciBuYW1lLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVGb250XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRm9udCBvZiB0aGUgdGl0bGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUZvbnRTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiU2l6ZSBvZiB0aGUgdGl0bGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUZvbnRXZWlnaHRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJXZWlnaHQgb2YgdGhlIHRpdGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVPZmZzZXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIHRpdGxlIG9mZnNldCB2YWx1ZSBmb3IgdGhlIGF4aXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZU1heExlbmd0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk1heCBsZW5ndGggZm9yIGF4aXMgdGl0bGUgaWYgdGhlIHRpdGxlIGlzIGF1dG9tYXRpY2FsbHkgZ2VuZXJhdGVkIGZyb20gdGhlIGZpZWxkJ3MgZGVzY3JpcHRpb24uIEJ5IGRlZmF1bHQsIHRoaXMgaXMgYXV0b21hdGljYWxseSBiYXNlZCBvbiBjZWxsIHNpemUgYW5kIGNoYXJhY3RlcldpZHRoIHByb3BlcnR5LlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY2hhcmFjdGVyV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDaGFyYWN0ZXIgd2lkdGggZm9yIGF1dG9tYXRpY2FsbHkgZGV0ZXJtaW5pbmcgdGl0bGUgbWF4IGxlbmd0aC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJPcHRpb25hbCBtYXJrIHByb3BlcnR5IGRlZmluaXRpb25zIGZvciBjdXN0b20gYXhpcyBzdHlsaW5nLlwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiQXhpc09yaWVudFwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwidG9wXCIsXG4gICAgICAgIFwicmlnaHRcIixcbiAgICAgICAgXCJsZWZ0XCIsXG4gICAgICAgIFwiYm90dG9tXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiU2NhbGVcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcInR5cGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvU2NhbGVUeXBlXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJkb21haW5cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZG9tYWluIG9mIHRoZSBzY2FsZSwgcmVwcmVzZW50aW5nIHRoZSBzZXQgb2YgZGF0YSB2YWx1ZXMuIEZvciBxdWFudGl0YXRpdmUgZGF0YSwgdGhpcyBjYW4gdGFrZSB0aGUgZm9ybSBvZiBhIHR3by1lbGVtZW50IGFycmF5IHdpdGggbWluaW11bSBhbmQgbWF4aW11bSB2YWx1ZXMuIEZvciBvcmRpbmFsL2NhdGVnb3JpY2FsIGRhdGEsIHRoaXMgbWF5IGJlIGFuIGFycmF5IG9mIHZhbGlkIGlucHV0IHZhbHVlcy5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJyYW5nZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSByYW5nZSBvZiB0aGUgc2NhbGUsIHJlcHJlc2VudGluZyB0aGUgc2V0IG9mIHZpc3VhbCB2YWx1ZXMuIEZvciBudW1lcmljIHZhbHVlcywgdGhlIHJhbmdlIGNhbiB0YWtlIHRoZSBmb3JtIG9mIGEgdHdvLWVsZW1lbnQgYXJyYXkgd2l0aCBtaW5pbXVtIGFuZCBtYXhpbXVtIHZhbHVlcy4gRm9yIG9yZGluYWwgb3IgcXVhbnRpemVkIGRhdGEsIHRoZSByYW5nZSBtYXkgYnkgYW4gYXJyYXkgb2YgZGVzaXJlZCBvdXRwdXQgdmFsdWVzLCB3aGljaCBhcmUgbWFwcGVkIHRvIGVsZW1lbnRzIGluIHRoZSBzcGVjaWZpZWQgZG9tYWluLiBGb3Igb3JkaW5hbCBzY2FsZXMgb25seSwgdGhlIHJhbmdlIGNhbiBiZSBkZWZpbmVkIHVzaW5nIGEgRGF0YVJlZjogdGhlIHJhbmdlIHZhbHVlcyBhcmUgdGhlbiBkcmF3biBkeW5hbWljYWxseSBmcm9tIGEgYmFja2luZyBkYXRhIHNldC5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwicm91bmRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJZiB0cnVlLCByb3VuZHMgbnVtZXJpYyBvdXRwdXQgdmFsdWVzIHRvIGludGVnZXJzLiBUaGlzIGNhbiBiZSBoZWxwZnVsIGZvciBzbmFwcGluZyB0byB0aGUgcGl4ZWwgZ3JpZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJiYW5kU2l6ZVwiOiB7XG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJwYWRkaW5nXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQXBwbGllcyBzcGFjaW5nIGFtb25nIG9yZGluYWwgZWxlbWVudHMgaW4gdGhlIHNjYWxlIHJhbmdlLiBUaGUgYWN0dWFsIGVmZmVjdCBkZXBlbmRzIG9uIGhvdyB0aGUgc2NhbGUgaXMgY29uZmlndXJlZC4gSWYgdGhlIF9fcG9pbnRzX18gcGFyYW1ldGVyIGlzIGB0cnVlYCwgdGhlIHBhZGRpbmcgdmFsdWUgaXMgaW50ZXJwcmV0ZWQgYXMgYSBtdWx0aXBsZSBvZiB0aGUgc3BhY2luZyBiZXR3ZWVuIHBvaW50cy4gQSByZWFzb25hYmxlIHZhbHVlIGlzIDEuMCwgc3VjaCB0aGF0IHRoZSBmaXJzdCBhbmQgbGFzdCBwb2ludCB3aWxsIGJlIG9mZnNldCBmcm9tIHRoZSBtaW5pbXVtIGFuZCBtYXhpbXVtIHZhbHVlIGJ5IGhhbGYgdGhlIGRpc3RhbmNlIGJldHdlZW4gcG9pbnRzLiBPdGhlcndpc2UsIHBhZGRpbmcgaXMgdHlwaWNhbGx5IGluIHRoZSByYW5nZSBbMCwgMV0gYW5kIGNvcnJlc3BvbmRzIHRvIHRoZSBmcmFjdGlvbiBvZiBzcGFjZSBpbiB0aGUgcmFuZ2UgaW50ZXJ2YWwgdG8gYWxsb2NhdGUgdG8gcGFkZGluZy4gQSB2YWx1ZSBvZiAwLjUgbWVhbnMgdGhhdCB0aGUgcmFuZ2UgYmFuZCB3aWR0aCB3aWxsIGJlIGVxdWFsIHRvIHRoZSBwYWRkaW5nIHdpZHRoLiBGb3IgbW9yZSwgc2VlIHRoZSBbRDMgb3JkaW5hbCBzY2FsZSBkb2N1bWVudGF0aW9uXShodHRwczovL2dpdGh1Yi5jb20vbWJvc3RvY2svZDMvd2lraS9PcmRpbmFsLVNjYWxlcykuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjbGFtcFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIklmIHRydWUsIHZhbHVlcyB0aGF0IGV4Y2VlZCB0aGUgZGF0YSBkb21haW4gYXJlIGNsYW1wZWQgdG8gZWl0aGVyIHRoZSBtaW5pbXVtIG9yIG1heGltdW0gcmFuZ2UgdmFsdWVcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJuaWNlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSWYgc3BlY2lmaWVkLCBtb2RpZmllcyB0aGUgc2NhbGUgZG9tYWluIHRvIHVzZSBhIG1vcmUgaHVtYW4tZnJpZW5kbHkgdmFsdWUgcmFuZ2UuIElmIHNwZWNpZmllZCBhcyBhIHRydWUgYm9vbGVhbiwgbW9kaWZpZXMgdGhlIHNjYWxlIGRvbWFpbiB0byB1c2UgYSBtb3JlIGh1bWFuLWZyaWVuZGx5IG51bWJlciByYW5nZSAoZS5nLiwgNyBpbnN0ZWFkIG9mIDYuOTYpLiBJZiBzcGVjaWZpZWQgYXMgYSBzdHJpbmcsIG1vZGlmaWVzIHRoZSBzY2FsZSBkb21haW4gdG8gdXNlIGEgbW9yZSBodW1hbi1mcmllbmRseSB2YWx1ZSByYW5nZS4gRm9yIHRpbWUgYW5kIHV0YyBzY2FsZSB0eXBlcyBvbmx5LCB0aGUgbmljZSB2YWx1ZSBzaG91bGQgYmUgYSBzdHJpbmcgaW5kaWNhdGluZyB0aGUgZGVzaXJlZCB0aW1lIGludGVydmFsLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvTmljZVRpbWVcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJleHBvbmVudFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlNldHMgdGhlIGV4cG9uZW50IG9mIHRoZSBzY2FsZSB0cmFuc2Zvcm1hdGlvbi4gRm9yIHBvdyBzY2FsZSB0eXBlcyBvbmx5LCBvdGhlcndpc2UgaWdub3JlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInplcm9cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJZiBgdHJ1ZWAsIGVuc3VyZXMgdGhhdCBhIHplcm8gYmFzZWxpbmUgdmFsdWUgaXMgaW5jbHVkZWQgaW4gdGhlIHNjYWxlIGRvbWFpbi5cXG5cXG5EZWZhdWx0IHZhbHVlOiBgdHJ1ZWAgZm9yIGB4YCBhbmQgYHlgIGNoYW5uZWwgaWYgdGhlIHF1YW50aXRhdGl2ZSBmaWVsZCBpcyBub3QgYmlubmVkXFxuXFxuYW5kIG5vIGN1c3RvbSBgZG9tYWluYCBpcyBwcm92aWRlZDsgYGZhbHNlYCBvdGhlcndpc2UuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidXNlUmF3RG9tYWluXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVXNlcyB0aGUgc291cmNlIGRhdGEgcmFuZ2UgYXMgc2NhbGUgZG9tYWluIGluc3RlYWQgb2YgYWdncmVnYXRlZCBkYXRhIGZvciBhZ2dyZWdhdGUgYXhpcy5cXG5cXG5UaGlzIHByb3BlcnR5IG9ubHkgd29ya3Mgd2l0aCBhZ2dyZWdhdGUgZnVuY3Rpb25zIHRoYXQgcHJvZHVjZSB2YWx1ZXMgd2l0aGluIHRoZSByYXcgZGF0YSBkb21haW4gKGBcXFwibWVhblxcXCJgLCBgXFxcImF2ZXJhZ2VcXFwiYCwgYFxcXCJzdGRldlxcXCJgLCBgXFxcInN0ZGV2cFxcXCJgLCBgXFxcIm1lZGlhblxcXCJgLCBgXFxcInExXFxcImAsIGBcXFwicTNcXFwiYCwgYFxcXCJtaW5cXFwiYCwgYFxcXCJtYXhcXFwiYCkuIEZvciBvdGhlciBhZ2dyZWdhdGlvbnMgdGhhdCBwcm9kdWNlIHZhbHVlcyBvdXRzaWRlIG9mIHRoZSByYXcgZGF0YSBkb21haW4gKGUuZy4gYFxcXCJjb3VudFxcXCJgLCBgXFxcInN1bVxcXCJgKSwgdGhpcyBwcm9wZXJ0eSBpcyBpZ25vcmVkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIlNjYWxlVHlwZVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwibGluZWFyXCIsXG4gICAgICAgIFwibG9nXCIsXG4gICAgICAgIFwicG93XCIsXG4gICAgICAgIFwic3FydFwiLFxuICAgICAgICBcInF1YW50aWxlXCIsXG4gICAgICAgIFwicXVhbnRpemVcIixcbiAgICAgICAgXCJvcmRpbmFsXCIsXG4gICAgICAgIFwidGltZVwiLFxuICAgICAgICBcInV0Y1wiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIk5pY2VUaW1lXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJzZWNvbmRcIixcbiAgICAgICAgXCJtaW51dGVcIixcbiAgICAgICAgXCJob3VyXCIsXG4gICAgICAgIFwiZGF5XCIsXG4gICAgICAgIFwid2Vla1wiLFxuICAgICAgICBcIm1vbnRoXCIsXG4gICAgICAgIFwieWVhclwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIlNvcnRGaWVsZFwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwiZmllbGRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZmllbGQgbmFtZSB0byBhZ2dyZWdhdGUgb3Zlci5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9wXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0FnZ3JlZ2F0ZU9wXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzb3J0IGFnZ3JlZ2F0aW9uIG9wZXJhdG9yXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJvcmRlclwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Tb3J0T3JkZXJcIlxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgXCJyZXF1aXJlZFwiOiBbXG4gICAgICAgIFwiZmllbGRcIixcbiAgICAgICAgXCJvcFwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIkFnZ3JlZ2F0ZU9wXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJ2YWx1ZXNcIixcbiAgICAgICAgXCJjb3VudFwiLFxuICAgICAgICBcInZhbGlkXCIsXG4gICAgICAgIFwibWlzc2luZ1wiLFxuICAgICAgICBcImRpc3RpbmN0XCIsXG4gICAgICAgIFwic3VtXCIsXG4gICAgICAgIFwibWVhblwiLFxuICAgICAgICBcImF2ZXJhZ2VcIixcbiAgICAgICAgXCJ2YXJpYW5jZVwiLFxuICAgICAgICBcInZhcmlhbmNlcFwiLFxuICAgICAgICBcInN0ZGV2XCIsXG4gICAgICAgIFwic3RkZXZwXCIsXG4gICAgICAgIFwibWVkaWFuXCIsXG4gICAgICAgIFwicTFcIixcbiAgICAgICAgXCJxM1wiLFxuICAgICAgICBcIm1vZGVza2V3XCIsXG4gICAgICAgIFwibWluXCIsXG4gICAgICAgIFwibWF4XCIsXG4gICAgICAgIFwiYXJnbWluXCIsXG4gICAgICAgIFwiYXJnbWF4XCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiU29ydE9yZGVyXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJhc2NlbmRpbmdcIixcbiAgICAgICAgXCJkZXNjZW5kaW5nXCIsXG4gICAgICAgIFwibm9uZVwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIlR5cGVcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcInF1YW50aXRhdGl2ZVwiLFxuICAgICAgICBcIm9yZGluYWxcIixcbiAgICAgICAgXCJ0ZW1wb3JhbFwiLFxuICAgICAgICBcIm5vbWluYWxcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJUaW1lVW5pdFwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwieWVhclwiLFxuICAgICAgICBcIm1vbnRoXCIsXG4gICAgICAgIFwiZGF5XCIsXG4gICAgICAgIFwiZGF0ZVwiLFxuICAgICAgICBcImhvdXJzXCIsXG4gICAgICAgIFwibWludXRlc1wiLFxuICAgICAgICBcInNlY29uZHNcIixcbiAgICAgICAgXCJtaWxsaXNlY29uZHNcIixcbiAgICAgICAgXCJ5ZWFybW9udGhcIixcbiAgICAgICAgXCJ5ZWFybW9udGhkYXRlXCIsXG4gICAgICAgIFwieWVhcm1vbnRoZGF0ZWhvdXJzXCIsXG4gICAgICAgIFwieWVhcm1vbnRoZGF0ZWhvdXJzbWludXRlc1wiLFxuICAgICAgICBcInllYXJtb250aGRhdGVob3Vyc21pbnV0ZXNzZWNvbmRzXCIsXG4gICAgICAgIFwiaG91cnNtaW51dGVzXCIsXG4gICAgICAgIFwiaG91cnNtaW51dGVzc2Vjb25kc1wiLFxuICAgICAgICBcIm1pbnV0ZXNzZWNvbmRzXCIsXG4gICAgICAgIFwic2Vjb25kc21pbGxpc2Vjb25kc1wiLFxuICAgICAgICBcInF1YXJ0ZXJcIixcbiAgICAgICAgXCJ5ZWFycXVhcnRlclwiLFxuICAgICAgICBcInF1YXJ0ZXJtb250aFwiLFxuICAgICAgICBcInllYXJxdWFydGVybW9udGhcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJCaW5cIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcIm1pblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBtaW5pbXVtIGJpbiB2YWx1ZSB0byBjb25zaWRlci4gSWYgdW5zcGVjaWZpZWQsIHRoZSBtaW5pbXVtIHZhbHVlIG9mIHRoZSBzcGVjaWZpZWQgZmllbGQgaXMgdXNlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcIm1heFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBtYXhpbXVtIGJpbiB2YWx1ZSB0byBjb25zaWRlci4gSWYgdW5zcGVjaWZpZWQsIHRoZSBtYXhpbXVtIHZhbHVlIG9mIHRoZSBzcGVjaWZpZWQgZmllbGQgaXMgdXNlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImJhc2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgbnVtYmVyIGJhc2UgdG8gdXNlIGZvciBhdXRvbWF0aWMgYmluIGRldGVybWluYXRpb24gKGRlZmF1bHQgaXMgYmFzZSAxMCkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdGVwXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gZXhhY3Qgc3RlcCBzaXplIHRvIHVzZSBiZXR3ZWVuIGJpbnMuIElmIHByb3ZpZGVkLCBvcHRpb25zIHN1Y2ggYXMgbWF4YmlucyB3aWxsIGJlIGlnbm9yZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdGVwc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIGFycmF5IG9mIGFsbG93YWJsZSBzdGVwIHNpemVzIHRvIGNob29zZSBmcm9tLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJtaW5zdGVwXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBtaW5pbXVtIGFsbG93YWJsZSBzdGVwIHNpemUgKHBhcnRpY3VsYXJseSB1c2VmdWwgZm9yIGludGVnZXIgdmFsdWVzKS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImRpdlwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlNjYWxlIGZhY3RvcnMgaW5kaWNhdGluZyBhbGxvd2FibGUgc3ViZGl2aXNpb25zLiBUaGUgZGVmYXVsdCB2YWx1ZSBpcyBbNSwgMl0sIHdoaWNoIGluZGljYXRlcyB0aGF0IGZvciBiYXNlIDEwIG51bWJlcnMgKHRoZSBkZWZhdWx0IGJhc2UpLCB0aGUgbWV0aG9kIG1heSBjb25zaWRlciBkaXZpZGluZyBiaW4gc2l6ZXMgYnkgNSBhbmQvb3IgMi4gRm9yIGV4YW1wbGUsIGZvciBhbiBpbml0aWFsIHN0ZXAgc2l6ZSBvZiAxMCwgdGhlIG1ldGhvZCBjYW4gY2hlY2sgaWYgYmluIHNpemVzIG9mIDIgKD0gMTAvNSksIDUgKD0gMTAvMiksIG9yIDEgKD0gMTAvKDUqMikpIG1pZ2h0IGFsc28gc2F0aXNmeSB0aGUgZ2l2ZW4gY29uc3RyYWludHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcIm1heGJpbnNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJNYXhpbXVtIG51bWJlciBvZiBiaW5zLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAyLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiQ2hhbm5lbERlZldpdGhMZWdlbmRcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImxlZ2VuZFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9MZWdlbmRcIlxuICAgICAgICB9LFxuICAgICAgICBcInNjYWxlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1NjYWxlXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzb3J0XCI6IHtcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Tb3J0RmllbGRcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Tb3J0T3JkZXJcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJmaWVsZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk5hbWUgb2YgdGhlIGZpZWxkIGZyb20gd2hpY2ggdG8gcHVsbCBhIGRhdGEgdmFsdWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0eXBlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1R5cGVcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGVuY29kZWQgZmllbGQncyB0eXBlIG9mIG1lYXN1cmVtZW50LiBUaGlzIGNhbiBiZSBlaXRoZXIgYSBmdWxsIHR5cGVcXG5cXG5uYW1lIChgXFxcInF1YW50aXRhdGl2ZVxcXCJgLCBgXFxcInRlbXBvcmFsXFxcImAsIGBcXFwib3JkaW5hbFxcXCJgLCAgYW5kIGBcXFwibm9taW5hbFxcXCJgKVxcblxcbm9yIGFuIGluaXRpYWwgY2hhcmFjdGVyIG9mIHRoZSB0eXBlIG5hbWUgKGBcXFwiUVxcXCJgLCBgXFxcIlRcXFwiYCwgYFxcXCJPXFxcImAsIGBcXFwiTlxcXCJgKS5cXG5cXG5UaGlzIHByb3BlcnR5IGlzIGNhc2UgaW5zZW5zaXRpdmUuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ2YWx1ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgY29uc3RhbnQgdmFsdWUgaW4gdmlzdWFsIGRvbWFpbi5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwidGltZVVuaXRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVGltZVVuaXRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGltZSB1bml0IGZvciBhIGB0ZW1wb3JhbGAgZmllbGQgIChlLmcuLCBgeWVhcmAsIGB5ZWFybW9udGhgLCBgbW9udGhgLCBgaG91cmApLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmluXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRmxhZyBmb3IgYmlubmluZyBhIGBxdWFudGl0YXRpdmVgIGZpZWxkLCBvciBhIGJpbiBwcm9wZXJ0eSBvYmplY3RcXG5cXG5mb3IgYmlubmluZyBwYXJhbWV0ZXJzLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQmluXCIsXG4gICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJCaW5uaW5nIHByb3BlcnRpZXMgb3IgYm9vbGVhbiBmbGFnIGZvciBkZXRlcm1pbmluZyB3aGV0aGVyIHRvIGJpbiBkYXRhIG9yIG5vdC5cIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJhZ2dyZWdhdGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQWdncmVnYXRlT3BcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQWdncmVnYXRpb24gZnVuY3Rpb24gZm9yIHRoZSBmaWVsZFxcblxcbihlLmcuLCBgbWVhbmAsIGBzdW1gLCBgbWVkaWFuYCwgYG1pbmAsIGBtYXhgLCBgY291bnRgKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGl0bGUgZm9yIGF4aXMgb3IgbGVnZW5kLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiTGVnZW5kXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJmb3JtYXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvcHRpb25hbCBmb3JtYXR0aW5nIHBhdHRlcm4gZm9yIGxlZ2VuZCBsYWJlbHMuIFZlZ2EgdXNlcyBEM1xcXFwncyBmb3JtYXQgcGF0dGVybi5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSB0aXRsZSBmb3IgdGhlIGxlZ2VuZC4gKFNob3dzIGZpZWxkIG5hbWUgYW5kIGl0cyBmdW5jdGlvbiBieSBkZWZhdWx0LilcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInZhbHVlc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkV4cGxpY2l0bHkgc2V0IHRoZSB2aXNpYmxlIGxlZ2VuZCB2YWx1ZXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIFwib3JpZW50XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9yaWVudGF0aW9uIG9mIHRoZSBsZWdlbmQuIE9uZSBvZiBcXFwibGVmdFxcXCIgb3IgXFxcInJpZ2h0XFxcIi4gVGhpcyBkZXRlcm1pbmVzIGhvdyB0aGUgbGVnZW5kIGlzIHBvc2l0aW9uZWQgd2l0aGluIHRoZSBzY2VuZS4gVGhlIGRlZmF1bHQgaXMgXFxcInJpZ2h0XFxcIi5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9mZnNldFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBvZmZzZXQsIGluIHBpeGVscywgYnkgd2hpY2ggdG8gZGlzcGxhY2UgdGhlIGxlZ2VuZCBmcm9tIHRoZSBlZGdlIG9mIHRoZSBlbmNsb3NpbmcgZ3JvdXAgb3IgZGF0YSByZWN0YW5nbGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJwYWRkaW5nXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHBhZGRpbmcsIGluIHBpeGVscywgYmV0d2VlbiB0aGUgbGVuZ2VuZCBhbmQgYXhpcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcIm1hcmdpblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBtYXJnaW4gYXJvdW5kIHRoZSBsZWdlbmQsIGluIHBpeGVsc1wiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JhZGllbnRTdHJva2VDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBjb2xvciBvZiB0aGUgZ3JhZGllbnQgc3Ryb2tlLCBjYW4gYmUgaW4gaGV4IGNvbG9yIGNvZGUgb3IgcmVndWxhciBjb2xvciBuYW1lLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JhZGllbnRTdHJva2VXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB3aWR0aCBvZiB0aGUgZ3JhZGllbnQgc3Ryb2tlLCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmFkaWVudEhlaWdodFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBoZWlnaHQgb2YgdGhlIGdyYWRpZW50LCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmFkaWVudFdpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHdpZHRoIG9mIHRoZSBncmFkaWVudCwgaW4gcGl4ZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxBbGlnblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBhbGlnbm1lbnQgb2YgdGhlIGxlZ2VuZCBsYWJlbCwgY2FuIGJlIGxlZnQsIG1pZGRsZSBvciByaWdodC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsQmFzZWxpbmVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgcG9zaXRpb24gb2YgdGhlIGJhc2VsaW5lIG9mIGxlZ2VuZCBsYWJlbCwgY2FuIGJlIHRvcCwgbWlkZGxlIG9yIGJvdHRvbS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgY29sb3Igb2YgdGhlIGxlZ2VuZCBsYWJlbCwgY2FuIGJlIGluIGhleCBjb2xvciBjb2RlIG9yIHJlZ3VsYXIgY29sb3IgbmFtZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsRm9udFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IG9mIHRoZSBsZW5nZW5kIGxhYmVsLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxGb250U2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IHNpemUgb2YgbGVuZ2VuZCBsYWJsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsT2Zmc2V0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9mZnNldCBvZiB0aGUgbGVnZW5kIGxhYmVsLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2hvcnRUaW1lTGFiZWxzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiV2hldGhlciBtb250aCBuYW1lcyBhbmQgd2Vla2RheSBuYW1lcyBzaG91bGQgYmUgYWJicmV2aWF0ZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3ltYm9sQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgY29sb3Igb2YgdGhlIGxlZ2VuZCBzeW1ib2wsXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzeW1ib2xTaGFwZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaGFwZSBvZiB0aGUgbGVnZW5kIHN5bWJvbCwgY2FuIGJlIHRoZSAnY2lyY2xlJywgJ3NxdWFyZScsICdjcm9zcycsICdkaWFtb25kJyxcXG5cXG4ndHJpYW5nbGUtdXAnLCAndHJpYW5nbGUtZG93bicsIG9yIGVsc2UgYSBjdXN0b20gU1ZHIHBhdGggc3RyaW5nLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3ltYm9sU2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplIG9mIHRoZSBsZW5nZW5kIHN5bWJvbCwgaW4gcGl4ZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3ltYm9sU3Ryb2tlV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgd2lkdGggb2YgdGhlIHN5bWJvbCdzIHN0cm9rZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJPcHRpb25hbCBtYXJrIHByb3BlcnR5IGRlZmluaXRpb25zIGZvciBjdXN0b20gbGVnZW5kIHN0eWxpbmcuXFxuXFxuVGhlIGNvbG9yIG9mIHRoZSBsZWdlbmQgdGl0bGUsIGNhbiBiZSBpbiBoZXggY29sb3IgY29kZSBvciByZWd1bGFyIGNvbG9yIG5hbWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUZvbnRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9udCBvZiB0aGUgbGVnZW5kIHRpdGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVGb250U2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IHNpemUgb2YgdGhlIGxlZ2VuZCB0aXRsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlRm9udFdlaWdodFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IHdlaWdodCBvZiB0aGUgbGVnZW5kIHRpdGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk9wdGlvbmFsIG1hcmsgcHJvcGVydHkgZGVmaW5pdGlvbnMgZm9yIGN1c3RvbSBsZWdlbmQgc3R5bGluZy5cIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkZpZWxkRGVmXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJmaWVsZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk5hbWUgb2YgdGhlIGZpZWxkIGZyb20gd2hpY2ggdG8gcHVsbCBhIGRhdGEgdmFsdWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0eXBlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1R5cGVcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGVuY29kZWQgZmllbGQncyB0eXBlIG9mIG1lYXN1cmVtZW50LiBUaGlzIGNhbiBiZSBlaXRoZXIgYSBmdWxsIHR5cGVcXG5cXG5uYW1lIChgXFxcInF1YW50aXRhdGl2ZVxcXCJgLCBgXFxcInRlbXBvcmFsXFxcImAsIGBcXFwib3JkaW5hbFxcXCJgLCAgYW5kIGBcXFwibm9taW5hbFxcXCJgKVxcblxcbm9yIGFuIGluaXRpYWwgY2hhcmFjdGVyIG9mIHRoZSB0eXBlIG5hbWUgKGBcXFwiUVxcXCJgLCBgXFxcIlRcXFwiYCwgYFxcXCJPXFxcImAsIGBcXFwiTlxcXCJgKS5cXG5cXG5UaGlzIHByb3BlcnR5IGlzIGNhc2UgaW5zZW5zaXRpdmUuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ2YWx1ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgY29uc3RhbnQgdmFsdWUgaW4gdmlzdWFsIGRvbWFpbi5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwidGltZVVuaXRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVGltZVVuaXRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGltZSB1bml0IGZvciBhIGB0ZW1wb3JhbGAgZmllbGQgIChlLmcuLCBgeWVhcmAsIGB5ZWFybW9udGhgLCBgbW9udGhgLCBgaG91cmApLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmluXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRmxhZyBmb3IgYmlubmluZyBhIGBxdWFudGl0YXRpdmVgIGZpZWxkLCBvciBhIGJpbiBwcm9wZXJ0eSBvYmplY3RcXG5cXG5mb3IgYmlubmluZyBwYXJhbWV0ZXJzLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQmluXCIsXG4gICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJCaW5uaW5nIHByb3BlcnRpZXMgb3IgYm9vbGVhbiBmbGFnIGZvciBkZXRlcm1pbmluZyB3aGV0aGVyIHRvIGJpbiBkYXRhIG9yIG5vdC5cIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJhZ2dyZWdhdGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQWdncmVnYXRlT3BcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQWdncmVnYXRpb24gZnVuY3Rpb24gZm9yIHRoZSBmaWVsZFxcblxcbihlLmcuLCBgbWVhbmAsIGBzdW1gLCBgbWVkaWFuYCwgYG1pbmAsIGBtYXhgLCBgY291bnRgKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGl0bGUgZm9yIGF4aXMgb3IgbGVnZW5kLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiT3JkZXJDaGFubmVsRGVmXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJzb3J0XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1NvcnRPcmRlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZmllbGRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJOYW1lIG9mIHRoZSBmaWVsZCBmcm9tIHdoaWNoIHRvIHB1bGwgYSBkYXRhIHZhbHVlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidHlwZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UeXBlXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBlbmNvZGVkIGZpZWxkJ3MgdHlwZSBvZiBtZWFzdXJlbWVudC4gVGhpcyBjYW4gYmUgZWl0aGVyIGEgZnVsbCB0eXBlXFxuXFxubmFtZSAoYFxcXCJxdWFudGl0YXRpdmVcXFwiYCwgYFxcXCJ0ZW1wb3JhbFxcXCJgLCBgXFxcIm9yZGluYWxcXFwiYCwgIGFuZCBgXFxcIm5vbWluYWxcXFwiYClcXG5cXG5vciBhbiBpbml0aWFsIGNoYXJhY3RlciBvZiB0aGUgdHlwZSBuYW1lIChgXFxcIlFcXFwiYCwgYFxcXCJUXFxcImAsIGBcXFwiT1xcXCJgLCBgXFxcIk5cXFwiYCkuXFxuXFxuVGhpcyBwcm9wZXJ0eSBpcyBjYXNlIGluc2Vuc2l0aXZlLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidmFsdWVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIGNvbnN0YW50IHZhbHVlIGluIHZpc3VhbCBkb21haW4uXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcInRpbWVVbml0XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1RpbWVVbml0XCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRpbWUgdW5pdCBmb3IgYSBgdGVtcG9yYWxgIGZpZWxkICAoZS5nLiwgYHllYXJgLCBgeWVhcm1vbnRoYCwgYG1vbnRoYCwgYGhvdXJgKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcImJpblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZsYWcgZm9yIGJpbm5pbmcgYSBgcXVhbnRpdGF0aXZlYCBmaWVsZCwgb3IgYSBiaW4gcHJvcGVydHkgb2JqZWN0XFxuXFxuZm9yIGJpbm5pbmcgcGFyYW1ldGVycy5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0JpblwiLFxuICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQmlubmluZyBwcm9wZXJ0aWVzIG9yIGJvb2xlYW4gZmxhZyBmb3IgZGV0ZXJtaW5pbmcgd2hldGhlciB0byBiaW4gZGF0YSBvciBub3QuXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwiYWdncmVnYXRlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0FnZ3JlZ2F0ZU9wXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFnZ3JlZ2F0aW9uIGZ1bmN0aW9uIGZvciB0aGUgZmllbGRcXG5cXG4oZS5nLiwgYG1lYW5gLCBgc3VtYCwgYG1lZGlhbmAsIGBtaW5gLCBgbWF4YCwgYGNvdW50YCkuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRpdGxlIGZvciBheGlzIG9yIGxlZ2VuZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkRhdGFcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImZvcm1hdFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9EYXRhRm9ybWF0XCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIG9iamVjdCB0aGF0IHNwZWNpZmllcyB0aGUgZm9ybWF0IGZvciB0aGUgZGF0YSBmaWxlIG9yIHZhbHVlcy5cIlxuICAgICAgICB9LFxuICAgICAgICBcInVybFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgVVJMIGZyb20gd2hpY2ggdG8gbG9hZCB0aGUgZGF0YSBzZXQuIFVzZSB0aGUgZm9ybWF0LnR5cGUgcHJvcGVydHlcXG5cXG50byBlbnN1cmUgdGhlIGxvYWRlZCBkYXRhIGlzIGNvcnJlY3RseSBwYXJzZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ2YWx1ZXNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJQYXNzIGFycmF5IG9mIG9iamVjdHMgaW5zdGVhZCBvZiBhIHVybCB0byBhIGZpbGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHt9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiRGF0YUZvcm1hdFwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwidHlwZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9EYXRhRm9ybWF0VHlwZVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUeXBlIG9mIGlucHV0IGRhdGE6IGBcXFwianNvblxcXCJgLCBgXFxcImNzdlxcXCJgLCBgXFxcInRzdlxcXCJgLlxcblxcblRoZSBkZWZhdWx0IGZvcm1hdCB0eXBlIGlzIGRldGVybWluZWQgYnkgdGhlIGV4dGVuc2lvbiBvZiB0aGUgZmlsZSB1cmwuXFxuXFxuSWYgbm8gZXh0ZW5zaW9uIGlzIGRldGVjdGVkLCBgXFxcImpzb25cXFwiYCB3aWxsIGJlIHVzZWQgYnkgZGVmYXVsdC5cIlxuICAgICAgICB9LFxuICAgICAgICBcInByb3BlcnR5XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSlNPTiBvbmx5KSBUaGUgSlNPTiBwcm9wZXJ0eSBjb250YWluaW5nIHRoZSBkZXNpcmVkIGRhdGEuXFxuXFxuVGhpcyBwYXJhbWV0ZXIgY2FuIGJlIHVzZWQgd2hlbiB0aGUgbG9hZGVkIEpTT04gZmlsZSBtYXkgaGF2ZSBzdXJyb3VuZGluZyBzdHJ1Y3R1cmUgb3IgbWV0YS1kYXRhLlxcblxcbkZvciBleGFtcGxlIGBcXFwicHJvcGVydHlcXFwiOiBcXFwidmFsdWVzLmZlYXR1cmVzXFxcImAgaXMgZXF1aXZhbGVudCB0byByZXRyaWV2aW5nIGBqc29uLnZhbHVlcy5mZWF0dXJlc2BcXG5cXG5mcm9tIHRoZSBsb2FkZWQgSlNPTiBvYmplY3QuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmZWF0dXJlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG5hbWUgb2YgdGhlIFRvcG9KU09OIG9iamVjdCBzZXQgdG8gY29udmVydCB0byBhIEdlb0pTT04gZmVhdHVyZSBjb2xsZWN0aW9uLlxcblxcbkZvciBleGFtcGxlLCBpbiBhIG1hcCBvZiB0aGUgd29ybGQsIHRoZXJlIG1heSBiZSBhbiBvYmplY3Qgc2V0IG5hbWVkIGBcXFwiY291bnRyaWVzXFxcImAuXFxuXFxuVXNpbmcgdGhlIGZlYXR1cmUgcHJvcGVydHksIHdlIGNhbiBleHRyYWN0IHRoaXMgc2V0IGFuZCBnZW5lcmF0ZSBhIEdlb0pTT04gZmVhdHVyZSBvYmplY3QgZm9yIGVhY2ggY291bnRyeS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcIm1lc2hcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgbmFtZSBvZiB0aGUgVG9wb0pTT04gb2JqZWN0IHNldCB0byBjb252ZXJ0IHRvIGEgbWVzaC5cXG5cXG5TaW1pbGFyIHRvIHRoZSBgZmVhdHVyZWAgb3B0aW9uLCBgbWVzaGAgZXh0cmFjdHMgYSBuYW1lZCBUb3BvSlNPTiBvYmplY3Qgc2V0LlxcblxcblVubGlrZSB0aGUgYGZlYXR1cmVgIG9wdGlvbiwgdGhlIGNvcnJlc3BvbmRpbmcgZ2VvIGRhdGEgaXMgcmV0dXJuZWQgYXMgYSBzaW5nbGUsIHVuaWZpZWQgbWVzaCBpbnN0YW5jZSwgbm90IGFzIGluaWRpdmlkdWFsIEdlb0pTT04gZmVhdHVyZXMuXFxuXFxuRXh0cmFjdGluZyBhIG1lc2ggaXMgdXNlZnVsIGZvciBtb3JlIGVmZmljaWVudGx5IGRyYXdpbmcgYm9yZGVycyBvciBvdGhlciBnZW9ncmFwaGljIGVsZW1lbnRzIHRoYXQgeW91IGRvIG5vdCBuZWVkIHRvIGFzc29jaWF0ZSB3aXRoIHNwZWNpZmljIHJlZ2lvbnMgc3VjaCBhcyBpbmRpdmlkdWFsIGNvdW50cmllcywgc3RhdGVzIG9yIGNvdW50aWVzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiRGF0YUZvcm1hdFR5cGVcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcImpzb25cIixcbiAgICAgICAgXCJjc3ZcIixcbiAgICAgICAgXCJ0c3ZcIixcbiAgICAgICAgXCJ0b3BvanNvblwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIlRyYW5zZm9ybVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwiZmlsdGVyXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBzdHJpbmcgY29udGFpbmluZyB0aGUgZmlsdGVyIFZlZ2EgZXhwcmVzc2lvbi4gVXNlIGBkYXR1bWAgdG8gcmVmZXIgdG8gdGhlIGN1cnJlbnQgZGF0YSBvYmplY3QuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0VxdWFsRmlsdGVyXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUmFuZ2VGaWx0ZXJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9JbkZpbHRlclwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRXF1YWxGaWx0ZXJcIlxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9SYW5nZUZpbHRlclwiXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0luRmlsdGVyXCJcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwiZmlsdGVySW52YWxpZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIldoZXRoZXIgdG8gZmlsdGVyIGludmFsaWQgdmFsdWVzIChgbnVsbGAgYW5kIGBOYU5gKSBmcm9tIHRoZSBkYXRhLiBCeSBkZWZhdWx0IChgdW5kZWZpbmVkYCksIG9ubHkgcXVhbnRpdGF0aXZlIGFuZCB0ZW1wb3JhbCBmaWVsZHMgYXJlIGZpbHRlcmVkLiBJZiBzZXQgdG8gYHRydWVgLCBhbGwgZGF0YSBpdGVtcyB3aXRoIG51bGwgdmFsdWVzIGFyZSBmaWx0ZXJlZC4gSWYgYGZhbHNlYCwgYWxsIGRhdGEgaXRlbXMgYXJlIGluY2x1ZGVkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcImNhbGN1bGF0ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNhbGN1bGF0ZSBuZXcgZmllbGQocykgdXNpbmcgdGhlIHByb3ZpZGVkIGV4cHJlc3NzaW9uKHMpLiBDYWxjdWxhdGlvbiBhcmUgYXBwbGllZCBiZWZvcmUgZmlsdGVyLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0Zvcm11bGFcIixcbiAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGb3JtdWxhIG9iamVjdCBmb3IgY2FsY3VsYXRlLlwiXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkVxdWFsRmlsdGVyXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJ0aW1lVW5pdFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UaW1lVW5pdFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaW1lIHVuaXQgZm9yIHRoZSBmaWVsZCB0byBiZSBmaWx0ZXJlZC5cIlxuICAgICAgICB9LFxuICAgICAgICBcImZpZWxkXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRmllbGQgdG8gYmUgZmlsdGVyZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJlcXVhbFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlZhbHVlIHRoYXQgdGhlIGZpZWxkIHNob3VsZCBiZSBlcXVhbCB0by5cIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRGF0ZVRpbWVcIixcbiAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk9iamVjdCBmb3IgZGVmaW5pbmcgZGF0ZXRpbWUgaW4gVmVnYS1MaXRlIEZpbHRlci5cXG5cXG5JZiBib3RoIG1vbnRoIGFuZCBxdWFydGVyIGFyZSBwcm92aWRlZCwgbW9udGggaGFzIGhpZ2hlciBwcmVjZWRlbmNlLlxcblxcbmBkYXlgIGNhbm5vdCBiZSBjb21iaW5lZCB3aXRoIG90aGVyIGRhdGUuXFxuXFxuV2UgYWNjZXB0IHN0cmluZyBmb3IgbW9udGggYW5kIGRheSBuYW1lcy5cIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwicmVxdWlyZWRcIjogW1xuICAgICAgICBcImZpZWxkXCIsXG4gICAgICAgIFwiZXF1YWxcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJEYXRlVGltZVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwieWVhclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkludGVnZXIgdmFsdWUgcmVwcmVzZW50aW5nIHRoZSB5ZWFyLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwicXVhcnRlclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkludGVnZXIgdmFsdWUgcmVwcmVzZW50aW5nIHRoZSBxdWFydGVyIG9mIHRoZSB5ZWFyIChmcm9tIDEtNCkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJtb250aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk9uZSBvZjogKDEpIGludGVnZXIgdmFsdWUgcmVwcmVzZW50aW5nIHRoZSBtb250aCBmcm9tIGAxYC1gMTJgLiBgMWAgcmVwcmVzZW50cyBKYW51YXJ5OyAgKDIpIGNhc2UtaW5zZW5zaXRpdmUgbW9udGggbmFtZSAoZS5nLiwgYFxcXCJKYW51YXJ5XFxcImApOyAgKDMpIGNhc2UtaW5zZW5zaXRpdmUsIDMtY2hhcmFjdGVyIHNob3J0IG1vbnRoIG5hbWUgKGUuZy4sIGBcXFwiSmFuXFxcImApLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGF0ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkludGVnZXIgdmFsdWUgcmVwcmVzZW50aW5nIHRoZSBkYXRlIGZyb20gMS0zMS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImRheVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlZhbHVlIHJlcHJlc2VudGluZyB0aGUgZGF5IG9mIHdlZWsuICBUaGlzIGNhbiBiZSBvbmUgb2Y6ICgxKSBpbnRlZ2VyIHZhbHVlIC0tIGAxYCByZXByZXNlbnRzIE1vbmRheTsgKDIpIGNhc2UtaW5zZW5zaXRpdmUgZGF5IG5hbWUgKGUuZy4sIGBcXFwiTW9uZGF5XFxcImApOyAgKDMpIGNhc2UtaW5zZW5zaXRpdmUsIDMtY2hhcmFjdGVyIHNob3J0IGRheSBuYW1lIChlLmcuLCBgXFxcIk1vblxcXCJgKS4gICA8YnIvPiAqKldhcm5pbmc6KiogQSBEYXRlVGltZSBkZWZpbml0aW9uIG9iamVjdCB3aXRoIGBkYXlgKiogc2hvdWxkIG5vdCBiZSBjb21iaW5lZCB3aXRoIGB5ZWFyYCwgYHF1YXJ0ZXJgLCBgbW9udGhgLCBvciBgZGF0ZWAuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJob3Vyc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkludGVnZXIgdmFsdWUgcmVwcmVzZW50aW5nIHRoZSBob3VyIG9mIGRheSBmcm9tIDAtMjMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJtaW51dGVzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSW50ZWdlciB2YWx1ZSByZXByZXNlbnRpbmcgbWludXRlIHNlZ21lbnQgb2YgYSB0aW1lIGZyb20gMC01OS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInNlY29uZHNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJbnRlZ2VyIHZhbHVlIHJlcHJlc2VudGluZyBzZWNvbmQgc2VnbWVudCBvZiBhIHRpbWUgZnJvbSAwLTU5LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibWlsbGlzZWNvbmRzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiSW50ZWdlciB2YWx1ZSByZXByZXNlbnRpbmcgbWlsbGlzZWNvbmQgc2VnbWVudCBvZiBhIHRpbWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJSYW5nZUZpbHRlclwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwidGltZVVuaXRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVGltZVVuaXRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwidGltZSB1bml0IGZvciB0aGUgZmllbGQgdG8gYmUgZmlsdGVyZWQuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmaWVsZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZpZWxkIHRvIGJlIGZpbHRlcmVkXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJyYW5nZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFycmF5IG9mIGluY2x1c2l2ZSBtaW5pbXVtIGFuZCBtYXhpbXVtIHZhbHVlc1xcblxcbmZvciBhIGZpZWxkIHZhbHVlIG9mIGEgZGF0YSBpdGVtIHRvIGJlIGluY2x1ZGVkIGluIHRoZSBmaWx0ZXJlZCBkYXRhLlwiLFxuICAgICAgICAgIFwibWF4SXRlbXNcIjogMixcbiAgICAgICAgICBcIm1pbkl0ZW1zXCI6IDIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRGF0ZVRpbWVcIixcbiAgICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT2JqZWN0IGZvciBkZWZpbmluZyBkYXRldGltZSBpbiBWZWdhLUxpdGUgRmlsdGVyLlxcblxcbklmIGJvdGggbW9udGggYW5kIHF1YXJ0ZXIgYXJlIHByb3ZpZGVkLCBtb250aCBoYXMgaGlnaGVyIHByZWNlZGVuY2UuXFxuXFxuYGRheWAgY2Fubm90IGJlIGNvbWJpbmVkIHdpdGggb3RoZXIgZGF0ZS5cXG5cXG5XZSBhY2NlcHQgc3RyaW5nIGZvciBtb250aCBhbmQgZGF5IG5hbWVzLlwiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcInJlcXVpcmVkXCI6IFtcbiAgICAgICAgXCJmaWVsZFwiLFxuICAgICAgICBcInJhbmdlXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiSW5GaWx0ZXJcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcInRpbWVVbml0XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1RpbWVVbml0XCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcInRpbWUgdW5pdCBmb3IgdGhlIGZpZWxkIHRvIGJlIGZpbHRlcmVkLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZmllbGRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGaWVsZCB0byBiZSBmaWx0ZXJlZFwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiaW5cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIHNldCBvZiB2YWx1ZXMgdGhhdCB0aGUgYGZpZWxkYCdzIHZhbHVlIHNob3VsZCBiZSBhIG1lbWJlciBvZixcXG5cXG5mb3IgYSBkYXRhIGl0ZW0gaW5jbHVkZWQgaW4gdGhlIGZpbHRlcmVkIGRhdGEuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRGF0ZVRpbWVcIixcbiAgICAgICAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT2JqZWN0IGZvciBkZWZpbmluZyBkYXRldGltZSBpbiBWZWdhLUxpdGUgRmlsdGVyLlxcblxcbklmIGJvdGggbW9udGggYW5kIHF1YXJ0ZXIgYXJlIHByb3ZpZGVkLCBtb250aCBoYXMgaGlnaGVyIHByZWNlZGVuY2UuXFxuXFxuYGRheWAgY2Fubm90IGJlIGNvbWJpbmVkIHdpdGggb3RoZXIgZGF0ZS5cXG5cXG5XZSBhY2NlcHQgc3RyaW5nIGZvciBtb250aCBhbmQgZGF5IG5hbWVzLlwiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcInJlcXVpcmVkXCI6IFtcbiAgICAgICAgXCJmaWVsZFwiLFxuICAgICAgICBcImluXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiRm9ybXVsYVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwiZmllbGRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZmllbGQgaW4gd2hpY2ggdG8gc3RvcmUgdGhlIGNvbXB1dGVkIGZvcm11bGEgdmFsdWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJleHByXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBzdHJpbmcgY29udGFpbmluZyBhbiBleHByZXNzaW9uIGZvciB0aGUgZm9ybXVsYS4gVXNlIHRoZSB2YXJpYWJsZSBgZGF0dW1gIHRvIHRvIHJlZmVyIHRvIHRoZSBjdXJyZW50IGRhdGEgb2JqZWN0LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcInJlcXVpcmVkXCI6IFtcbiAgICAgICAgXCJmaWVsZFwiLFxuICAgICAgICBcImV4cHJcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJDb25maWdcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcInZpZXdwb3J0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHdpZHRoIGFuZCBoZWlnaHQgb2YgdGhlIG9uLXNjcmVlbiB2aWV3cG9ydCwgaW4gcGl4ZWxzLiBJZiBuZWNlc3NhcnksIGNsaXBwaW5nIGFuZCBzY3JvbGxpbmcgd2lsbCBiZSBhcHBsaWVkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmFja2dyb3VuZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNTUyBjb2xvciBwcm9wZXJ0eSB0byB1c2UgYXMgYmFja2dyb3VuZCBvZiB2aXN1YWxpemF0aW9uLiBEZWZhdWx0IGlzIGBcXFwidHJhbnNwYXJlbnRcXFwiYC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcIm51bWJlckZvcm1hdFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkQzIE51bWJlciBmb3JtYXQgZm9yIGF4aXMgbGFiZWxzIGFuZCB0ZXh0IHRhYmxlcy4gRm9yIGV4YW1wbGUgXFxcInNcXFwiIGZvciBTSSB1bml0cy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpbWVGb3JtYXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IGRhdGV0aW1lIGZvcm1hdCBmb3IgYXhpcyBhbmQgbGVnZW5kIGxhYmVscy4gVGhlIGZvcm1hdCBjYW4gYmUgc2V0IGRpcmVjdGx5IG9uIGVhY2ggYXhpcyBhbmQgbGVnZW5kLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY291bnRUaXRsZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgYXhpcyBhbmQgbGVnZW5kIHRpdGxlIGZvciBjb3VudCBmaWVsZHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjZWxsXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NlbGxDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ2VsbCBDb25maWdcIlxuICAgICAgICB9LFxuICAgICAgICBcIm1hcmtcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvTWFya0NvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJNYXJrIENvbmZpZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwib3ZlcmxheVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9PdmVybGF5Q29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk1hcmsgT3ZlcmxheSBDb25maWdcIlxuICAgICAgICB9LFxuICAgICAgICBcInNjYWxlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1NjYWxlQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlNjYWxlIENvbmZpZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYXhpc1wiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9BeGlzQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkF4aXMgQ29uZmlnXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsZWdlbmRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvTGVnZW5kQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkxlZ2VuZCBDb25maWdcIlxuICAgICAgICB9LFxuICAgICAgICBcImZhY2V0XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZhY2V0Q29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZhY2V0IENvbmZpZ1wiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiQ2VsbENvbmZpZ1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwid2lkdGhcIjoge1xuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiaGVpZ2h0XCI6IHtcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImNsaXBcIjoge1xuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcImZpbGxcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZmlsbCBjb2xvci5cIixcbiAgICAgICAgICBcImZvcm1hdFwiOiBcImNvbG9yXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmaWxsT3BhY2l0eVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmaWxsIG9wYWNpdHkgKHZhbHVlIGJldHdlZW4gWzAsMV0pLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3Ryb2tlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHN0cm9rZSBjb2xvci5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInN0cm9rZU9wYWNpdHlcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc3Ryb2tlIG9wYWNpdHkgKHZhbHVlIGJldHdlZW4gWzAsMV0pLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3Ryb2tlV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc3Ryb2tlIHdpZHRoLCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdHJva2VEYXNoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gYXJyYXkgb2YgYWx0ZXJuYXRpbmcgc3Ryb2tlLCBzcGFjZSBsZW5ndGhzIGZvciBjcmVhdGluZyBkYXNoZWQgb3IgZG90dGVkIGxpbmVzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJzdHJva2VEYXNoT2Zmc2V0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9mZnNldCAoaW4gcGl4ZWxzKSBpbnRvIHdoaWNoIHRvIGJlZ2luIGRyYXdpbmcgd2l0aCB0aGUgc3Ryb2tlIGRhc2ggYXJyYXkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJNYXJrQ29uZmlnXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJmaWxsZWRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJXaGV0aGVyIHRoZSBzaGFwZVxcXFwncyBjb2xvciBzaG91bGQgYmUgdXNlZCBhcyBmaWxsIGNvbG9yIGluc3RlYWQgb2Ygc3Ryb2tlIGNvbG9yLlxcblxcblRoaXMgaXMgb25seSBhcHBsaWNhYmxlIGZvciBcXFwiYmFyXFxcIiwgXFxcInBvaW50XFxcIiwgYW5kIFxcXCJhcmVhXFxcIi5cXG5cXG5BbGwgbWFya3MgZXhjZXB0IFxcXCJwb2ludFxcXCIgbWFya3MgYXJlIGZpbGxlZCBieSBkZWZhdWx0LlxcblxcblNlZSBNYXJrIERvY3VtZW50YXRpb24gKGh0dHA6Ly92ZWdhLmdpdGh1Yi5pby92ZWdhLWxpdGUvZG9jcy9tYXJrcy5odG1sKVxcblxcbmZvciB1c2FnZSBleGFtcGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcImNvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCBjb2xvci5cIixcbiAgICAgICAgICBcImZvcm1hdFwiOiBcImNvbG9yXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmaWxsXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCBGaWxsIENvbG9yLiAgVGhpcyBoYXMgaGlnaGVyIHByZWNlZGVuY2UgdGhhbiBjb25maWcuY29sb3JcIixcbiAgICAgICAgICBcImZvcm1hdFwiOiBcImNvbG9yXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdHJva2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IFN0cm9rZSBDb2xvci4gIFRoaXMgaGFzIGhpZ2hlciBwcmVjZWRlbmNlIHRoYW4gY29uZmlnLmNvbG9yXCIsXG4gICAgICAgICAgXCJmb3JtYXRcIjogXCJjb2xvclwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwib3BhY2l0eVwiOiB7XG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJtYXhpbXVtXCI6IDEsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmaWxsT3BhY2l0eVwiOiB7XG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDAsXG4gICAgICAgICAgXCJtYXhpbXVtXCI6IDEsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzdHJva2VPcGFjaXR5XCI6IHtcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcIm1heGltdW1cIjogMSxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInN0cm9rZVdpZHRoXCI6IHtcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInN0cm9rZURhc2hcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBhcnJheSBvZiBhbHRlcm5hdGluZyBzdHJva2UsIHNwYWNlIGxlbmd0aHMgZm9yIGNyZWF0aW5nIGRhc2hlZCBvciBkb3R0ZWQgbGluZXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInN0cm9rZURhc2hPZmZzZXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb2Zmc2V0IChpbiBwaXhlbHMpIGludG8gd2hpY2ggdG8gYmVnaW4gZHJhd2luZyB3aXRoIHRoZSBzdHJva2UgZGFzaCBhcnJheS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInN0YWNrZWRcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvU3RhY2tPZmZzZXRcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9yaWVudFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9PcmllbnRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9yaWVudGF0aW9uIG9mIGEgbm9uLXN0YWNrZWQgYmFyLCB0aWNrLCBhcmVhLCBhbmQgbGluZSBjaGFydHMuXFxuXFxuVGhlIHZhbHVlIGlzIGVpdGhlciBob3Jpem9udGFsIChkZWZhdWx0KSBvciB2ZXJ0aWNhbC5cXG5cXG4tIEZvciBiYXIsIHJ1bGUgYW5kIHRpY2ssIHRoaXMgZGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBzaXplIG9mIHRoZSBiYXIgYW5kIHRpY2tcXG5cXG5zaG91bGQgYmUgYXBwbGllZCB0byB4IG9yIHkgZGltZW5zaW9uLlxcblxcbi0gRm9yIGFyZWEsIHRoaXMgcHJvcGVydHkgZGV0ZXJtaW5lcyB0aGUgb3JpZW50IHByb3BlcnR5IG9mIHRoZSBWZWdhIG91dHB1dC5cXG5cXG4tIEZvciBsaW5lLCB0aGlzIHByb3BlcnR5IGRldGVybWluZXMgdGhlIHNvcnQgb3JkZXIgb2YgdGhlIHBvaW50cyBpbiB0aGUgbGluZVxcblxcbmlmIGBjb25maWcuc29ydExpbmVCeWAgaXMgbm90IHNwZWNpZmllZC5cXG5cXG5Gb3Igc3RhY2tlZCBjaGFydHMsIHRoaXMgaXMgYWx3YXlzIGRldGVybWluZWQgYnkgdGhlIG9yaWVudGF0aW9uIG9mIHRoZSBzdGFjaztcXG5cXG50aGVyZWZvcmUgZXhwbGljaXRseSBzcGVjaWZpZWQgdmFsdWUgd2lsbCBiZSBpZ25vcmVkLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiaW50ZXJwb2xhdGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvSW50ZXJwb2xhdGVcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGxpbmUgaW50ZXJwb2xhdGlvbiBtZXRob2QgdG8gdXNlLiBPbmUgb2YgbGluZWFyLCBzdGVwLWJlZm9yZSwgc3RlcC1hZnRlciwgYmFzaXMsIGJhc2lzLW9wZW4sIGNhcmRpbmFsLCBjYXJkaW5hbC1vcGVuLCBtb25vdG9uZS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInRlbnNpb25cIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZXBlbmRpbmcgb24gdGhlIGludGVycG9sYXRpb24gdHlwZSwgc2V0cyB0aGUgdGVuc2lvbiBwYXJhbWV0ZXIuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsaW5lU2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlNpemUgb2YgbGluZSBtYXJrLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwicnVsZVNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJTaXplIG9mIHJ1bGUgbWFyay5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImJhclNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc2l6ZSBvZiB0aGUgYmFycy4gIElmIHVuc3BlY2lmaWVkLCB0aGUgZGVmYXVsdCBzaXplIGlzICBgYmFuZFNpemUtMWAsXFxuXFxud2hpY2ggcHJvdmlkZXMgMSBwaXhlbCBvZmZzZXQgYmV0d2VlbiBiYXJzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmFyVGhpblNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc2l6ZSBvZiB0aGUgYmFycyBvbiBjb250aW51b3VzIHNjYWxlcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInNoYXBlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHN5bWJvbCBzaGFwZSB0byB1c2UuIE9uZSBvZiBjaXJjbGUgKGRlZmF1bHQpLCBzcXVhcmUsIGNyb3NzLCBkaWFtb25kLCB0cmlhbmdsZS11cCwgb3IgdHJpYW5nbGUtZG93biwgb3IgYSBjdXN0b20gU1ZHIHBhdGguXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvU2hhcGVcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwic2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBwaXhlbCBhcmVhIGVhY2ggdGhlIHBvaW50LiBGb3IgZXhhbXBsZTogaW4gdGhlIGNhc2Ugb2YgY2lyY2xlcywgdGhlIHJhZGl1cyBpcyBkZXRlcm1pbmVkIGluIHBhcnQgYnkgdGhlIHNxdWFyZSByb290IG9mIHRoZSBzaXplIHZhbHVlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1NpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgd2lkdGggb2YgdGhlIHRpY2tzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1RoaWNrbmVzc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoaWNrbmVzcyBvZiB0aGUgdGljayBtYXJrLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYWxpZ25cIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvSG9yaXpvbnRhbEFsaWduXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBob3Jpem9udGFsIGFsaWdubWVudCBvZiB0aGUgdGV4dC4gT25lIG9mIGxlZnQsIHJpZ2h0LCBjZW50ZXIuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJhbmdsZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSByb3RhdGlvbiBhbmdsZSBvZiB0aGUgdGV4dCwgaW4gZGVncmVlcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImJhc2VsaW5lXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1ZlcnRpY2FsQWxpZ25cIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHZlcnRpY2FsIGFsaWdubWVudCBvZiB0aGUgdGV4dC4gT25lIG9mIHRvcCwgbWlkZGxlLCBib3R0b20uXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJkeFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBob3Jpem9udGFsIG9mZnNldCwgaW4gcGl4ZWxzLCBiZXR3ZWVuIHRoZSB0ZXh0IGxhYmVsIGFuZCBpdHMgYW5jaG9yIHBvaW50LiBUaGUgb2Zmc2V0IGlzIGFwcGxpZWQgYWZ0ZXIgcm90YXRpb24gYnkgdGhlIGFuZ2xlIHByb3BlcnR5LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZHlcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgdmVydGljYWwgb2Zmc2V0LCBpbiBwaXhlbHMsIGJldHdlZW4gdGhlIHRleHQgbGFiZWwgYW5kIGl0cyBhbmNob3IgcG9pbnQuIFRoZSBvZmZzZXQgaXMgYXBwbGllZCBhZnRlciByb3RhdGlvbiBieSB0aGUgYW5nbGUgcHJvcGVydHkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJyYWRpdXNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJQb2xhciBjb29yZGluYXRlIHJhZGlhbCBvZmZzZXQsIGluIHBpeGVscywgb2YgdGhlIHRleHQgbGFiZWwgZnJvbSB0aGUgb3JpZ2luIGRldGVybWluZWQgYnkgdGhlIHggYW5kIHkgcHJvcGVydGllcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRoZXRhXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiUG9sYXIgY29vcmRpbmF0ZSBhbmdsZSwgaW4gcmFkaWFucywgb2YgdGhlIHRleHQgbGFiZWwgZnJvbSB0aGUgb3JpZ2luIGRldGVybWluZWQgYnkgdGhlIHggYW5kIHkgcHJvcGVydGllcy4gVmFsdWVzIGZvciB0aGV0YSBmb2xsb3cgdGhlIHNhbWUgY29udmVudGlvbiBvZiBhcmMgbWFyayBzdGFydEFuZ2xlIGFuZCBlbmRBbmdsZSBwcm9wZXJ0aWVzOiBhbmdsZXMgYXJlIG1lYXN1cmVkIGluIHJhZGlhbnMsIHdpdGggMCBpbmRpY2F0aW5nIFxcXCJub3J0aFxcXCIuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmb250XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHR5cGVmYWNlIHRvIHNldCB0aGUgdGV4dCBpbiAoZS5nLiwgSGVsdmV0aWNhIE5ldWUpLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZm9udFNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9udCBzaXplLCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmb250U3R5bGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRm9udFN0eWxlXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IHN0eWxlIChlLmcuLCBpdGFsaWMpLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZm9udFdlaWdodFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Gb250V2VpZ2h0XCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IHdlaWdodCAoZS5nLiwgYm9sZCkuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJmb3JtYXRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9ybWF0dGluZyBwYXR0ZXJuIGZvciB0ZXh0IHZhbHVlLiBJZiBub3QgZGVmaW5lZCwgdGhpcyB3aWxsIGJlIGRldGVybWluZWQgYXV0b21hdGljYWxseS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInNob3J0VGltZUxhYmVsc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIldoZXRoZXIgbW9udGggbmFtZXMgYW5kIHdlZWtkYXkgbmFtZXMgc2hvdWxkIGJlIGFiYnJldmlhdGVkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcInRleHRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJQbGFjZWhvbGRlciBUZXh0XCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJhcHBseUNvbG9yVG9CYWNrZ3JvdW5kXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQXBwbHkgY29sb3IgZmllbGQgdG8gYmFja2dyb3VuZCBjb2xvciBpbnN0ZWFkIG9mIHRoZSB0ZXh0LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIlN0YWNrT2Zmc2V0XCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJ6ZXJvXCIsXG4gICAgICAgIFwiY2VudGVyXCIsXG4gICAgICAgIFwibm9ybWFsaXplXCIsXG4gICAgICAgIFwibm9uZVwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIk9yaWVudFwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwiaG9yaXpvbnRhbFwiLFxuICAgICAgICBcInZlcnRpY2FsXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiSW50ZXJwb2xhdGVcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcImxpbmVhclwiLFxuICAgICAgICBcImxpbmVhci1jbG9zZWRcIixcbiAgICAgICAgXCJzdGVwXCIsXG4gICAgICAgIFwic3RlcC1iZWZvcmVcIixcbiAgICAgICAgXCJzdGVwLWFmdGVyXCIsXG4gICAgICAgIFwiYmFzaXNcIixcbiAgICAgICAgXCJiYXNpcy1vcGVuXCIsXG4gICAgICAgIFwiYmFzaXMtY2xvc2VkXCIsXG4gICAgICAgIFwiY2FyZGluYWxcIixcbiAgICAgICAgXCJjYXJkaW5hbC1vcGVuXCIsXG4gICAgICAgIFwiY2FyZGluYWwtY2xvc2VkXCIsXG4gICAgICAgIFwiYnVuZGxlXCIsXG4gICAgICAgIFwibW9ub3RvbmVcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJTaGFwZVwiOiB7XG4gICAgICBcInR5cGVcIjogXCJzdHJpbmdcIixcbiAgICAgIFwiZW51bVwiOiBbXG4gICAgICAgIFwiY2lyY2xlXCIsXG4gICAgICAgIFwic3F1YXJlXCIsXG4gICAgICAgIFwiY3Jvc3NcIixcbiAgICAgICAgXCJkaWFtb25kXCIsXG4gICAgICAgIFwidHJpYW5nbGUtdXBcIixcbiAgICAgICAgXCJ0cmlhbmdsZS1kb3duXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiSG9yaXpvbnRhbEFsaWduXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJsZWZ0XCIsXG4gICAgICAgIFwicmlnaHRcIixcbiAgICAgICAgXCJjZW50ZXJcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJWZXJ0aWNhbEFsaWduXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJ0b3BcIixcbiAgICAgICAgXCJtaWRkbGVcIixcbiAgICAgICAgXCJib3R0b21cIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJGb250U3R5bGVcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcIm5vcm1hbFwiLFxuICAgICAgICBcIml0YWxpY1wiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIkZvbnRXZWlnaHRcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCIsXG4gICAgICBcImVudW1cIjogW1xuICAgICAgICBcIm5vcm1hbFwiLFxuICAgICAgICBcImJvbGRcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJPdmVybGF5Q29uZmlnXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJsaW5lXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiV2hldGhlciB0byBvdmVybGF5IGxpbmUgd2l0aCBwb2ludC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJhcmVhXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0FyZWFPdmVybGF5XCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlR5cGUgb2Ygb3ZlcmxheSBmb3IgYXJlYSBtYXJrIChsaW5lIG9yIGxpbmVwb2ludClcIlxuICAgICAgICB9LFxuICAgICAgICBcInBvaW50U3R5bGVcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvTWFya0NvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHN0eWxlIGZvciB0aGUgb3ZlcmxheWVkIHBvaW50LlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGluZVN0eWxlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL01hcmtDb25maWdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCBzdHlsZSBmb3IgdGhlIG92ZXJsYXllZCBwb2ludC5cIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkFyZWFPdmVybGF5XCI6IHtcbiAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiLFxuICAgICAgXCJlbnVtXCI6IFtcbiAgICAgICAgXCJsaW5lXCIsXG4gICAgICAgIFwibGluZXBvaW50XCIsXG4gICAgICAgIFwibm9uZVwiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIlNjYWxlQ29uZmlnXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJyb3VuZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIklmIHRydWUsIHJvdW5kcyBudW1lcmljIG91dHB1dCB2YWx1ZXMgdG8gaW50ZWdlcnMuXFxuXFxuVGhpcyBjYW4gYmUgaGVscGZ1bCBmb3Igc25hcHBpbmcgdG8gdGhlIHBpeGVsIGdyaWQuXFxuXFxuKE9ubHkgYXZhaWxhYmxlIGZvciBgeGAsIGB5YCwgYHNpemVgLCBgcm93YCwgYW5kIGBjb2x1bW5gIHNjYWxlcy4pXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGV4dEJhbmRXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgYmFuZCB3aWR0aCBmb3IgYHhgIG9yZGluYWwgc2NhbGUgd2hlbiBpcyBtYXJrIGlzIGB0ZXh0YC5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImJhbmRTaXplXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCBiYW5kIHNpemUgZm9yICgxKSBgeWAgb3JkaW5hbCBzY2FsZSxcXG5cXG5hbmQgKDIpIGB4YCBvcmRpbmFsIHNjYWxlIHdoZW4gdGhlIG1hcmsgaXMgbm90IGB0ZXh0YC5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9wYWNpdHlcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHJhbmdlIGZvciBvcGFjaXR5LlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJwYWRkaW5nXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCBwYWRkaW5nIGZvciBgeGAgYW5kIGB5YCBvcmRpbmFsIHNjYWxlcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInVzZVJhd0RvbWFpblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlVzZXMgdGhlIHNvdXJjZSBkYXRhIHJhbmdlIGFzIHNjYWxlIGRvbWFpbiBpbnN0ZWFkIG9mIGFnZ3JlZ2F0ZWQgZGF0YSBmb3IgYWdncmVnYXRlIGF4aXMuXFxuXFxuVGhpcyBwcm9wZXJ0eSBvbmx5IHdvcmtzIHdpdGggYWdncmVnYXRlIGZ1bmN0aW9ucyB0aGF0IHByb2R1Y2UgdmFsdWVzIHdpdGhpbiB0aGUgcmF3IGRhdGEgZG9tYWluIChgXFxcIm1lYW5cXFwiYCwgYFxcXCJhdmVyYWdlXFxcImAsIGBcXFwic3RkZXZcXFwiYCwgYFxcXCJzdGRldnBcXFwiYCwgYFxcXCJtZWRpYW5cXFwiYCwgYFxcXCJxMVxcXCJgLCBgXFxcInEzXFxcImAsIGBcXFwibWluXFxcImAsIGBcXFwibWF4XFxcImApLiBGb3Igb3RoZXIgYWdncmVnYXRpb25zIHRoYXQgcHJvZHVjZSB2YWx1ZXMgb3V0c2lkZSBvZiB0aGUgcmF3IGRhdGEgZG9tYWluIChlLmcuIGBcXFwiY291bnRcXFwiYCwgYFxcXCJzdW1cXFwiYCksIHRoaXMgcHJvcGVydHkgaXMgaWdub3JlZC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJub21pbmFsQ29sb3JSYW5nZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgcmFuZ2UgZm9yIG5vbWluYWwgY29sb3Igc2NhbGVcIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwic2VxdWVudGlhbENvbG9yUmFuZ2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHJhbmdlIGZvciBvcmRpbmFsIC8gY29udGludW91cyBjb2xvciBzY2FsZVwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJzaGFwZVJhbmdlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCByYW5nZSBmb3Igc2hhcGVcIixcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwiYmFyU2l6ZVJhbmdlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCByYW5nZSBmb3IgYmFyIHNpemUgc2NhbGVcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwiZm9udFNpemVSYW5nZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkRlZmF1bHQgcmFuZ2UgZm9yIGZvbnQgc2l6ZSBzY2FsZVwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXCJydWxlU2l6ZVJhbmdlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCByYW5nZSBmb3IgcnVsZSBzdHJva2Ugd2lkdGhzXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tTaXplUmFuZ2VcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJEZWZhdWx0IHJhbmdlIGZvciB0aWNrIHNwYW5zXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcInBvaW50U2l6ZVJhbmdlXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRGVmYXVsdCByYW5nZSBmb3IgYmFyIHNpemUgc2NhbGVcIixcbiAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiQXhpc0NvbmZpZ1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwiYXhpc1dpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiV2lkdGggb2YgdGhlIGF4aXMgbGluZVwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGF5ZXJcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBIHN0cmluZyBpbmRpY2F0aW5nIGlmIHRoZSBheGlzIChhbmQgYW55IGdyaWRsaW5lcykgc2hvdWxkIGJlIHBsYWNlZCBhYm92ZSBvciBiZWxvdyB0aGUgZGF0YSBtYXJrcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9mZnNldFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBvZmZzZXQsIGluIHBpeGVscywgYnkgd2hpY2ggdG8gZGlzcGxhY2UgdGhlIGF4aXMgZnJvbSB0aGUgZWRnZSBvZiB0aGUgZW5jbG9zaW5nIGdyb3VwIG9yIGRhdGEgcmVjdGFuZ2xlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYXhpc0NvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ29sb3Igb2YgYXhpcyBsaW5lLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JpZFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgZmxhZyBpbmRpY2F0ZSBpZiBncmlkbGluZXMgc2hvdWxkIGJlIGNyZWF0ZWQgaW4gYWRkaXRpb24gdG8gdGlja3MuIElmIGBncmlkYCBpcyB1bnNwZWNpZmllZCwgdGhlIGRlZmF1bHQgdmFsdWUgaXMgYHRydWVgIGZvciBST1cgYW5kIENPTC4gRm9yIFggYW5kIFksIHRoZSBkZWZhdWx0IHZhbHVlIGlzIGB0cnVlYCBmb3IgcXVhbnRpdGF0aXZlIGFuZCB0aW1lIGZpZWxkcyBhbmQgYGZhbHNlYCBvdGhlcndpc2UuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JpZENvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ29sb3Igb2YgZ3JpZGxpbmVzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JpZERhc2hcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgb2Zmc2V0IChpbiBwaXhlbHMpIGludG8gd2hpY2ggdG8gYmVnaW4gZHJhd2luZyB3aXRoIHRoZSBncmlkIGRhc2ggYXJyYXkuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBcImdyaWRPcGFjaXR5XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHN0cm9rZSBvcGFjaXR5IG9mIGdyaWQgKHZhbHVlIGJldHdlZW4gWzAsMV0pXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmlkV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZ3JpZCB3aWR0aCwgaW4gcGl4ZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiRW5hYmxlIG9yIGRpc2FibGUgbGFiZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsQW5nbGVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgcm90YXRpb24gYW5nbGUgb2YgdGhlIGF4aXMgbGFiZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxBbGlnblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRleHQgYWxpZ25tZW50IGZvciB0aGUgTGFiZWwuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJsYWJlbEJhc2VsaW5lXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGV4dCBiYXNlbGluZSBmb3IgdGhlIGxhYmVsLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxNYXhMZW5ndGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUcnVuY2F0ZSBsYWJlbHMgdGhhdCBhcmUgdG9vIGxvbmcuXCIsXG4gICAgICAgICAgXCJtaW5pbXVtXCI6IDEsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzaG9ydFRpbWVMYWJlbHNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJXaGV0aGVyIG1vbnRoIGFuZCBkYXkgbmFtZXMgc2hvdWxkIGJlIGFiYnJldmlhdGVkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICB9LFxuICAgICAgICBcInN1YmRpdmlkZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIklmIHByb3ZpZGVkLCBzZXRzIHRoZSBudW1iZXIgb2YgbWlub3IgdGlja3MgYmV0d2VlbiBtYWpvciB0aWNrcyAodGhlIHZhbHVlIDkgcmVzdWx0cyBpbiBkZWNpbWFsIHN1YmRpdmlzaW9uKS4gT25seSBhcHBsaWNhYmxlIGZvciBheGVzIHZpc3VhbGl6aW5nIHF1YW50aXRhdGl2ZSBzY2FsZXMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkEgZGVzaXJlZCBudW1iZXIgb2YgdGlja3MsIGZvciBheGVzIHZpc3VhbGl6aW5nIHF1YW50aXRhdGl2ZSBzY2FsZXMuIFRoZSByZXN1bHRpbmcgbnVtYmVyIG1heSBiZSBkaWZmZXJlbnQgc28gdGhhdCB2YWx1ZXMgYXJlIFxcXCJuaWNlXFxcIiAobXVsdGlwbGVzIG9mIDIsIDUsIDEwKSBhbmQgbGllIHdpdGhpbiB0aGUgdW5kZXJseWluZyBzY2FsZSdzIHJhbmdlLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja0NvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGNvbG9yIG9mIHRoZSBheGlzJ3MgdGljay5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tMYWJlbENvbG9yXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIGNvbG9yIG9mIHRoZSB0aWNrIGxhYmVsLCBjYW4gYmUgaW4gaGV4IGNvbG9yIGNvZGUgb3IgcmVndWxhciBjb2xvciBuYW1lLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja0xhYmVsRm9udFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IG9mIHRoZSB0aWNrIGxhYmVsLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja0xhYmVsRm9udFNpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9udCBzaXplIG9mIGxhYmVsLCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aWNrUGFkZGluZ1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBwYWRkaW5nLCBpbiBwaXhlbHMsIGJldHdlZW4gdGlja3MgYW5kIHRleHQgbGFiZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1NpemVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc2l6ZSwgaW4gcGl4ZWxzLCBvZiBtYWpvciwgbWlub3IgYW5kIGVuZCB0aWNrcy5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tTaXplTWFqb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc2l6ZSwgaW4gcGl4ZWxzLCBvZiBtYWpvciB0aWNrcy5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tTaXplTWlub3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgc2l6ZSwgaW4gcGl4ZWxzLCBvZiBtaW5vciB0aWNrcy5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpY2tTaXplRW5kXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHNpemUsIGluIHBpeGVscywgb2YgZW5kIHRpY2tzLlwiLFxuICAgICAgICAgIFwibWluaW11bVwiOiAwLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGlja1dpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHdpZHRoLCBpbiBwaXhlbHMsIG9mIHRpY2tzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNvbG9yIG9mIHRoZSB0aXRsZSwgY2FuIGJlIGluIGhleCBjb2xvciBjb2RlIG9yIHJlZ3VsYXIgY29sb3IgbmFtZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlRm9udFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZvbnQgb2YgdGhlIHRpdGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVGb250U2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlNpemUgb2YgdGhlIHRpdGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVGb250V2VpZ2h0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiV2VpZ2h0IG9mIHRoZSB0aXRsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlT2Zmc2V0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSB0aXRsZSBvZmZzZXQgdmFsdWUgZm9yIHRoZSBheGlzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVNYXhMZW5ndGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJNYXggbGVuZ3RoIGZvciBheGlzIHRpdGxlIGlmIHRoZSB0aXRsZSBpcyBhdXRvbWF0aWNhbGx5IGdlbmVyYXRlZCBmcm9tIHRoZSBmaWVsZCdzIGRlc2NyaXB0aW9uLiBCeSBkZWZhdWx0LCB0aGlzIGlzIGF1dG9tYXRpY2FsbHkgYmFzZWQgb24gY2VsbCBzaXplIGFuZCBjaGFyYWN0ZXJXaWR0aCBwcm9wZXJ0eS5cIixcbiAgICAgICAgICBcIm1pbmltdW1cIjogMCxcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImNoYXJhY3RlcldpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQ2hhcmFjdGVyIHdpZHRoIGZvciBhdXRvbWF0aWNhbGx5IGRldGVybWluaW5nIHRpdGxlIG1heCBsZW5ndGguXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT3B0aW9uYWwgbWFyayBwcm9wZXJ0eSBkZWZpbml0aW9ucyBmb3IgY3VzdG9tIGF4aXMgc3R5bGluZy5cIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkxlZ2VuZENvbmZpZ1wiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwib3JpZW50XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9yaWVudGF0aW9uIG9mIHRoZSBsZWdlbmQuIE9uZSBvZiBcXFwibGVmdFxcXCIgb3IgXFxcInJpZ2h0XFxcIi4gVGhpcyBkZXRlcm1pbmVzIGhvdyB0aGUgbGVnZW5kIGlzIHBvc2l0aW9uZWQgd2l0aGluIHRoZSBzY2VuZS4gVGhlIGRlZmF1bHQgaXMgXFxcInJpZ2h0XFxcIi5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9mZnNldFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBvZmZzZXQsIGluIHBpeGVscywgYnkgd2hpY2ggdG8gZGlzcGxhY2UgdGhlIGxlZ2VuZCBmcm9tIHRoZSBlZGdlIG9mIHRoZSBlbmNsb3NpbmcgZ3JvdXAgb3IgZGF0YSByZWN0YW5nbGUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJwYWRkaW5nXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHBhZGRpbmcsIGluIHBpeGVscywgYmV0d2VlbiB0aGUgbGVuZ2VuZCBhbmQgYXhpcy5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcIm1hcmdpblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBtYXJnaW4gYXJvdW5kIHRoZSBsZWdlbmQsIGluIHBpeGVsc1wiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JhZGllbnRTdHJva2VDb2xvclwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBjb2xvciBvZiB0aGUgZ3JhZGllbnQgc3Ryb2tlLCBjYW4gYmUgaW4gaGV4IGNvbG9yIGNvZGUgb3IgcmVndWxhciBjb2xvciBuYW1lLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZ3JhZGllbnRTdHJva2VXaWR0aFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSB3aWR0aCBvZiB0aGUgZ3JhZGllbnQgc3Ryb2tlLCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmFkaWVudEhlaWdodFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBoZWlnaHQgb2YgdGhlIGdyYWRpZW50LCBpbiBwaXhlbHMuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmFkaWVudFdpZHRoXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIHdpZHRoIG9mIHRoZSBncmFkaWVudCwgaW4gcGl4ZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxBbGlnblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBhbGlnbm1lbnQgb2YgdGhlIGxlZ2VuZCBsYWJlbCwgY2FuIGJlIGxlZnQsIG1pZGRsZSBvciByaWdodC5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsQmFzZWxpbmVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgcG9zaXRpb24gb2YgdGhlIGJhc2VsaW5lIG9mIGxlZ2VuZCBsYWJlbCwgY2FuIGJlIHRvcCwgbWlkZGxlIG9yIGJvdHRvbS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgY29sb3Igb2YgdGhlIGxlZ2VuZCBsYWJlbCwgY2FuIGJlIGluIGhleCBjb2xvciBjb2RlIG9yIHJlZ3VsYXIgY29sb3IgbmFtZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsRm9udFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IG9mIHRoZSBsZW5nZW5kIGxhYmVsLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxGb250U2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IHNpemUgb2YgbGVuZ2VuZCBsYWJsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcImxhYmVsT2Zmc2V0XCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG9mZnNldCBvZiB0aGUgbGVnZW5kIGxhYmVsLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2hvcnRUaW1lTGFiZWxzXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiV2hldGhlciBtb250aCBuYW1lcyBhbmQgd2Vla2RheSBuYW1lcyBzaG91bGQgYmUgYWJicmV2aWF0ZWQuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3ltYm9sQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgY29sb3Igb2YgdGhlIGxlZ2VuZCBzeW1ib2wsXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzeW1ib2xTaGFwZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaGFwZSBvZiB0aGUgbGVnZW5kIHN5bWJvbCwgY2FuIGJlIHRoZSAnY2lyY2xlJywgJ3NxdWFyZScsICdjcm9zcycsICdkaWFtb25kJyxcXG5cXG4ndHJpYW5nbGUtdXAnLCAndHJpYW5nbGUtZG93bicsIG9yIGVsc2UgYSBjdXN0b20gU1ZHIHBhdGggc3RyaW5nLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3ltYm9sU2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzaXplIG9mIHRoZSBsZW5nZW5kIHN5bWJvbCwgaW4gcGl4ZWxzLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic3ltYm9sU3Ryb2tlV2lkdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgd2lkdGggb2YgdGhlIHN5bWJvbCdzIHN0cm9rZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlQ29sb3JcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJPcHRpb25hbCBtYXJrIHByb3BlcnR5IGRlZmluaXRpb25zIGZvciBjdXN0b20gbGVnZW5kIHN0eWxpbmcuXFxuXFxuVGhlIGNvbG9yIG9mIHRoZSBsZWdlbmQgdGl0bGUsIGNhbiBiZSBpbiBoZXggY29sb3IgY29kZSBvciByZWd1bGFyIGNvbG9yIG5hbWUuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0aXRsZUZvbnRcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJUaGUgZm9udCBvZiB0aGUgbGVnZW5kIHRpdGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwidGl0bGVGb250U2l6ZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IHNpemUgb2YgdGhlIGxlZ2VuZCB0aXRsZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcInRpdGxlRm9udFdlaWdodFwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBmb250IHdlaWdodCBvZiB0aGUgbGVnZW5kIHRpdGxlLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk9wdGlvbmFsIG1hcmsgcHJvcGVydHkgZGVmaW5pdGlvbnMgZm9yIGN1c3RvbSBsZWdlbmQgc3R5bGluZy5cIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBcIkZhY2V0Q29uZmlnXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJzY2FsZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9GYWNldFNjYWxlQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZhY2V0IFNjYWxlIENvbmZpZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiYXhpc1wiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9BeGlzQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZhY2V0IEF4aXMgQ29uZmlnXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJncmlkXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZhY2V0R3JpZENvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJGYWNldCBHcmlkIENvbmZpZ1wiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY2VsbFwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9DZWxsQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkZhY2V0IENlbGwgQ29uZmlnXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJGYWNldFNjYWxlQ29uZmlnXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJyb3VuZFwiOiB7XG4gICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgIH0sXG4gICAgICAgIFwicGFkZGluZ1wiOiB7XG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJGYWNldEdyaWRDb25maWdcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImNvbG9yXCI6IHtcbiAgICAgICAgICBcImZvcm1hdFwiOiBcImNvbG9yXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJvcGFjaXR5XCI6IHtcbiAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9mZnNldFwiOiB7XG4gICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgXCJGYWNldFNwZWNcIjoge1xuICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICBcImZhY2V0XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZhY2V0XCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJzcGVjXCI6IHtcbiAgICAgICAgICBcIm9uZU9mXCI6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9MYXllclNwZWNcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Vbml0U3BlY1wiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBcIm5hbWVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJOYW1lIG9mIHRoZSB2aXN1YWxpemF0aW9uIGZvciBsYXRlciByZWZlcmVuY2UuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJkZXNjcmlwdGlvblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIG9wdGlvbmFsIGRlc2NyaXB0aW9uIG9mIHRoaXMgbWFyayBmb3IgY29tbWVudGluZyBwdXJwb3NlLlxcblxcblRoaXMgcHJvcGVydHkgaGFzIG5vIGVmZmVjdCBvbiB0aGUgb3V0cHV0IHZpc3VhbGl6YXRpb24uXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJkYXRhXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0RhdGFcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb2JqZWN0IGRlc2NyaWJpbmcgdGhlIGRhdGEgc291cmNlXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0cmFuc2Zvcm1cIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVHJhbnNmb3JtXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIG9iamVjdCBkZXNjcmliaW5nIGZpbHRlciBhbmQgbmV3IGZpZWxkIGNhbGN1bGF0aW9uLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY29uZmlnXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDb25maWd1cmF0aW9uIG9iamVjdFwiXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcInJlcXVpcmVkXCI6IFtcbiAgICAgICAgXCJmYWNldFwiLFxuICAgICAgICBcInNwZWNcIlxuICAgICAgXVxuICAgIH0sXG4gICAgXCJGYWNldFwiOiB7XG4gICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgIFwicm93XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1Bvc2l0aW9uQ2hhbm5lbERlZlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY29sdW1uXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1Bvc2l0aW9uQ2hhbm5lbERlZlwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIFwiTGF5ZXJTcGVjXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJsYXllcnNcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJVbml0IHNwZWNzIHRoYXQgd2lsbCBiZSBsYXllcmVkLlwiLFxuICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1VuaXRTcGVjXCJcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFwibmFtZVwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIk5hbWUgb2YgdGhlIHZpc3VhbGl6YXRpb24gZm9yIGxhdGVyIHJlZmVyZW5jZS5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImRlc2NyaXB0aW9uXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb3B0aW9uYWwgZGVzY3JpcHRpb24gb2YgdGhpcyBtYXJrIGZvciBjb21tZW50aW5nIHB1cnBvc2UuXFxuXFxuVGhpcyBwcm9wZXJ0eSBoYXMgbm8gZWZmZWN0IG9uIHRoZSBvdXRwdXQgdmlzdWFsaXphdGlvbi5cIixcbiAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICB9LFxuICAgICAgICBcImRhdGFcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRGF0YVwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJBbiBvYmplY3QgZGVzY3JpYmluZyB0aGUgZGF0YSBzb3VyY2VcIlxuICAgICAgICB9LFxuICAgICAgICBcInRyYW5zZm9ybVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9UcmFuc2Zvcm1cIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb2JqZWN0IGRlc2NyaWJpbmcgZmlsdGVyIGFuZCBuZXcgZmllbGQgY2FsY3VsYXRpb24uXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJjb25maWdcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ29uZmlnXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNvbmZpZ3VyYXRpb24gb2JqZWN0XCJcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFwicmVxdWlyZWRcIjogW1xuICAgICAgICBcImxheWVyc1wiXG4gICAgICBdXG4gICAgfSxcbiAgICBcIlVuaXRTcGVjXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJtYXJrXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL01hcmtcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiVGhlIG1hcmsgdHlwZS5cXG5cXG5PbmUgb2YgYFxcXCJiYXJcXFwiYCwgYFxcXCJjaXJjbGVcXFwiYCwgYFxcXCJzcXVhcmVcXFwiYCwgYFxcXCJ0aWNrXFxcImAsIGBcXFwibGluZVxcXCJgLFxcblxcbmBcXFwiYXJlYVxcXCJgLCBgXFxcInBvaW50XFxcImAsIGBcXFwicnVsZVxcXCJgLCBhbmQgYFxcXCJ0ZXh0XFxcImAuXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJlbmNvZGluZ1wiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Vbml0RW5jb2RpbmdcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQSBrZXktdmFsdWUgbWFwcGluZyBiZXR3ZWVuIGVuY29kaW5nIGNoYW5uZWxzIGFuZCBkZWZpbml0aW9uIG9mIGZpZWxkcy5cIlxuICAgICAgICB9LFxuICAgICAgICBcIm5hbWVcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJOYW1lIG9mIHRoZSB2aXN1YWxpemF0aW9uIGZvciBsYXRlciByZWZlcmVuY2UuXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJkZXNjcmlwdGlvblwiOiB7XG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIG9wdGlvbmFsIGRlc2NyaXB0aW9uIG9mIHRoaXMgbWFyayBmb3IgY29tbWVudGluZyBwdXJwb3NlLlxcblxcblRoaXMgcHJvcGVydHkgaGFzIG5vIGVmZmVjdCBvbiB0aGUgb3V0cHV0IHZpc3VhbGl6YXRpb24uXCIsXG4gICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJkYXRhXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0RhdGFcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQW4gb2JqZWN0IGRlc2NyaWJpbmcgdGhlIGRhdGEgc291cmNlXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ0cmFuc2Zvcm1cIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvVHJhbnNmb3JtXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkFuIG9iamVjdCBkZXNjcmliaW5nIGZpbHRlciBhbmQgbmV3IGZpZWxkIGNhbGN1bGF0aW9uLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiY29uZmlnXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NvbmZpZ1wiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJDb25maWd1cmF0aW9uIG9iamVjdFwiXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBcInJlcXVpcmVkXCI6IFtcbiAgICAgICAgXCJtYXJrXCJcbiAgICAgIF1cbiAgICB9LFxuICAgIFwiVW5pdEVuY29kaW5nXCI6IHtcbiAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgXCJ4XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL1Bvc2l0aW9uQ2hhbm5lbERlZlwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJYIGNvb3JkaW5hdGVzIGZvciBgcG9pbnRgLCBgY2lyY2xlYCwgYHNxdWFyZWAsXFxuXFxuYGxpbmVgLCBgcnVsZWAsIGB0ZXh0YCwgYW5kIGB0aWNrYFxcblxcbihvciB0byB3aWR0aCBhbmQgaGVpZ2h0IGZvciBgYmFyYCBhbmQgYGFyZWFgIG1hcmtzKS5cIlxuICAgICAgICB9LFxuICAgICAgICBcInlcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUG9zaXRpb25DaGFubmVsRGVmXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlkgY29vcmRpbmF0ZXMgZm9yIGBwb2ludGAsIGBjaXJjbGVgLCBgc3F1YXJlYCxcXG5cXG5gbGluZWAsIGBydWxlYCwgYHRleHRgLCBhbmQgYHRpY2tgXFxuXFxuKG9yIHRvIHdpZHRoIGFuZCBoZWlnaHQgZm9yIGBiYXJgIGFuZCBgYXJlYWAgbWFya3MpLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwieDJcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvUG9zaXRpb25DaGFubmVsRGVmXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlgyIGNvb3JkaW5hdGVzIGZvciByYW5nZWQgYGJhcmAsIGBydWxlYCwgYGFyZWFgXCJcbiAgICAgICAgfSxcbiAgICAgICAgXCJ5MlwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9Qb3NpdGlvbkNoYW5uZWxEZWZcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiWTIgY29vcmRpbmF0ZXMgZm9yIHJhbmdlZCBgYmFyYCwgYHJ1bGVgLCBgYXJlYWBcIlxuICAgICAgICB9LFxuICAgICAgICBcImNvbG9yXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NoYW5uZWxEZWZXaXRoTGVnZW5kXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkNvbG9yIG9mIHRoZSBtYXJrcyDigJMgZWl0aGVyIGZpbGwgb3Igc3Ryb2tlIGNvbG9yIGJhc2VkIG9uIG1hcmsgdHlwZS5cXG5cXG4oQnkgZGVmYXVsdCwgZmlsbCBjb2xvciBmb3IgYGFyZWFgLCBgYmFyYCwgYHRpY2tgLCBgdGV4dGAsIGBjaXJjbGVgLCBhbmQgYHNxdWFyZWAgL1xcblxcbnN0cm9rZSBjb2xvciBmb3IgYGxpbmVgIGFuZCBgcG9pbnRgLilcIlxuICAgICAgICB9LFxuICAgICAgICBcIm9wYWNpdHlcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvQ2hhbm5lbERlZldpdGhMZWdlbmRcIixcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiT3BhY2l0eSBvZiB0aGUgbWFya3Mg4oCTIGVpdGhlciBjYW4gYmUgYSB2YWx1ZSBvciBpbiBhIHJhbmdlLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwic2l6ZVwiOiB7XG4gICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9DaGFubmVsRGVmV2l0aExlZ2VuZFwiLFxuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJTaXplIG9mIHRoZSBtYXJrLlxcblxcbi0gRm9yIGBwb2ludGAsIGBzcXVhcmVgIGFuZCBgY2lyY2xlYFxcblxcbuKAkyB0aGUgc3ltYm9sIHNpemUsIG9yIHBpeGVsIGFyZWEgb2YgdGhlIG1hcmsuXFxuXFxuLSBGb3IgYGJhcmAgYW5kIGB0aWNrYCDigJMgdGhlIGJhciBhbmQgdGljaydzIHNpemUuXFxuXFxuLSBGb3IgYHRleHRgIOKAkyB0aGUgdGV4dCdzIGZvbnQgc2l6ZS5cXG5cXG4tIFNpemUgaXMgY3VycmVudGx5IHVuc3VwcG9ydGVkIGZvciBgbGluZWAgYW5kIGBhcmVhYC5cIlxuICAgICAgICB9LFxuICAgICAgICBcInNoYXBlXCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0NoYW5uZWxEZWZXaXRoTGVnZW5kXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRoZSBzeW1ib2wncyBzaGFwZSAob25seSBmb3IgYHBvaW50YCBtYXJrcykuIFRoZSBzdXBwb3J0ZWQgdmFsdWVzIGFyZVxcblxcbmBcXFwiY2lyY2xlXFxcImAgKGRlZmF1bHQpLCBgXFxcInNxdWFyZVxcXCJgLCBgXFxcImNyb3NzXFxcImAsIGBcXFwiZGlhbW9uZFxcXCJgLCBgXFxcInRyaWFuZ2xlLXVwXFxcImAsXFxuXFxub3IgYFxcXCJ0cmlhbmdsZS1kb3duXFxcImAsIG9yIGVsc2UgYSBjdXN0b20gU1ZHIHBhdGggc3RyaW5nLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwiZGV0YWlsXCI6IHtcbiAgICAgICAgICBcImRlc2NyaXB0aW9uXCI6IFwiQWRkaXRpb25hbCBsZXZlbHMgb2YgZGV0YWlsIGZvciBncm91cGluZyBkYXRhIGluIGFnZ3JlZ2F0ZSB2aWV3cyBhbmRcXG5cXG5pbiBsaW5lIGFuZCBhcmVhIG1hcmtzIHdpdGhvdXQgbWFwcGluZyBkYXRhIHRvIGEgc3BlY2lmaWMgdmlzdWFsIGNoYW5uZWwuXCIsXG4gICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRmllbGREZWZcIixcbiAgICAgICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIkludGVyZmFjZSBmb3IgYW55IGtpbmQgb2YgRmllbGREZWY7XFxuXFxuRm9yIHNpbXBsaWNpdHksIHdlIGRvIG5vdCBkZWNsYXJlIG11bHRpcGxlIGludGVyZmFjZXMgb2YgRmllbGREZWYgbGlrZVxcblxcbndlIGRvIGZvciBKU09OIHNjaGVtYS5cIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgXCIkcmVmXCI6IFwiIy9kZWZpbml0aW9ucy9GaWVsZERlZlwiLFxuICAgICAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJJbnRlcmZhY2UgZm9yIGFueSBraW5kIG9mIEZpZWxkRGVmO1xcblxcbkZvciBzaW1wbGljaXR5LCB3ZSBkbyBub3QgZGVjbGFyZSBtdWx0aXBsZSBpbnRlcmZhY2VzIG9mIEZpZWxkRGVmIGxpa2VcXG5cXG53ZSBkbyBmb3IgSlNPTiBzY2hlbWEuXCJcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgXCJ0ZXh0XCI6IHtcbiAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL0ZpZWxkRGVmXCIsXG4gICAgICAgICAgXCJkZXNjcmlwdGlvblwiOiBcIlRleHQgb2YgdGhlIGB0ZXh0YCBtYXJrLlwiXG4gICAgICAgIH0sXG4gICAgICAgIFwibGFiZWxcIjoge1xuICAgICAgICAgIFwiJHJlZlwiOiBcIiMvZGVmaW5pdGlvbnMvRmllbGREZWZcIlxuICAgICAgICB9LFxuICAgICAgICBcInBhdGhcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJPcmRlciBvZiBkYXRhIHBvaW50cyBpbiBsaW5lIG1hcmtzLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL09yZGVyQ2hhbm5lbERlZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL09yZGVyQ2hhbm5lbERlZlwiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIFwib3JkZXJcIjoge1xuICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJMYXllciBvcmRlciBmb3Igbm9uLXN0YWNrZWQgbWFya3MsIG9yIHN0YWNrIG9yZGVyIGZvciBzdGFja2VkIG1hcmtzLlwiLFxuICAgICAgICAgIFwib25lT2ZcIjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL09yZGVyQ2hhbm5lbERlZlwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBcInR5cGVcIjogXCJhcnJheVwiLFxuICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICBcIiRyZWZcIjogXCIjL2RlZmluaXRpb25zL09yZGVyQ2hhbm5lbERlZlwiXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFwiJHNjaGVtYVwiOiBcImh0dHA6Ly9qc29uLXNjaGVtYS5vcmcvZHJhZnQtMDQvc2NoZW1hI1wiXG59OyIsIid1c2Ugc3RyaWN0Jztcbi8qIGdsb2JhbHMgd2luZG93LCBhbmd1bGFyICovXG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJywgW1xuICAgICdMb2NhbFN0b3JhZ2VNb2R1bGUnLFxuICAgICdhbmd1bGFyLWdvb2dsZS1hbmFseXRpY3MnLFxuICAgICdhbmd1bGFyLXNvcnRhYmxlLXZpZXcnLFxuICAgICdhbmd1bGFyLXdlYnNxbCdcbiAgXSlcbiAgLmNvbnN0YW50KCdfJywgd2luZG93Ll8pXG4gIC8vIGRhdGFsaWIsIHZlZ2FsaXRlLCB2ZWdhXG4gIC5jb25zdGFudCgndmwnLCB3aW5kb3cudmwpXG4gIC5jb25zdGFudCgnY3FsJywgd2luZG93LmNxbClcbiAgLmNvbnN0YW50KCd2bFNjaGVtYScsIHdpbmRvdy52bFNjaGVtYSlcbiAgLmNvbnN0YW50KCd2ZycsIHdpbmRvdy52ZylcbiAgLmNvbnN0YW50KCd1dGlsJywgd2luZG93LnZnLnV0aWwpXG4gIC8vIG90aGVyIGxpYnJhcmllc1xuICAuY29uc3RhbnQoJ2pRdWVyeScsIHdpbmRvdy4kKVxuICAuY29uc3RhbnQoJ1BhcGEnLCB3aW5kb3cuUGFwYSlcbiAgLmNvbnN0YW50KCdCbG9iJywgd2luZG93LkJsb2IpXG4gIC5jb25zdGFudCgnVVJMJywgd2luZG93LlVSTClcbiAgLmNvbnN0YW50KCdEcm9wJywgd2luZG93LkRyb3ApXG4gIC5jb25zdGFudCgnSGVhcCcsIHdpbmRvdy5IZWFwKVxuICAvLyBVc2UgdGhlIGN1c3RvbWl6ZWQgdmVuZG9yL2pzb24zLWNvbXBhY3RzdHJpbmdpZnlcbiAgLmNvbnN0YW50KCdKU09OMycsIHdpbmRvdy5KU09OMy5ub0NvbmZsaWN0KCkpXG4gIC5jb25zdGFudCgnQU5ZJywgJ19fQU5ZX18nKVxuICAvLyBjb25zdGFudHNcbiAgLmNvbnN0YW50KCdjb25zdHMnLCB7XG4gICAgYWRkQ291bnQ6IHRydWUsIC8vIGFkZCBjb3VudCBmaWVsZCB0byBEYXRhc2V0LmRhdGFzY2hlbWFcbiAgICBkZWJ1ZzogdHJ1ZSxcbiAgICB1c2VVcmw6IHRydWUsXG4gICAgbG9nZ2luZzogdHJ1ZSxcbiAgICBsb2dMZXZlbDogJ0lORk8nLFxuICAgIGxvZ1ByaW50TGV2ZWw6ICdJTkZPJyxcbiAgICBsb2dUb1dlYlNxbDogZmFsc2UsIC8vIGluIHVzZXIgc3R1ZGllcywgc2V0IHRoaXMgdG8gdHJ1ZVxuICAgIGRlZmF1bHRDb25maWdTZXQ6ICdsYXJnZScsXG4gICAgYXBwSWQ6ICd2bHVpJyxcbiAgICAvLyBlbWJlZGRlZCBwb2xlc3RhciBhbmQgdm95YWdlciB3aXRoIGtub3duIGRhdGFcbiAgICBlbWJlZGRlZERhdGE6IHdpbmRvdy52Z3VpRGF0YSB8fCB1bmRlZmluZWQsXG4gICAgcHJpb3JpdHk6IHtcbiAgICAgIGJvb2ttYXJrOiAwLFxuICAgICAgcG9wdXA6IDAsXG4gICAgICB2aXNsaXN0OiAxMDAwXG4gICAgfSxcbiAgICBteXJpYVJlc3Q6ICdodHRwOi8vZWMyLTUyLTEtMzgtMTgyLmNvbXB1dGUtMS5hbWF6b25hd3MuY29tOjg3NTMnLFxuICAgIGRlZmF1bHRUaW1lRm46ICd5ZWFyJ1xuICB9KTtcbiIsImFuZ3VsYXIubW9kdWxlKFwidmx1aVwiKS5ydW4oW1wiJHRlbXBsYXRlQ2FjaGVcIiwgZnVuY3Rpb24oJHRlbXBsYXRlQ2FjaGUpIHskdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L2FkZG15cmlhZGF0YXNldC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJhZGQtbXlyaWEtZGF0YXNldFxcXCI+PHA+U2VsZWN0IGEgZGF0YXNldCBmcm9tIHRoZSBNeXJpYSBpbnN0YW5jZSBhdCA8aW5wdXQgbmctbW9kZWw9XFxcIm15cmlhUmVzdFVybFxcXCI+PGJ1dHRvbiBuZy1jbGljaz1cXFwibG9hZERhdGFzZXRzKFxcJ1xcJylcXFwiPnVwZGF0ZTwvYnV0dG9uPi48L3A+PGZvcm0gbmctc3VibWl0PVxcXCJhZGREYXRhc2V0KG15cmlhRGF0YXNldClcXFwiPjxkaXY+PHNlbGVjdCBuYW1lPVxcXCJteXJpYS1kYXRhc2V0XFxcIiBpZD1cXFwic2VsZWN0LW15cmlhLWRhdGFzZXRcXFwiIG5nLWRpc2FibGVkPVxcXCJkaXNhYmxlZFxcXCIgbmctbW9kZWw9XFxcIm15cmlhRGF0YXNldFxcXCIgbmctb3B0aW9ucz1cXFwib3B0aW9uTmFtZShkYXRhc2V0KSBmb3IgZGF0YXNldCBpbiBteXJpYURhdGFzZXRzIHRyYWNrIGJ5IGRhdGFzZXQucmVsYXRpb25OYW1lXFxcIj48b3B0aW9uIHZhbHVlPVxcXCJcXFwiPlNlbGVjdCBEYXRhc2V0Li4uPC9vcHRpb24+PC9zZWxlY3Q+PC9kaXY+PGJ1dHRvbiB0eXBlPVxcXCJzdWJtaXRcXFwiPkFkZCBkYXRhc2V0PC9idXR0b24+PC9mb3JtPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImRhdGFzZXQvYWRkdXJsZGF0YXNldC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJhZGQtdXJsLWRhdGFzZXRcXFwiPjxwPkFkZCB0aGUgbmFtZSBvZiB0aGUgZGF0YXNldCBhbmQgdGhlIFVSTCB0byBhIDxiPkpTT048L2I+IG9yIDxiPkNTVjwvYj4gKHdpdGggaGVhZGVyKSBmaWxlLiBNYWtlIHN1cmUgdGhhdCB0aGUgZm9ybWF0dGluZyBpcyBjb3JyZWN0IGFuZCBjbGVhbiB0aGUgZGF0YSBiZWZvcmUgYWRkaW5nIGl0LiBUaGUgYWRkZWQgZGF0YXNldCBpcyBvbmx5IHZpc2libGUgdG8geW91LjwvcD48Zm9ybSBuZy1zdWJtaXQ9XFxcImFkZEZyb21VcmwoYWRkZWREYXRhc2V0KVxcXCI+PGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+PGxhYmVsIGZvcj1cXFwiZGF0YXNldC1uYW1lXFxcIj5OYW1lPC9sYWJlbD4gPGlucHV0IG5nLW1vZGVsPVxcXCJhZGRlZERhdGFzZXQubmFtZVxcXCIgaWQ9XFxcImRhdGFzZXQtbmFtZVxcXCIgdHlwZT1cXFwidGV4dFxcXCI+PC9kaXY+PGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+PGxhYmVsIGZvcj1cXFwiZGF0YXNldC11cmxcXFwiPlVSTDwvbGFiZWw+IDxpbnB1dCBuZy1tb2RlbD1cXFwiYWRkZWREYXRhc2V0LnVybFxcXCIgaWQ9XFxcImRhdGFzZXQtdXJsXFxcIiB0eXBlPVxcXCJ1cmxcXFwiPjxwPk1ha2Ugc3VyZSB0aGF0IHlvdSBob3N0IHRoZSBmaWxlIG9uIGEgc2VydmVyIHRoYXQgaGFzIDxjb2RlPkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbjogKjwvY29kZT4gc2V0LjwvcD48L2Rpdj48YnV0dG9uIHR5cGU9XFxcInN1Ym1pdFxcXCI+QWRkIGRhdGFzZXQ8L2J1dHRvbj48L2Zvcm0+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiZGF0YXNldC9jaGFuZ2Vsb2FkZWRkYXRhc2V0Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcImNoYW5nZS1sb2FkZWQtZGF0YXNldFxcXCI+PGRpdiBuZy1pZj1cXFwidXNlckRhdGEubGVuZ3RoXFxcIj48aDM+VXBsb2FkZWQgRGF0YXNldHM8L2gzPjx1bD48bGkgbmctcmVwZWF0PVxcXCJkYXRhc2V0IGluIHVzZXJEYXRhIHRyYWNrIGJ5IGRhdGFzZXQuaWRcXFwiIG5nLWNsYXNzPVxcXCJ7c2VsZWN0ZWQ6IERhdGFzZXQuY3VycmVudERhdGFzZXQuaWQgPT09IGRhdGFzZXQuaWR9XFxcIj48YSBjbGFzcz1cXFwiZGF0YXNldFxcXCIgbmctY2xpY2s9XFxcInNlbGVjdERhdGFzZXQoZGF0YXNldClcXFwiIG5nLWRpc2FibGVkPVxcXCJEYXRhc2V0LmN1cnJlbnREYXRhc2V0LmlkID09PSBkYXRhc2V0LmlkXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZGF0YWJhc2VcXFwiPjwvaT4gPHN0cm9uZz57e2RhdGFzZXQubmFtZX19PC9zdHJvbmc+PC9hPiA8c3BhbiBuZy1pZj1cXFwiZGF0YXNldC5kZXNjcmlwdGlvblxcXCI+e3tkYXRhc2V0LmRlc2NyaXB0aW9ufX08L3NwYW4+IDxzdHJvbmcgbmctaWY9XFxcIkRhdGFzZXQuY3VycmVudERhdGFzZXQgPT09IGRhdGFzZXRcXFwiPihzZWxlY3RlZCk8L3N0cm9uZz48L2xpPjwvdWw+PC9kaXY+PGgzPkV4cGxvcmUgYSBTYW1wbGUgRGF0YXNldDwvaDM+PHVsIGNsYXNzPVxcXCJsb2FkZWQtZGF0YXNldC1saXN0XFxcIj48bGkgbmctcmVwZWF0PVxcXCJkYXRhc2V0IGluIHNhbXBsZURhdGEgdHJhY2sgYnkgZGF0YXNldC5pZFxcXCIgbmctY2xhc3M9XFxcIntzZWxlY3RlZDogRGF0YXNldC5jdXJyZW50RGF0YXNldC5pZCA9PT0gZGF0YXNldC5pZH1cXFwiPjxhIGNsYXNzPVxcXCJkYXRhc2V0XFxcIiBuZy1jbGljaz1cXFwic2VsZWN0RGF0YXNldChkYXRhc2V0KVxcXCIgbmctZGlzYWJsZWQ9XFxcIkRhdGFzZXQuY3VycmVudERhdGFzZXQuaWQgPT09IGRhdGFzZXQuaWRcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1kYXRhYmFzZVxcXCI+PC9pPiA8c3Ryb25nPnt7ZGF0YXNldC5uYW1lfX08L3N0cm9uZz48L2E+IDxzdHJvbmcgbmctaWY9XFxcIkRhdGFzZXQuY3VycmVudERhdGFzZXQgPT09IGRhdGFzZXRcXFwiPihzZWxlY3RlZCk8L3N0cm9uZz4gPGVtIG5nLWlmPVxcXCJkYXRhc2V0LmRlc2NyaXB0aW9uXFxcIj57e2RhdGFzZXQuZGVzY3JpcHRpb259fTwvZW0+PC9saT48L3VsPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImRhdGFzZXQvZGF0YXNldG1vZGFsLmh0bWxcIixcIjxtb2RhbCBpZD1cXFwiZGF0YXNldC1tb2RhbFxcXCIgbWF4LXdpZHRoPVxcXCI4MDBweFxcXCI+PGRpdiBjbGFzcz1cXFwibW9kYWwtaGVhZGVyXFxcIj48bW9kYWwtY2xvc2UtYnV0dG9uPjwvbW9kYWwtY2xvc2UtYnV0dG9uPjxoMj5BZGQgRGF0YXNldDwvaDI+PC9kaXY+PGRpdiBjbGFzcz1cXFwibW9kYWwtbWFpblxcXCI+PHRhYnNldD48dGFiIGhlYWRpbmc9XFxcIkNoYW5nZSBEYXRhc2V0XFxcIj48Y2hhbmdlLWxvYWRlZC1kYXRhc2V0PjwvY2hhbmdlLWxvYWRlZC1kYXRhc2V0PjwvdGFiPjx0YWIgaGVhZGluZz1cXFwiUGFzdGUgb3IgVXBsb2FkIERhdGFcXFwiPjxwYXN0ZS1kYXRhc2V0PjwvcGFzdGUtZGF0YXNldD48L3RhYj48dGFiIGhlYWRpbmc9XFxcIkZyb20gVVJMXFxcIj48YWRkLXVybC1kYXRhc2V0PjwvYWRkLXVybC1kYXRhc2V0PjwvdGFiPjx0YWIgaGVhZGluZz1cXFwiRnJvbSBNeXJpYVxcXCI+PGFkZC1teXJpYS1kYXRhc2V0PjwvYWRkLW15cmlhLWRhdGFzZXQ+PC90YWI+PC90YWJzZXQ+PC9kaXY+PC9tb2RhbD5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L2RhdGFzZXRzZWxlY3Rvci5odG1sXCIsXCI8YnV0dG9uIGlkPVxcXCJzZWxlY3QtZGF0YVxcXCIgY2xhc3M9XFxcInNtYWxsLWJ1dHRvbiBzZWxlY3QtZGF0YVxcXCIgbmctY2xpY2s9XFxcImxvYWREYXRhc2V0KCk7XFxcIj5DaGFuZ2U8L2J1dHRvbj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L2ZpbGVkcm9wem9uZS5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJkcm9wem9uZVxcXCIgbmctdHJhbnNjbHVkZT1cXFwiXFxcIj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJkYXRhc2V0L3Bhc3RlZGF0YXNldC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJwYXN0ZS1kYXRhXFxcIj48ZmlsZS1kcm9wem9uZSBkYXRhc2V0PVxcXCJkYXRhc2V0XFxcIiBtYXgtZmlsZS1zaXplPVxcXCIxMFxcXCIgdmFsaWQtbWltZS10eXBlcz1cXFwiW3RleHQvY3N2LCB0ZXh0L2pzb24sIHRleHQvdHN2XVxcXCI+PGRpdiBjbGFzcz1cXFwidXBsb2FkLWRhdGFcXFwiPjxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPjxsYWJlbCBmb3I9XFxcImRhdGFzZXQtZmlsZVxcXCI+RmlsZTwvbGFiZWw+IDxpbnB1dCB0eXBlPVxcXCJmaWxlXFxcIiBpZD1cXFwiZGF0YXNldC1maWxlXFxcIiBhY2NlcHQ9XFxcInRleHQvY3N2LHRleHQvdHN2XFxcIj48L2Rpdj48cD5VcGxvYWQgYSBDU1YsIG9yIHBhc3RlIGRhdGEgaW4gPGEgaHJlZj1cXFwiaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQ29tbWEtc2VwYXJhdGVkX3ZhbHVlc1xcXCI+Q1NWPC9hPiBmb3JtYXQgaW50byB0aGUgZmllbGRzLjwvcD48ZGl2IGNsYXNzPVxcXCJkcm9wem9uZS10YXJnZXRcXFwiPjxwPkRyb3AgQ1NWIGZpbGUgaGVyZTwvcD48L2Rpdj48L2Rpdj48Zm9ybSBuZy1zdWJtaXQ9XFxcImFkZERhdGFzZXQoKVxcXCI+PGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+PGxhYmVsIGZvcj1cXFwiZGF0YXNldC1uYW1lXFxcIj5OYW1lPC9sYWJlbD4gPGlucHV0IHR5cGU9XFxcIm5hbWVcXFwiIG5nLW1vZGVsPVxcXCJkYXRhc2V0Lm5hbWVcXFwiIGlkPVxcXCJkYXRhc2V0LW5hbWVcXFwiIHJlcXVpcmVkPVxcXCJcXFwiPjwvZGl2PjxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPjx0ZXh0YXJlYSBuZy1tb2RlbD1cXFwiZGF0YXNldC5kYXRhXFxcIiBuZy1tb2RlbC1vcHRpb25zPVxcXCJ7IHVwZGF0ZU9uOiBcXCdkZWZhdWx0IGJsdXJcXCcsIGRlYm91bmNlOiB7IFxcJ2RlZmF1bHRcXCc6IDE3LCBcXCdibHVyXFwnOiAwIH19XFxcIiByZXF1aXJlZD1cXFwiXFxcIj5cXG4gICAgICA8L3RleHRhcmVhPjwvZGl2PjxidXR0b24gdHlwZT1cXFwic3VibWl0XFxcIj5BZGQgZGF0YTwvYnV0dG9uPjwvZm9ybT48L2ZpbGUtZHJvcHpvbmU+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiY29tcG9uZW50cy9hbGVydG1lc3NhZ2VzL2FsZXJ0bWVzc2FnZXMuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwiYWxlcnQtYm94XFxcIiBuZy1zaG93PVxcXCJBbGVydHMuYWxlcnRzLmxlbmd0aCA+IDBcXFwiPjxkaXYgY2xhc3M9XFxcImFsZXJ0LWl0ZW1cXFwiIG5nLXJlcGVhdD1cXFwiYWxlcnQgaW4gQWxlcnRzLmFsZXJ0c1xcXCI+e3sgYWxlcnQubXNnIH19IDxhIGNsYXNzPVxcXCJjbG9zZVxcXCIgbmctY2xpY2s9XFxcIkFsZXJ0cy5jbG9zZUFsZXJ0KCRpbmRleClcXFwiPiZ0aW1lczs8L2E+PC9kaXY+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiY29tcG9uZW50cy9ib29rbWFya2xpc3QvYm9va21hcmtsaXN0Lmh0bWxcIixcIjxtb2RhbCBpZD1cXFwiYm9va21hcmstbGlzdFxcXCIgbmctaWY9XFxcIkJvb2ttYXJrcy5pc1N1cHBvcnRlZFxcXCI+PGRpdiBjbGFzcz1cXFwibW9kYWwtaGVhZGVyIGNhcmQgbm8tdG9wLW1hcmdpbiBuby1yaWdodC1tYXJnaW5cXFwiPjxtb2RhbC1jbG9zZS1idXR0b24gY2xvc2UtYWN0aW9uPVxcXCJCb29rbWFya3MubG9nQm9va21hcmtzQ2xvc2VkKClcXFwiPjwvbW9kYWwtY2xvc2UtYnV0dG9uPjxoMiBjbGFzcz1cXFwibm8tYm90dG9tLW1hcmdpblxcXCI+Qm9va21hcmtzICh7eyBCb29rbWFya3MubGlzdC5sZW5ndGggfX0pPC9oMj48YSBjbGFzcz1cXFwiYm9va21hcmstbGlzdC11dGlsXFxcIiBuZy1jbGljaz1cXFwiQm9va21hcmtzLmNsZWFyKClcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS10cmFzaC1vXFxcIj48L2k+IENsZWFyIGFsbDwvYT4gPGEgY2xhc3M9XFxcImJvb2ttYXJrLWxpc3QtdXRpbFxcXCIgbmctY2xpY2s9XFxcIkJvb2ttYXJrcy5leHBvcnQoKVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWNsaXBib2FyZFxcXCI+PC9pPiBFeHBvcnQ8L2E+PC9kaXY+PGRpdiBjbGFzcz1cXFwiZmxleC1ncm93LTEgc2Nyb2xsLXlcXFwiPjxkaXYgbmctaWY9XFxcIkJvb2ttYXJrcy5saXN0Lmxlbmd0aCA+IDBcXFwiIGNsYXNzPVxcXCJoZmxleCBmbGV4LXdyYXBcXFwiIHN2LXJvb3Q9XFxcIlxcXCIgc3YtcGFydD1cXFwiQm9va21hcmtzLmxpc3RcXFwiIHN2LW9uLXNvcnQ9XFxcIkJvb2ttYXJrcy5yZW9yZGVyKClcXFwiPjx2bC1wbG90LWdyb3VwIG5nLXJlcGVhdD1cXFwiYm9va21hcmsgaW4gQm9va21hcmtzLmxpc3QgfCBvcmRlck9iamVjdEJ5IDogXFwndGltZUFkZGVkXFwnIDogZmFsc2VcXFwiIGNsYXNzPVxcXCJ3cmFwcGVkLXZsLXBsb3QtZ3JvdXAgY2FyZFxcXCIgbGlzdC10aXRsZT1cXFwiXFwnQm9va21hcmtcXCdcXFwiIGNoYXJ0PVxcXCJib29rbWFyay5jaGFydFxcXCIgZmllbGQtc2V0PVxcXCJib29rbWFyay5jaGFydC5maWVsZFNldFxcXCIgc2hvdy1ib29rbWFyaz1cXFwidHJ1ZVxcXCIgc2hvdy1kZWJ1Zz1cXFwiY29uc3RzLmRlYnVnXFxcIiBzaG93LWV4cGFuZD1cXFwiZmFsc2VcXFwiIGFsd2F5cy1zZWxlY3RlZD1cXFwidHJ1ZVxcXCIgaGlnaGxpZ2h0ZWQ9XFxcImhpZ2hsaWdodGVkXFxcIiBvdmVyZmxvdz1cXFwidHJ1ZVxcXCIgdG9vbHRpcD1cXFwidHJ1ZVxcXCIgcHJpb3JpdHk9XFxcImNvbnN0cy5wcmlvcml0eS5ib29rbWFya1xcXCIgc2hvdy1zZWxlY3Q9XFxcInRydWVcXFwiIHN2LWVsZW1lbnQ9XFxcIlxcXCI+PC92bC1wbG90LWdyb3VwPjxkaXYgc3YtcGxhY2Vob2xkZXI9XFxcIlxcXCI+PC9kaXY+PC9kaXY+PGRpdiBjbGFzcz1cXFwidmlzLWxpc3QtZW1wdHlcXFwiIG5nLWlmPVxcXCJCb29rbWFya3MubGlzdC5sZW5ndGggPT09IDBcXFwiPllvdSBoYXZlIG5vIGJvb2ttYXJrczwvZGl2PjwvZGl2PjwvbW9kYWw+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiY29tcG9uZW50cy9jaGFubmVsc2hlbGYvY2hhbm5lbHNoZWxmLmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcInNoZWxmLWdyb3VwXFxcIj48ZGl2IGNsYXNzPVxcXCJzaGVsZlxcXCIgbmctY2xhc3M9XFxcIntkaXNhYmxlZDogZGlzYWJsZWQgfHwgIXN1cHBvcnRNYXJrKGNoYW5uZWxJZCwgbWFyayksIFxcJ2FueVxcJzogaXNBbnlDaGFubmVsfVxcXCI+PGRpdiBjbGFzcz1cXFwic2hlbGYtbGFiZWxcXFwiIG5nLWNsYXNzPVxcXCJ7ZXhwYW5kZWQ6IHByb3BzRXhwYW5kZWR9XFxcIj57eyBpc0FueUNoYW5uZWwgPyBcXCdhbnlcXCcgOiBjaGFubmVsSWQgfX08L2Rpdj48ZGl2IGNsYXNzPVxcXCJmaWVsZC1kcm9wXFxcIiBuZy1tb2RlbD1cXFwicGlsbHNbY2hhbm5lbElkXVxcXCIgZGF0YS1kcm9wPVxcXCIhZGlzYWJsZWQgJiYgc3VwcG9ydE1hcmsoY2hhbm5lbElkLCBtYXJrKVxcXCIganF5b3VpLWRyb3BwYWJsZT1cXFwie29uRHJvcDpcXCdmaWVsZERyb3BwZWRcXCd9XFxcIiBkYXRhLWpxeW91aS1vcHRpb25zPVxcXCJ7YWN0aXZlQ2xhc3M6IFxcJ2Ryb3AtYWN0aXZlXFwnfVxcXCI+PGZpZWxkLWluZm8gbmctc2hvdz1cXFwiZW5jb2RpbmdbY2hhbm5lbElkXS5maWVsZFxcXCIgbmctY2xhc3M9XFxcInsgZXhwYW5kZWQ6IGZ1bmNzRXhwYW5kZWQsIGFueTogaXNBbnlGaWVsZCwgXFwnZW51bWVyYXRlZC1maWVsZFxcJzogaXNFbnVtZXJhdGVkRmllbGQsIFxcJ2VudW1lcmF0ZWQtY2hhbm5lbFxcJzogaXNFbnVtZXJhdGVkQ2hhbm5lbCwgaGlnaGxpZ2h0ZWQ6IGlzSGlnaGxpZ2h0ZWQoY2hhbm5lbElkKSB9XFxcIiBmaWVsZC1kZWY9XFxcImVuY29kaW5nW2NoYW5uZWxJZF1cXFwiIHNob3ctdHlwZT1cXFwidHJ1ZVxcXCIgc2hvdy1jYXJldD1cXFwidHJ1ZVxcXCIgZGlzYWJsZS1jYXJldD1cXFwiZW5jb2RpbmdbY2hhbm5lbElkXS5hZ2dyZWdhdGU9PT1cXCdjb3VudFxcJ1xcXCIgcG9wdXAtY29udGVudD1cXFwiZmllbGRJbmZvUG9wdXBDb250ZW50XFxcIiBzaG93LXJlbW92ZT1cXFwidHJ1ZVxcXCIgcmVtb3ZlLWFjdGlvbj1cXFwicmVtb3ZlRmllbGQoKVxcXCIgY2xhc3M9XFxcInNlbGVjdGVkIGRyYWdnYWJsZSBmdWxsLXdpZHRoXFxcIiBkYXRhLWRyYWc9XFxcInRydWVcXFwiIG5nLW1vZGVsPVxcXCJwaWxsc1tjaGFubmVsSWRdXFxcIiBqcXlvdWktZHJhZ2dhYmxlPVxcXCJ7b25TdGFydDogXFwnZmllbGREcmFnU3RhcnRcXCcsIG9uU3RvcDpcXCdmaWVsZERyYWdTdG9wXFwnfVxcXCIgZGF0YS1qcXlvdWktb3B0aW9ucz1cXFwie3JldmVydDogXFwnaW52YWxpZFxcJywgaGVscGVyOiBcXCdjbG9uZVxcJ31cXFwiPjwvZmllbGQtaW5mbz48c3BhbiBjbGFzcz1cXFwicGxhY2Vob2xkZXJcXFwiIG5nLWlmPVxcXCIhZW5jb2RpbmdbY2hhbm5lbElkXS5maWVsZFxcXCI+ZHJvcCBhIGZpZWxkIGhlcmU8L3NwYW4+PC9kaXY+PC9kaXY+PGRpdiBjbGFzcz1cXFwiZHJvcC1jb250YWluZXJcXFwiPjxkaXYgY2xhc3M9XFxcInBvcHVwLW1lbnUgc2hlbGYtcHJvcGVydGllcyBzaGVsZi1wcm9wZXJ0aWVzLXt7Y2hhbm5lbElkfX1cXFwiPjwvZGl2PjxkaXYgY2xhc3M9XFxcInBvcHVwLW1lbnUgc2hlbGYtZnVuY3Rpb25zIHNoZWxmLWZ1bmN0aW9ucy17e2NoYW5uZWxJZH19XFxcIj48ZnVuY3Rpb24tc2VsZWN0IG5nLWlmPVxcXCIhcHJldmlld1xcXCIgZmllbGQtZGVmPVxcXCJlbmNvZGluZ1tjaGFubmVsSWRdXFxcIiBjaGFubmVsLWlkPVxcXCJjaGFubmVsSWRcXFwiPjwvZnVuY3Rpb24tc2VsZWN0PjwvZGl2PjwvZGl2PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvZmllbGRpbmZvL2ZpZWxkaW5mby5odG1sXCIsXCI8c3BhbiBjbGFzcz1cXFwiZmllbGQtaW5mb1xcXCI+PHNwYW4gY2xhc3M9XFxcImhmbGV4IGZ1bGwtd2lkdGhcXFwiIG5nLWNsaWNrPVxcXCJjbGlja2VkKCRldmVudClcXFwiPjxzcGFuIGNsYXNzPVxcXCJ0eXBlLWNhcmV0XFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTogIWRpc2FibGVDYXJldH1cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1jYXJldC1kb3duXFxcIiBuZy1zaG93PVxcXCJzaG93Q2FyZXRcXFwiPjwvaT4gPHNwYW4gY2xhc3M9XFxcInR5cGUgZmEge3tpY29ufX1cXFwiIG5nLXNob3c9XFxcInNob3dUeXBlXFxcIiB0aXRsZT1cXFwie3t0eXBlTmFtZX19XFxcIj48L3NwYW4+PC9zcGFuPiA8c3BhbiBuZy1pZj1cXFwiZmllbGREZWYuYWdncmVnYXRlIT09XFwnY291bnRcXCdcXFwiIGNsYXNzPVxcXCJmaWVsZC1pbmZvLXRleHRcXFwiPjxzcGFuIG5nLWlmPVxcXCJmdW5jKGZpZWxkRGVmKVxcXCIgY2xhc3M9XFxcImZpZWxkLWZ1bmNcXFwiIHRpdGxlPVxcXCJ7eyBmdW5jKGZpZWxkRGVmKSB9fVxcXCIgbmctY2xhc3M9XFxcInthbnk6IGZpZWxkRGVmLl9hbnl9XFxcIj57eyBmdW5jKGZpZWxkRGVmKSB9fTwvc3Bhbj48c3BhbiBjbGFzcz1cXFwiZmllbGQtbmFtZVxcXCIgbmctY2xhc3M9XFxcIntoYXNmdW5jOiBmdW5jKGZpZWxkRGVmKSwgYW55OiBmaWVsZERlZi5fYW55fVxcXCI+e3sgKGZpZWxkRGVmLnRpdGxlIHx8IGZpZWxkRGVmLmZpZWxkKSB8IHVuZGVyc2NvcmUyc3BhY2UgfX08L3NwYW4+PC9zcGFuPiA8c3BhbiBuZy1pZj1cXFwiZmllbGREZWYuYWdncmVnYXRlPT09XFwnY291bnRcXCcgfHwgZmllbGREZWYuYXV0b0NvdW50XFxcIiBjbGFzcz1cXFwiZmllbGQtY291bnQgZmllbGQtaW5mby10ZXh0XFxcIj48c3BhbiBjbGFzcz1cXFwiZmllbGQtbmFtZVxcXCI+Q09VTlQ8L3NwYW4+PC9zcGFuPiA8c3BhbiBjbGFzcz1cXFwibm8tc2hyaW5rIHJlbW92ZVxcXCIgbmctc2hvdz1cXFwic2hvd1JlbW92ZVxcXCI+PGEgY2xhc3M9XFxcInJlbW92ZS1maWVsZFxcXCIgbmctY2xpY2s9XFxcInJlbW92ZUFjdGlvbigpXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtdGltZXNcXFwiPjwvaT48L2E+PC9zcGFuPiA8c3BhbiBjbGFzcz1cXFwibm8tc2hyaW5rIGFkZFxcXCIgbmctc2hvdz1cXFwic2hvd0FkZFxcXCI+PGEgY2xhc3M9XFxcImFkZC1maWVsZFxcXCIgbmctY2xpY2s9XFxcImFkZEFjdGlvbigpXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtcGx1c1xcXCI+PC9pPjwvYT48L3NwYW4+PC9zcGFuPjwvc3Bhbj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL2Z1bmN0aW9uc2VsZWN0L2Z1bmN0aW9uc2VsZWN0Lmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcIm1iNVxcXCIgbmctaWY9XFxcImZ1bmMubGlzdC5hYm92ZUZvbGQubGVuZ3RoID4gMSB8fCBmdW5jLmxpc3QuYWJvdmVGb2xkWzBdICE9PSB1bmRlZmluZWRcXFwiPjxoND5GdW5jdGlvbjwvaDQ+PGRpdj48bGFiZWwgY2xhc3M9XFxcImZ1bmMtbGFiZWwgZmllbGQtZnVuY1xcXCIgbmctcmVwZWF0PVxcXCJmIGluIGZ1bmMubGlzdC5hYm92ZUZvbGRcXFwiIG5nLWNsYXNzPVxcXCJ7bm9uZTogIWZ9XFxcIj48aW5wdXQgdHlwZT1cXFwicmFkaW9cXFwiIG5nLXZhbHVlPVxcXCJmXFxcIiBuZy1tb2RlbD1cXFwiZnVuYy5zZWxlY3RlZFxcXCIgbmctY2hhbmdlPVxcXCJzZWxlY3RDaGFuZ2VkKClcXFwiPiB7e2YgfHwgXFwnTk9ORVxcJ319PC9sYWJlbD48L2Rpdj48ZGl2IG5nLXNob3c9XFxcInNob3dBbGxGdW5jdGlvbnNcXFwiPjxsYWJlbCBjbGFzcz1cXFwiZnVuYy1sYWJlbCBmaWVsZC1mdW5jXFxcIiBuZy1jbGFzcz1cXFwie1xcJ3NpbmdsZS1jb2x1bW5cXCc6IGZ1bmMuaXNUZW1wb3JhbH1cXFwiIG5nLXJlcGVhdD1cXFwiZiBpbiBmdW5jLmxpc3QuYmVsb3dGb2xkXFxcIj48aW5wdXQgdHlwZT1cXFwicmFkaW9cXFwiIG5nLXZhbHVlPVxcXCJmXFxcIiBuZy1tb2RlbD1cXFwiZnVuYy5zZWxlY3RlZFxcXCIgbmctY2hhbmdlPVxcXCJzZWxlY3RDaGFuZ2VkKClcXFwiPiB7e2Z9fTwvbGFiZWw+PC9kaXY+PGRpdiBuZy1oaWRlPVxcXCJmdW5jLmlzQ291bnQgfHwgZnVuYy5saXN0LmJlbG93Rm9sZC5sZW5ndGggPT0gMFxcXCIgY2xhc3M9XFxcImV4cGFuZC1jb2xsYXBzZVxcXCI+PGEgbmctY2xpY2s9XFxcInNob3dBbGxGdW5jdGlvbnM9IXNob3dBbGxGdW5jdGlvbnNcXFwiPjxzcGFuIG5nLXNob3c9XFxcIiFzaG93QWxsRnVuY3Rpb25zXFxcIj5tb3JlIDxpIGNsYXNzPVxcXCJmYSBmYS1hbmdsZS1kb3duXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9pPjwvc3Bhbj4gPHNwYW4gbmctc2hvdz1cXFwic2hvd0FsbEZ1bmN0aW9uc1xcXCI+bGVzcyA8aSBjbGFzcz1cXFwiZmEgZmEtYW5nbGUtdXBcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L2k+PC9zcGFuPjwvYT48L2Rpdj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL21vZGFsL21vZGFsLmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcIm1vZGFsXFxcIiBuZy1pZj1cXFwiaXNPcGVuXFxcIj48ZGl2IGNsYXNzPVxcXCJtb2RhbC13cmFwcGVyXFxcIiBzdHlsZT1cXFwie3t3cmFwcGVyU3R5bGV9fVxcXCIgbmctdHJhbnNjbHVkZT1cXFwiXFxcIj48L2Rpdj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL21vZGFsL21vZGFsY2xvc2VidXR0b24uaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwicmlnaHRcXFwiPjxhIG5nLWNsaWNrPVxcXCJjbG9zZU1vZGFsKClcXFwiIGNsYXNzPVxcXCJyaWdodFxcXCI+Q2xvc2U8L2E+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiY29tcG9uZW50cy9wcm9wZXJ0eWVkaXRvci9wcm9wZXJ0eWVkaXRvci5odG1sXCIsXCI8ZGl2PjxsYWJlbCBjbGFzcz1cXFwicHJvcC1sYWJlbFxcXCIgZm9yPVxcXCJ7eyBpZCB9fVxcXCI+PHNwYW4gY2xhc3M9XFxcIm5hbWVcXFwiIHRpdGxlPVxcXCJ7eyBwcm9wTmFtZSB9fVxcXCI+e3sgcHJvcE5hbWUgfX08L3NwYW4+IDxzcGFuIG5nLWlmPVxcXCJkZXNjcmlwdGlvblxcXCIgY2xhc3M9XFxcImZhIGZhLWluZm8tY2lyY2xlXFxcIiB0b29sdGlwcz1cXFwiXFxcIiB0b29sdGlwLXNpemU9XFxcInNtYWxsXFxcIiB0b29sdGlwLWh0bWw9XFxcIjxzdHJvbmc+e3sgcHJvcE5hbWUgfX08L3N0cm9uZz48ZGl2IGNsYXNzPVxcJ3Rvb2x0aXAtY29udGVudFxcJz57eyBkZXNjcmlwdGlvbiB9fTwvZGl2PlxcXCIgdG9vbHRpcC1zaWRlPVxcXCJyaWdodFxcXCI+PC9zcGFuPjwvbGFiZWw+PGZvcm0gY2xhc3M9XFxcImlubGluZS1ibG9ja1xcXCIgbmctc3dpdGNoPVxcXCJ0eXBlICsgKGVudW0gIT09IHVuZGVmaW5lZCA/IFxcJ2xpc3RcXCcgOiBcXCdcXCcpXFxcIj48aW5wdXQgaWQ9XFxcInt7IGlkIH19XFxcIiBuZy1zd2l0Y2gtd2hlbj1cXFwiYm9vbGVhblxcXCIgdHlwZT1cXFwiY2hlY2tib3hcXFwiIG5nLW1vZGVsPVxcXCJncm91cFtwcm9wTmFtZV1cXFwiIG5nLWhpZGU9XFxcImF1dG9tb2RlbC52YWx1ZVxcXCI+PHNlbGVjdCBpZD1cXFwie3sgaWQgfX1cXFwiIG5nLXN3aXRjaC13aGVuPVxcXCJzdHJpbmdsaXN0XFxcIiBuZy1tb2RlbD1cXFwiZ3JvdXBbcHJvcE5hbWVdXFxcIiBuZy1vcHRpb25zPVxcXCJjaG9pY2UgZm9yIGNob2ljZSBpbiBlbnVtIHRyYWNrIGJ5IGNob2ljZVxcXCIgbmctaGlkZT1cXFwiYXV0b21vZGVsLnZhbHVlXFxcIj48L3NlbGVjdD48aW5wdXQgaWQ9XFxcInt7IGlkIH19XFxcIiBuZy1zd2l0Y2gtd2hlbj1cXFwiaW50ZWdlclxcXCIgbmctYXR0ci10eXBlPVxcXCJ7eyBpc1JhbmdlID8gXFwncmFuZ2VcXCcgOiBcXCdudW1iZXJcXCd9fVxcXCIgbmctbW9kZWw9XFxcImdyb3VwW3Byb3BOYW1lXVxcXCIgbmctbW9kZWwtb3B0aW9ucz1cXFwie2RlYm91bmNlOiAyMDB9XFxcIiBuZy1hdHRyLW1pbj1cXFwie3ttaW59fVxcXCIgbmctYXR0ci1tYXg9XFxcInt7bWF4fX1cXFwiIG5nLWhpZGU9XFxcImF1dG9tb2RlbC52YWx1ZVxcXCIgbmctYXR0ci10aXRsZT1cXFwie3sgaXNSYW5nZSA/IGdyb3VwW3Byb3BOYW1lXSA6IHVuZGVmaW5lZCB9fVxcXCI+IDxpbnB1dCBpZD1cXFwie3sgaWQgfX1cXFwiIG5nLWF0dHItdHlwZT1cXFwie3sgcm9sZSA9PT0gXFwnY29sb3JcXCcgPyBcXCdjb2xvclxcJyA6IFxcJ3N0cmluZ1xcJyB9fVxcXCIgbmctc3dpdGNoLXdoZW49XFxcInN0cmluZ1xcXCIgbmctbW9kZWw9XFxcImdyb3VwW3Byb3BOYW1lXVxcXCIgbmctbW9kZWwtb3B0aW9ucz1cXFwie2RlYm91bmNlOiA1MDB9XFxcIiBuZy1oaWRlPVxcXCJhdXRvbW9kZWwudmFsdWVcXFwiPiA8c21hbGwgbmctaWY9XFxcImhhc0F1dG9cXFwiPjxsYWJlbD5BdXRvIDxpbnB1dCBuZy1tb2RlbD1cXFwiYXV0b21vZGVsLnZhbHVlXFxcIiB0eXBlPVxcXCJjaGVja2JveFxcXCI+PC9sYWJlbD48L3NtYWxsPjwvZm9ybT48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL3NjaGVtYWxpc3Qvc2NoZW1hbGlzdC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJzY2hlbWEgbm8tdG9wLW1hcmdpbiBmdWxsLXdpZHRoXFxcIj48c2NoZW1hLWxpc3QtaXRlbSBuZy1yZXBlYXQ9XFxcImZpZWxkRGVmIGluIGZpZWxkRGVmcyB8IG9yZGVyQnkgOiBvcmRlckJ5XFxcIiBmaWVsZC1kZWY9XFxcImZpZWxkRGVmXFxcIiBzaG93LWFkZD1cXFwic2hvd0FkZFxcXCI+PC9zY2hlbWEtbGlzdC1pdGVtPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvc2NoZW1hbGlzdC9zY2hlbWFsaXN0aXRlbS5odG1sXCIsXCI8ZmllbGQtaW5mbyBjbGFzcz1cXFwicGlsbCBsaXN0LWl0ZW0gZHJhZ2dhYmxlIGZ1bGwtd2lkdGggbm8tcmlnaHQtbWFyZ2luXFxcIiBuZy1jbGFzcz1cXFwie2FueTogaXNFbnVtU3BlYyhmaWVsZERlZi5maWVsZCl9XFxcIiBuZy1kYmxjbGljaz1cXFwiZmllbGRBZGQoZmllbGREZWYpXFxcIiBmaWVsZC1kZWY9XFxcImZpZWxkRGVmXFxcIiBuZy1tb2RlbD1cXFwicGlsbFxcXCIgZGF0YS1kcmFnPVxcXCJ0cnVlXFxcIiBqcXlvdWktZHJhZ2dhYmxlPVxcXCJ7cGxhY2Vob2xkZXI6IFxcJ2tlZXBcXCcsIGRlZXBDb3B5OiB0cnVlLCBvblN0YXJ0OiBcXCdmaWVsZERyYWdTdGFydFxcJywgb25TdG9wOlxcJ2ZpZWxkRHJhZ1N0b3BcXCd9XFxcIiBkYXRhLWpxeW91aS1vcHRpb25zPVxcXCJ7cmV2ZXJ0OiBcXCdpbnZhbGlkXFwnLCBoZWxwZXI6IFxcJ2Nsb25lXFwnfVxcXCIgc2hvdy1hZGQ9XFxcInNob3dBZGRcXFwiIHNob3ctY2FyZXQ9XFxcInRydWVcXFwiIGRpc2FibGUtY2FyZXQ9XFxcImZpZWxkRGVmLmltbXV0YWJsZSB8fCBmaWVsZERlZi5hZ2dyZWdhdGUgPT09IFxcJ2NvdW50XFwnIHx8IGFsbG93ZWRUeXBlcy5sZW5ndGg8PTFcXFwiIHNob3ctdHlwZT1cXFwidHJ1ZVxcXCIgYWRkLWFjdGlvbj1cXFwiZmllbGRBZGQoZmllbGREZWYpXFxcIiBwb3B1cC1jb250ZW50PVxcXCJmaWVsZEluZm9Qb3B1cENvbnRlbnRcXFwiPjwvZmllbGQtaW5mbz48ZGl2IGNsYXNzPVxcXCJkcm9wLWNvbnRhaW5lclxcXCI+PGRpdiBjbGFzcz1cXFwicG9wdXAtbWVudSBzY2hlbWEtbWVudVxcXCI+PGRpdiBjbGFzcz1cXFwibWI1IGZpZWxkLXR5cGVcXFwiIG5nLWlmPVxcXCJhbGxvd2VkVHlwZXMubGVuZ3RoPjEgJiYgIWlzQW55RmllbGRcXFwiPjxoND5UeXBlPC9oND48bGFiZWwgY2xhc3M9XFxcInR5cGUtbGFiZWxcXFwiIG5nLXJlcGVhdD1cXFwidHlwZSBpbiBhbGxvd2VkVHlwZXNcXFwiPjxpbnB1dCB0eXBlPVxcXCJyYWRpb1xcXCIgbmctdmFsdWU9XFxcInR5cGVcXFwiIG5nLW1vZGVsPVxcXCJmaWVsZERlZi50eXBlXFxcIj4ge3t0eXBlfX08L2xhYmVsPjwvZGl2PjwvZGl2PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvc2hlbHZlcy9zaGVsdmVzLmh0bWxcIixcIjxkaXYgY2xhc3M9XFxcImNhcmQgc2hlbHZlcyBuby10b3AtbWFyZ2luIG5vLXJpZ2h0LW1hcmdpbiBhYnMtMTAwXFxcIj48YSBjbGFzcz1cXFwicmlnaHRcXFwiIG5nLWNsaWNrPVxcXCJjbGVhcigpXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtZXJhc2VyXFxcIj48L2k+IENsZWFyPC9hPjxoMj5FbmNvZGluZzwvaDI+PGRpdiBjbGFzcz1cXFwic2hlbGYtcGFuZSBzaGVsZi1lbmNvZGluZy1wYW5lIGZ1bGwtd2lkdGhcXFwiPjxoMz5Qb3NpdGlvbmFsPC9oMz48Y2hhbm5lbC1zaGVsZiBjaGFubmVsLWlkPVxcXCJcXCd4XFwnXFxcIiBwcmV2aWV3PVxcXCJwcmV2aWV3XFxcIiBlbmNvZGluZz1cXFwic3BlYy5lbmNvZGluZ1xcXCIgbWFyaz1cXFwic3BlYy5tYXJrXFxcIj48L2NoYW5uZWwtc2hlbGY+PGNoYW5uZWwtc2hlbGYgY2hhbm5lbC1pZD1cXFwiXFwneVxcJ1xcXCIgcHJldmlldz1cXFwicHJldmlld1xcXCIgZW5jb2Rpbmc9XFxcInNwZWMuZW5jb2RpbmdcXFwiIG1hcms9XFxcInNwZWMubWFya1xcXCI+PC9jaGFubmVsLXNoZWxmPjxjaGFubmVsLXNoZWxmIGNoYW5uZWwtaWQ9XFxcIlxcJ2NvbHVtblxcJ1xcXCIgcHJldmlldz1cXFwicHJldmlld1xcXCIgZW5jb2Rpbmc9XFxcInNwZWMuZW5jb2RpbmdcXFwiIG1hcms9XFxcInNwZWMubWFya1xcXCIgZGlzYWJsZWQ9XFxcIiFzcGVjLmVuY29kaW5nLnguZmllbGRcXFwiPj48L2NoYW5uZWwtc2hlbGY+PGNoYW5uZWwtc2hlbGYgY2hhbm5lbC1pZD1cXFwiXFwncm93XFwnXFxcIiBwcmV2aWV3PVxcXCJwcmV2aWV3XFxcIiBlbmNvZGluZz1cXFwic3BlYy5lbmNvZGluZ1xcXCIgbWFyaz1cXFwic3BlYy5tYXJrXFxcIiBkaXNhYmxlZD1cXFwiIXNwZWMuZW5jb2RpbmcueS5maWVsZFxcXCI+PC9jaGFubmVsLXNoZWxmPjwvZGl2PjxkaXYgY2xhc3M9XFxcInNoZWxmLXBhbmUgc2hlbGYtbWFya3MtcGFuZSBmdWxsLXdpZHRoXFxcIj48ZGl2IGNsYXNzPVxcXCJyaWdodFxcXCI+PHNlbGVjdCBjbGFzcz1cXFwibWFya3NlbGVjdFxcXCIgbmctbW9kZWw9XFxcInNwZWMubWFya1xcXCIgbmctY2xhc3M9XFxcInthdXRvOiBzcGVjLm1hcmsgPT09IEFOWX1cXFwiIG5nLW9wdGlvbnM9XFxcIih0eXBlID09PSBBTlkgPyBcXCdhdXRvXFwnIDogdHlwZSkgZm9yIHR5cGUgaW4gKHN1cHBvcnRBbnkgPyBtYXJrc1dpdGhBbnkgOiBtYXJrcylcXFwiIG5nLWNoYW5nZT1cXFwibWFya0NoYW5nZSgpXFxcIj48L3NlbGVjdD48L2Rpdj48aDM+TWFya3M8L2gzPjxjaGFubmVsLXNoZWxmIGNoYW5uZWwtaWQ9XFxcIlxcJ3NpemVcXCdcXFwiIHByZXZpZXc9XFxcInByZXZpZXdcXFwiIGVuY29kaW5nPVxcXCJzcGVjLmVuY29kaW5nXFxcIiBtYXJrPVxcXCJzcGVjLm1hcmtcXFwiPjwvY2hhbm5lbC1zaGVsZj48Y2hhbm5lbC1zaGVsZiBjaGFubmVsLWlkPVxcXCJcXCdjb2xvclxcJ1xcXCIgcHJldmlldz1cXFwicHJldmlld1xcXCIgZW5jb2Rpbmc9XFxcInNwZWMuZW5jb2RpbmdcXFwiIG1hcms9XFxcInNwZWMubWFya1xcXCI+PC9jaGFubmVsLXNoZWxmPjxjaGFubmVsLXNoZWxmIGNoYW5uZWwtaWQ9XFxcIlxcJ3NoYXBlXFwnXFxcIiBwcmV2aWV3PVxcXCJwcmV2aWV3XFxcIiBlbmNvZGluZz1cXFwic3BlYy5lbmNvZGluZ1xcXCIgbWFyaz1cXFwic3BlYy5tYXJrXFxcIj48L2NoYW5uZWwtc2hlbGY+PGNoYW5uZWwtc2hlbGYgY2hhbm5lbC1pZD1cXFwiXFwnZGV0YWlsXFwnXFxcIiBwcmV2aWV3PVxcXCJwcmV2aWV3XFxcIiBlbmNvZGluZz1cXFwic3BlYy5lbmNvZGluZ1xcXCIgbWFyaz1cXFwic3BlYy5tYXJrXFxcIj48L2NoYW5uZWwtc2hlbGY+PGNoYW5uZWwtc2hlbGYgY2hhbm5lbC1pZD1cXFwiXFwndGV4dFxcJ1xcXCIgcHJldmlldz1cXFwicHJldmlld1xcXCIgZW5jb2Rpbmc9XFxcInNwZWMuZW5jb2RpbmdcXFwiIG1hcms9XFxcInNwZWMubWFya1xcXCI+PC9jaGFubmVsLXNoZWxmPjwvZGl2PjxkaXYgY2xhc3M9XFxcInNoZWxmLXBhbmUgc2hlbGYtYW55LXBhbmUgZnVsbC13aWR0aFxcXCIgbmctaWY9XFxcInN1cHBvcnRBbnkgJiYgIXByZXZpZXdcXFwiPjxoMz5BdXRvbWF0aWM8L2gzPjxjaGFubmVsLXNoZWxmIG5nLXJlcGVhdD1cXFwiY2hhbm5lbElkIGluIGFueUNoYW5uZWxJZHNcXFwiIHByZXZpZXc9XFxcInByZXZpZXdcXFwiIGNoYW5uZWwtaWQ9XFxcImNoYW5uZWxJZFxcXCIgZW5jb2Rpbmc9XFxcInNwZWMuZW5jb2RpbmdcXFwiIG1hcms9XFxcInNwZWMubWFya1xcXCI+PC9jaGFubmVsLXNoZWxmPjwvZGl2PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvdGFicy90YWIuaHRtbFwiLFwiPGRpdiBuZy1pZj1cXFwiYWN0aXZlXFxcIiBuZy10cmFuc2NsdWRlPVxcXCJcXFwiPjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvdGFicy90YWJzZXQuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwidGFiLWNvbnRhaW5lclxcXCI+PGRpdj48YSBjbGFzcz1cXFwidGFiXFxcIiBuZy1yZXBlYXQ9XFxcInRhYiBpbiB0YWJzZXQudGFic1xcXCIgbmctY2xhc3M9XFxcIntcXCdhY3RpdmVcXCc6IHRhYi5hY3RpdmV9XFxcIiBuZy1jbGljaz1cXFwidGFic2V0LnNob3dUYWIodGFiKVxcXCI+e3t0YWIuaGVhZGluZ319PC9hPjwvZGl2PjxkaXYgY2xhc3M9XFxcInRhYi1jb250ZW50c1xcXCIgbmctdHJhbnNjbHVkZT1cXFwiXFxcIj48L2Rpdj48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL3ZscGxvdC92bHBsb3QuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwidmwtcGxvdFxcXCIgaWQ9XFxcInZpcy17e3Zpc0lkfX1cXFwiIG5nLWNsYXNzPVxcXCJ7IGZpdDogIWFsd2F5c1Njcm9sbGFibGUgJiYgIW92ZXJmbG93ICYmIGhlaWdodCA+IHZsUGxvdEhlaWdodCgpICYmIHdpZHRoID4gdmxQbG90V2lkdGgoKSwgXFwnb3ZlcmZsb3cteVxcJzogKGFsd2F5c1Njcm9sbGFibGUgfHwgb3ZlcmZsb3cpICYmIGhlaWdodCA+IHZsUGxvdEhlaWdodCgpLCBcXCdvdmVyZmxvdy14XFwnOiAoYWx3YXlzU2Nyb2xsYWJsZSB8fCBvdmVyZmxvdykgJiYgd2lkdGggPiB2bFBsb3RXaWR0aCgpLCBzY3JvbGw6IGFsd2F5c1Njcm9sbGFibGUgfHwgdW5sb2NrZWQgfHwgaG92ZXJGb2N1cyB9XFxcIiBuZy1tb3VzZWRvd249XFxcInVubG9ja2VkPSF0aHVtYm5haWxcXFwiIG5nLW1vdXNldXA9XFxcInVubG9ja2VkPWZhbHNlXFxcIiBuZy1tb3VzZWVudGVyPVxcXCJtb3VzZWVudGVyKClcXFwiIG5nLW1vdXNlbGVhdmU9XFxcIm1vdXNlbGVhdmUoKVxcXCI+PC9kaXY+XCIpO1xuJHRlbXBsYXRlQ2FjaGUucHV0KFwiY29tcG9uZW50cy92bHBsb3Rncm91cC92bHBsb3Rncm91cC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJ2bC1wbG90LWdyb3VwIHZmbGV4XFxcIiBuZy1kYmxjbGljaz1cXFwic2VsZWN0KGNoYXJ0KVxcXCI+PGRpdiBuZy1zaG93PVxcXCJzaG93RXhwYW5kIHx8IGZpZWxkU2V0IHx8IHNob3dUcmFuc3Bvc2UgfHwgc2hvd0Jvb2ttYXJrICYmIEJvb2ttYXJrcy5pc1N1cHBvcnRlZCB8fCBzaG93VG9nZ2xlXFxcIiBjbGFzcz1cXFwidmwtcGxvdC1ncm91cC1oZWFkZXIgbm8tc2hyaW5rXFxcIj48ZGl2IGNsYXNzPVxcXCJmaWVsZC1zZXQtaW5mb1xcXCIgbmctbW91c2VlbnRlcj1cXFwiZW5hYmxlUHJldmlldygpXFxcIiBuZy1tb3VzZWxlYXZlPVxcXCJkaXNhYmxlUHJldmlldygpXFxcIj48ZmllbGQtaW5mbyBuZy1yZXBlYXQ9XFxcImZpZWxkRGVmIGluIGZpZWxkU2V0XFxcIiBuZy1pZj1cXFwiZmllbGRTZXQgJiYgKGZpZWxkRGVmLmZpZWxkIHx8IGZpZWxkRGVmLmF1dG9Db3VudClcXFwiIGZpZWxkLWRlZj1cXFwiZmllbGREZWZcXFwiIGVudW0tc3BlYy1pbmRleD1cXFwiY2hhcnQuZW51bVNwZWNJbmRleFxcXCIgc2hvdy10eXBlPVxcXCJ0cnVlXFxcIiBuZy1jbGFzcz1cXFwieyBzZWxlY3RlZDogYWx3YXlzU2VsZWN0ZWQgfHwgKGlzU2VsZWN0ZWQgJiYgaXNTZWxlY3RlZChmaWVsZERlZi5maWVsZCkpLCB1bnNlbGVjdGVkOiBpc1NlbGVjdGVkICYmICFpc1NlbGVjdGVkKGZpZWxkRGVmLmZpZWxkKSwgaGlnaGxpZ2h0ZWQ6IChoaWdobGlnaHRlZHx8e30pW2ZpZWxkRGVmLmZpZWxkXSwgXFwnZW51bWVyYXRlZC1maWVsZFxcJzogaXNFbnVtZXJhdGVkRmllbGQoY2hhcnQsICRpbmRleCksIFxcJ2VudW1lcmF0ZWQtY2hhbm5lbFxcJzogaXNFbnVtZXJhdGVkQ2hhbm5lbChjaGFydCwgJGluZGV4KSB9XFxcIiBuZy1tb3VzZWVudGVyPVxcXCJmaWVsZEluZm9Nb3VzZW92ZXIoZmllbGREZWYsICRpbmRleClcXFwiIG5nLW1vdXNlbGVhdmU9XFxcImZpZWxkSW5mb01vdXNlb3V0KGZpZWxkRGVmLCAkaW5kZXgpXFxcIj48L2ZpZWxkLWluZm8+PC9kaXY+PGRpdiBzdHlsZT1cXFwiZmxleC1ncm93OjFcXFwiPjwvZGl2PjxkaXYgY2xhc3M9XFxcInRvb2xib3hcXFwiPjxhIG5nLWlmPVxcXCJjb25zdHMuZGVidWcgJiYgc2hvd0RlYnVnXFxcIiBjbGFzcz1cXFwiY29tbWFuZCBkZWJ1Z1xcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXdyZW5jaFxcXCIgbmctY2xpY2s9XFxcInNoQ29waWVkPVxcJ1xcJzsgdmxDb3BpZWQ9XFwnXFwnOyB2Z0NvcGllZD1cXCdcXCc7XFxcIj48L2k+PC9hPjx2bC1wbG90LWdyb3VwLXBvcHVwIG5nLWlmPVxcXCJjb25zdHMuZGVidWcgJiYgc2hvd0RlYnVnICYmIHJlbmRlclBvcHVwXFxcIj48L3ZsLXBsb3QtZ3JvdXAtcG9wdXA+PGEgbmctaWY9XFxcInNob3dMb2cgJiYgY2hhcnQudmxTcGVjICYmIGxvZy5zdXBwb3J0KGNoYXJ0LnZsU3BlYywgXFwneFxcJylcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIiB0aXRsZT1cXFwiVG9nZ2xlIFgtU2NhbGVcXFwiIG5nLWNsaWNrPVxcXCJsb2cudG9nZ2xlKGNoYXJ0LnZsU3BlYywgXFwneFxcJylcXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOiBsb2cuYWN0aXZlKGNoYXJ0LnZsU3BlYywgXFwneFxcJyl9XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtbG9uZy1hcnJvdy1yaWdodFxcXCI+PC9pPiA8c21hbGw+TG9nIFg8L3NtYWxsPjwvYT4gPGEgbmctaWY9XFxcInNob3dMb2cgJiYgY2hhcnQudmxTcGVjICYmIGxvZy5zdXBwb3J0KGNoYXJ0LnZsU3BlYywgXFwneVxcJylcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIiB0aXRsZT1cXFwiVG9nZ2xlIFktU2NhbGVcXFwiIG5nLWNsaWNrPVxcXCJsb2cudG9nZ2xlKGNoYXJ0LnZsU3BlYywgXFwneVxcJylcXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOiBsb2cuYWN0aXZlKGNoYXJ0LnZsU3BlYywgXFwneVxcJyl9XFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtbG9uZy1hcnJvdy11cFxcXCI+PC9pPiA8c21hbGw+TG9nIFk8L3NtYWxsPjwvYT4gPGEgbmctaWY9XFxcInNob3dTb3J0ICYmIGNoYXJ0LnZsU3BlYyAmJiB0b2dnbGVTb3J0LnN1cHBvcnQoY2hhcnQudmxTcGVjKVxcXCIgY2xhc3M9XFxcImNvbW1hbmRcXFwiIG5nLWNsaWNrPVxcXCJ0b2dnbGVTb3J0LnRvZ2dsZShjaGFydC52bFNwZWMpXFxcIiB0aXRsZT1cXFwiU29ydFxcXCI+PGkgY2xhc3M9XFxcImZhIHNvcnRcXFwiIG5nLWNsYXNzPVxcXCJ0b2dnbGVTb3J0Q2xhc3MoY2hhcnQudmxTcGVjKVxcXCI+PC9pPiA8c21hbGwgbmctaWY9XFxcInNob3dMYWJlbFxcXCI+U29ydDwvc21hbGw+PC9hPiA8YSBuZy1pZj1cXFwic2hvd0ZpbHRlck51bGwgJiYgY2hhcnQudmxTcGVjICYmIHRvZ2dsZUZpbHRlck51bGwuc3VwcG9ydChjaGFydC52bFNwZWMpXFxcIiBjbGFzcz1cXFwiY29tbWFuZFxcXCIgbmctY2xpY2s9XFxcInRvZ2dsZUZpbHRlck51bGwoY2hhcnQudmxTcGVjKVxcXCIgdGl0bGU9XFxcIkZpbHRlciBOdWxsXFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTogY2hhcnQudmxTcGVjICYmIChjaGFydC52bFNwZWMudHJhbnNmb3JtfHx7fSkuZmlsdGVySW52YWxpZH1cXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1maWx0ZXJcXFwiPjwvaT4gPHNtYWxsIG5nLWlmPVxcXCJzaG93TGFiZWxcXFwiPkZpbHRlcjwvc21hbGw+IDxzbWFsbD5OVUxMPC9zbWFsbD48L2E+IDxhIG5nLWlmPVxcXCJzaG93VHJhbnNwb3NlXFxcIiB0aXRsZT1cXFwiU3dhcCBYL1lcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIiBuZy1jbGljaz1cXFwidHJhbnNwb3NlKClcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS1yZWZyZXNoIHRyYW5zcG9zZVxcXCI+PC9pPiA8c21hbGwgbmctaWY9XFxcInNob3dMYWJlbFxcXCI+U3dhcCBYL1k8L3NtYWxsPjwvYT4gPGEgbmctaWY9XFxcInNob3dCb29rbWFyayAmJiBCb29rbWFya3MuaXNTdXBwb3J0ZWRcXFwiIGNsYXNzPVxcXCJjb21tYW5kXFxcIiB0aXRsZT1cXFwiQm9va21hcmtcXFwiIG5nLWNsaWNrPVxcXCJ0b2dnbGVCb29rbWFyayhjaGFydClcXFwiIG5nLWNsYXNzPVxcXCJ7ZGlzYWJsZWQ6ICFjaGFydC52bFNwZWMuZW5jb2RpbmcsIGFjdGl2ZTogQm9va21hcmtzLmlzQm9va21hcmtlZChjaGFydC5zaG9ydGhhbmQpfVxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWJvb2ttYXJrXFxcIj48L2k+IDxzbWFsbCBuZy1pZj1cXFwic2hvd0xhYmVsXFxcIj5Cb29rbWFyazwvc21hbGw+PC9hPiA8YSBuZy1pZj1cXFwic2hvd0V4cGFuZFxcXCIgbmctY2xpY2s9XFxcImV4cGFuZEFjdGlvbigpXFxcIiBjbGFzcz1cXFwiY29tbWFuZFxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLWV4cGFuZFxcXCI+PC9pPjwvYT4gPGEgbmctaWY9XFxcInNob3dTZWxlY3RcXFwiIHRpdGxlPVxcXCJTZXQgZW5jb2RpbmcgdG8gdGhpcyBjaGFydFxcXCIgbmctY2xpY2s9XFxcInNlbGVjdChjaGFydClcXFwiIGNsYXNzPVxcXCJjb21tYW5kIHNlbGVjdFxcXCI+PGkgY2xhc3M9XFxcImZhIGZhLXNlcnZlclxcXCI+PC9pPjwvYT48ZGl2IG5nLWlmPVxcXCJzaG93Qm9va21hcmtBbGVydFxcXCIgY2xhc3M9XFxcImJvb2ttYXJrLWFsZXJ0XFxcIj48ZGl2PlJlbW92ZSBib29rbWFyaz88L2Rpdj48c21hbGw+WW91ciBub3RlcyB3aWxsIGJlIGxvc3QuPC9zbWFsbD48ZGl2PjxhIG5nLWNsaWNrPVxcXCJyZW1vdmVCb29rbWFyayhjaGFydClcXFwiPjxpIGNsYXNzPVxcXCJmYSBmYS10cmFzaC1vXFxcIj48L2k+IHJlbW92ZSBpdDwvYT4gPGEgbmctY2xpY2s9XFxcImtlZXBCb29rbWFyaygpXFxcIj48aSBjbGFzcz1cXFwiZmEgZmEtYm9va21hcmtcXFwiPjwvaT4ga2VlcCBpdDwvYT48L2Rpdj48L2Rpdj48L2Rpdj48L2Rpdj48dmwtcGxvdCBjbGFzcz1cXFwiZmxleC1ncm93LTFcXFwiIGNoYXJ0PVxcXCJjaGFydFxcXCIgZGlzYWJsZWQ9XFxcImRpc2FibGVkXFxcIiBpcy1pbi1saXN0PVxcXCJpc0luTGlzdFxcXCIgbGlzdC10aXRsZT1cXFwibGlzdFRpdGxlXFxcIiBhbHdheXMtc2Nyb2xsYWJsZT1cXFwiYWx3YXlzU2Nyb2xsYWJsZVxcXCIgY29uZmlnLXNldD1cXFwie3tjb25maWdTZXR8fFxcJ3NtYWxsXFwnfX1cXFwiIG92ZXJmbG93PVxcXCJvdmVyZmxvd1xcXCIgcHJpb3JpdHk9XFxcInByaW9yaXR5XFxcIiByZXNjYWxlPVxcXCJyZXNjYWxlXFxcIiB0aHVtYm5haWw9XFxcInRodW1ibmFpbFxcXCIgdG9vbHRpcD1cXFwidG9vbHRpcFxcXCI+PC92bC1wbG90Pjx0ZXh0YXJlYSBjbGFzcz1cXFwiYW5ub3RhdGlvblxcXCIgbmctaWY9XFxcIkJvb2ttYXJrcy5pc0Jvb2ttYXJrZWQoY2hhcnQuc2hvcnRoYW5kKVxcXCIgbmctbW9kZWw9XFxcIkJvb2ttYXJrcy5kaWN0W2NoYXJ0LnNob3J0aGFuZF0uYW5ub3RhdGlvblxcXCIgbmctY2hhbmdlPVxcXCJCb29rbWFya3Muc2F2ZUFubm90YXRpb25zKGNoYXJ0LnNob3J0aGFuZClcXFwiIHBsYWNlaG9sZGVyPVxcXCJub3Rlc1xcXCI+PC90ZXh0YXJlYT48L2Rpdj5cIik7XG4kdGVtcGxhdGVDYWNoZS5wdXQoXCJjb21wb25lbnRzL3ZscGxvdGdyb3VwL3ZscGxvdGdyb3VwcG9wdXAuaHRtbFwiLFwiPGRpdiBjbGFzcz1cXFwiZHJvcC1jb250YWluZXJcXFwiPjxkaXYgY2xhc3M9XFxcInBvcHVwLW1lbnUgcG9wdXAtY29tbWFuZCBuby1zaHJpbmsgZGV2LXRvb2xcXFwiPjxkaXYgY2xhc3M9XFxcImNvbW1hbmQgZGVidWdcXFwiPjxzcGFuIGNsYXNzPVxcXCJkZWJ1Z1xcXCI+Vmw8L3NwYW4+IDxhIGNsYXNzPVxcXCJkZWJ1Z1xcXCIgdWktemVyb2NsaXA9XFxcIlxcXCIgemVyb2NsaXAtY29waWVkPVxcXCJ2bENvcGllZD1cXCcoQ29waWVkKVxcJ1xcXCIgemVyb2NsaXAtbW9kZWw9XFxcImNoYXJ0LmNsZWFuU3BlYyB8IGNvbXBhY3RKU09OXFxcIj5Db3B5PC9hPiAvIDxhIGNsYXNzPVxcXCJkZWJ1Z1xcXCIgbmctY2xpY2s9XFxcImxvZ0NvZGUoXFwnVmVnYS1MaXRlXFwnLCBjaGFydC5jbGVhblNwZWMpOyB2bENvcGllZD1cXCcoTG9nZ2VkKVxcJztcXFwiPkxvZzwvYT4gPHNwYW4+e3t2bENvcGllZH19PC9zcGFuPjwvZGl2PjxkaXYgY2xhc3M9XFxcImNvbW1hbmQgZGVidWdcXFwiPjxzcGFuIGNsYXNzPVxcXCJkZWJ1Z1xcXCI+Vmc8L3NwYW4+IDxhIGNsYXNzPVxcXCJkZWJ1Z1xcXCIgdWktemVyb2NsaXA9XFxcIlxcXCIgemVyb2NsaXAtY29waWVkPVxcXCJ2Z0NvcGllZD1cXCcoQ29waWVkKVxcJ1xcXCIgemVyb2NsaXAtbW9kZWw9XFxcImNoYXJ0LnZnU3BlYyB8IGNvbXBhY3RKU09OXFxcIj5Db3B5PC9hPiAvIDxhIGNsYXNzPVxcXCJkZWJ1Z1xcXCIgbmctY2xpY2s9XFxcImxvZ0NvZGUoXFwnVmVnYVxcJywgY2hhcnQudmdTcGVjKTsgdmdDb3BpZWQ9XFwnKExvZ2dlZClcXCc7XFxcIj5Mb2c8L2E+IDxzcGFuPnt7dmdDb3BpZWR9fTwvc3Bhbj48L2Rpdj48YSBjbGFzcz1cXFwiY29tbWFuZCBkZWJ1Z1xcXCIgbmctaHJlZj1cXFwie3sge3R5cGU6XFwndmxcXCcsIHNwZWM6IGNoYXJ0LmNsZWFuU3BlY30gfCByZXBvcnRVcmwgfX1cXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIj5SZXBvcnQgQmFkIFJlbmRlcjwvYT4gPGEgbmctY2xpY2s9XFxcInNob3dGZWF0dXJlPSFzaG93RmVhdHVyZVxcXCIgY2xhc3M9XFxcImNvbW1hbmQgZGVidWdcXFwiPnt7Y2hhcnQuc2NvcmV9fTwvYT48ZGl2IG5nLXJlcGVhdD1cXFwiZiBpbiBjaGFydC5zY29yZUZlYXR1cmVzIHRyYWNrIGJ5IGYucmVhc29uXFxcIj5be3tmLnNjb3JlfX1dIHt7Zi5yZWFzb259fTwvZGl2PjwvZGl2PjwvZGl2PlwiKTtcbiR0ZW1wbGF0ZUNhY2hlLnB1dChcImNvbXBvbmVudHMvdmxwbG90Z3JvdXBsaXN0L3ZscGxvdGdyb3VwbGlzdC5odG1sXCIsXCI8ZGl2IGNsYXNzPVxcXCJ2bC1wbG90LWdyb3VwLWxpc3QtY29udGFpbmVyXFxcIj48ZGl2IGNsYXNzPVxcXCJ2aXMtbGlzdC1oZWFkZXJcXFwiIG5nLXNob3c9XFxcImxpc3RUaXRsZSAmJiAhaGlkZUxpc3RUaXRsZVxcXCI+PGgzPnt7bGlzdFRpdGxlfX08L2gzPjxzcGFuIGNsYXNzPVxcXCJkZXNjcmlwdGlvblxcXCI+PC9zcGFuPjwvZGl2PjxkaXYgY2xhc3M9XFxcInZpcy1saXN0IGhmbGV4IGZsZXgtd3JhcFxcXCI+PHZsLXBsb3QtZ3JvdXAgbmctcmVwZWF0PVxcXCJjaGFydCBpbiBjaGFydHMgfCBsaW1pdFRvOiBsaW1pdFxcXCIgY2xhc3M9XFxcIndyYXBwZWQtdmwtcGxvdC1ncm91cCBjYXJkXFxcIiBjaGFydD1cXFwiY2hhcnRcXFwiIGlzLWluLWxpc3Q9XFxcImlzSW5MaXN0XFxcIiBsaXN0LXRpdGxlPVxcXCJsaXN0VGl0bGVcXFwiIGVuYWJsZS1waWxscy1wcmV2aWV3PVxcXCJlbmFibGVQaWxsc1ByZXZpZXdcXFwiIGZpZWxkLXNldD1cXFwiY2hhcnQuZmllbGRTZXRcXFwiIHNob3ctYm9va21hcms9XFxcInRydWVcXFwiIHNob3ctZGVidWc9XFxcImNvbnN0cy5kZWJ1ZyAmJiBjb25zdHMuZGVidWdJbkxpc3RcXFwiIHNob3ctc2VsZWN0PVxcXCJ0cnVlXFxcIiBzaG93LWZpbHRlci1udWxsPVxcXCJ0cnVlXFxcIiBzaG93LWxvZz1cXFwidHJ1ZVxcXCIgc2hvdy1zb3J0PVxcXCJ0cnVlXFxcIiBvdmVyZmxvdz1cXFwidHJ1ZVxcXCIgdG9vbHRpcD1cXFwidHJ1ZVxcXCIgaGlnaGxpZ2h0ZWQ9XFxcIlBpbGxzLmhpZ2hsaWdodGVkXFxcIiBwcmlvcml0eT1cXFwicHJpb3JpdHkgKyAkaW5kZXhcXFwiPjwvdmwtcGxvdC1ncm91cD48L2Rpdj48YSBuZy1jbGljaz1cXFwiaW5jcmVhc2VMaW1pdCgpXFxcIj48ZGl2IGNsYXNzPVxcXCJ2aXMtbGlzdC1tb3JlXFxcIiBuZy1zaG93PVxcXCJsaW1pdCA8IGNoYXJ0cy5sZW5ndGhcXFwiPkxvYWQgbW9yZS4uLjwvZGl2PjwvYT48L2Rpdj5cIik7fV0pOyIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTphZGRNeXJpYURhdGFzZXRcbiAqIEBkZXNjcmlwdGlvblxuICogIyBhZGRNeXJpYURhdGFzZXRcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdhZGRNeXJpYURhdGFzZXQnLCBmdW5jdGlvbiAoJGh0dHAsIERhdGFzZXQsIGNvbnN0cykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvYWRkbXlyaWFkYXRhc2V0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICc/Xl5tb2RhbCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHRydWUsXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMsIG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAvLyBJZiB0aGlzIGRpcmVjdGl2ZSBvY2N1cnMgd2l0aGluIGEgYSBtb2RhbCwgZ2l2ZSBvdXJzZWx2ZXMgYSB3YXkgdG8gY2xvc2VcbiAgICAgICAgLy8gdGhhdCBtb2RhbCBvbmNlIHRoZSBhZGQgYnV0dG9uIGhhcyBiZWVuIGNsaWNrZWRcbiAgICAgICAgZnVuY3Rpb24gY2xvc2VNb2RhbCgpIHtcbiAgICAgICAgICBpZiAobW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgICAgICBtb2RhbENvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIHNjb3BlIHZhcmlhYmxlc1xuICAgICAgICBzY29wZS5teXJpYVJlc3RVcmwgPSBjb25zdHMubXlyaWFSZXN0O1xuICAgICAgICBzY29wZS5teXJpYURhdGFzZXRzID0gW107XG4gICAgICAgIHNjb3BlLm15cmlhRGF0YXNldCA9IG51bGw7XG5cbiAgICAgICAgc2NvcGUubG9hZERhdGFzZXRzID0gZnVuY3Rpb24ocXVlcnkpIHtcbiAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KHNjb3BlLm15cmlhUmVzdFVybCArICcvZGF0YXNldC9zZWFyY2gvP3E9JyArIHF1ZXJ5KVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgc2NvcGUubXlyaWFEYXRhc2V0cyA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBMb2FkIHRoZSBhdmFpbGFibGUgZGF0YXNldHMgZnJvbSBNeXJpYVxuICAgICAgICBzY29wZS5sb2FkRGF0YXNldHMoJycpO1xuXG4gICAgICAgIHNjb3BlLm9wdGlvbk5hbWUgPSBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICAgICAgcmV0dXJuIGRhdGFzZXQudXNlck5hbWUgKyAnOicgKyBkYXRhc2V0LnByb2dyYW1OYW1lICsgJzonICsgZGF0YXNldC5yZWxhdGlvbk5hbWU7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuYWRkRGF0YXNldCA9IGZ1bmN0aW9uKG15cmlhRGF0YXNldCkge1xuICAgICAgICAgIHZhciBkYXRhc2V0ID0ge1xuICAgICAgICAgICAgZ3JvdXA6ICdteXJpYScsXG4gICAgICAgICAgICBuYW1lOiBteXJpYURhdGFzZXQucmVsYXRpb25OYW1lLFxuICAgICAgICAgICAgdXJsOiBzY29wZS5teXJpYVJlc3RVcmwgKyAnL2RhdGFzZXQvdXNlci0nICsgbXlyaWFEYXRhc2V0LnVzZXJOYW1lICtcbiAgICAgICAgICAgICAgJy9wcm9ncmFtLScgKyBteXJpYURhdGFzZXQucHJvZ3JhbU5hbWUgK1xuICAgICAgICAgICAgICAnL3JlbGF0aW9uLScgKyBteXJpYURhdGFzZXQucmVsYXRpb25OYW1lICsgJy9kYXRhP2Zvcm1hdD1qc29uJ1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICBEYXRhc2V0LnR5cGUgPSAnanNvbic7XG4gICAgICAgICAgRGF0YXNldC5kYXRhc2V0ID0gRGF0YXNldC5hZGQoZGF0YXNldCk7XG4gICAgICAgICAgRGF0YXNldC51cGRhdGUoRGF0YXNldC5kYXRhc2V0KTtcblxuICAgICAgICAgIGNsb3NlTW9kYWwoKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTphZGRVcmxEYXRhc2V0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgYWRkVXJsRGF0YXNldFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2FkZFVybERhdGFzZXQnLCBmdW5jdGlvbiAoRGF0YXNldCwgTG9nZ2VyKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9hZGR1cmxkYXRhc2V0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICc/Xl5tb2RhbCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHRydWUsXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMsIG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAvLyBJZiB0aGlzIGRpcmVjdGl2ZSBvY2N1cnMgd2l0aGluIGEgYSBtb2RhbCwgZ2l2ZSBvdXJzZWx2ZXMgYSB3YXkgdG8gY2xvc2VcbiAgICAgICAgLy8gdGhhdCBtb2RhbCBvbmNlIHRoZSBhZGQgYnV0dG9uIGhhcyBiZWVuIGNsaWNrZWRcbiAgICAgICAgZnVuY3Rpb24gY2xvc2VNb2RhbCgpIHtcbiAgICAgICAgICBpZiAobW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgICAgICBtb2RhbENvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyB0aGUgZGF0YXNldCB0byBhZGRcbiAgICAgICAgc2NvcGUuYWRkZWREYXRhc2V0ID0ge1xuICAgICAgICAgIGdyb3VwOiAndXNlcidcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5hZGRGcm9tVXJsID0gZnVuY3Rpb24oZGF0YXNldCkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5EQVRBU0VUX05FV19VUkwsIGRhdGFzZXQudXJsKTtcblxuICAgICAgICAgIC8vIFJlZ2lzdGVyIHRoZSBuZXcgZGF0YXNldFxuICAgICAgICAgIERhdGFzZXQuZGF0YXNldCA9IERhdGFzZXQuYWRkKGRhdGFzZXQpO1xuXG4gICAgICAgICAgLy8gRmV0Y2ggJiBhY3RpdmF0ZSB0aGUgbmV3bHktcmVnaXN0ZXJlZCBkYXRhc2V0XG4gICAgICAgICAgRGF0YXNldC51cGRhdGUoRGF0YXNldC5kYXRhc2V0KTtcblxuICAgICAgICAgIGNsb3NlTW9kYWwoKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZmlsdGVyXG4gKiBAbmFtZSB2ZWdhLWxpdGUtdWkuZmlsdGVyOmluR3JvdXBcbiAqIEBmdW5jdGlvblxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGluR3JvdXBcbiAqIEdldCBkYXRhc2V0cyBpbiBhIHBhcnRpY3VsYXIgZ3JvdXBcbiAqIEBwYXJhbSAge1N0cmluZ30gZGF0YXNldEdyb3VwIE9uZSBvZiBcInNhbXBsZSxcIiBcInVzZXJcIiwgb3IgXCJteXJpYVwiXG4gKiBAcmV0dXJuIHtBcnJheX0gQW4gYXJyYXkgb2YgZGF0YXNldHMgaW4gdGhlIHNwZWNpZmllZCBncm91cFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5maWx0ZXIoJ2luR3JvdXAnLCBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGFyciwgZGF0YXNldEdyb3VwKSB7XG4gICAgICByZXR1cm4gXy5maWx0ZXIoYXJyLCB7XG4gICAgICAgIGdyb3VwOiBkYXRhc2V0R3JvdXBcbiAgICAgIH0pO1xuICAgIH07XG4gIH0pO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmNoYW5nZUxvYWRlZERhdGFzZXRcbiAqIEBkZXNjcmlwdGlvblxuICogIyBjaGFuZ2VMb2FkZWREYXRhc2V0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnY2hhbmdlTG9hZGVkRGF0YXNldCcsIGZ1bmN0aW9uIChEYXRhc2V0LCBfKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9jaGFuZ2Vsb2FkZWRkYXRhc2V0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICc/Xl5tb2RhbCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHRydWUsXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMsIG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAvLyBJZiB0aGlzIGRpcmVjdGl2ZSBvY2N1cnMgd2l0aGluIGEgYSBtb2RhbCwgZ2l2ZSBvdXJzZWx2ZXMgYSB3YXkgdG8gY2xvc2VcbiAgICAgICAgLy8gdGhhdCBtb2RhbCBvbmNlIHRoZSBhZGQgYnV0dG9uIGhhcyBiZWVuIGNsaWNrZWRcbiAgICAgICAgZnVuY3Rpb24gY2xvc2VNb2RhbCgpIHtcbiAgICAgICAgICBpZiAobW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgICAgICBtb2RhbENvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFeHBvc2UgZGF0YXNldCBvYmplY3QgaXRzZWxmIHNvIGN1cnJlbnQgZGF0YXNldCBjYW4gYmUgbWFya2VkXG4gICAgICAgIHNjb3BlLkRhdGFzZXQgPSBEYXRhc2V0O1xuXG4gICAgICAgIHNjb3BlLnVzZXJEYXRhID0gXy5maWx0ZXIoRGF0YXNldC5kYXRhc2V0cywgZnVuY3Rpb24oZGF0YXNldCkge1xuICAgICAgICAgIHJldHVybiBkYXRhc2V0Lmdyb3VwICE9PSAnc2FtcGxlJztcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2NvcGUuc2FtcGxlRGF0YSA9IF8uZmlsdGVyKERhdGFzZXQuZGF0YXNldHMsIHtcbiAgICAgICAgICBncm91cDogJ3NhbXBsZSdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIGRhdGFzZXRXYXRjaGVyID0gc2NvcGUuJHdhdGNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiBEYXRhc2V0LmRhdGFzZXRzLmxlbmd0aDtcbiAgICAgICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2NvcGUudXNlckRhdGEgPSBfLmZpbHRlcihEYXRhc2V0LmRhdGFzZXRzLCBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YXNldC5ncm91cCAhPT0gJ3NhbXBsZSc7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLnNlbGVjdERhdGFzZXQgPSBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICAgICAgLy8gQWN0aXZhdGUgdGhlIHNlbGVjdGVkIGRhdGFzZXRcbiAgICAgICAgICBEYXRhc2V0LnVwZGF0ZShkYXRhc2V0KTtcbiAgICAgICAgICBjbG9zZU1vZGFsKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIC8vIENsZWFuIHVwIHdhdGNoZXJzXG4gICAgICAgICAgZGF0YXNldFdhdGNoZXIoKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZhY3RvcnkoJ0RhdGFzZXQnLCBmdW5jdGlvbigkaHR0cCwgJHEsIEFsZXJ0cywgXywgdXRpbCwgdmwsIGNxbCwgU2FtcGxlRGF0YSwgQ29uZmlnLCBMb2dnZXIpIHtcbiAgICB2YXIgRGF0YXNldCA9IHt9O1xuXG4gICAgLy8gU3RhcnQgd2l0aCB0aGUgbGlzdCBvZiBzYW1wbGUgZGF0YXNldHNcbiAgICB2YXIgZGF0YXNldHMgPSBTYW1wbGVEYXRhO1xuXG4gICAgRGF0YXNldC5kYXRhc2V0cyA9IGRhdGFzZXRzO1xuICAgIERhdGFzZXQuZGF0YXNldCA9IGRhdGFzZXRzWzFdO1xuICAgIERhdGFzZXQuY3VycmVudERhdGFzZXQgPSB1bmRlZmluZWQ7ICAvLyBkYXRhc2V0IGJlZm9yZSB1cGRhdGVcbiAgICBEYXRhc2V0LmRhdGFzY2hlbWEgPSBbXTtcbiAgICBEYXRhc2V0LnN0YXRzID0ge307XG4gICAgRGF0YXNldC50eXBlID0gdW5kZWZpbmVkO1xuXG4gICAgdmFyIHR5cGVPcmRlciA9IHtcbiAgICAgIG5vbWluYWw6IDAsXG4gICAgICBvcmRpbmFsOiAwLFxuICAgICAgZ2VvZ3JhcGhpYzogMixcbiAgICAgIHRlbXBvcmFsOiAzLFxuICAgICAgcXVhbnRpdGF0aXZlOiA0XG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5ID0ge307XG5cbiAgICBEYXRhc2V0LmZpZWxkT3JkZXJCeS50eXBlID0gZnVuY3Rpb24oZmllbGREZWYpIHtcbiAgICAgIGlmIChmaWVsZERlZi5hZ2dyZWdhdGU9PT0nY291bnQnKSByZXR1cm4gNDtcbiAgICAgIHJldHVybiB0eXBlT3JkZXJbZmllbGREZWYudHlwZV07XG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5LnR5cGVUaGVuTmFtZSA9IGZ1bmN0aW9uKGZpZWxkRGVmKSB7XG4gICAgICByZXR1cm4gRGF0YXNldC5maWVsZE9yZGVyQnkudHlwZShmaWVsZERlZikgKyAnXycgK1xuICAgICAgICAoZmllbGREZWYuYWdncmVnYXRlID09PSAnY291bnQnID8gJ34nIDogZmllbGREZWYuZmllbGQudG9Mb3dlckNhc2UoKSk7XG4gICAgICAgIC8vIH4gaXMgdGhlIGxhc3QgY2hhcmFjdGVyIGluIEFTQ0lJXG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5Lm9yaWdpbmFsID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gMDsgLy8gbm8gc3dhcCB3aWxsIG9jY3VyXG4gICAgfTtcblxuICAgIERhdGFzZXQuZmllbGRPcmRlckJ5LmZpZWxkID0gZnVuY3Rpb24oZmllbGREZWYpIHtcbiAgICAgIHJldHVybiBmaWVsZERlZi5maWVsZDtcbiAgICB9O1xuXG4gICAgRGF0YXNldC5maWVsZE9yZGVyID0gRGF0YXNldC5maWVsZE9yZGVyQnkudHlwZVRoZW5OYW1lO1xuXG4gICAgLy8gdXBkYXRlIHRoZSBzY2hlbWEgYW5kIHN0YXRzXG4gICAgRGF0YXNldC5vblVwZGF0ZSA9IFtdO1xuXG4gICAgRGF0YXNldC51cGRhdGUgPSBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICB2YXIgdXBkYXRlUHJvbWlzZTtcblxuICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkRBVEFTRVRfQ0hBTkdFLCBkYXRhc2V0Lm5hbWUpO1xuXG4gICAgICBpZiAoZGF0YXNldC52YWx1ZXMpIHtcbiAgICAgICAgdXBkYXRlUHJvbWlzZSA9ICRxKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgIC8vIGpzaGludCB1bnVzZWQ6ZmFsc2VcbiAgICAgICAgICBEYXRhc2V0LnR5cGUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgdXBkYXRlRnJvbURhdGEoZGF0YXNldCwgZGF0YXNldC52YWx1ZXMpO1xuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB1cGRhdGVQcm9taXNlID0gJGh0dHAuZ2V0KGRhdGFzZXQudXJsLCB7Y2FjaGU6IHRydWV9KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgdmFyIGRhdGE7XG5cbiAgICAgICAgICAvLyBmaXJzdCBzZWUgd2hldGhlciB0aGUgZGF0YSBpcyBKU09OLCBvdGhlcndpc2UgdHJ5IHRvIHBhcnNlIENTVlxuICAgICAgICAgIGlmIChfLmlzT2JqZWN0KHJlc3BvbnNlLmRhdGEpKSB7XG4gICAgICAgICAgICAgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICAgRGF0YXNldC50eXBlID0gJ2pzb24nO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkYXRhID0gdXRpbC5yZWFkKHJlc3BvbnNlLmRhdGEsIHt0eXBlOiAnY3N2J30pO1xuICAgICAgICAgICAgRGF0YXNldC50eXBlID0gJ2Nzdic7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdXBkYXRlRnJvbURhdGEoZGF0YXNldCwgZGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBEYXRhc2V0Lm9uVXBkYXRlLmZvckVhY2goZnVuY3Rpb24obGlzdGVuZXIpIHtcbiAgICAgICAgdXBkYXRlUHJvbWlzZSA9IHVwZGF0ZVByb21pc2UudGhlbihsaXN0ZW5lcik7XG4gICAgICB9KTtcblxuICAgICAgLy8gQ29weSB0aGUgZGF0YXNldCBpbnRvIHRoZSBjb25maWcgc2VydmljZSBvbmNlIGl0IGlzIHJlYWR5XG4gICAgICB1cGRhdGVQcm9taXNlLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIENvbmZpZy51cGRhdGVEYXRhc2V0KGRhdGFzZXQsIERhdGFzZXQudHlwZSk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHVwZGF0ZVByb21pc2U7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGdldEZpZWxkRGVmcyhzY2hlbWEsIG9yZGVyKSB7XG4gICAgICB2YXIgZmllbGREZWZzID0gc2NoZW1hLmZpZWxkcygpLm1hcChmdW5jdGlvbihmaWVsZCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGZpZWxkOiBmaWVsZCxcbiAgICAgICAgICB0eXBlOiBzY2hlbWEudHlwZShmaWVsZCksXG4gICAgICAgICAgcHJpbWl0aXZlVHlwZTogc2NoZW1hLnByaW1pdGl2ZVR5cGUoZmllbGQpXG4gICAgICAgIH07XG4gICAgICB9KTtcblxuICAgICAgZmllbGREZWZzID0gdXRpbC5zdGFibGVzb3J0KGZpZWxkRGVmcywgb3JkZXIgfHwgRGF0YXNldC5maWVsZE9yZGVyQnkudHlwZVRoZW5OYW1lLCBEYXRhc2V0LmZpZWxkT3JkZXJCeS5maWVsZCk7XG5cbiAgICAgIGZpZWxkRGVmcy5wdXNoKHsgZmllbGQ6ICcqJywgYWdncmVnYXRlOiB2bC5hZ2dyZWdhdGUuQWdncmVnYXRlT3AuQ09VTlQsIHR5cGU6IHZsLnR5cGUuUVVBTlRJVEFUSVZFfSk7XG4gICAgICByZXR1cm4gZmllbGREZWZzO1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gdXBkYXRlRnJvbURhdGEoZGF0YXNldCwgZGF0YSkge1xuICAgICAgRGF0YXNldC5kYXRhID0gZGF0YTtcbiAgICAgIERhdGFzZXQuY3VycmVudERhdGFzZXQgPSBkYXRhc2V0O1xuXG4gICAgICBEYXRhc2V0LnNjaGVtYSA9IGNxbC5zY2hlbWEuU2NoZW1hLmJ1aWxkKGRhdGEpO1xuICAgICAgLy8gVE9ETzogZmluZCBhbGwgcmVmZXJlbmNlIG9mIERhdGFzZXQuc3RhdHMuc2FtcGxlIGFuZCByZXBsYWNlXG5cbiAgICAgIC8vIFRPRE86IGZpbmQgYWxsIHJlZmVyZW5jZSBvZiBEYXRhc2V0LmRhdGFzY2hlbWEgYW5kIHJlcGxhY2VcbiAgICAgIERhdGFzZXQuZGF0YXNjaGVtYSA9IGdldEZpZWxkRGVmcyhEYXRhc2V0LnNjaGVtYSk7XG4gICAgfVxuXG4gICAgRGF0YXNldC5hZGQgPSBmdW5jdGlvbihkYXRhc2V0KSB7XG4gICAgICBpZiAoIWRhdGFzZXQuaWQpIHtcbiAgICAgICAgZGF0YXNldC5pZCA9IGRhdGFzZXQudXJsO1xuICAgICAgfVxuICAgICAgZGF0YXNldHMucHVzaChkYXRhc2V0KTtcblxuICAgICAgcmV0dXJuIGRhdGFzZXQ7XG4gICAgfTtcblxuICAgIHJldHVybiBEYXRhc2V0O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTpkYXRhc2V0TW9kYWxcbiAqIEBkZXNjcmlwdGlvblxuICogIyBkYXRhc2V0TW9kYWxcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdkYXRhc2V0TW9kYWwnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9kYXRhc2V0bW9kYWwuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgc2NvcGU6IGZhbHNlXG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnZGF0YXNldFNlbGVjdG9yJywgZnVuY3Rpb24oTW9kYWxzLCBMb2dnZXIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdkYXRhc2V0L2RhdGFzZXRzZWxlY3Rvci5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHt9LFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUvKiwgZWxlbWVudCwgYXR0cnMqLykge1xuICAgICAgICBzY29wZS5sb2FkRGF0YXNldCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5EQVRBU0VUX09QRU4pO1xuICAgICAgICAgIE1vZGFscy5vcGVuKCdkYXRhc2V0LW1vZGFsJyk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6ZmlsZURyb3B6b25lXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgZmlsZURyb3B6b25lXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLy8gQWRkIHRoZSBmaWxlIHJlYWRlciBhcyBhIG5hbWVkIGRlcGVuZGVuY3lcbiAgLmNvbnN0YW50KCdGaWxlUmVhZGVyJywgd2luZG93LkZpbGVSZWFkZXIpXG4gIC5kaXJlY3RpdmUoJ2ZpbGVEcm9wem9uZScsIGZ1bmN0aW9uIChNb2RhbHMsIEFsZXJ0cywgRmlsZVJlYWRlcikge1xuXG4gICAgLy8gSGVscGVyIG1ldGhvZHNcblxuICAgIGZ1bmN0aW9uIGlzU2l6ZVZhbGlkKHNpemUsIG1heFNpemUpIHtcbiAgICAgIC8vIFNpemUgaXMgcHJvdmlkZWQgaW4gYnl0ZXM7IG1heFNpemUgaXMgcHJvdmlkZWQgaW4gbWVnYWJ5dGVzXG4gICAgICAvLyBDb2VyY2UgbWF4U2l6ZSB0byBhIG51bWJlciBpbiBjYXNlIGl0IGNvbWVzIGluIGFzIGEgc3RyaW5nLFxuICAgICAgLy8gJiByZXR1cm4gdHJ1ZSB3aGVuIG1heCBmaWxlIHNpemUgd2FzIG5vdCBzcGVjaWZpZWQsIGlzIGVtcHR5LFxuICAgICAgLy8gb3IgaXMgc3VmZmljaWVudGx5IGxhcmdlXG4gICAgICByZXR1cm4gIW1heFNpemUgfHwgKCBzaXplIC8gMTAyNCAvIDEwMjQgPCArbWF4U2l6ZSApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzVHlwZVZhbGlkKHR5cGUsIHZhbGlkTWltZVR5cGVzKSB7XG4gICAgICAgIC8vIElmIG5vIG1pbWUgdHlwZSByZXN0cmljdGlvbnMgd2VyZSBwcm92aWRlZCwgb3IgdGhlIHByb3ZpZGVkIGZpbGUnc1xuICAgICAgICAvLyB0eXBlIGlzIHdoaXRlbGlzdGVkLCB0eXBlIGlzIHZhbGlkXG4gICAgICByZXR1cm4gIXZhbGlkTWltZVR5cGVzIHx8ICggdmFsaWRNaW1lVHlwZXMuaW5kZXhPZih0eXBlKSA+IC0xICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnZGF0YXNldC9maWxlZHJvcHpvbmUuaHRtbCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIC8vIFBlcm1pdCBhcmJpdHJhcnkgY2hpbGQgY29udGVudFxuICAgICAgdHJhbnNjbHVkZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIG1heEZpbGVTaXplOiAnQCcsXG4gICAgICAgIHZhbGlkTWltZVR5cGVzOiAnQCcsXG4gICAgICAgIC8vIEV4cG9zZSB0aGlzIGRpcmVjdGl2ZSdzIGRhdGFzZXQgcHJvcGVydHkgdG8gcGFyZW50IHNjb3BlcyB0aHJvdWdoXG4gICAgICAgIC8vIHR3by13YXkgZGF0YWJpbmRpbmdcbiAgICAgICAgZGF0YXNldDogJz0nXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LyosIGF0dHJzKi8pIHtcbiAgICAgICAgc2NvcGUuZGF0YXNldCA9IHNjb3BlLmRhdGFzZXQgfHwge307XG5cbiAgICAgICAgZWxlbWVudC5vbignZHJhZ292ZXIgZHJhZ2VudGVyJywgZnVuY3Rpb24gb25EcmFnRW50ZXIoZXZlbnQpIHtcbiAgICAgICAgICBpZiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGV2ZW50Lm9yaWdpbmFsRXZlbnQuZGF0YVRyYW5zZmVyLmVmZmVjdEFsbG93ZWQgPSAnY29weSc7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZ1bmN0aW9uIHJlYWRGaWxlKGZpbGUpIHtcbiAgICAgICAgICBpZiAoIWlzVHlwZVZhbGlkKGZpbGUudHlwZSwgc2NvcGUudmFsaWRNaW1lVHlwZXMpKSB7XG4gICAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIEFsZXJ0cy5hZGQoJ0ludmFsaWQgZmlsZSB0eXBlLiBGaWxlIG11c3QgYmUgb25lIG9mIGZvbGxvd2luZyB0eXBlczogJyArIHNjb3BlLnZhbGlkTWltZVR5cGVzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWlzU2l6ZVZhbGlkKGZpbGUuc2l6ZSwgc2NvcGUubWF4RmlsZVNpemUpKSB7XG4gICAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIEFsZXJ0cy5hZGQoJ0ZpbGUgbXVzdCBiZSBzbWFsbGVyIHRoYW4gJyArIHNjb3BlLm1heEZpbGVTaXplICsgJyBNQicpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuXG4gICAgICAgICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgICAgcmV0dXJuIHNjb3BlLiRhcHBseShmdW5jdGlvbihzY29wZSkge1xuICAgICAgICAgICAgICBzY29wZS5kYXRhc2V0LmRhdGEgPSBldnQudGFyZ2V0LnJlc3VsdDtcbiAgICAgICAgICAgICAgLy8gU3RyaXAgZmlsZSBuYW1lIGV4dGVuc2lvbnMgZnJvbSB0aGUgdXBsb2FkZWQgZGF0YVxuICAgICAgICAgICAgICBzY29wZS5kYXRhc2V0Lm5hbWUgPSBmaWxlLm5hbWUucmVwbGFjZSgvXFwuXFx3KyQvLCAnJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgcmVhZGVyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIEFsZXJ0cy5hZGQoJ0Vycm9yIHJlYWRpbmcgZmlsZScpO1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICByZWFkZXIucmVhZEFzVGV4dChmaWxlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGVsZW1lbnQub24oJ2Ryb3AnLCBmdW5jdGlvbiBvbkRyb3AoZXZlbnQpIHtcbiAgICAgICAgICBpZiAoZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmVhZEZpbGUoZXZlbnQub3JpZ2luYWxFdmVudC5kYXRhVHJhbnNmZXIuZmlsZXNbMF0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBlbGVtZW50LmZpbmQoJ2lucHV0W3R5cGU9XCJmaWxlXCJdJykub24oJ2NoYW5nZScsIGZ1bmN0aW9uIG9uVXBsb2FkKC8qZXZlbnQqLykge1xuICAgICAgICAgIC8vIFwidGhpc1wiIGlzIHRoZSBpbnB1dCBlbGVtZW50XG4gICAgICAgICAgcmVhZEZpbGUodGhpcy5maWxlc1swXSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6cGFzdGVEYXRhc2V0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgcGFzdGVEYXRhc2V0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgncGFzdGVEYXRhc2V0JywgZnVuY3Rpb24gKERhdGFzZXQsIExvZ2dlciwgQ29uZmlnLCBfLCB2Zykge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2RhdGFzZXQvcGFzdGVkYXRhc2V0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcXVpcmU6ICc/Xl5tb2RhbCcsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHRydWUsXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMsIG1vZGFsQ29udHJvbGxlcikge1xuICAgICAgICAvLyBJZiB0aGlzIGRpcmVjdGl2ZSBvY2N1cnMgd2l0aGluIGEgYSBtb2RhbCwgZ2l2ZSBvdXJzZWx2ZXMgYSB3YXkgdG8gY2xvc2VcbiAgICAgICAgLy8gdGhhdCBtb2RhbCBvbmNlIHRoZSBhZGQgYnV0dG9uIGhhcyBiZWVuIGNsaWNrZWRcbiAgICAgICAgZnVuY3Rpb24gY2xvc2VNb2RhbCgpIHtcbiAgICAgICAgICBpZiAobW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgICAgICBtb2RhbENvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIHNjb3BlIHZhcmlhYmxlc1xuICAgICAgICBzY29wZS5kYXRhc2V0ID0ge1xuICAgICAgICAgIG5hbWU6ICcnLFxuICAgICAgICAgIGRhdGE6ICcnXG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuYWRkRGF0YXNldCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBkYXRhID0gdmcudXRpbC5yZWFkKHNjb3BlLmRhdGFzZXQuZGF0YSwge1xuICAgICAgICAgICAgdHlwZTogJ2NzdidcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHZhciBwYXN0ZWREYXRhc2V0ID0ge1xuICAgICAgICAgICAgaWQ6IERhdGUubm93KCksICAvLyB0aW1lIGFzIGlkXG4gICAgICAgICAgICBuYW1lOiBzY29wZS5kYXRhc2V0Lm5hbWUsXG4gICAgICAgICAgICB2YWx1ZXM6IGRhdGEsXG4gICAgICAgICAgICBncm91cDogJ3Bhc3RlZCdcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgLy8gTG9nIHRoYXQgd2UgaGF2ZSBwYXN0ZWQgZGF0YVxuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5EQVRBU0VUX05FV19QQVNURSwgcGFzdGVkRGF0YXNldC5uYW1lKTtcblxuICAgICAgICAgIC8vIFJlZ2lzdGVyIHRoZSBwYXN0ZWQgZGF0YSBhcyBhIG5ldyBkYXRhc2V0XG4gICAgICAgICAgRGF0YXNldC5kYXRhc2V0ID0gRGF0YXNldC5hZGQocGFzdGVkRGF0YXNldCk7XG5cbiAgICAgICAgICAvLyBBY3RpdmF0ZSB0aGUgbmV3bHktcmVnaXN0ZXJlZCBkYXRhc2V0XG4gICAgICAgICAgRGF0YXNldC51cGRhdGUoRGF0YXNldC5kYXRhc2V0KTtcblxuICAgICAgICAgIC8vIENsb3NlIHRoaXMgZGlyZWN0aXZlJ3MgY29udGFpbmluZyBtb2RhbFxuICAgICAgICAgIGNsb3NlTW9kYWwoKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKS5jb25zdGFudCgnU2FtcGxlRGF0YScsIFt7XG4gIG5hbWU6ICdCYXJsZXknLFxuICBkZXNjcmlwdGlvbjogJ0JhcmxleSB5aWVsZCBieSB2YXJpZXR5IGFjcm9zcyB0aGUgdXBwZXIgbWlkd2VzdCBpbiAxOTMxIGFuZCAxOTMyJyxcbiAgdXJsOiAnZGF0YS9iYXJsZXkuanNvbicsXG4gIGlkOiAnYmFybGV5JyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0NhcnMnLFxuICBkZXNjcmlwdGlvbjogJ0F1dG9tb3RpdmUgc3RhdGlzdGljcyBmb3IgYSB2YXJpZXR5IG9mIGNhciBtb2RlbHMgYmV0d2VlbiAxOTcwICYgMTk4MicsXG4gIHVybDogJ2RhdGEvY2Fycy5qc29uJyxcbiAgaWQ6ICdjYXJzJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0NyaW1lYScsXG4gIHVybDogJ2RhdGEvY3JpbWVhLmpzb24nLFxuICBpZDogJ2NyaW1lYScsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdEcml2aW5nJyxcbiAgdXJsOiAnZGF0YS9kcml2aW5nLmpzb24nLFxuICBpZDogJ2RyaXZpbmcnLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnSXJpcycsXG4gIHVybDogJ2RhdGEvaXJpcy5qc29uJyxcbiAgaWQ6ICdpcmlzJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0pvYnMnLFxuICB1cmw6ICdkYXRhL2pvYnMuanNvbicsXG4gIGlkOiAnam9icycsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdQb3B1bGF0aW9uJyxcbiAgdXJsOiAnZGF0YS9wb3B1bGF0aW9uLmpzb24nLFxuICBpZDogJ3BvcHVsYXRpb24nLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnTW92aWVzJyxcbiAgdXJsOiAnZGF0YS9tb3ZpZXMuanNvbicsXG4gIGlkOiAnbW92aWVzJyxcbiAgZ3JvdXA6ICdzYW1wbGUnXG59LHtcbiAgbmFtZTogJ0JpcmRzdHJpa2VzJyxcbiAgdXJsOiAnZGF0YS9iaXJkc3RyaWtlcy5qc29uJyxcbiAgaWQ6ICdiaXJkc3RyaWtlcycsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufSx7XG4gIG5hbWU6ICdCdXJ0aW4nLFxuICB1cmw6ICdkYXRhL2J1cnRpbi5qc29uJyxcbiAgaWQ6ICdidXJ0aW4nLFxuICBncm91cDogJ3NhbXBsZSdcbn0se1xuICBuYW1lOiAnQ2FtcGFpZ25zJyxcbiAgdXJsOiAnZGF0YS93ZWJhbGwyNi5qc29uJyxcbiAgaWQ6ICd3ZWJhbGwyNicsXG4gIGdyb3VwOiAnc2FtcGxlJ1xufV0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2FsZXJ0TWVzc2FnZXMnLCBmdW5jdGlvbihBbGVydHMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2FsZXJ0bWVzc2FnZXMvYWxlcnRtZXNzYWdlcy5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICBzY29wZToge30sXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSAvKiwgZWxlbWVudCwgYXR0cnMqLykge1xuICAgICAgICBzY29wZS5BbGVydHMgPSBBbGVydHM7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6Ym9va21hcmtMaXN0XG4gKiBAZGVzY3JpcHRpb25cbiAqICMgYm9va21hcmtMaXN0XG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnYm9va21hcmtMaXN0JywgZnVuY3Rpb24gKEJvb2ttYXJrcywgY29uc3RzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9ib29rbWFya2xpc3QvYm9va21hcmtsaXN0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBzY29wZToge1xuICAgICAgICBoaWdobGlnaHRlZDogJz0nLCAvLyBUaGlzIG9uZSBpcyByZWFsbHkgdHdvLXdheSBiaW5kaW5nLlxuICAgICAgICBwb3N0U2VsZWN0QWN0aW9uOiAnPSdcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSAvKiwgZWxlbWVudCwgYXR0cnMqLykge1xuICAgICAgICBzY29wZS5Cb29rbWFya3MgPSBCb29rbWFya3M7XG4gICAgICAgIHNjb3BlLmNvbnN0cyA9IGNvbnN0cztcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdjaGFubmVsU2hlbGYnLCBmdW5jdGlvbihBTlksIERhdGFzZXQsIFBpbGxzLCBfLCBEcm9wLCBMb2dnZXIsIHZsLCBjcWwsIFNjaGVtYSkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvY2hhbm5lbHNoZWxmL2NoYW5uZWxzaGVsZi5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgY2hhbm5lbElkOiAnPCcsXG4gICAgICAgIGVuY29kaW5nOiAnPScsXG4gICAgICAgIG1hcms6ICc8JyxcbiAgICAgICAgcHJldmlldzogJzwnLFxuICAgICAgICBkaXNhYmxlZDogJzwnXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQgLyosIGF0dHJzKi8pIHtcbiAgICAgICAgc2NvcGUuRGF0YXNldCA9IERhdGFzZXQ7XG4gICAgICAgIHNjb3BlLnNjaGVtYSA9IFNjaGVtYS5nZXRDaGFubmVsU2NoZW1hKHNjb3BlLmNoYW5uZWxJZCk7XG4gICAgICAgIHNjb3BlLnBpbGxzID0gUGlsbHMucGlsbHM7XG5cbiAgICAgICAgc2NvcGUuaXNIaWdobGlnaHRlZCA9IGZ1bmN0aW9uIChjaGFubmVsSWQpIHtcbiAgICAgICAgICB2YXIgaGlnaGxpZ2h0ZWQgPSBQaWxscy5oaWdobGlnaHRlZCB8fCB7fTtcbiAgICAgICAgICByZXR1cm4gaGlnaGxpZ2h0ZWRbc2NvcGUuZW5jb2RpbmdbY2hhbm5lbElkXS5maWVsZF0gfHxcbiAgICAgICAgICAgIGhpZ2hsaWdodGVkWydmJyArIGNoYW5uZWxJZF07XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVGhlc2Ugd2lsbCBnZXQgdXBkYXRlZCBpbiB0aGUgd2F0Y2hlclxuICAgICAgICBzY29wZS5pc0FueUNoYW5uZWwgPSBmYWxzZTtcbiAgICAgICAgc2NvcGUuaXNBbnlGaWVsZCA9IGZhbHNlO1xuXG4gICAgICAgIHNjb3BlLnN1cHBvcnRNYXJrID0gZnVuY3Rpb24oY2hhbm5lbElkLCBtYXJrKSB7XG4gICAgICAgICAgaWYgKFBpbGxzLmlzQW55Q2hhbm5lbChjaGFubmVsSWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKG1hcmsgPT09IEFOWSkgeyAvLyBUT0RPOiBzdXBwb3J0IHtlbnVtOiBbLi4uXX1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdmwuY2hhbm5lbC5zdXBwb3J0TWFyayhjaGFubmVsSWQsIG1hcmspO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBwcm9wc1BvcHVwID0gbmV3IERyb3Aoe1xuICAgICAgICAgIGNvbnRlbnQ6IGVsZW1lbnQuZmluZCgnLnNoZWxmLXByb3BlcnRpZXMnKVswXSxcbiAgICAgICAgICB0YXJnZXQ6IGVsZW1lbnQuZmluZCgnLnNoZWxmLWxhYmVsJylbMF0sXG4gICAgICAgICAgcG9zaXRpb246ICdib3R0b20gbGVmdCcsXG4gICAgICAgICAgb3Blbk9uOiAnY2xpY2snXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLmZpZWxkSW5mb1BvcHVwQ29udGVudCA9ICBlbGVtZW50LmZpbmQoJy5zaGVsZi1mdW5jdGlvbnMnKVswXTtcblxuICAgICAgICBzY29wZS5yZW1vdmVGaWVsZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIFBpbGxzLnJlbW92ZShzY29wZS5jaGFubmVsSWQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmZpZWxkRHJhZ1N0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgUGlsbHMuZHJhZ1N0YXJ0KFBpbGxzLmdldChzY29wZS5jaGFubmVsSWQpLCBzY29wZS5jaGFubmVsSWQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmZpZWxkRHJhZ1N0b3AgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBQaWxscy5kcmFnU3RvcCgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFdmVudCBoYW5kbGVyIGZvciBkcm9wcGluZyBwaWxsLlxuICAgICAgICAgKi9cbiAgICAgICAgc2NvcGUuZmllbGREcm9wcGVkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIHBpbGwgPSBQaWxscy5nZXQoc2NvcGUuY2hhbm5lbElkKTtcblxuICAgICAgICAgIC8vIHZhbGlkYXRlIHR5cGVcbiAgICAgICAgICB2YXIgdHlwZXMgPSBTY2hlbWEuc2NoZW1hLmRlZmluaXRpb25zLlR5cGUuZW51bTtcbiAgICAgICAgICBpZiAoIV8uaW5jbHVkZXModHlwZXMsIHBpbGwudHlwZSkgJiYgIWNxbC5lbnVtU3BlYy5pc0VudW1TcGVjKHBpbGwudHlwZSkpIHtcbiAgICAgICAgICAgIC8vIGlmIGV4aXN0aW5nIHR5cGUgaXMgbm90IHN1cHBvcnRlZFxuICAgICAgICAgICAgcGlsbC50eXBlID0gdHlwZXNbMF07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gVE9ETyB2YWxpZGF0ZSB0aW1lVW5pdCAvIGFnZ3JlZ2F0ZVxuXG4gICAgICAgICAgUGlsbHMuZHJhZ0Ryb3Aoc2NvcGUuY2hhbm5lbElkKTtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuRklFTERfRFJPUCwgcGlsbCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGNoYW5uZWxJZFdhdGNoZXIgPSBzY29wZS4kd2F0Y2goJ2NoYW5uZWxJZCcsIGZ1bmN0aW9uKGNoYW5uZWxJZCkge1xuICAgICAgICAgIHNjb3BlLmlzQW55Q2hhbm5lbCA9IFBpbGxzLmlzQW55Q2hhbm5lbChjaGFubmVsSWQpO1xuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICAvLyBGSVhNRTogcmVtb3ZlIHRoaXMgY29uZnVzaW5nIDItd2F5IGJpbmRpbmcgbG9naWNzXG4gICAgICAgIC8vIElmIHNvbWUgZXh0ZXJuYWwgYWN0aW9uIGNoYW5nZXMgdGhlIGZpZWxkRGVmLCB3ZSBhbHNvIG5lZWQgdG8gdXBkYXRlIHRoZSBwaWxsXG4gICAgICAgIHZhciBjaGFubmVsRW5jb2RpbmdXYXRjaGVyID0gc2NvcGUuJHdhdGNoKCdlbmNvZGluZ1tjaGFubmVsSWRdJywgZnVuY3Rpb24oZmllbGREZWYpIHtcbiAgICAgICAgICAvLyBQcmV2aWV3IHNoZWxmIHNob3VsZCBub3QgY2F1c2Ugc2lkZSBlZmZlY3RcbiAgICAgICAgICBpZiAoc2NvcGUucHJldmlldykge1xuICAgICAgICAgICAgc2NvcGUuaXNFbnVtZXJhdGVkRmllbGQgPSBQaWxscy5pc0VudW1lcmF0ZWRGaWVsZChzY29wZS5jaGFubmVsSWQpO1xuICAgICAgICAgICAgc2NvcGUuaXNFbnVtZXJhdGVkQ2hhbm5lbCA9IFBpbGxzLmlzRW51bWVyYXRlZENoYW5uZWwoc2NvcGUuY2hhbm5lbElkKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgUGlsbHMuc2V0KHNjb3BlLmNoYW5uZWxJZCwgZmllbGREZWYgPyBfLmNsb25lRGVlcChmaWVsZERlZikgOiB7fSk7XG4gICAgICAgICAgICBzY29wZS5pc0FueUZpZWxkID0gY3FsLmVudW1TcGVjLmlzRW51bVNwZWMoZmllbGREZWYuZmllbGQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cblxuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKHByb3BzUG9wdXAgJiYgcHJvcHNQb3B1cC5kZXN0cm95KSB7XG4gICAgICAgICAgICBwcm9wc1BvcHVwLmRlc3Ryb3koKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBDbGVhbiB1cCB3YXRjaGVyc1xuICAgICAgICAgIGNoYW5uZWxJZFdhdGNoZXIoKTtcbiAgICAgICAgICBjaGFubmVsRW5jb2RpbmdXYXRjaGVyKCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOmZpZWxkSW5mb1xuICogQGRlc2NyaXB0aW9uXG4gKiAjIGZpZWxkSW5mb1xuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2ZpZWxkSW5mbycsIGZ1bmN0aW9uIChBTlksIERyb3AsIHZsLCBjcWwpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2ZpZWxkaW5mby9maWVsZGluZm8uaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIGZpZWxkRGVmOiAnPCcsXG4gICAgICAgIHNob3dBZGQ6ICc8JyxcbiAgICAgICAgc2hvd0NhcmV0OiAnPCcsXG4gICAgICAgIHNob3dSZW1vdmU6ICc8JyxcbiAgICAgICAgc2hvd1R5cGU6ICc8JyxcbiAgICAgICAgcG9wdXBDb250ZW50OiAnPCcsXG5cbiAgICAgICAgYWN0aW9uOiAnJicsXG4gICAgICAgIGFkZEFjdGlvbjogJyYnLFxuICAgICAgICByZW1vdmVBY3Rpb246ICcmJyxcbiAgICAgICAgZGlzYWJsZUNhcmV0OiAnPCdcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCkge1xuICAgICAgICB2YXIgZnVuY3NQb3B1cDtcbiAgICAgICAgc2NvcGUudmxUeXBlID0gdmwudHlwZTtcbiAgICAgICAgc2NvcGUuaXNFbnVtU3BlYyA9IGNxbC5lbnVtU3BlYy5pc0VudW1TcGVjO1xuXG4gICAgICAgIC8vIFByb3BlcnRpZXMgdGhhdCBhcmUgY3JlYXRlZCBieSBhIHdhdGNoZXIgbGF0ZXJcbiAgICAgICAgc2NvcGUudHlwZU5hbWUgPSBudWxsO1xuICAgICAgICBzY29wZS5pY29uID0gbnVsbDtcbiAgICAgICAgc2NvcGUubnVsbCA9IG51bGw7XG5cbiAgICAgICAgc2NvcGUuY2xpY2tlZCA9IGZ1bmN0aW9uKCRldmVudCl7XG4gICAgICAgICAgaWYoc2NvcGUuYWN0aW9uICYmICRldmVudC50YXJnZXQgIT09IGVsZW1lbnQuZmluZCgnLmZhLWNhcmV0LWRvd24nKVswXSAmJlxuICAgICAgICAgICAgJGV2ZW50LnRhcmdldCAhPT0gZWxlbWVudC5maW5kKCdzcGFuLnR5cGUnKVswXSkge1xuICAgICAgICAgICAgc2NvcGUuYWN0aW9uKCRldmVudCk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmZ1bmMgPSBmdW5jdGlvbihmaWVsZERlZikge1xuICAgICAgICAgIHJldHVybiBmaWVsZERlZi5hZ2dyZWdhdGUgfHwgZmllbGREZWYudGltZVVuaXQgfHxcbiAgICAgICAgICAgIChmaWVsZERlZi5iaW4gJiYgJ2JpbicpIHx8XG4gICAgICAgICAgICBmaWVsZERlZi5fYWdncmVnYXRlIHx8IGZpZWxkRGVmLl90aW1lVW5pdCB8fFxuICAgICAgICAgICAgKGZpZWxkRGVmLl9iaW4gJiYgJ2JpbicpIHx8IChmaWVsZERlZi5fYW55ICYmICdhdXRvJyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHBvcHVwQ29udGVudFdhdGNoZXIgPSBzY29wZS4kd2F0Y2goJ3BvcHVwQ29udGVudCcsIGZ1bmN0aW9uKHBvcHVwQ29udGVudCkge1xuICAgICAgICAgIGlmICghcG9wdXBDb250ZW50KSB7IHJldHVybjsgfVxuXG4gICAgICAgICAgaWYgKGZ1bmNzUG9wdXApIHtcbiAgICAgICAgICAgIGZ1bmNzUG9wdXAuZGVzdHJveSgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGZ1bmNzUG9wdXAgPSBuZXcgRHJvcCh7XG4gICAgICAgICAgICBjb250ZW50OiBwb3B1cENvbnRlbnQsXG4gICAgICAgICAgICB0YXJnZXQ6IGVsZW1lbnQuZmluZCgnLnR5cGUtY2FyZXQnKVswXSxcbiAgICAgICAgICAgIHBvc2l0aW9uOiAnYm90dG9tIGxlZnQnLFxuICAgICAgICAgICAgb3Blbk9uOiAnY2xpY2snXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBUWVBFX05BTUVTID0ge1xuICAgICAgICAgIG5vbWluYWw6ICd0ZXh0JyxcbiAgICAgICAgICBvcmRpbmFsOiAndGV4dC1vcmRpbmFsJyxcbiAgICAgICAgICBxdWFudGl0YXRpdmU6ICdudW1iZXInLFxuICAgICAgICAgIHRlbXBvcmFsOiAndGltZScsXG4gICAgICAgICAgZ2VvZ3JhcGhpYzogJ2dlbydcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgVFlQRV9JQ09OUyA9IHtcbiAgICAgICAgICBub21pbmFsOiAnZmEtZm9udCcsXG4gICAgICAgICAgb3JkaW5hbDogJ2ZhLWZvbnQnLFxuICAgICAgICAgIHF1YW50aXRhdGl2ZTogJ2ljb24taGFzaCcsXG4gICAgICAgICAgdGVtcG9yYWw6ICdmYS1jYWxlbmRhcicsXG4gICAgICAgIH07XG4gICAgICAgIFRZUEVfSUNPTlNbQU5ZXSA9ICdmYS1hc3Rlcmlzayc7IC8vIHNlcGFyYXRlIGxpbmUgYmVjYXVzZSB3ZSBtaWdodCBjaGFuZ2Ugd2hhdCdzIHRoZSBzdHJpbmcgZm9yIEFOWVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFR5cGVEaWN0VmFsdWUodHlwZSwgZGljdCkge1xuICAgICAgICAgIGlmIChjcWwuZW51bVNwZWMuaXNFbnVtU3BlYyh0eXBlKSkgeyAvLyBpcyBlbnVtU3BlY1xuICAgICAgICAgICAgdmFyIHZhbCA9IG51bGw7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHR5cGUuZW51bS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICB2YXIgX3R5cGUgPSB0eXBlLmVudW1baV07XG4gICAgICAgICAgICAgIGlmICh2YWwgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB2YWwgPSBkaWN0W190eXBlXTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAodmFsICE9PSBkaWN0W190eXBlXSkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIEFOWTsgLy8gSWYgdGhlcmUgYXJlIG1hbnkgY29uZmxpY3RpbmcgdHlwZXNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB2YWw7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBkaWN0W3R5cGVdO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGZpZWxkRGVmV2F0Y2hlciA9IHNjb3BlLiR3YXRjaCgnZmllbGREZWYudHlwZScsIGZ1bmN0aW9uKHR5cGUpIHtcbiAgICAgICAgICBzY29wZS5pY29uID0gZ2V0VHlwZURpY3RWYWx1ZSh0eXBlLCBUWVBFX0lDT05TKTtcbiAgICAgICAgICBzY29wZS50eXBlTmFtZSA9IGdldFR5cGVEaWN0VmFsdWUodHlwZSwgVFlQRV9OQU1FUyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoZnVuY3NQb3B1cCAmJiBmdW5jc1BvcHVwLmRlc3Ryb3kpIHtcbiAgICAgICAgICAgIGZ1bmNzUG9wdXAuZGVzdHJveSgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIHVucmVnaXN0ZXIgd2F0Y2hlcnNcbiAgICAgICAgICBwb3B1cENvbnRlbnRXYXRjaGVyKCk7XG4gICAgICAgICAgZmllbGREZWZXYXRjaGVyKCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ2Z1bmN0aW9uU2VsZWN0JywgZnVuY3Rpb24oXywgY29uc3RzLCB2bCwgUGlsbHMsIExvZ2dlciwgRGF0YXNldCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvZnVuY3Rpb25zZWxlY3QvZnVuY3Rpb25zZWxlY3QuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgY2hhbm5lbElkOiAnPCcsXG4gICAgICAgIGZpZWxkRGVmOiAnPSdcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSAvKixlbGVtZW50LCBhdHRycyovKSB7XG4gICAgICAgIHZhciBCSU49J2JpbicsIENPVU5UPSdjb3VudCcsIG1heGJpbnM7XG5cbiAgICAgICAgc2NvcGUuZnVuYyA9IHtcbiAgICAgICAgICBzZWxlY3RlZDogdW5kZWZpbmVkLFxuICAgICAgICAgIGxpc3Q6IHtcbiAgICAgICAgICAgIGFib3ZlRm9sZDogW10sXG4gICAgICAgICAgICBiZWxvd0ZvbGQ6IFtdIC8vIGNvdWxkIGJlIGVtcHR5XG4gICAgICAgICAgfSxcbiAgICAgICAgICBpc1RlbXBvcmFsOiBmYWxzZSwgLy8gZm9yIG1ha2luZyBiZWxvd0ZvbGQgdGltZVVuaXRzIHNpbmdsZS1jb2x1bW5cbiAgICAgICAgICBpc0NvdW50OiBmYWxzZSAvLyBoaWRlIFwibW9yZVwiICYgXCJsZXNzXCIgdG9nZ2xlIGZvciBDT1VOVFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGZ1bmN0aW9ucyBmb3IgVCA9IHRpbWVVbml0cyArIHVuZGVmaW5lZFxuICAgICAgICB2YXIgdGVtcG9yYWxGdW5jdGlvbnMgPSB7XG4gICAgICAgICAgYWJvdmVGb2xkOiBbXG4gICAgICAgICAgICB1bmRlZmluZWQsICd5ZWFyJyxcbiAgICAgICAgICAgICdxdWFydGVyJywgJ21vbnRoJyxcbiAgICAgICAgICAgICdkYXRlJywnZGF5JyxcbiAgICAgICAgICAgICdob3VycycsICdtaW51dGVzJyxcbiAgICAgICAgICAgICdzZWNvbmRzJywgJ21pbGxpc2Vjb25kcycsXG4gICAgICAgICAgICAneWVhcm1vbnRoZGF0ZSdcbiAgICAgICAgICBdLFxuICAgICAgICAgIGJlbG93Rm9sZDogW1xuICAgICAgICAgICAgJ3llYXJxdWFydGVyJyxcbiAgICAgICAgICAgICd5ZWFybW9udGgnLFxuICAgICAgICAgICAgJ3llYXJtb250aGRhdGVob3VycycsXG4gICAgICAgICAgICAneWVhcm1vbnRoZGF0ZWhvdXJzbWludXRlcycsXG4gICAgICAgICAgICAneWVhcm1vbnRoZGF0ZWhvdXJzbWludXRlc3NlY29uZHMnLFxuICAgICAgICAgICAgJ2hvdXJzbWludXRlcycsXG4gICAgICAgICAgICAnaG91cnNtaW51dGVzc2Vjb25kcycsXG4gICAgICAgICAgICAnbWludXRlc3NlY29uZHMnLFxuICAgICAgICAgICAgJ3NlY29uZHNtaWxsaXNlY29uZHMnXG4gICAgICAgICAgXVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBjYXJkaW5hbGl0eUZpbHRlciA9IGZ1bmN0aW9uKHRpbWVVbml0KSB7XG5cbiAgICAgICAgICB2YXIgcGlsbCA9ICBQaWxscy5nZXQoc2NvcGUuY2hhbm5lbElkKTtcbiAgICAgICAgICBpZiAoIXBpbGwpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgZmllbGQgPSBwaWxsLmZpZWxkO1xuICAgICAgICAgIC8vIENvbnZlcnQgJ2FueScgY2hhbm5lbCB0byAnPycuXG4gICAgICAgICAgdmFyIGNoYW5uZWwgPSBQaWxscy5pc0FueUNoYW5uZWwoc2NvcGUuY2hhbm5lbElkKSA/ICc/JyA6IHNjb3BlLmNoYW5uZWxJZDtcbiAgICAgICAgICByZXR1cm4gIXRpbWVVbml0IHx8IC8vIERvbid0IGZpbHRlciB1bmRlZmluZWQuXG4gICAgICAgICAgICAvLyBSZW1vdmUgdGltZVVuaXRzIHRoYXQgZG8gbm90IGhhdmUgdmFyaWF0aW9uIChjYXJkaW5hbGl0eSA8PSAxKS5cbiAgICAgICAgICAgIERhdGFzZXQuc2NoZW1hLnRpbWVVbml0SGFzVmFyaWF0aW9uKHtmaWVsZDogZmllbGQsIGNoYW5uZWw6IGNoYW5uZWwsIHRpbWVVbml0OiB0aW1lVW5pdH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIHRpbWVVbml0cyA9IFQgZnVuY3Rpb25zIC0gdW5kZWZpbmVkXG4gICAgICAgIHZhciB0aW1lVW5pdHMgPSBfLnB1bGwoXy5jb25jYXQodGVtcG9yYWxGdW5jdGlvbnMuYWJvdmVGb2xkLCB0ZW1wb3JhbEZ1bmN0aW9ucy5iZWxvd0ZvbGQpLCB1bmRlZmluZWQpO1xuXG4gICAgICAgIC8vIGZ1bmN0aW9ucyBmb3IgUSA9IGFnZ3JlZ2F0ZXMgKyBCSU4gKyB1bmRlZmluZWQgLSBDT1VOVFxuICAgICAgICB2YXIgcXVhbnRpdGF0aXZlRnVuY3Rpb25zID0ge1xuICAgICAgICAgIGFib3ZlRm9sZDogW1xuICAgICAgICAgICAgdW5kZWZpbmVkLCAnYmluJyxcbiAgICAgICAgICAgICdtaW4nLCAnbWF4JyxcbiAgICAgICAgICAgICdtZWFuJywgJ21lZGlhbicsXG4gICAgICAgICAgICAnc3VtJ1xuICAgICAgICAgIF0sXG4gICAgICAgICAgYmVsb3dGb2xkOiBbXG4gICAgICAgICAgICAndmFsaWQnLCAnbWlzc2luZycsXG4gICAgICAgICAgICAnZGlzdGluY3QnLCAnbW9kZXNrZXcnLFxuICAgICAgICAgICAgJ3ExJywgJ3EzJyxcbiAgICAgICAgICAgICdzdGRldicsICdzdGRldnAnLFxuICAgICAgICAgICAgJ3ZhcmlhbmNlJywgJ3ZhcmlhbmNlcCdcbiAgICAgICAgICBdIC8vIGhpZGUgQ09VTlQgZm9yIFEgaW4gdGhlIFVJIGJlY2F1c2Ugd2UgZGVkaWNhdGUgaXQgdG8gYSBzcGVjaWFsIFwiIyBDb3VudFwiIGZpZWxkXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gYWdncmVnYXRlcyA9IFEgRnVuY3Rpb25zICsgQ09VTlQgLSBCSU4gLSB1bmRlZmluZWRcbiAgICAgICAgdmFyIGFnZ3JlZ2F0ZXMgPSBfLnB1bGwoXy5jb25jYXQocXVhbnRpdGF0aXZlRnVuY3Rpb25zLmFib3ZlRm9sZCwgcXVhbnRpdGF0aXZlRnVuY3Rpb25zLmJlbG93Rm9sZCwgW0NPVU5UXSksXG4gICAgICAgICAgQklOLCB1bmRlZmluZWQpO1xuXG4gICAgICAgIHNjb3BlLnNlbGVjdENoYW5nZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuRlVOQ19DSEFOR0UsIHNjb3BlLmZ1bmMuc2VsZWN0ZWQpO1xuXG4gICAgICAgICAgdmFyIHNlbGVjdGVkRnVuYyA9IHNjb3BlLmZ1bmMuc2VsZWN0ZWQ7XG5cbiAgICAgICAgICB2YXIgb2xkUGlsbCA9IFBpbGxzLmdldChzY29wZS5jaGFubmVsSWQpLFxuICAgICAgICAgICAgcGlsbCA9IF8uY2xvbmUob2xkUGlsbCksXG4gICAgICAgICAgICB0eXBlID0gcGlsbCA/IHBpbGwudHlwZSA6ICcnLFxuICAgICAgICAgICAgaXNRID0gdHlwZSA9PT0gdmwudHlwZS5RVUFOVElUQVRJVkUsXG4gICAgICAgICAgICBpc1QgPSB0eXBlID09PSB2bC50eXBlLlRFTVBPUkFMO1xuXG4gICAgICAgICAgaWYoIXBpbGwpe1xuICAgICAgICAgICAgcmV0dXJuOyAvLyBub3QgcmVhZHlcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyByZXNldCBmaWVsZCBkZWZcbiAgICAgICAgICAvLyBIQUNLOiB3ZSdyZSB0ZW1wb3JhcmlseSBzdG9yaW5nIHRoZSBtYXhiaW5zIGluIHRoZSBwaWxsXG4gICAgICAgICAgcGlsbC5iaW4gPSBzZWxlY3RlZEZ1bmMgPT09IEJJTiA/IHt9IDogdW5kZWZpbmVkO1xuICAgICAgICAgIHBpbGwuYWdncmVnYXRlID0gKGlzUSAmJiBhZ2dyZWdhdGVzLmluZGV4T2Yoc2VsZWN0ZWRGdW5jKSAhPT0gLTEpID8gc2VsZWN0ZWRGdW5jIDogdW5kZWZpbmVkO1xuICAgICAgICAgIHBpbGwudGltZVVuaXQgPSAoaXNUICYmIHRpbWVVbml0cy5pbmRleE9mKHNlbGVjdGVkRnVuYykgIT09IC0xKSA/IHNlbGVjdGVkRnVuYyA6IHVuZGVmaW5lZDtcblxuICAgICAgICAgIGlmKCFfLmlzRXF1YWwob2xkUGlsbCwgcGlsbCkpe1xuICAgICAgICAgICAgUGlsbHMuc2V0KHNjb3BlLmNoYW5uZWxJZCwgcGlsbCwgdHJ1ZSAvKiBwcm9wYWdhdGUgY2hhbmdlICovKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gd2hlbiBwYXJlbnQgb2JqZWN0cyBtb2RpZnkgdGhlIGZpZWxkXG4gICAgICAgIHZhciBmaWVsZERlZldhdGNoZXIgPSBzY29wZS4kd2F0Y2goJ2ZpZWxkRGVmJywgZnVuY3Rpb24ocGlsbCkge1xuICAgICAgICAgIGlmICghcGlsbCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciB0eXBlID0gcGlsbC5maWVsZCA/IHBpbGwudHlwZSA6ICcnO1xuXG4gICAgICAgICAgLy8gaGFjazogc2F2ZSB0aGUgbWF4Ymluc1xuICAgICAgICAgIGlmIChwaWxsLmJpbikge1xuICAgICAgICAgICAgbWF4YmlucyA9IHBpbGwuYmluLm1heGJpbnM7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIGlzT3JkaW5hbFNoZWxmID0gWydyb3cnLCdjb2x1bW4nLCdzaGFwZSddLmluZGV4T2Yoc2NvcGUuY2hhbm5lbElkKSAhPT0gLTEsXG4gICAgICAgICAgICBpc1EgPSB0eXBlID09PSB2bC50eXBlLlFVQU5USVRBVElWRSxcbiAgICAgICAgICAgIGlzVCA9IHR5cGUgPT09IHZsLnR5cGUuVEVNUE9SQUw7XG5cbiAgICAgICAgICAvLyBmb3IgbWFraW5nIGJlbG93Rm9sZCB0aW1lVW5pdHMgc2luZ2xlLWNvbHVtblxuICAgICAgICAgIHNjb3BlLmZ1bmMuaXNUZW1wb3JhbCA9IGlzVDtcblxuICAgICAgICAgIC8vIGhpZGUgXCJtb3JlXCIgJiBcImxlc3NcIiB0b2dnbGVzIGZvciBDT1VOVFxuICAgICAgICAgIHNjb3BlLmZ1bmMuaXNDb3VudCA9IHBpbGwuZmllbGQgPT09ICcqJztcblxuICAgICAgICAgIGlmKHBpbGwuZmllbGQgPT09ICcqJyAmJiBwaWxsLmFnZ3JlZ2F0ZSA9PT0gQ09VTlQpe1xuICAgICAgICAgICAgc2NvcGUuZnVuYy5saXN0LmFib3ZlRm9sZD1bQ09VTlRdO1xuICAgICAgICAgICAgc2NvcGUuZnVuYy5saXN0LmJlbG93Rm9sZD1bXTtcbiAgICAgICAgICAgIHNjb3BlLmZ1bmMuc2VsZWN0ZWQgPSBDT1VOVDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVE9ETzogY2hlY2sgc3VwcG9ydGVkIHR5cGUgYmFzZWQgb24gcHJpbWl0aXZlIGRhdGE/XG4gICAgICAgICAgICBpZiAoaXNUKSB7XG4gICAgICAgICAgICAgIHNjb3BlLmZ1bmMubGlzdC5hYm92ZUZvbGQgPSB0ZW1wb3JhbEZ1bmN0aW9ucy5hYm92ZUZvbGQuZmlsdGVyKGNhcmRpbmFsaXR5RmlsdGVyKTtcbiAgICAgICAgICAgICAgc2NvcGUuZnVuYy5saXN0LmJlbG93Rm9sZCA9IHRlbXBvcmFsRnVuY3Rpb25zLmJlbG93Rm9sZC5maWx0ZXIoY2FyZGluYWxpdHlGaWx0ZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaXNRKSB7XG4gICAgICAgICAgICAgIHNjb3BlLmZ1bmMubGlzdC5hYm92ZUZvbGQgPSBxdWFudGl0YXRpdmVGdW5jdGlvbnMuYWJvdmVGb2xkO1xuICAgICAgICAgICAgICBzY29wZS5mdW5jLmxpc3QuYmVsb3dGb2xkID0gcXVhbnRpdGF0aXZlRnVuY3Rpb25zLmJlbG93Rm9sZDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGRlZmF1bHRWYWwgPSAoaXNPcmRpbmFsU2hlbGYgJiZcbiAgICAgICAgICAgICAgKGlzUSAmJiBCSU4pIHx8IChpc1QgJiYgY29uc3RzLmRlZmF1bHRUaW1lRm4pXG4gICAgICAgICAgICApIHx8IHVuZGVmaW5lZDtcblxuICAgICAgICAgICAgdmFyIHNlbGVjdGVkID0gcGlsbC5iaW4gPyAnYmluJyA6XG4gICAgICAgICAgICAgIHBpbGwuYWdncmVnYXRlIHx8IHBpbGwudGltZVVuaXQ7XG5cbiAgICAgICAgICAgIGlmIChzY29wZS5mdW5jLmxpc3QuYWJvdmVGb2xkLmluZGV4T2Yoc2VsZWN0ZWQpID49IDAgfHwgc2NvcGUuZnVuYy5saXN0LmJlbG93Rm9sZC5pbmRleE9mKHNlbGVjdGVkKSA+PSAwKSB7XG4gICAgICAgICAgICAgIHNjb3BlLmZ1bmMuc2VsZWN0ZWQgPSBzZWxlY3RlZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHNjb3BlLmZ1bmMuc2VsZWN0ZWQgPSBkZWZhdWx0VmFsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIC8vIENsZWFuIHVwIHdhdGNoZXIocylcbiAgICAgICAgICBmaWVsZERlZldhdGNoZXIoKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmx1aS5kaXJlY3RpdmU6bW9kYWxcbiAqIEBkZXNjcmlwdGlvblxuICogIyBtb2RhbFxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ21vZGFsJywgZnVuY3Rpb24gKCRkb2N1bWVudCwgTW9kYWxzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9tb2RhbC9tb2RhbC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICB0cmFuc2NsdWRlOiB0cnVlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgYXV0b09wZW46ICc8JyxcbiAgICAgICAgbWF4V2lkdGg6ICdAJ1xuICAgICAgfSxcbiAgICAgIC8vIFByb3ZpZGUgYW4gaW50ZXJmYWNlIGZvciBjaGlsZCBkaXJlY3RpdmVzIHRvIGNsb3NlIHRoaXMgbW9kYWxcbiAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSkge1xuICAgICAgICB0aGlzLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJHNjb3BlLmlzT3BlbiA9IGZhbHNlO1xuICAgICAgICB9O1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuICAgICAgICB2YXIgbW9kYWxJZCA9IGF0dHJzLmlkO1xuXG4gICAgICAgIGlmIChzY29wZS5tYXhXaWR0aCkge1xuICAgICAgICAgIHNjb3BlLndyYXBwZXJTdHlsZSA9ICdtYXgtd2lkdGg6JyArIHNjb3BlLm1heFdpZHRoO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGVmYXVsdCB0byBjbG9zZWQgdW5sZXNzIGF1dG9PcGVuIGlzIHNldFxuICAgICAgICBzY29wZS5pc09wZW4gPSBzY29wZS5hdXRvT3BlbjtcblxuICAgICAgICAvLyBjbG9zZSBvbiBlc2NcbiAgICAgICAgZnVuY3Rpb24gZXNjYXBlKGUpIHtcbiAgICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAyNyAmJiBzY29wZS5pc09wZW4pIHtcbiAgICAgICAgICAgIHNjb3BlLmlzT3BlbiA9IGZhbHNlO1xuICAgICAgICAgICAgc2NvcGUuJGRpZ2VzdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGFuZ3VsYXIuZWxlbWVudCgkZG9jdW1lbnQpLm9uKCdrZXlkb3duJywgZXNjYXBlKTtcblxuICAgICAgICAvLyBSZWdpc3RlciB0aGlzIG1vZGFsIHdpdGggdGhlIHNlcnZpY2VcbiAgICAgICAgTW9kYWxzLnJlZ2lzdGVyKG1vZGFsSWQsIHNjb3BlKTtcbiAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIE1vZGFscy5kZXJlZ2lzdGVyKG1vZGFsSWQpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTptb2RhbENsb3NlQnV0dG9uXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgbW9kYWxDbG9zZUJ1dHRvblxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ21vZGFsQ2xvc2VCdXR0b24nLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL21vZGFsL21vZGFsY2xvc2VidXR0b24uaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVxdWlyZTogJ15ebW9kYWwnLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgY2xvc2VBY3Rpb246ICcmJ1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbW9kYWxDb250cm9sbGVyKSB7XG4gICAgICAgIHNjb3BlLmNsb3NlTW9kYWwgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBtb2RhbENvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgICBpZiAoc2NvcGUuY2xvc2VBY3Rpb24pIHtcbiAgICAgICAgICAgIHNjb3BlLmNsb3NlQWN0aW9uKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBzZXJ2aWNlXG4gKiBAbmFtZSB2bHVpLk1vZGFsc1xuICogQGRlc2NyaXB0aW9uXG4gKiAjIE1vZGFsc1xuICogU2VydmljZSB1c2VkIHRvIGNvbnRyb2wgbW9kYWwgdmlzaWJpbGl0eSBmcm9tIGFueXdoZXJlIGluIHRoZSBhcHBsaWNhdGlvblxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5mYWN0b3J5KCdNb2RhbHMnLCBmdW5jdGlvbiAoJGNhY2hlRmFjdG9yeSkge1xuXG4gICAgLy8gVE9ETzogVGhlIHVzZSBvZiBzY29wZSBoZXJlIGFzIHRoZSBtZXRob2QgYnkgd2hpY2ggYSBtb2RhbCBkaXJlY3RpdmVcbiAgICAvLyBpcyByZWdpc3RlcmVkIGFuZCBjb250cm9sbGVkIG1heSBuZWVkIHRvIGNoYW5nZSB0byBzdXBwb3J0IHJldHJpZXZpbmdcbiAgICAvLyBkYXRhIGZyb20gYSBtb2RhbCBhcyBtYXkgYmUgbmVlZGVkIGluICM3N1xuICAgIHZhciBtb2RhbHNDYWNoZSA9ICRjYWNoZUZhY3RvcnkoJ21vZGFscycpO1xuXG4gICAgLy8gUHVibGljIEFQSVxuICAgIHJldHVybiB7XG4gICAgICByZWdpc3RlcjogZnVuY3Rpb24oaWQsIHNjb3BlKSB7XG4gICAgICAgIGlmIChtb2RhbHNDYWNoZS5nZXQoaWQpKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignQ2Fubm90IHJlZ2lzdGVyIHR3byBtb2RhbHMgd2l0aCBpZCAnICsgaWQpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBtb2RhbHNDYWNoZS5wdXQoaWQsIHNjb3BlKTtcbiAgICAgIH0sXG5cbiAgICAgIGRlcmVnaXN0ZXI6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgIG1vZGFsc0NhY2hlLnJlbW92ZShpZCk7XG4gICAgICB9LFxuXG4gICAgICAvLyBPcGVuIGEgbW9kYWxcbiAgICAgIG9wZW46IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgIHZhciBtb2RhbFNjb3BlID0gbW9kYWxzQ2FjaGUuZ2V0KGlkKTtcbiAgICAgICAgaWYgKCFtb2RhbFNjb3BlKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignVW5yZWdpc3RlcmVkIG1vZGFsIGlkICcgKyBpZCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIG1vZGFsU2NvcGUuaXNPcGVuID0gdHJ1ZTtcbiAgICAgIH0sXG5cbiAgICAgIC8vIENsb3NlIGEgbW9kYWxcbiAgICAgIGNsb3NlOiBmdW5jdGlvbihpZCkge1xuICAgICAgICB2YXIgbW9kYWxTY29wZSA9IG1vZGFsc0NhY2hlLmdldChpZCk7XG4gICAgICAgIGlmICghbW9kYWxTY29wZSkge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1VucmVnaXN0ZXJlZCBtb2RhbCBpZCAnICsgaWQpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBtb2RhbFNjb3BlLmlzT3BlbiA9IGZhbHNlO1xuICAgICAgfSxcblxuICAgICAgZW1wdHk6IGZ1bmN0aW9uKCkge1xuICAgICAgICBtb2RhbHNDYWNoZS5yZW1vdmVBbGwoKTtcbiAgICAgIH0sXG5cbiAgICAgIGNvdW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIG1vZGFsc0NhY2hlLmluZm8oKS5zaXplO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZlZ2EtbGl0ZS11aS5kaXJlY3RpdmU6cHJvcGVydHlFZGl0b3JcbiAqIEBkZXNjcmlwdGlvblxuICogIyBwcm9wZXJ0eUVkaXRvclxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3Byb3BlcnR5RWRpdG9yJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvcHJvcGVydHllZGl0b3IvcHJvcGVydHllZGl0b3IuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgaWQ6ICc9JyxcbiAgICAgICAgdHlwZTogJz0nLFxuICAgICAgICBlbnVtOiAnPScsXG4gICAgICAgIHByb3BOYW1lOiAnPScsXG4gICAgICAgIGdyb3VwOiAnPScsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnPScsXG4gICAgICAgIGRlZmF1bHQ6ICc9JyxcbiAgICAgICAgbWluOiAnPScsXG4gICAgICAgIG1heDogJz0nLFxuICAgICAgICByb2xlOiAnPScgLy8gZm9yIGV4YW1wbGUgJ2NvbG9yJ1xuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlIC8qLCBlbGVtZW50LCBhdHRycyovKSB7XG4gICAgICAgIHNjb3BlLmhhc0F1dG8gPSBzY29wZS5kZWZhdWx0ID09PSB1bmRlZmluZWQ7XG5cbiAgICAgICAgLy9UT0RPKGthbml0dyk6IGNvbnNpZGVyIHJlbmFtaW5nXG4gICAgICAgIHNjb3BlLmF1dG9tb2RlbCA9IHsgdmFsdWU6IGZhbHNlIH07XG5cbiAgICAgICAgaWYgKHNjb3BlLmhhc0F1dG8pIHtcbiAgICAgICAgICBzY29wZS5hdXRvbW9kZWwudmFsdWUgPSBzY29wZS5ncm91cFtzY29wZS5wcm9wTmFtZV0gPT09IHVuZGVmaW5lZDtcblxuICAgICAgICAgIC8vIGNoYW5nZSB0aGUgdmFsdWUgdG8gdW5kZWZpbmVkIGlmIGF1dG8gaXMgdHJ1ZVxuICAgICAgICAgIHZhciBhdXRvTW9kZWxXYXRjaGVyID0gc2NvcGUuJHdhdGNoKCdhdXRvbW9kZWwudmFsdWUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChzY29wZS5hdXRvbW9kZWwudmFsdWUgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgc2NvcGUuZ3JvdXBbc2NvcGUucHJvcE5hbWVdID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gQ2xlYW4gdXAgd2F0Y2hlclxuICAgICAgICAgICAgYXV0b01vZGVsV2F0Y2hlcigpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgIH1cblxuICAgICAgICBzY29wZS5pc1JhbmdlID0gc2NvcGUubWF4ICE9PSB1bmRlZmluZWQgJiYgc2NvcGUubWluICE9PSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgnc2NoZW1hTGlzdCcsIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvc2NoZW1hbGlzdC9zY2hlbWFsaXN0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIG9yZGVyQnk6ICc8JyxcbiAgICAgICAgZmllbGREZWZzOiAnPCcsXG4gICAgICAgIHNob3dBZGQ6ICc8J1xuICAgICAgfSxcbiAgICAgIHJlcGxhY2U6IHRydWVcbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSBwb2xlc3Rhci5kaXJlY3RpdmU6c2NoZW1hTGlzdEl0ZW1cbiAqIEBkZXNjcmlwdGlvblxuICogIyBzY2hlbWFMaXN0SXRlbVxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3NjaGVtYUxpc3RJdGVtJywgZnVuY3Rpb24gKERhdGFzZXQsIERyb3AsIFBpbGxzLCBjcWwsIHZsKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnY29tcG9uZW50cy9zY2hlbWFsaXN0L3NjaGVtYWxpc3RpdGVtLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IGZhbHNlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgZmllbGREZWY6ICc9JywgLy8gVHdvLXdheVxuICAgICAgICBzaG93QWRkOiAgJzwnLFxuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uIHBvc3RMaW5rKHNjb3BlLCBlbGVtZW50KSB7XG4gICAgICAgIHNjb3BlLmlzQW55RmllbGQgPSBmYWxzZTtcblxuICAgICAgICBzY29wZS5maWVsZEluZm9Qb3B1cENvbnRlbnQgPSAgZWxlbWVudC5maW5kKCcuc2NoZW1hLW1lbnUnKVswXTtcblxuICAgICAgICBzY29wZS5pc0VudW1TcGVjID0gY3FsLmVudW1TcGVjLmlzRW51bVNwZWM7XG5cbiAgICAgICAgc2NvcGUuZmllbGRBZGQgPSBmdW5jdGlvbihmaWVsZERlZikge1xuICAgICAgICAgIFBpbGxzLmFkZChmaWVsZERlZik7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuZmllbGREcmFnU3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgZmllbGREZWYgPSBzY29wZS5maWVsZERlZjtcblxuICAgICAgICAgIHNjb3BlLnBpbGwgPSB7XG4gICAgICAgICAgICBmaWVsZDogZmllbGREZWYuZmllbGQsXG4gICAgICAgICAgICB0aXRsZTogZmllbGREZWYudGl0bGUsXG4gICAgICAgICAgICB0eXBlOiBmaWVsZERlZi50eXBlLFxuICAgICAgICAgICAgYWdncmVnYXRlOiBmaWVsZERlZi5hZ2dyZWdhdGVcbiAgICAgICAgICB9O1xuICAgICAgICAgIFBpbGxzLmRyYWdTdGFydChzY29wZS5waWxsLCBudWxsKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5maWVsZERyYWdTdG9wID0gUGlsbHMuZHJhZ1N0b3A7XG5cbiAgICAgICAgLy8gVE9ETyhodHRwczovL2dpdGh1Yi5jb20vdmVnYS92ZWdhLWxpdGUtdWkvaXNzdWVzLzE4Nyk6XG4gICAgICAgIC8vIGNvbnNpZGVyIGlmIHdlIGNhbiB1c2UgdmFsaWRhdG9yIC8gY3FsIGluc3RlYWRcbiAgICAgICAgdmFyIGFsbG93ZWRDYXN0aW5nID0ge1xuICAgICAgICAgIHF1YW50aXRhdGl2ZTogW3ZsLnR5cGUuUVVBTlRJVEFUSVZFLCB2bC50eXBlLk9SRElOQUwsIHZsLnR5cGUuTk9NSU5BTF0sXG4gICAgICAgICAgb3JkaW5hbDogW3ZsLnR5cGUuT1JESU5BTCwgdmwudHlwZS5OT01JTkFMXSxcbiAgICAgICAgICBub21pbmFsOiBbdmwudHlwZS5OT01JTkFMLCB2bC50eXBlLk9SRElOQUxdLFxuICAgICAgICAgIHRlbXBvcmFsOiBbdmwudHlwZS5URU1QT1JBTCwgdmwudHlwZS5PUkRJTkFMLCB2bC50eXBlLk5PTUlOQUxdLFxuICAgICAgICAgIGFsbDogW3ZsLnR5cGUuUVVBTlRJVEFUSVZFLCB2bC50eXBlLlRFTVBPUkFMLCB2bC50eXBlLk9SRElOQUwsIHZsLnR5cGUuTk9NSU5BTF1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgdW53YXRjaEZpZWxkRGVmID0gc2NvcGUuJHdhdGNoKCdmaWVsZERlZicsIGZ1bmN0aW9uKGZpZWxkRGVmKXtcbiAgICAgICAgICBpZiAoY3FsLmVudW1TcGVjLmlzRW51bVNwZWMoZmllbGREZWYuZmllbGQpKSB7XG4gICAgICAgICAgICBzY29wZS5hbGxvd2VkVHlwZXMgPSBhbGxvd2VkQ2FzdGluZy5hbGw7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNjb3BlLmFsbG93ZWRUeXBlcyA9IGFsbG93ZWRDYXN0aW5nW0RhdGFzZXQuc2NoZW1hLnR5cGUoZmllbGREZWYuZmllbGQpXTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzY29wZS5pc0FueUZpZWxkID0gY3FsLmVudW1TcGVjLmlzRW51bVNwZWMoZmllbGREZWYuZmllbGQpO1xuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2NvcGUuZmllbGRBZGQgPSBudWxsO1xuICAgICAgICAgIHNjb3BlLmZpZWxkRHJhZ1N0b3AgPSBudWxsO1xuICAgICAgICAgIHNjb3BlLmlzRW51bVNwZWMgPSBudWxsO1xuXG4gICAgICAgICAgdW53YXRjaEZpZWxkRGVmKCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pOyIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCdzaGVsdmVzJywgZnVuY3Rpb24oKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3NoZWx2ZXMvc2hlbHZlcy5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICBzY29wZToge1xuICAgICAgICBzcGVjOiAnPScsXG4gICAgICAgIHByZXZpZXc6ICc8JyxcbiAgICAgICAgc3VwcG9ydEFueTogJzwnXG4gICAgICB9LFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgQU5ZLCB1dGlsLCB2bCwgQ29uZmlnLCBEYXRhc2V0LCBMb2dnZXIsIFBpbGxzKSB7XG4gICAgICAgICRzY29wZS5BTlkgPSBBTlk7XG4gICAgICAgICRzY29wZS5hbnlDaGFubmVsSWRzID0gW107XG5cbiAgICAgICAgJHNjb3BlLm1hcmtzID0gWydwb2ludCcsICd0aWNrJywgJ2JhcicsICdsaW5lJywgJ2FyZWEnLCAndGV4dCddO1xuICAgICAgICAkc2NvcGUubWFya3NXaXRoQW55ID0gW0FOWV0uY29uY2F0KCRzY29wZS5tYXJrcyk7XG5cbiAgICAgICAgJHNjb3BlLm1hcmtDaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuTUFSS19DSEFOR0UsICRzY29wZS5zcGVjLm1hcmspO1xuICAgICAgICB9O1xuXG4gICAgICAgICRzY29wZS50cmFuc3Bvc2UgPSBmdW5jdGlvbigpe1xuICAgICAgICAgIHZsLnNwZWMudHJhbnNwb3NlKCRzY29wZS5zcGVjKTtcbiAgICAgICAgfTtcblxuICAgICAgICAkc2NvcGUuY2xlYXIgPSBmdW5jdGlvbigpe1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5TUEVDX0NMRUFOLCAkc2NvcGUuc3BlYyk7XG4gICAgICAgICAgUGlsbHMucmVzZXQoKTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgc3BlY1dhdGNoZXIgPSAkc2NvcGUuJHdhdGNoKCdzcGVjJywgZnVuY3Rpb24oc3BlYykge1xuICAgICAgICAgIC8vIHBvcHVsYXRlIGFueUNoYW5uZWxJZHMgc28gd2Ugc2hvdyBhbGwgb3IgdGhlbVxuICAgICAgICAgIGlmICgkc2NvcGUuc3VwcG9ydEFueSkge1xuICAgICAgICAgICAgJHNjb3BlLmFueUNoYW5uZWxJZHMgPSB1dGlsLmtleXMoc3BlYy5lbmNvZGluZykucmVkdWNlKGZ1bmN0aW9uKGFueUNoYW5uZWxJZHMsIGNoYW5uZWxJZCkge1xuICAgICAgICAgICAgICBpZiAoUGlsbHMuaXNBbnlDaGFubmVsKGNoYW5uZWxJZCkpIHtcbiAgICAgICAgICAgICAgICBhbnlDaGFubmVsSWRzLnB1c2goY2hhbm5lbElkKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm4gYW55Q2hhbm5lbElkcztcbiAgICAgICAgICAgIH0sIFtdKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gT25seSBjYWxsIFBpbGxzLnVwZGF0ZSwgd2hpY2ggd2lsbCB0cmlnZ2VyIFNwZWMuc3BlYyB0byB1cGRhdGUgaWYgaXQncyBub3QgYSBwcmV2aWV3LlxuICAgICAgICAgIGlmICghJHNjb3BlLnByZXZpZXcpIHtcbiAgICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5TUEVDX0NIQU5HRSwgc3BlYyk7XG4gICAgICAgICAgICBQaWxscy51cGRhdGUoc3BlYyk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTsgLy8sIHRydWUgLyogd2F0Y2ggZXF1YWxpdHkgcmF0aGVyIHRoYW4gcmVmZXJlbmNlICovKTtcblxuXG4gICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgLy8gQ2xlYW4gdXAgd2F0Y2hlclxuICAgICAgICAgIHNwZWNXYXRjaGVyKCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZsdWkuZGlyZWN0aXZlOnRhYlxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHRhYlxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3RhYicsIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvdGFicy90YWIuaHRtbCcsXG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVxdWlyZTogJ15edGFic2V0JyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICB0cmFuc2NsdWRlOiB0cnVlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgaGVhZGluZzogJ0AnXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCB0YWJzZXRDb250cm9sbGVyKSB7XG4gICAgICAgIHRhYnNldENvbnRyb2xsZXIuYWRkVGFiKHNjb3BlKTtcbiAgICAgIH1cbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZGlyZWN0aXZlXG4gKiBAbmFtZSB2bHVpLmRpcmVjdGl2ZTp0YWJzZXRcbiAqIEBkZXNjcmlwdGlvblxuICogIyB0YWJzZXRcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCd0YWJzZXQnLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3RhYnMvdGFic2V0Lmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHRyYW5zY2x1ZGU6IHRydWUsXG5cbiAgICAgIC8vIEludGVyZmFjZSBmb3IgdGFicyB0byByZWdpc3RlciB0aGVtc2VsdmVzXG4gICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHRoaXMudGFicyA9IFtdO1xuXG4gICAgICAgIHRoaXMuYWRkVGFiID0gZnVuY3Rpb24odGFiU2NvcGUpIHtcbiAgICAgICAgICAvLyBGaXJzdCB0YWIgaXMgYWx3YXlzIGF1dG8tYWN0aXZhdGVkOyBvdGhlcnMgYXV0by1kZWFjdGl2YXRlZFxuICAgICAgICAgIHRhYlNjb3BlLmFjdGl2ZSA9IHNlbGYudGFicy5sZW5ndGggPT09IDA7XG4gICAgICAgICAgc2VsZi50YWJzLnB1c2godGFiU2NvcGUpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuc2hvd1RhYiA9IGZ1bmN0aW9uKHNlbGVjdGVkVGFiKSB7XG4gICAgICAgICAgc2VsZi50YWJzLmZvckVhY2goZnVuY3Rpb24odGFiKSB7XG4gICAgICAgICAgICAvLyBBY3RpdmF0ZSB0aGUgc2VsZWN0ZWQgdGFiLCBkZWFjdGl2YXRlIGFsbCBvdGhlcnNcbiAgICAgICAgICAgIHRhYi5hY3RpdmUgPSB0YWIgPT09IHNlbGVjdGVkVGFiO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgfSxcblxuICAgICAgLy8gRXhwb3NlIGNvbnRyb2xsZXIgdG8gdGVtcGxhdGVzIGFzIFwidGFic2V0XCJcbiAgICAgIGNvbnRyb2xsZXJBczogJ3RhYnNldCdcbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZGlyZWN0aXZlKCd2bFBsb3QnLCBmdW5jdGlvbih2bCwgdmcsIGNxbCwgJHRpbWVvdXQsICRxLCBEYXRhc2V0LCBDb25maWcsIGNvbnN0cywgXywgJGRvY3VtZW50LCBMb2dnZXIsIEhlYXAsICR3aW5kb3cpIHtcbiAgICB2YXIgY291bnRlciA9IDA7XG4gICAgdmFyIE1BWF9DQU5WQVNfU0laRSA9IDMyNzY3LzIsIE1BWF9DQU5WQVNfQVJFQSA9IDI2ODQzNTQ1Ni80O1xuXG4gICAgdmFyIHJlbmRlclF1ZXVlID0gbmV3IEhlYXAoZnVuY3Rpb24oYSwgYil7XG4gICAgICAgIHJldHVybiBhLnByaW9yaXR5IC0gYi5wcmlvcml0eTtcbiAgICAgIH0pLFxuICAgICAgcmVuZGVyaW5nID0gZmFsc2U7XG5cbiAgICBmdW5jdGlvbiBnZXRSZW5kZXJlcih3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAvLyB1c2UgY2FudmFzIGJ5IGRlZmF1bHQgYnV0IHVzZSBzdmcgaWYgdGhlIHZpc3VhbGl6YXRpb24gaXMgdG9vIGJpZ1xuICAgICAgaWYgKHdpZHRoID4gTUFYX0NBTlZBU19TSVpFIHx8IGhlaWdodCA+IE1BWF9DQU5WQVNfU0laRSB8fCB3aWR0aCpoZWlnaHQgPiBNQVhfQ0FOVkFTX0FSRUEpIHtcbiAgICAgICAgcmV0dXJuICdzdmcnO1xuICAgICAgfVxuICAgICAgcmV0dXJuICdjYW52YXMnO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvdmxwbG90L3ZscGxvdC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICBzY29wZToge1xuICAgICAgICBjaGFydDogJz0nLFxuXG4gICAgICAgIC8vb3B0aW9uYWxcbiAgICAgICAgZGlzYWJsZWQ6ICc8JyxcbiAgICAgICAgLyoqIEEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGlmIHRoZSBwbG90IGlzIHN0aWxsIGluIHRoZSB2aWV3LCBzbyBpdCBtaWdodCBiZSBvbWl0dGVkIGZyb20gdGhlIHJlbmRlciBxdWV1ZSBpZiBuZWNlc3NhcnkuICovXG4gICAgICAgIGlzSW5MaXN0OiAnPCcsXG4gICAgICAgIGxpc3RUaXRsZTogJzwnLFxuXG4gICAgICAgIGFsd2F5c1Njcm9sbGFibGU6ICc8JyxcbiAgICAgICAgY29uZmlnU2V0OiAnQCcsXG4gICAgICAgIG92ZXJmbG93OiAnPCcsXG4gICAgICAgIHByaW9yaXR5OiAnPCcsXG4gICAgICAgIHJlc2NhbGU6ICc8JyxcbiAgICAgICAgdGh1bWJuYWlsOiAnPCcsXG4gICAgICAgIHRvb2x0aXA6ICc8J1xuICAgICAgfSxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCkge1xuICAgICAgICB2YXIgSE9WRVJfVElNRU9VVCA9IDUwMDtcbiAgICAgICAgdmFyIHZpZXc7XG4gICAgICAgIHZhciB0b29sdGlwO1xuICAgICAgICB2YXIgVE9PTFRJUF9ERUxBWSA9IDIwMDtcblxuICAgICAgICBzY29wZS52bFBsb3RIZWlnaHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gZWxlbWVudC5oZWlnaHQoKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS52bFBsb3RXaWR0aCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiBlbGVtZW50LndpZHRoKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gZGVzdHJveVZpZXcoKSB7XG4gICAgICAgICAgaWYgKHZpZXcpIHtcbiAgICAgICAgICAgIHRvb2x0aXAuZGVzdHJveSgpOyAvLyBkZXN0cm95IHRvb2x0aXAgKHByb21pc2UgYW5kIGV2ZW50IGxpc3RuZXJzKVxuICAgICAgICAgICAgdmlldy5vZmYoJ21vdXNlb3ZlcicpO1xuICAgICAgICAgICAgdmlldy5vZmYoJ21vdXNlb3V0Jyk7XG4gICAgICAgICAgICB2aWV3LmRlc3Ryb3koKTtcbiAgICAgICAgICAgIHZpZXcgPSBudWxsO1xuXG4gICAgICAgICAgICB2YXIgc2hvcnRoYW5kID0gZ2V0U2hvcnRoYW5kKCk7XG4gICAgICAgICAgICBpZiAoY29uc3RzLmRlYnVnICYmICR3aW5kb3cudmlld3MpIHtcbiAgICAgICAgICAgICAgZGVsZXRlICR3aW5kb3cudmlld3Nbc2hvcnRoYW5kXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBzY29wZS52aXNJZCA9IChjb3VudGVyKyspO1xuXG4gICAgICAgIHZhciBob3ZlclByb21pc2UgPSBudWxsO1xuICAgICAgICB2YXIgcmVuZGVyUXVldWVOZXh0UHJvbWlzZSA9IG51bGw7XG5cbiAgICAgICAgc2NvcGUuaG92ZXJGb2N1cyA9IGZhbHNlO1xuICAgICAgICBzY29wZS5kZXN0cm95ZWQgPSBmYWxzZTtcblxuICAgICAgICBzY29wZS5tb3VzZWVudGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaG92ZXJQcm9taXNlID0gJHRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5DSEFSVF9NT1VTRU9WRVIsIHNjb3BlLmNoYXJ0LnNob3J0aGFuZCx7XG4gICAgICAgICAgICAgIGxpc3Q6IHNjb3BlLmxpc3RUaXRsZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzY29wZS5ob3ZlckZvY3VzID0gIXNjb3BlLnRodW1ibmFpbDtcbiAgICAgICAgICB9LCBIT1ZFUl9USU1FT1VUKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5tb3VzZWxlYXZlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKHNjb3BlLmhvdmVyRm9jdXMpIHtcbiAgICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5DSEFSVF9NT1VTRU9VVCwgc2NvcGUuY2hhcnQuc2hvcnRoYW5kLCB7XG4gICAgICAgICAgICAgIGxpc3Q6IHNjb3BlLmxpc3RUaXRsZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKGhvdmVyUHJvbWlzZSk7XG4gICAgICAgICAgaG92ZXJQcm9taXNlID0gbnVsbDtcblxuICAgICAgICAgIHNjb3BlLmhvdmVyRm9jdXMgPSBzY29wZS51bmxvY2tlZCA9IGZhbHNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uVG9vbHRpcEFwcGVhcihldmVudCwgaXRlbSkge1xuICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5DSEFSVF9UT09MVElQLCBpdGVtLmRhdHVtLCB7XG4gICAgICAgICAgICBzaG9ydGhhbmQ6IHNjb3BlLmNoYXJ0LnNob3J0aGFuZCxcbiAgICAgICAgICAgIGxpc3Q6IHNjb3BlLmxpc3RUaXRsZVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gb25Ub29sdGlwRGlzYXBwZWFyKGV2ZW50LCBpdGVtKSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkNIQVJUX1RPT0xUSVBfRU5ELCBpdGVtLmRhdHVtLCB7XG4gICAgICAgICAgICBzaG9ydGhhbmQ6IHNjb3BlLmNoYXJ0LnNob3J0aGFuZCxcbiAgICAgICAgICAgIGxpc3Q6IHNjb3BlLmxpc3RUaXRsZVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0VmdTcGVjKCkge1xuICAgICAgICAgIHZhciBjb25maWdTZXQgPSBzY29wZS5jb25maWdTZXQgfHwgY29uc3RzLmRlZmF1bHRDb25maWdTZXQgfHwge307XG5cbiAgICAgICAgICBpZiAoIXNjb3BlLmNoYXJ0LnZsU3BlYykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciB2bFNwZWMgPSBfLmNsb25lRGVlcChzY29wZS5jaGFydC52bFNwZWMpO1xuICAgICAgICAgIHZnLnV0aWwuZXh0ZW5kKHZsU3BlYy5jb25maWcsIENvbmZpZ1tjb25maWdTZXRdKCkpO1xuICAgICAgICAgIHJldHVybiB2bC5jb21waWxlKHZsU3BlYykuc3BlYztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFZpc0VsZW1lbnQoKSB7XG4gICAgICAgICAgcmV0dXJuIGVsZW1lbnQuZmluZCgnLnZlZ2EgPiA6Zmlyc3QtY2hpbGQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlc2NhbGVJZkVuYWJsZSgpIHtcbiAgICAgICAgICB2YXIgdmlzRWxlbWVudCA9IGdldFZpc0VsZW1lbnQoKTtcbiAgICAgICAgICBpZiAoc2NvcGUucmVzY2FsZSkge1xuICAgICAgICAgICAgLy8gaGF2ZSB0byBkaWdlc3QgdGhlIHNjb3BlIHRvIGVuc3VyZSB0aGF0XG4gICAgICAgICAgICAvLyBlbGVtZW50LndpZHRoKCkgaXMgYm91bmQgYnkgcGFyZW50IGVsZW1lbnQhXG4gICAgICAgICAgICBzY29wZS4kZGlnZXN0KCk7XG5cbiAgICAgICAgICAgIHZhciB4UmF0aW8gPSBNYXRoLm1heChcbiAgICAgICAgICAgICAgICAwLjIsXG4gICAgICAgICAgICAgICAgZWxlbWVudC53aWR0aCgpIC8gIC8qIHdpZHRoIG9mIHZscGxvdCBib3VuZGluZyBib3ggKi9cbiAgICAgICAgICAgICAgICBzY29wZS53aWR0aCAvKiB3aWR0aCBvZiB0aGUgdmlzICovXG4gICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGlmICh4UmF0aW8gPCAxKSB7XG4gICAgICAgICAgICAgIHZpc0VsZW1lbnQud2lkdGgoc2NvcGUud2lkdGggKiB4UmF0aW8pXG4gICAgICAgICAgICAgICAgICAgICAgICAuaGVpZ2h0KHNjb3BlLmhlaWdodCAqIHhSYXRpbyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmlzRWxlbWVudC5jc3MoJ3RyYW5zZm9ybScsIG51bGwpXG4gICAgICAgICAgICAgICAgICAgICAgLmNzcygndHJhbnNmb3JtLW9yaWdpbicsIG51bGwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldFNob3J0aGFuZCgpIHtcbiAgICAgICAgICByZXR1cm4gc2NvcGUuY2hhcnQuc2hvcnRoYW5kIHx8IChzY29wZS5jaGFydC52bFNwZWMgPyBjcWwucXVlcnkuc2hvcnRoYW5kLnZsU3BlYyhzY29wZS5jaGFydC52bFNwZWMpIDogJycpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmVuZGVyUXVldWVOZXh0KCkge1xuICAgICAgICAgIC8vIHJlbmRlciBuZXh0IGl0ZW0gaW4gdGhlIHF1ZXVlXG4gICAgICAgICAgaWYgKHJlbmRlclF1ZXVlLnNpemUoKSA+IDApIHtcbiAgICAgICAgICAgIHZhciBuZXh0ID0gcmVuZGVyUXVldWUucG9wKCk7XG4gICAgICAgICAgICBuZXh0LnBhcnNlKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIG9yIHNheSB0aGF0IG5vIG9uZSBpcyByZW5kZXJpbmdcbiAgICAgICAgICAgIHJlbmRlcmluZyA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG5cbiAgICAgICAgZnVuY3Rpb24gcmVuZGVyKHNwZWMpIHtcblxuICAgICAgICAgIGlmICghc3BlYykge1xuICAgICAgICAgICAgaWYgKHZpZXcpIHtcbiAgICAgICAgICAgICAgZGVzdHJveVZpZXcoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzY29wZS5oZWlnaHQgPSBzcGVjLmhlaWdodDtcbiAgICAgICAgICBpZiAoIWVsZW1lbnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2NhbiBub3QgZmluZCB2aXMgZWxlbWVudCcpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBzaG9ydGhhbmQgPSBnZXRTaG9ydGhhbmQoKTtcblxuICAgICAgICAgIGZ1bmN0aW9uIHBhcnNlVmVnYSgpIHtcbiAgICAgICAgICAgIC8vIGlmIG5vIGxvbmdlciBhIHBhcnQgb2YgdGhlIGxpc3QsIGNhbmNlbCFcbiAgICAgICAgICAgIGlmIChzY29wZS5kZXN0cm95ZWQgfHwgc2NvcGUuZGlzYWJsZWQgfHwgKHNjb3BlLmlzSW5MaXN0ICYmIHNjb3BlLmNoYXJ0LmZpZWxkU2V0S2V5ICYmICFzY29wZS5pc0luTGlzdChzY29wZS5jaGFydCkpKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjYW5jZWwgcmVuZGVyaW5nJywgc2hvcnRoYW5kKTtcbiAgICAgICAgICAgICAgcmVuZGVyUXVldWVOZXh0KCk7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHN0YXJ0ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgICAgICAvLyByZW5kZXIgaWYgc3RpbGwgYSBwYXJ0IG9mIHRoZSBsaXN0XG4gICAgICAgICAgICB2Zy5wYXJzZS5zcGVjKHNwZWMsIGZ1bmN0aW9uKGVycm9yLCBjaGFydCkge1xuICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdlcnJvcicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICByZW5kZXJRdWV1ZU5leHRQcm9taXNlID0gJHRpbWVvdXQocmVuZGVyUXVldWVOZXh0LCAxKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB2YXIgZW5kUGFyc2UgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgICAgICAgICAgICBkZXN0cm95VmlldygpO1xuICAgICAgICAgICAgICAgIHZpZXcgPSBjaGFydCh7ZWw6IGVsZW1lbnRbMF19KTtcblxuICAgICAgICAgICAgICAgIGlmICghY29uc3RzLnVzZVVybCkge1xuICAgICAgICAgICAgICAgICAgdmlldy5kYXRhKHtyYXc6IERhdGFzZXQuZGF0YX0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZpZXcudXBkYXRlKCk7XG5cbiAgICAgICAgICAgICAgICAvLyByZWFkIHdpZHRoIC8gaGVpZ2h0IGZyb20gbGF5b3V0XG4gICAgICAgICAgICAgICAgdmFyIGxheW91dCA9IHZpZXcuZGF0YSgnbGF5b3V0JykudmFsdWVzKClbMF07XG4gICAgICAgICAgICAgICAgdmFyIHJlbmRlcmVyID0gZ2V0UmVuZGVyZXIobGF5b3V0LndpZHRoLCBsYXlvdXQuaGVpZ2h0KTtcbiAgICAgICAgICAgICAgICBpZiAocmVuZGVyZXIgPT09ICdzdmcnKSB7XG4gICAgICAgICAgICAgICAgICB2aWV3LnJlbmRlcmVyKHJlbmRlcmVyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgdmlzRWxlbWVudCA9IGVsZW1lbnQuZmluZCgnLnZlZ2EgPiA6Zmlyc3QtY2hpbGQnKTtcbiAgICAgICAgICAgICAgICAvLyByZWFkICA8Y2FudmFzPi88c3ZnPuKAmXMgd2lkdGggYW5kIGhlaWdodCwgd2hpY2ggaXMgdmVnYSdzIG91dGVyIHdpZHRoIGFuZCBoZWlnaHQgdGhhdCBpbmNsdWRlcyBheGVzIGFuZCBsZWdlbmRzXG4gICAgICAgICAgICAgICAgc2NvcGUud2lkdGggPSAgdmlzRWxlbWVudC53aWR0aCgpO1xuICAgICAgICAgICAgICAgIHNjb3BlLmhlaWdodCA9IHZpc0VsZW1lbnQuaGVpZ2h0KCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoY29uc3RzLmRlYnVnKSB7XG4gICAgICAgICAgICAgICAgICAkd2luZG93LnZpZXdzID0gJHdpbmRvdy52aWV3cyB8fCB7fTtcbiAgICAgICAgICAgICAgICAgICR3aW5kb3cudmlld3Nbc2hvcnRoYW5kXSA9IHZpZXc7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkNIQVJUX1JFTkRFUiwgc2NvcGUuY2hhcnQuc2hvcnRoYW5kLCB7XG4gICAgICAgICAgICAgICAgICBsaXN0OiBzY29wZS5saXN0VGl0bGVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXNjYWxlSWZFbmFibGUoKTtcblxuICAgICAgICAgICAgICAgIHZhciBlbmRDaGFydCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwYXJzZSBzcGVjJywgKGVuZFBhcnNlLXN0YXJ0KSwgJ2NoYXJ0aW5nJywgKGVuZENoYXJ0LWVuZFBhcnNlKSwgc2hvcnRoYW5kKTtcbiAgICAgICAgICAgICAgICBpZiAoc2NvcGUudG9vbHRpcCkge1xuICAgICAgICAgICAgICAgICAgLy8gdXNlIHZlZ2EtdG9vbHRpcFxuICAgICAgICAgICAgICAgICAgdG9vbHRpcCA9IHZsLnRvb2x0aXAodmlldywgc2NvcGUuY2hhcnQudmxTcGVjLCB7XG4gICAgICAgICAgICAgICAgICAgIG9uQXBwZWFyOiBvblRvb2x0aXBBcHBlYXIsXG4gICAgICAgICAgICAgICAgICAgIG9uRGlzYXBwZWFyOiBvblRvb2x0aXBEaXNhcHBlYXIsXG4gICAgICAgICAgICAgICAgICAgIGRlbGF5OiBUT09MVElQX0RFTEFZXG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUsIEpTT04uc3RyaW5naWZ5KHNwZWMpKTtcbiAgICAgICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgICByZW5kZXJRdWV1ZU5leHRQcm9taXNlID0gJHRpbWVvdXQocmVuZGVyUXVldWVOZXh0LCAxKTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoIXJlbmRlcmluZykgeyAvLyBpZiBubyBpbnN0YW5jZSBpcyBiZWluZyByZW5kZXIgLS0gcmVuZGVyaW5nIG5vd1xuICAgICAgICAgICAgcmVuZGVyaW5nPXRydWU7XG4gICAgICAgICAgICBwYXJzZVZlZ2EoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlIHF1ZXVlIGl0XG4gICAgICAgICAgICByZW5kZXJRdWV1ZS5wdXNoKHtcbiAgICAgICAgICAgICAgcHJpb3JpdHk6IHNjb3BlLnByaW9yaXR5IHx8IDAsXG4gICAgICAgICAgICAgIHBhcnNlOiBwYXJzZVZlZ2FcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzcGVjV2F0Y2hlciA9IHNjb3BlLiR3YXRjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAvLyBPbWl0IGRhdGEgcHJvcGVydHkgdG8gc3BlZWQgdXAgZGVlcCB3YXRjaFxuICAgICAgICAgIHJldHVybiBfLm9taXQoc2NvcGUuY2hhcnQudmxTcGVjLCAnZGF0YScpO1xuICAgICAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgc3BlYyA9IHNjb3BlLmNoYXJ0LnZnU3BlYyA9IGdldFZnU3BlYygpO1xuICAgICAgICAgIGlmICghc2NvcGUuY2hhcnQuY2xlYW5TcGVjKSB7XG4gICAgICAgICAgICAvLyBGSVhNRVxuICAgICAgICAgICAgc2NvcGUuY2hhcnQuY2xlYW5TcGVjID0gc2NvcGUuY2hhcnQudmxTcGVjO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZW5kZXIoc3BlYyk7XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygndmxwbG90IGRlc3Ryb3llZCcpO1xuICAgICAgICAgIGlmICh2aWV3KSB7XG4gICAgICAgICAgICBkZXN0cm95VmlldygpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChob3ZlclByb21pc2UpIHtcbiAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChob3ZlclByb21pc2UpO1xuICAgICAgICAgICAgaG92ZXJQcm9taXNlID0gbnVsbDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBpZiAocmVuZGVyUXVldWVOZXh0UHJvbWlzZSkge1xuICAgICAgICAgIC8vICAgJHRpbWVvdXQuY2FuY2VsKHJlbmRlclF1ZXVlTmV4dFByb21pc2UpO1xuICAgICAgICAgIC8vICAgcmVuZGVyUXVldWVOZXh0UHJvbWlzZSA9IG51bGw7XG4gICAgICAgICAgLy8gfVxuXG4gICAgICAgICAgc2NvcGUuZGVzdHJveWVkID0gdHJ1ZTtcbiAgICAgICAgICAvLyBGSVhNRSBhbm90aGVyIHdheSB0aGF0IHNob3VsZCBlbGltaW5hdGUgdGhpbmdzIGZyb20gbWVtb3J5IGZhc3RlciBzaG91bGQgYmUgcmVtb3ZpbmdcbiAgICAgICAgICAvLyBtYXliZSBzb21ldGhpbmcgbGlrZVxuICAgICAgICAgIC8vIHJlbmRlclF1ZXVlLnNwbGljZShyZW5kZXJRdWV1ZS5pbmRleE9mKHBhcnNlVmVnYSksIDEpKTtcbiAgICAgICAgICAvLyBidXQgd2l0aG91dCBwcm9wZXIgdGVzdGluZywgdGhpcyBpcyByaXNraWVyIHRoYW4gc2V0dGluZyBzY29wZS5kZXN0cm95ZWQuXG5cbiAgICAgICAgICAvLyBDbGVhbiB1cCB3YXRjaGVyXG4gICAgICAgICAgc3BlY1dhdGNoZXIoKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIGRpcmVjdGl2ZVxuICogQG5hbWUgdmVnYS1saXRlLXVpLmRpcmVjdGl2ZTp2aXNMaXN0SXRlbVxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHZpc0xpc3RJdGVtXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgndmxQbG90R3JvdXAnLCBmdW5jdGlvbiAoQm9va21hcmtzLCBjb25zdHMsIHZnLCB2bCwgRGF0YXNldCwgTG9nZ2VyLCBfLCBQaWxscywgQ2hhcnQsICR0aW1lb3V0LCBNb2RhbHMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL3ZscGxvdGdyb3VwL3ZscGxvdGdyb3VwLmh0bWwnLFxuICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICBjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsICRlbGVtZW50KSB7XG4gICAgICAgIHRoaXMuZ2V0RHJvcFRhcmdldCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiAkZWxlbWVudC5maW5kKCcuZmEtd3JlbmNoJylbMF07XG4gICAgICAgIH07XG4gICAgICB9LFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgLyogcGFzcyB0byB2bHBsb3QgKiovXG4gICAgICAgIGNoYXJ0OiAnPScsXG5cbiAgICAgICAgLy9vcHRpb25hbFxuICAgICAgICBkaXNhYmxlZDogJzwnLFxuICAgICAgICBpc0luTGlzdDogJzwnLFxuICAgICAgICBsaXN0VGl0bGU6ICc8JyxcblxuICAgICAgICBhbHdheXNTY3JvbGxhYmxlOiAnPCcsXG4gICAgICAgIGNvbmZpZ1NldDogJ0AnLFxuICAgICAgICBlbmFibGVQaWxsc1ByZXZpZXc6ICc8JyxcbiAgICAgICAgb3ZlcmZsb3c6ICc8JyxcbiAgICAgICAgcHJpb3JpdHk6ICc8JyxcbiAgICAgICAgcmVzY2FsZTogJzwnLFxuICAgICAgICB0aHVtYm5haWw6ICc8JyxcbiAgICAgICAgdG9vbHRpcDogJzwnLFxuXG4gICAgICAgIC8qIHZscGxvdGdyb3VwIHNwZWNpZmljICovXG5cbiAgICAgICAgLyoqIFNldCBvZiBmaWVsZERlZnMgZm9yIHNob3dpbmcgZmllbGQgaW5mby4gIEZvciBWb3lhZ2VyMiwgdGhpcyBtaWdodCBiZSBqdXN0IGEgc3Vic2V0IG9mIGZpZWxkcyB0aGF0IGFyZSBhbWJpZ3VvdXMuICovXG4gICAgICAgIGZpZWxkU2V0OiAnPCcsXG5cbiAgICAgICAgc2hvd0Jvb2ttYXJrOiAnPCcsXG4gICAgICAgIHNob3dEZWJ1ZzogJzwnLFxuICAgICAgICBzaG93RXhwYW5kOiAnPCcsXG4gICAgICAgIHNob3dGaWx0ZXJOdWxsOiAnPCcsXG4gICAgICAgIHNob3dMYWJlbDogJzwnLFxuICAgICAgICBzaG93TG9nOiAnPCcsXG4gICAgICAgIHNob3dTZWxlY3Q6ICc8JyxcbiAgICAgICAgc2hvd1NvcnQ6ICc8JyxcbiAgICAgICAgc2hvd1RyYW5zcG9zZTogJzwnLFxuXG4gICAgICAgIC8qKiBXaGV0aGVyIHRoZSBsb2cgLyB0cmFuc3Bvc2Ugc29ydCBjYXVzZSBzaWRlIGVmZmVjdCB0byB0aGUgc2hlbGYgICovXG4gICAgICAgIHRvZ2dsZVNoZWxmOiAnPCcsXG5cbiAgICAgICAgYWx3YXlzU2VsZWN0ZWQ6ICc8JyxcbiAgICAgICAgaXNTZWxlY3RlZDogJzwnLFxuICAgICAgICBoaWdobGlnaHRlZDogJzwnLFxuICAgICAgICBleHBhbmRBY3Rpb246ICcmJyxcbiAgICAgICAgc2VsZWN0QWN0aW9uOiAnJidcbiAgICAgIH0sXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSkge1xuICAgICAgICBzY29wZS5Cb29rbWFya3MgPSBCb29rbWFya3M7XG4gICAgICAgIHNjb3BlLmNvbnN0cyA9IGNvbnN0cztcblxuXG4gICAgICAgIC8vIGJvb2ttYXJrIGFsZXJ0XG4gICAgICAgIHNjb3BlLnNob3dCb29rbWFya0FsZXJ0ID0gZmFsc2U7XG4gICAgICAgIHNjb3BlLnRvZ2dsZUJvb2ttYXJrID0gZnVuY3Rpb24oY2hhcnQpIHtcbiAgICAgICAgICBpZiAoQm9va21hcmtzLmlzQm9va21hcmtlZChjaGFydC5zaG9ydGhhbmQpKSB7XG4gICAgICAgICAgICBzY29wZS5zaG93Qm9va21hcmtBbGVydCA9ICFzY29wZS5zaG93Qm9va21hcmtBbGVydDsgLy8gdG9nZ2xlIGFsZXJ0XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgQm9va21hcmtzLmFkZChjaGFydCwgc2NvcGUubGlzdFRpdGxlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGZpZWxkSG92ZXJQcm9taXNlID0gbnVsbDtcbiAgICAgICAgdmFyIHByZXZpZXdQcm9taXNlID0gbnVsbDtcblxuICAgICAgICBzY29wZS5lbmFibGVQcmV2aWV3ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcHJldmlld1Byb21pc2UgPSAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmIChzY29wZS5lbmFibGVQaWxsc1ByZXZpZXcpIHtcbiAgICAgICAgICAgICAgUGlsbHMucHJldmlldyh0cnVlLCBzY29wZS5jaGFydCwgc2NvcGUubGlzdFRpdGxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LCA1MDApO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuZGlzYWJsZVByZXZpZXcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAocHJldmlld1Byb21pc2UpIHtcbiAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChwcmV2aWV3UHJvbWlzZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHByZXZpZXdQcm9taXNlID0gbnVsbDtcblxuICAgICAgICAgIGlmIChzY29wZS5lbmFibGVQaWxsc1ByZXZpZXcpIHtcbiAgICAgICAgICAgIFBpbGxzLnByZXZpZXcoZmFsc2UsIHNjb3BlLmNoYXJ0LCBzY29wZS5saXN0VGl0bGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5maWVsZEluZm9Nb3VzZW92ZXIgPSBmdW5jdGlvbihmaWVsZERlZiwgaW5kZXgpIHtcbiAgICAgICAgICBmaWVsZEhvdmVyUHJvbWlzZSA9ICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgKHNjb3BlLmhpZ2hsaWdodGVkfHx7fSlbZmllbGREZWYuZmllbGRdID0gdHJ1ZTtcblxuICAgICAgICAgICAgLy8gTGluayB0byBvcmlnaW5hbCBmaWVsZCBpbiB0aGUgQ1FMLWJhc2VkIHNwZWNcbiAgICAgICAgICAgIGlmIChzY29wZS5jaGFydC5lbnVtU3BlY0luZGV4KSB7XG4gICAgICAgICAgICAgIHZhciBlbnVtU3BlY0luZGV4ID0gc2NvcGUuY2hhcnQuZW51bVNwZWNJbmRleDtcbiAgICAgICAgICAgICAgaWYgKGVudW1TcGVjSW5kZXguZW5jb2RpbmdzICYmIGVudW1TcGVjSW5kZXguZW5jb2RpbmdzW2luZGV4XSAmJiBlbnVtU3BlY0luZGV4LmVuY29kaW5nc1tpbmRleF0uZmllbGQpIHtcbiAgICAgICAgICAgICAgICB2YXIgZmllbGRFbnVtU3BlY05hbWUgPSBlbnVtU3BlY0luZGV4LmVuY29kaW5nc1tpbmRleF0uZmllbGQubmFtZTtcbiAgICAgICAgICAgICAgICAoc2NvcGUuaGlnaGxpZ2h0ZWR8fHt9KVtmaWVsZEVudW1TcGVjTmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5GSUVMRERFRl9ISUdITElHSFRFRCwgc2NvcGUuY2hhcnQuc2hvcnRoYW5kLCB7XG4gICAgICAgICAgICAgIGhpZ2hsaWdodGVkRmllbGQ6IGZpZWxkRGVmLmZpZWxkLFxuICAgICAgICAgICAgICBsaXN0OiBzY29wZS5saXN0VGl0bGVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuZmllbGRJbmZvTW91c2VvdXQgPSBmdW5jdGlvbihmaWVsZERlZiwgaW5kZXgpIHtcbiAgICAgICAgICBpZiAoZmllbGRIb3ZlclByb21pc2UpIHtcbiAgICAgICAgICAgIC8vIGlmIHdlIHVuaG92ZXIgd2l0aGluXG4gICAgICAgICAgICAkdGltZW91dC5jYW5jZWwoZmllbGRIb3ZlclByb21pc2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBmaWVsZEhvdmVyUHJvbWlzZSA9IG51bGw7XG5cbiAgICAgICAgICBpZiAoKHNjb3BlLmhpZ2hsaWdodGVkfHx7fSlbZmllbGREZWYuZmllbGRdKSB7XG4gICAgICAgICAgICAvLyBkaXNhYmxlIHByZXZpZXcgaWYgaXQncyBlbmFibGVkXG4gICAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuRklFTERERUZfVU5ISUdITElHSFRFRCwgc2NvcGUuY2hhcnQuc2hvcnRoYW5kLCB7XG4gICAgICAgICAgICAgIGhpZ2hsaWdodGVkRmllbGQ6IGZpZWxkRGVmLmZpZWxkLFxuICAgICAgICAgICAgICBsaXN0OiBzY29wZS5saXN0VGl0bGVcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAoc2NvcGUuaGlnaGxpZ2h0ZWR8fHt9KVtmaWVsZERlZi5maWVsZF0gPSBmYWxzZTtcblxuICAgICAgICAgICAgLy8gVW5saW5rIExpbmsgdG8gb3JpZ2luYWwgZmllbGQgaW4gdGhlIENRTC1iYXNlZCBzcGVjXG4gICAgICAgICAgICBpZiAoc2NvcGUuY2hhcnQuZW51bVNwZWNJbmRleCkge1xuICAgICAgICAgICAgICB2YXIgZW51bVNwZWNJbmRleCA9IHNjb3BlLmNoYXJ0LmVudW1TcGVjSW5kZXg7XG4gICAgICAgICAgICAgIGlmIChlbnVtU3BlY0luZGV4LmVuY29kaW5ncyAmJiBlbnVtU3BlY0luZGV4LmVuY29kaW5nc1tpbmRleF0gJiYgZW51bVNwZWNJbmRleC5lbmNvZGluZ3NbaW5kZXhdLmZpZWxkKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZpZWxkRW51bVNwZWNOYW1lID0gZW51bVNwZWNJbmRleC5lbmNvZGluZ3NbaW5kZXhdLmZpZWxkLm5hbWU7XG4gICAgICAgICAgICAgICAgZGVsZXRlIChzY29wZS5oaWdobGlnaHRlZHx8e30pW2ZpZWxkRW51bVNwZWNOYW1lXTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5pc0VudW1lcmF0ZWRGaWVsZCA9IGZ1bmN0aW9uKGNoYXJ0LCBpbmRleCkge1xuICAgICAgICAgIGlmIChjaGFydC5lbnVtU3BlY0luZGV4KSB7XG4gICAgICAgICAgICBpZiAoY2hhcnQuZW51bVNwZWNJbmRleC5lbmNvZGluZ3MgJiYgY2hhcnQuZW51bVNwZWNJbmRleC5lbmNvZGluZ3NbaW5kZXhdKSB7XG4gICAgICAgICAgICAgIHJldHVybiBjaGFydC5lbnVtU3BlY0luZGV4LmVuY29kaW5nc1tpbmRleF0uZmllbGQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5pc0VudW1lcmF0ZWRDaGFubmVsID0gZnVuY3Rpb24oY2hhcnQsIGluZGV4KSB7XG4gICAgICAgICAgaWYgKGNoYXJ0LmVudW1TcGVjSW5kZXgpIHtcbiAgICAgICAgICAgIGlmIChjaGFydC5lbnVtU3BlY0luZGV4LmVuY29kaW5ncyAmJiBjaGFydC5lbnVtU3BlY0luZGV4LmVuY29kaW5nc1tpbmRleF0pIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGNoYXJ0LmVudW1TcGVjSW5kZXguZW5jb2RpbmdzW2luZGV4XS5jaGFubmVsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUuc2VsZWN0ID0gZnVuY3Rpb24oY2hhcnQpIHtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuU1BFQ19TRUxFQ1QsIGNoYXJ0LnNob3J0aGFuZCwge1xuICAgICAgICAgICAgbGlzdDogc2NvcGUubGlzdFRpdGxlXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgUGlsbHMucGFyc2UoY2hhcnQudmxTcGVjKTtcbiAgICAgICAgICBpZiAoc2NvcGUuJHBhcmVudC5wb3N0U2VsZWN0QWN0aW9uKSB7XG4gICAgICAgICAgICBzY29wZS4kcGFyZW50LnBvc3RTZWxlY3RBY3Rpb24oKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgTW9kYWxzLmNsb3NlKCdib29rbWFyay1saXN0Jyk7IC8vIEhBQ0s6IHRoaXMgbGluZSBpcyBvbmx5IG5lY2Vzc2FyeSB3aGVuIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIGZyb20gYm9va21hcmsgbGlzdFxuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLnJlbW92ZUJvb2ttYXJrID0gZnVuY3Rpb24oY2hhcnQpIHtcbiAgICAgICAgICBCb29rbWFya3MucmVtb3ZlKGNoYXJ0KTtcbiAgICAgICAgICBzY29wZS5zaG93Qm9va21hcmtBbGVydCA9IGZhbHNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmtlZXBCb29rbWFyayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNjb3BlLnNob3dCb29rbWFya0FsZXJ0ID0gZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gRGVmZXIgcmVuZGVyaW5nIHRoZSBkZWJ1ZyBEcm9wIHBvcHVwIHVudGlsIGl0IGlzIHJlcXVlc3RlZFxuICAgICAgICBzY29wZS5yZW5kZXJQb3B1cCA9IGZhbHNlO1xuICAgICAgICAvLyBVc2UgXy5vbmNlIGJlY2F1c2UgdGhlIHBvcHVwIG9ubHkgbmVlZHMgdG8gYmUgaW5pdGlhbGl6ZWQgb25jZVxuICAgICAgICBzY29wZS5pbml0aWFsaXplUG9wdXAgPSBfLm9uY2UoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2NvcGUucmVuZGVyUG9wdXAgPSB0cnVlO1xuICAgICAgICB9KTtcblxuICAgICAgICBzY29wZS5sb2dDb2RlID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhuYW1lKyc6XFxuXFxuJywgSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBUT0dHTEUgTE9HXG5cbiAgICAgICAgc2NvcGUubG9nID0ge307XG4gICAgICAgIHNjb3BlLmxvZy5zdXBwb3J0ID0gZnVuY3Rpb24oc3BlYywgY2hhbm5lbCkge1xuICAgICAgICAgIGlmICghc3BlYykgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgICAgICB2YXIgZW5jb2RpbmcgPSBzcGVjLmVuY29kaW5nLFxuICAgICAgICAgICAgZmllbGREZWYgPSBlbmNvZGluZ1tjaGFubmVsXTtcblxuICAgICAgICAgIHJldHVybiBmaWVsZERlZiAmJiBmaWVsZERlZi50eXBlID09PSB2bC50eXBlLlFVQU5USVRBVElWRSAmJiAhZmllbGREZWYuYmluO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLmxvZy50b2dnbGUgPSBmdW5jdGlvbihzcGVjLCBjaGFubmVsKSB7XG4gICAgICAgICAgaWYgKCFzY29wZS5sb2cuc3VwcG9ydChzcGVjLCBjaGFubmVsKSkgeyByZXR1cm47IH1cblxuICAgICAgICAgIHZhciBmaWVsZERlZiA9IHNwZWMuZW5jb2RpbmdbY2hhbm5lbF0sXG4gICAgICAgICAgICBzY2FsZSA9IGZpZWxkRGVmLnNjYWxlID0gZmllbGREZWYuc2NhbGUgfHwge307XG5cbiAgICAgICAgICBpZiAoc2NvcGUudG9nZ2xlU2hlbGYpIHtcbiAgICAgICAgICAgIFBpbGxzLnJlc2NhbGUoY2hhbm5lbCwgc2NhbGUudHlwZSA9PT0gJ2xvZycgPyAnbGluZWFyJyA6ICdsb2cnKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2NhbGUudHlwZSA9IHNjYWxlLnR5cGUgPT09ICdsb2cnID8gJ2xpbmVhcicgOiAnbG9nJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuTE9HX1RPR0dMRSwgc2NvcGUuY2hhcnQuc2hvcnRoYW5kLCB7XG4gICAgICAgICAgICBsaXN0OiBzY29wZS5saXN0VGl0bGVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS5sb2cuYWN0aXZlID0gZnVuY3Rpb24oc3BlYywgY2hhbm5lbCkge1xuICAgICAgICAgIGlmICghc2NvcGUubG9nLnN1cHBvcnQoc3BlYywgY2hhbm5lbCkpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgICB2YXIgZmllbGREZWYgPSBzcGVjLmVuY29kaW5nW2NoYW5uZWxdLFxuICAgICAgICAgICAgc2NhbGUgPSBmaWVsZERlZi5zY2FsZTtcblxuICAgICAgICAgIHJldHVybiBzY2FsZSAmJiBzY2FsZS50eXBlID09PSAnbG9nJztcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBUT0dHTEUgRklMVEVSXG4gICAgICAgIC8vIFRPRE86IGV4dHJhY3QgdG9nZ2xlRmlsdGVyTnVsbCB0byBiZSBpdHMgb3duIGNsYXNzXG5cbiAgICAgICAgc2NvcGUudG9nZ2xlRmlsdGVyTnVsbCA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICAgICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuTlVMTF9GSUxURVJfVE9HR0xFLCBzY29wZS5jaGFydC5zaG9ydGhhbmQsIHtcbiAgICAgICAgICAgIGxpc3Q6IHNjb3BlLmxpc3RUaXRsZVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaWYgKHNjb3BlLnRvZ2dsZVNoZWxmKSB7XG4gICAgICAgICAgICBQaWxscy50b2dnbGVGaWx0ZXJJbnZhbGlkKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNwZWMudHJhbnNmb3JtID0gc3BlYy50cmFuc2Zvcm0gfHwge307XG4gICAgICAgICAgICBzcGVjLnRyYW5zZm9ybS5maWx0ZXJJbnZhbGlkID0gc3BlYy50cmFuc2Zvcm0uZmlsdGVySW52YWxpZCA9PT0gdHJ1ZSA/IHVuZGVmaW5lZCA6IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLnRvZ2dsZUZpbHRlck51bGwuc3VwcG9ydCA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICAgICAgICB2YXIgZmllbGREZWZzID0gdmwuc3BlYy5maWVsZERlZnMoc3BlYyk7XG4gICAgICAgICAgZm9yICh2YXIgaSBpbiBmaWVsZERlZnMpIHtcbiAgICAgICAgICAgIHZhciBmaWVsZERlZiA9IGZpZWxkRGVmc1tpXTtcbiAgICAgICAgICAgIGlmIChfLmluY2x1ZGVzKFt2bC50eXBlLk9SRElOQUwsIHZsLnR5cGUuTk9NSU5BTF0sIGZpZWxkRGVmLnR5cGUpICYmIERhdGFzZXQuc2NoZW1hLnN0YXRzKGZpZWxkRGVmKS5taXNzaW5nID4gMCkge1xuICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFRPR0dMRSBTT1JUXG4gICAgICAgIC8vIFRPRE86IGV4dHJhY3QgdG9nZ2xlU29ydCB0byBiZSBpdHMgb3duIGNsYXNzXG5cbiAgICAgICAgdmFyIHRvZ2dsZVNvcnQgPSBzY29wZS50b2dnbGVTb3J0ID0ge307XG5cbiAgICAgICAgdG9nZ2xlU29ydC5tb2RlcyA9IFsnb3JkaW5hbC1hc2NlbmRpbmcnLCAnb3JkaW5hbC1kZXNjZW5kaW5nJyxcbiAgICAgICAgICAncXVhbnRpdGF0aXZlLWFzY2VuZGluZycsICdxdWFudGl0YXRpdmUtZGVzY2VuZGluZycsICdjdXN0b20nXTtcblxuICAgICAgICB0b2dnbGVTb3J0LnRvZ2dsZSA9IGZ1bmN0aW9uKHNwZWMpIHtcblxuICAgICAgICAgIHZhciBjdXJyZW50TW9kZSA9IHRvZ2dsZVNvcnQubW9kZShzcGVjKTtcbiAgICAgICAgICB2YXIgY3VycmVudE1vZGVJbmRleCA9IHRvZ2dsZVNvcnQubW9kZXMuaW5kZXhPZihjdXJyZW50TW9kZSk7XG5cbiAgICAgICAgICB2YXIgbmV3TW9kZUluZGV4ID0gKGN1cnJlbnRNb2RlSW5kZXggKyAxKSAlICh0b2dnbGVTb3J0Lm1vZGVzLmxlbmd0aCAtIDEpO1xuICAgICAgICAgIHZhciBuZXdNb2RlID0gdG9nZ2xlU29ydC5tb2Rlc1tuZXdNb2RlSW5kZXhdO1xuXG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLlNPUlRfVE9HR0xFLCBzY29wZS5jaGFydC5zaG9ydGhhbmQsIHtcbiAgICAgICAgICAgIGN1cnJlbnRNb2RlOiBjdXJyZW50TW9kZSxcbiAgICAgICAgICAgIG5ld01vZGU6IG5ld01vZGUsXG4gICAgICAgICAgICBsaXN0OiBzY29wZS5saXN0VGl0bGVcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHZhciBjaGFubmVscyA9IHRvZ2dsZVNvcnQuY2hhbm5lbHMoc3BlYyk7XG5cbiAgICAgICAgICBpZiAoc2NvcGUudG9nZ2xlU2hlbGYpIHtcbiAgICAgICAgICAgIFBpbGxzLnNvcnQoY2hhbm5lbHMub3JkaW5hbCwgdG9nZ2xlU29ydC5nZXRTb3J0KG5ld01vZGUsIHNwZWMpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3BlYy5lbmNvZGluZ1tjaGFubmVscy5vcmRpbmFsXS5zb3J0ID0gdG9nZ2xlU29ydC5nZXRTb3J0KG5ld01vZGUsIHNwZWMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvKiogR2V0IHNvcnQgcHJvcGVydHkgZGVmaW5pdGlvbiB0aGF0IG1hdGNoZXMgZWFjaCBtb2RlLiAqL1xuICAgICAgICB0b2dnbGVTb3J0LmdldFNvcnQgPSBmdW5jdGlvbihtb2RlLCBzcGVjKSB7XG4gICAgICAgICAgaWYgKG1vZGUgPT09ICdvcmRpbmFsLWFzY2VuZGluZycpIHtcbiAgICAgICAgICAgIHJldHVybiAnYXNjZW5kaW5nJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobW9kZSA9PT0gJ29yZGluYWwtZGVzY2VuZGluZycpIHtcbiAgICAgICAgICAgIHJldHVybiAnZGVzY2VuZGluZyc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIGNoYW5uZWxzID0gdG9nZ2xlU29ydC5jaGFubmVscyhzcGVjKTtcbiAgICAgICAgICB2YXIgcUVuY0RlZiA9IHNwZWMuZW5jb2RpbmdbY2hhbm5lbHMucXVhbnRpdGF0aXZlXTtcblxuICAgICAgICAgIGlmIChtb2RlID09PSAncXVhbnRpdGF0aXZlLWFzY2VuZGluZycpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIG9wOiBxRW5jRGVmLmFnZ3JlZ2F0ZSxcbiAgICAgICAgICAgICAgZmllbGQ6IHFFbmNEZWYuZmllbGQsXG4gICAgICAgICAgICAgIG9yZGVyOiAnYXNjZW5kaW5nJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAobW9kZSA9PT0gJ3F1YW50aXRhdGl2ZS1kZXNjZW5kaW5nJykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgb3A6IHFFbmNEZWYuYWdncmVnYXRlLFxuICAgICAgICAgICAgICBmaWVsZDogcUVuY0RlZi5maWVsZCxcbiAgICAgICAgICAgICAgb3JkZXI6ICdkZXNjZW5kaW5nJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfTtcblxuICAgICAgICB0b2dnbGVTb3J0Lm1vZGUgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgICAgICAgdmFyIGNoYW5uZWxzID0gdG9nZ2xlU29ydC5jaGFubmVscyhzcGVjKTtcbiAgICAgICAgICB2YXIgc29ydCA9IHNwZWMuZW5jb2RpbmdbY2hhbm5lbHMub3JkaW5hbF0uc29ydDtcblxuICAgICAgICAgIGlmIChzb3J0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiAnb3JkaW5hbC1hc2NlbmRpbmcnO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdG9nZ2xlU29ydC5tb2Rlcy5sZW5ndGggLSAxIDsgaSsrKSB7XG4gICAgICAgICAgICAvLyBjaGVjayBpZiBzb3J0IG1hdGNoZXMgYW55IG9mIHRoZSBzb3J0IGZvciBlYWNoIG1vZGUgZXhjZXB0ICdjdXN0b20nLlxuICAgICAgICAgICAgdmFyIG1vZGUgPSB0b2dnbGVTb3J0Lm1vZGVzW2ldO1xuICAgICAgICAgICAgdmFyIHNvcnRPZk1vZGUgPSB0b2dnbGVTb3J0LmdldFNvcnQobW9kZSwgc3BlYyk7XG5cbiAgICAgICAgICAgIGlmIChfLmlzRXF1YWwoc29ydCwgc29ydE9mTW9kZSkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG1vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHZnLnV0aWwuaXNPYmplY3Qoc29ydCkgJiYgc29ydC5vcCAmJiBzb3J0LmZpZWxkKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2N1c3RvbSc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2ludmFsaWQgbW9kZScpO1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRvZ2dsZVNvcnQuY2hhbm5lbHMgPSBmdW5jdGlvbihzcGVjKSB7XG4gICAgICAgICAgcmV0dXJuIHNwZWMuZW5jb2RpbmcueC50eXBlID09PSB2bC50eXBlLk5PTUlOQUwgfHwgc3BlYy5lbmNvZGluZy54LnR5cGUgPT09IHZsLnR5cGUuT1JESU5BTCA/XG4gICAgICAgICAgICAgICAgICB7b3JkaW5hbDogJ3gnLCBxdWFudGl0YXRpdmU6ICd5J30gOlxuICAgICAgICAgICAgICAgICAge29yZGluYWw6ICd5JywgcXVhbnRpdGF0aXZlOiAneCd9O1xuICAgICAgICB9O1xuXG4gICAgICAgIHRvZ2dsZVNvcnQuc3VwcG9ydCA9IGZ1bmN0aW9uKHNwZWMpIHtcbiAgICAgICAgICB2YXIgZW5jb2RpbmcgPSBzcGVjLmVuY29kaW5nO1xuXG4gICAgICAgICAgaWYgKHZsLmVuY29kaW5nLmhhcyhlbmNvZGluZywgJ3JvdycpIHx8IHZsLmVuY29kaW5nLmhhcyhlbmNvZGluZywgJ2NvbHVtbicpIHx8XG4gICAgICAgICAgICAhdmwuZW5jb2RpbmcuaGFzKGVuY29kaW5nLCAneCcpIHx8ICF2bC5lbmNvZGluZy5oYXMoZW5jb2RpbmcsICd5JykgfHxcbiAgICAgICAgICAgICF2bC5lbmNvZGluZy5pc0FnZ3JlZ2F0ZShzcGVjLmVuY29kaW5nKSkgeyAvLyBGSVhNRSByZXBsYWNlIHRoaXMgcHJvcGVyIGFsd2F5c05vT2NjbHVzaW9uIG1ldGhvZFxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgIChlbmNvZGluZy54LnR5cGUgPT09IHZsLnR5cGUuTk9NSU5BTCB8fCBlbmNvZGluZy54LnR5cGUgPT09IHZsLnR5cGUuT1JESU5BTCkgJiZcbiAgICAgICAgICAgICAgdmwuZmllbGREZWYuaXNNZWFzdXJlKGVuY29kaW5nLnkpXG4gICAgICAgICAgICApID8gJ3gnIDpcbiAgICAgICAgICAgIChcbiAgICAgICAgICAgICAgKGVuY29kaW5nLnkudHlwZSA9PT0gdmwudHlwZS5OT01JTkFMIHx8IGVuY29kaW5nLnkudHlwZSA9PT0gdmwudHlwZS5PUkRJTkFMKSAmJlxuICAgICAgICAgICAgICB2bC5maWVsZERlZi5pc01lYXN1cmUoZW5jb2RpbmcueClcbiAgICAgICAgICAgICkgPyAneScgOiBmYWxzZTtcbiAgICAgICAgfTtcblxuICAgICAgICBzY29wZS50b2dnbGVTb3J0Q2xhc3MgPSBmdW5jdGlvbih2bFNwZWMpIHtcbiAgICAgICAgICBpZiAoIXZsU3BlYyB8fCAhdG9nZ2xlU29ydC5zdXBwb3J0KHZsU3BlYykpIHtcbiAgICAgICAgICAgIHJldHVybiAnaW52aXNpYmxlJztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgb3JkaW5hbENoYW5uZWwgPSB2bFNwZWMgJiYgdG9nZ2xlU29ydC5jaGFubmVscyh2bFNwZWMpLm9yZGluYWwsXG4gICAgICAgICAgICBtb2RlID0gdmxTcGVjICYmIHRvZ2dsZVNvcnQubW9kZSh2bFNwZWMpO1xuXG4gICAgICAgICAgdmFyIGRpcmVjdGlvbkNsYXNzID0gb3JkaW5hbENoYW5uZWwgPT09ICd4JyA/ICdzb3J0LXggJyA6ICcnO1xuXG4gICAgICAgICAgc3dpdGNoIChtb2RlKSB7XG4gICAgICAgICAgICBjYXNlICdvcmRpbmFsLWFzY2VuZGluZyc6XG4gICAgICAgICAgICAgIHJldHVybiBkaXJlY3Rpb25DbGFzcyArICdmYS1zb3J0LWFscGhhLWFzYyc7XG4gICAgICAgICAgICBjYXNlICdvcmRpbmFsLWRlc2NlbmRpbmcnOlxuICAgICAgICAgICAgICByZXR1cm4gZGlyZWN0aW9uQ2xhc3MgKyAnZmEtc29ydC1hbHBoYS1kZXNjJztcbiAgICAgICAgICAgIGNhc2UgJ3F1YW50aXRhdGl2ZS1hc2NlbmRpbmcnOlxuICAgICAgICAgICAgICByZXR1cm4gZGlyZWN0aW9uQ2xhc3MgKyAnZmEtc29ydC1hbW91bnQtYXNjJztcbiAgICAgICAgICAgIGNhc2UgJ3F1YW50aXRhdGl2ZS1kZXNjZW5kaW5nJzpcbiAgICAgICAgICAgICAgcmV0dXJuIGRpcmVjdGlvbkNsYXNzICsgJ2ZhLXNvcnQtYW1vdW50LWRlc2MnO1xuICAgICAgICAgICAgZGVmYXVsdDogLy8gY3VzdG9tXG4gICAgICAgICAgICAgIHJldHVybiBkaXJlY3Rpb25DbGFzcyArICdmYS1zb3J0JztcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgc2NvcGUudHJhbnNwb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLlRSQU5TUE9TRV9UT0dHTEUsIHNjb3BlLmNoYXJ0LnNob3J0aGFuZCwge1xuICAgICAgICAgICAgbGlzdDogc2NvcGUubGlzdFRpdGxlXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgaWYgKHNjb3BlLnRvZ2dsZVNoZWxmKSB7XG4gICAgICAgICAgICBQaWxscy50cmFuc3Bvc2UoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgQ2hhcnQudHJhbnNwb3NlKHNjb3BlLmNoYXJ0LnZsU3BlYyk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBzY29wZS5jaGFydCA9IG51bGw7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBkaXJlY3RpdmVcbiAqIEBuYW1lIHZlZ2EtbGl0ZS11aS5kaXJlY3RpdmU6dmlzTGlzdEl0ZW1cbiAqIEBkZXNjcmlwdGlvblxuICogIyB2aXNMaXN0SXRlbVxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5kaXJlY3RpdmUoJ3ZsUGxvdEdyb3VwUG9wdXAnLCBmdW5jdGlvbiAoRHJvcCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvdmxwbG90Z3JvdXAvdmxwbG90Z3JvdXBwb3B1cC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXF1aXJlOiAnXl52bFBsb3RHcm91cCcsXG4gICAgICBzY29wZTogZmFsc2UsXG4gICAgICBsaW5rOiBmdW5jdGlvbiBwb3N0TGluayhzY29wZSwgZWxlbWVudCwgYXR0cnMsIHZsUGxvdEdyb3VwQ29udHJvbGxlcikge1xuICAgICAgICB2YXIgZGVidWdQb3B1cCA9IG5ldyBEcm9wKHtcbiAgICAgICAgICBjb250ZW50OiBlbGVtZW50LmZpbmQoJy5kZXYtdG9vbCcpWzBdLFxuICAgICAgICAgIHRhcmdldDogdmxQbG90R3JvdXBDb250cm9sbGVyLmdldERyb3BUYXJnZXQoKSxcbiAgICAgICAgICBwb3NpdGlvbjogJ2JvdHRvbSByaWdodCcsXG4gICAgICAgICAgb3Blbk9uOiAnY2xpY2snLFxuICAgICAgICAgIGNvbnN0cmFpblRvV2luZG93OiB0cnVlXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjb3BlLiRvbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICBkZWJ1Z1BvcHVwLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmRpcmVjdGl2ZSgndmxQbG90R3JvdXBMaXN0JywgZnVuY3Rpb24gKHZsLCBjcWwsIGpRdWVyeSwgY29uc3RzLCBfLCBMb2dnZXIsIFBpbGxzLCBDaGFydCkge1xuICAgIHJldHVybiB7XG4gICAgICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvdmxwbG90Z3JvdXBsaXN0L3ZscGxvdGdyb3VwbGlzdC5odG1sJyxcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgLyoqIEFuIGluc3RhbmNlIG9mIHNwZWNRdWVyeU1vZGVsR3JvdXAgKi9cbiAgICAgICAgZW5hYmxlUGlsbHNQcmV2aWV3OiAnPCcsXG4gICAgICAgIGluaXRpYWxMaW1pdDogJzwnLFxuICAgICAgICBsaXN0VGl0bGU6ICc8JyxcbiAgICAgICAgaGlkZUxpc3RUaXRsZTogJzwnLFxuICAgICAgICBjaGFydHM6ICc8JyxcbiAgICAgICAgcHJpb3JpdHk6ICc8JyxcbiAgICAgICAgc2hvd01vcmU6ICc8JyxcbiAgICAgICAgcG9zdFNlbGVjdEFjdGlvbjogJyYnXG4gICAgICB9LFxuICAgICAgbGluazogZnVuY3Rpb24gcG9zdExpbmsoc2NvcGUgLyosIGVsZW1lbnQsIGF0dHJzKi8pIHtcbiAgICAgICAgc2NvcGUuY29uc3RzID0gY29uc3RzO1xuICAgICAgICBzY29wZS5saW1pdCA9IHNjb3BlLmluaXRpYWxMaW1pdCB8fCAzO1xuXG4gICAgICAgIC8vIEZ1bmN0aW9uc1xuICAgICAgICBzY29wZS5nZXRDaGFydCA9IENoYXJ0LmdldENoYXJ0O1xuICAgICAgICBzY29wZS5pbmNyZWFzZUxpbWl0ID0gaW5jcmVhc2VMaW1pdDtcbiAgICAgICAgc2NvcGUuaXNJbmxpc3QgPSBpc0luTGlzdDtcbiAgICAgICAgc2NvcGUuUGlsbHMgPSBQaWxscztcblxuICAgICAgICAvLyBlbGVtZW50LmJpbmQoJ3Njcm9sbCcsIGZ1bmN0aW9uKCl7XG4gICAgICAgIC8vICAgIGlmKGpRdWVyeSh0aGlzKS5zY3JvbGxUb3AoKSArIGpRdWVyeSh0aGlzKS5pbm5lckhlaWdodCgpID49IGpRdWVyeSh0aGlzKVswXS5zY3JvbGxIZWlnaHQpe1xuICAgICAgICAvLyAgICAgaWYgKHNjb3BlLmxpbWl0IDwgc2NvcGUubW9kZWxHcm91cC5jaGFydHMubGVuZ3RoKSB7XG4gICAgICAgIC8vICAgICAgIHNjb3BlLmluY3JlYXNlTGltaXQoKTtcbiAgICAgICAgLy8gICAgIH1cbiAgICAgICAgLy8gICAgfVxuICAgICAgICAvLyB9KTtcblxuICAgICAgICBmdW5jdGlvbiBpbmNyZWFzZUxpbWl0KCkge1xuICAgICAgICAgIHNjb3BlLmxpbWl0ICs9IDU7XG4gICAgICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkxPQURfTU9SRSwgc2NvcGUubGltaXQsIHtcbiAgICAgICAgICAgIGxpc3Q6IHNjb3BlLmxpc3RUaXRsZVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqIHJldHVybiBpZiB0aGUgcGxvdCBpcyBzdGlsbCBpbiB0aGUgdmlldywgc28gaXQgbWlnaHQgYmUgb21pdHRlZCBmcm9tIHRoZSByZW5kZXIgcXVldWUgaWYgbmVjZXNzYXJ5LiAqL1xuICAgICAgICBmdW5jdGlvbiBpc0luTGlzdChjaGFydCkge1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2NvcGUuY2hhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZihjaGFydC5zaG9ydGhhbmQgPT09IHNjb3BlLmNoYXJ0c1tpXS5zaG9ydGhhbmQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5maWx0ZXIoJ2NvbXBhY3RKU09OJywgZnVuY3Rpb24oSlNPTjMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICAgIHJldHVybiBKU09OMy5zdHJpbmdpZnkoaW5wdXQsIG51bGwsICcgICcsIDgwKTtcbiAgICB9O1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZmlsdGVyXG4gKiBAbmFtZSB2ZWdhLWxpdGUtdWkuZmlsdGVyOmVuY29kZVVyaVxuICogQGZ1bmN0aW9uXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgZW5jb2RlVXJpXG4gKiBGaWx0ZXIgaW4gdGhlIHZlZ2EtbGl0ZS11aS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmlsdGVyKCdlbmNvZGVVUkknLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChpbnB1dCkge1xuICAgICAgcmV0dXJuIHdpbmRvdy5lbmNvZGVVUkkoaW5wdXQpO1xuICAgIH07XG4gIH0pOyIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2MgZmlsdGVyXG4gKiBAbmFtZSBmYWNldGVkdml6LmZpbHRlcjpyZXBvcnRVcmxcbiAqIEBmdW5jdGlvblxuICogQGRlc2NyaXB0aW9uXG4gKiAjIHJlcG9ydFVybFxuICogRmlsdGVyIGluIHRoZSBmYWNldGVkdml6LlxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5maWx0ZXIoJ3JlcG9ydFVybCcsIGZ1bmN0aW9uIChjb21wYWN0SlNPTkZpbHRlciwgXywgY29uc3RzKSB7XG4gICAgZnVuY3Rpb24gdm95YWdlclJlcG9ydChwYXJhbXMpIHtcbiAgICAgIHZhciB1cmwgPSAnaHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vZm9ybXMvZC8xVDlaQTE0RjNtbXpySFI3SkpWVUt5UFh6ck1xRjU0Q2pMSU9qdjJFN1pFTS92aWV3Zm9ybT8nO1xuXG4gICAgICBpZiAocGFyYW1zLmZpZWxkcykge1xuICAgICAgICB2YXIgcXVlcnkgPSBlbmNvZGVVUkkoY29tcGFjdEpTT05GaWx0ZXIoXy52YWx1ZXMocGFyYW1zLmZpZWxkcykpKTtcbiAgICAgICAgdXJsICs9ICdlbnRyeS4xMjQ1MTk5NDc3PScgKyBxdWVyeSArICcmJztcbiAgICAgIH1cblxuICAgICAgaWYgKHBhcmFtcy5zcGVjKSB7XG4gICAgICAgIHZhciBzcGVjID0gXy5vbWl0KHBhcmFtcy5zcGVjLCAnY29uZmlnJyk7XG4gICAgICAgIHNwZWMgPSBlbmNvZGVVUkkoY29tcGFjdEpTT05GaWx0ZXIoc3BlYykpO1xuICAgICAgICB1cmwgKz0gJ2VudHJ5LjEzMjM2ODAxMzY9JyArIHNwZWMgKyAnJic7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXJhbXMuc3BlYzIpIHtcbiAgICAgICAgdmFyIHNwZWMyID0gXy5vbWl0KHBhcmFtcy5zcGVjMiwgJ2NvbmZpZycpO1xuICAgICAgICBzcGVjMiA9IGVuY29kZVVSSShjb21wYWN0SlNPTkZpbHRlcihzcGVjMikpO1xuICAgICAgICB1cmwgKz0gJ2VudHJ5Ljg1MzEzNzc4Nj0nICsgc3BlYzIgKyAnJic7XG4gICAgICB9XG5cbiAgICAgIHZhciB0eXBlUHJvcCA9ICdlbnRyeS4xOTQwMjkyNjc3PSc7XG4gICAgICBzd2l0Y2ggKHBhcmFtcy50eXBlKSB7XG4gICAgICAgIGNhc2UgJ3ZsJzpcbiAgICAgICAgICB1cmwgKz0gdHlwZVByb3AgKyAnVmlzdWFsaXphdGlvbitSZW5kZXJpbmcrKFZlZ2FsaXRlKSYnO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICd2cic6XG4gICAgICAgICAgdXJsICs9IHR5cGVQcm9wICsgJ1JlY29tbWVuZGVyK0FsZ29yaXRobSsoVmlzcmVjKSYnO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdmdic6XG4gICAgICAgICAgdXJsICs9IHR5cGVQcm9wICsgJ1JlY29tbWVuZGVyK1VJKyhGYWNldGVkVml6KSYnO1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICB9XG4gICAgICByZXR1cm4gdXJsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHZsdWlSZXBvcnQocGFyYW1zKSB7XG4gICAgICB2YXIgdXJsID0gJ2h0dHBzOi8vZG9jcy5nb29nbGUuY29tL2Zvcm1zL2QvMXhLcy1xR2FMWkVVZmJUbWhkbVNvUzEzT0tPRXB1dV9OTldFNVRBQW1sX1kvdmlld2Zvcm0/JztcbiAgICAgIGlmIChwYXJhbXMuc3BlYykge1xuICAgICAgICB2YXIgc3BlYyA9IF8ub21pdChwYXJhbXMuc3BlYywgJ2NvbmZpZycpO1xuICAgICAgICBzcGVjID0gZW5jb2RlVVJJKGNvbXBhY3RKU09ORmlsdGVyKHNwZWMpKTtcbiAgICAgICAgdXJsICs9ICdlbnRyeS4xMjQ1MTk5NDc3PScgKyBzcGVjICsgJyYnO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHVybDtcbiAgICB9XG5cbiAgICByZXR1cm4gY29uc3RzLmFwcElkID09PSAndm95YWdlcicgPyB2b3lhZ2VyUmVwb3J0IDogdmx1aVJlcG9ydDtcbiAgfSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuZ2RvYyBmaWx0ZXJcbiAqIEBuYW1lIHZlZ2EtbGl0ZS11aS5maWx0ZXI6dW5kZXJzY29yZTJzcGFjZVxuICogQGZ1bmN0aW9uXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgdW5kZXJzY29yZTJzcGFjZVxuICogRmlsdGVyIGluIHRoZSB2ZWdhLWxpdGUtdWkuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLmZpbHRlcigndW5kZXJzY29yZTJzcGFjZScsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgICByZXR1cm4gaW5wdXQgPyBpbnB1dC5yZXBsYWNlKC9fKy9nLCAnICcpIDogJyc7XG4gICAgfTtcbiAgfSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5zZXJ2aWNlKCdBbGVydHMnLCBmdW5jdGlvbigkdGltZW91dCwgXykge1xuICAgIHZhciBBbGVydHMgPSB7fTtcblxuICAgIEFsZXJ0cy5hbGVydHMgPSBbXTtcblxuICAgIEFsZXJ0cy5hZGQgPSBmdW5jdGlvbihtc2csIGRpc21pc3MpIHtcbiAgICAgIHZhciBtZXNzYWdlID0ge21zZzogbXNnfTtcbiAgICAgIEFsZXJ0cy5hbGVydHMucHVzaChtZXNzYWdlKTtcbiAgICAgIGlmIChkaXNtaXNzKSB7XG4gICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBpbmRleCA9IF8uZmluZEluZGV4KEFsZXJ0cy5hbGVydHMsIG1lc3NhZ2UpO1xuICAgICAgICAgIEFsZXJ0cy5jbG9zZUFsZXJ0KGluZGV4KTtcbiAgICAgICAgfSwgZGlzbWlzcyk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIEFsZXJ0cy5jbG9zZUFsZXJ0ID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgIEFsZXJ0cy5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIEFsZXJ0cztcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5nZG9jIHNlcnZpY2VcbiAqIEBuYW1lIHZsdWkuQm9va21hcmtzXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgQm9va21hcmtzXG4gKiBTZXJ2aWNlIGluIHRoZSB2bHVpLlxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5zZXJ2aWNlKCdCb29rbWFya3MnLCBmdW5jdGlvbihfLCB2bCwgbG9jYWxTdG9yYWdlU2VydmljZSwgTG9nZ2VyLCBEYXRhc2V0KSB7XG4gICAgdmFyIEJvb2ttYXJrcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5saXN0ID0gW107XG4gICAgICB0aGlzLmRpY3QgPSB7fTtcbiAgICAgIHRoaXMuaXNTdXBwb3J0ZWQgPSBsb2NhbFN0b3JhZ2VTZXJ2aWNlLmlzU3VwcG9ydGVkO1xuICAgIH07XG5cbiAgICB2YXIgcHJvdG8gPSBCb29rbWFya3MucHJvdG90eXBlO1xuXG4gICAgcHJvdG8uc2F2ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgbG9jYWxTdG9yYWdlU2VydmljZS5zZXQoJ2Jvb2ttYXJrTGlzdCcsIHRoaXMubGlzdCk7XG4gICAgfTtcblxuICAgIHByb3RvLnNhdmVBbm5vdGF0aW9ucyA9IF8udGhyb3R0bGUoZnVuY3Rpb24oc2hvcnRoYW5kKSB7XG4gICAgICBfLmZpbmQodGhpcy5saXN0LCBmdW5jdGlvbihib29rbWFyaykgeyByZXR1cm4gYm9va21hcmsuc2hvcnRoYW5kID09PSBzaG9ydGhhbmQ7IH0pXG4gICAgICAgIC5jaGFydC5hbm5vdGF0aW9uID0gdGhpcy5kaWN0W3Nob3J0aGFuZF0uYW5ub3RhdGlvbjtcbiAgICAgIHRoaXMuc2F2ZSgpO1xuICAgIH0sIDEwMDAsIHtcInRyYWlsaW5nXCI6IHRydWV9KTtcblxuICAgIC8vIGV4cG9ydCBhbGwgYm9va21hcmtzIGFuZCBhbm5vdGF0aW9uc1xuICAgIHByb3RvLmV4cG9ydCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGRpY3Rpb25hcnkgPSB0aGlzLmRpY3Q7XG5cbiAgICAgIC8vIHByZXBhcmUgZXhwb3J0IGRhdGFcbiAgICAgIHZhciBleHBvcnRTcGVjcyA9IFtdO1xuICAgICAgXy5mb3JFYWNoKHRoaXMubGlzdCwgZnVuY3Rpb24oYm9va21hcmspIHtcbiAgICAgICAgdmFyIHNwZWMgPSBib29rbWFyay5jaGFydC52bFNwZWM7XG4gICAgICAgIHNwZWMuZGVzY3JpcHRpb24gPSBkaWN0aW9uYXJ5W2Jvb2ttYXJrLnNob3J0aGFuZF0uYW5ub3RhdGlvbjtcbiAgICAgICAgZXhwb3J0U3BlY3MucHVzaChzcGVjKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyB3cml0ZSBleHBvcnQgZGF0YSBpbiBhIG5ldyB0YWJcbiAgICAgIHZhciBleHBvcnRXaW5kb3cgPSB3aW5kb3cub3BlbigpO1xuICAgICAgZXhwb3J0V2luZG93LmRvY3VtZW50Lm9wZW4oKTtcbiAgICAgIGV4cG9ydFdpbmRvdy5kb2N1bWVudC53cml0ZSgnPGh0bWw+PGJvZHk+PHByZT4nICsgSlNPTi5zdHJpbmdpZnkoZXhwb3J0U3BlY3MsIG51bGwsIDIpICsgJzwvcHJlPjwvYm9keT48L2h0bWw+Jyk7XG4gICAgICBleHBvcnRXaW5kb3cuZG9jdW1lbnQuY2xvc2UoKTtcbiAgICB9O1xuXG4gICAgcHJvdG8ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5saXN0ID0gbG9jYWxTdG9yYWdlU2VydmljZS5nZXQoJ2Jvb2ttYXJrTGlzdCcpIHx8IFtdO1xuXG4gICAgICAvLyBwb3B1bGF0ZSB0aGlzLmRpY3RcbiAgICAgIHZhciBkaWN0aW9uYXJ5ID0gdGhpcy5kaWN0O1xuICAgICAgXy5mb3JFYWNoKHRoaXMubGlzdCwgZnVuY3Rpb24oYm9va21hcmspIHtcbiAgICAgICAgZGljdGlvbmFyeVtib29rbWFyay5zaG9ydGhhbmRdID0gXy5jbG9uZURlZXAoYm9va21hcmsuY2hhcnQpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHByb3RvLmNsZWFyID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmxpc3Quc3BsaWNlKDAsIHRoaXMubGlzdC5sZW5ndGgpO1xuICAgICAgdGhpcy5kaWN0ID0ge307XG4gICAgICB0aGlzLnNhdmUoKTtcblxuICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkJPT0tNQVJLX0NMRUFSKTtcbiAgICB9O1xuXG4gICAgcHJvdG8uYWRkID0gZnVuY3Rpb24oY2hhcnQsIGxpc3RUaXRsZSkge1xuICAgICAgdmFyIHNob3J0aGFuZCA9IGNoYXJ0LnNob3J0aGFuZDtcbiAgICAgIGNoYXJ0LnRpbWVBZGRlZCA9IChuZXcgRGF0ZSgpLmdldFRpbWUoKSk7XG5cbiAgICAgIC8vIEZJWE1FOiB0aGlzIGlzIG5vdCBhbHdheXMgYSBnb29kIGlkZWFcbiAgICAgIGNoYXJ0LnNjaGVtYSA9IERhdGFzZXQuc2NoZW1hO1xuXG4gICAgICB0aGlzLmRpY3RbY2hhcnQuc2hvcnRoYW5kXSA9IF8uY2xvbmVEZWVwKGNoYXJ0KTtcblxuICAgICAgdGhpcy5saXN0LnB1c2goe1xuICAgICAgICBzaG9ydGhhbmQ6IHNob3J0aGFuZCxcbiAgICAgICAgbGlzdDogbGlzdFRpdGxlLFxuICAgICAgICBjaGFydDogXy5jbG9uZURlZXAoY2hhcnQpXG4gICAgICB9KTtcblxuICAgICAgdGhpcy5zYXZlKCk7XG5cbiAgICAgIExvZ2dlci5sb2dJbnRlcmFjdGlvbihMb2dnZXIuYWN0aW9ucy5CT09LTUFSS19BREQsIHNob3J0aGFuZCwge1xuICAgICAgICBsaXN0OiBsaXN0VGl0bGVcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBwcm90by5yZW1vdmUgPSBmdW5jdGlvbihjaGFydCkge1xuICAgICAgdmFyIHNob3J0aGFuZCA9IGNoYXJ0LnNob3J0aGFuZDtcblxuICAgICAgLy8gcmVtb3ZlIGJvb2ttYXJrIGZyb20gdGhpcy5saXN0XG4gICAgICB2YXIgaW5kZXggPSB0aGlzLmxpc3QuZmluZEluZGV4KGZ1bmN0aW9uKGJvb2ttYXJrKSB7IHJldHVybiBib29rbWFyay5zaG9ydGhhbmQgPT09IHNob3J0aGFuZDsgfSk7XG4gICAgICB2YXIgcmVtb3ZlZDtcbiAgICAgIGlmIChpbmRleCA+PSAwKSB7XG4gICAgICAgIHJlbW92ZWQgPSB0aGlzLmxpc3Quc3BsaWNlKGluZGV4LCAxKVswXTtcbiAgICAgIH1cblxuICAgICAgLy8gcmVtb3ZlIGJvb2ttYXJrIGZyb20gdGhpcy5kaWN0XG4gICAgICBkZWxldGUgdGhpcy5kaWN0W2NoYXJ0LnNob3J0aGFuZF07XG5cbiAgICAgIHRoaXMuc2F2ZSgpO1xuXG4gICAgICBMb2dnZXIubG9nSW50ZXJhY3Rpb24oTG9nZ2VyLmFjdGlvbnMuQk9PS01BUktfUkVNT1ZFLCBzaG9ydGhhbmQsIHtcbiAgICAgICAgbGlzdDogKHJlbW92ZWQgfHwge30pLmxpc3RcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBwcm90by5yZW9yZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnNhdmUoKTtcbiAgICB9O1xuXG4gICAgcHJvdG8uaXNCb29rbWFya2VkID0gZnVuY3Rpb24oc2hvcnRoYW5kKSB7XG4gICAgICByZXR1cm4gdGhpcy5kaWN0Lmhhc093blByb3BlcnR5KHNob3J0aGFuZCk7XG4gICAgfTtcblxuICAgIHByb3RvLmxvZ0Jvb2ttYXJrc0Nsb3NlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgTG9nZ2VyLmxvZ0ludGVyYWN0aW9uKExvZ2dlci5hY3Rpb25zLkJPT0tNQVJLX0NMT1NFKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIG5ldyBCb29rbWFya3MoKTtcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCd2bHVpJylcbiAgLnNlcnZpY2UoJ0NoYXJ0JywgZnVuY3Rpb24gKGNxbCwgXykge1xuICAgIHZhciBDaGFydCA9IHtcbiAgICAgIGdldENoYXJ0OiBnZXRDaGFydCxcbiAgICAgIHRyYW5zcG9zZTogdHJhbnNwb3NlXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHtTcGVjUXVlcnlNb2RlbEdyb3VwIHwgU3BlY1F1ZXJ5TW9kZWx9IGl0ZW1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRDaGFydChpdGVtKSB7XG4gICAgICBpZiAoIWl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAvKiogQHR5cGUge09iamVjdH0gY29uY2lzZSBzcGVjIGdlbmVyYXRlZCAqL1xuICAgICAgICAgIHZsU3BlYzogbnVsbCxcbiAgICAgICAgICBmaWVsZFNldDogbnVsbCxcblxuICAgICAgICAgIC8qKiBAdHlwZSB7U3RyaW5nfSBnZW5lcmF0ZWQgdmwgc2hvcnRoYW5kICovXG4gICAgICAgICAgc2hvcnRoYW5kOiBudWxsLFxuICAgICAgICAgIGVudW1TcGVjSW5kZXg6IG51bGxcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgdmFyIHNwZWNNID0gaXRlbSBpbnN0YW5jZW9mIGNxbC5tb2RlbC5TcGVjUXVlcnlNb2RlbEdyb3VwID9cbiAgICAgICAgaXRlbS5nZXRUb3BTcGVjUXVlcnlNb2RlbCgpOlxuICAgICAgICBpdGVtO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZW51bVNwZWNJbmRleDogc3BlY00uZW51bVNwZWNJbmRleCxcbiAgICAgICAgZmllbGRTZXQ6IHNwZWNNLnNwZWNRdWVyeS5lbmNvZGluZ3MsXG4gICAgICAgIHZsU3BlYzogc3BlY00udG9TcGVjKCksXG4gICAgICAgIHNob3J0aGFuZDogc3BlY00udG9TaG9ydGhhbmQoKVxuICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0cmFuc3Bvc2Uoc3BlYykge1xuICAgICAgdmFyIGVuY29kaW5nID0gXy5jbG9uZShzcGVjLmVuY29kaW5nKTtcbiAgICAgIHZhciBvbGRYRW5jID0gZW5jb2RpbmcueDtcbiAgICAgIHZhciBvbGRZRW5jID0gZW5jb2RpbmcueTtcbiAgICAgIGVuY29kaW5nLnkgPSBvbGRYRW5jO1xuICAgICAgZW5jb2RpbmcueCA9IG9sZFlFbmM7XG5cbiAgICAgIHZhciBvbGRSb3dFbmMgPSBlbmNvZGluZy5yb3c7XG4gICAgICB2YXIgb2xkQ29sRW5jID0gZW5jb2RpbmcuY29sdW1uO1xuICAgICAgZW5jb2Rpbmcucm93ID0gb2xkQ29sRW5jO1xuICAgICAgZW5jb2RpbmcuY29sdW1uID0gb2xkUm93RW5jO1xuXG4gICAgICBzcGVjLmVuY29kaW5nID0gZW5jb2Rpbmc7XG4gICAgfVxuXG4gICAgcmV0dXJuIENoYXJ0O1xuICB9KTsiLCIndXNlIHN0cmljdCc7XG5cbi8vIFNlcnZpY2UgZm9yIHRoZSBzcGVjIGNvbmZpZy5cbi8vIFdlIGtlZXAgdGhpcyBzZXBhcmF0ZSBzbyB0aGF0IGNoYW5nZXMgYXJlIGtlcHQgZXZlbiBpZiB0aGUgc3BlYyBjaGFuZ2VzLlxuYW5ndWxhci5tb2R1bGUoJ3ZsdWknKVxuICAuZmFjdG9yeSgnQ29uZmlnJywgZnVuY3Rpb24oKSB7XG4gICAgdmFyIENvbmZpZyA9IHt9O1xuXG4gICAgQ29uZmlnLmRhdGEgPSB7fTtcbiAgICBDb25maWcuY29uZmlnID0ge307XG5cbiAgICBDb25maWcuZ2V0Q29uZmlnID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4ge307XG4gICAgfTtcblxuICAgIENvbmZpZy5nZXREYXRhID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gQ29uZmlnLmRhdGE7XG4gICAgfTtcblxuICAgIENvbmZpZy5sYXJnZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY2VsbDoge1xuICAgICAgICAgIHdpZHRoOiA0MDAsXG4gICAgICAgICAgaGVpZ2h0OiA0MDBcbiAgICAgICAgfSxcbiAgICAgICAgZmFjZXQ6IHtcbiAgICAgICAgICBjZWxsOiB7XG4gICAgICAgICAgICB3aWR0aDogMjAwLFxuICAgICAgICAgICAgaGVpZ2h0OiAyMDBcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfTtcblxuICAgIENvbmZpZy5zbWFsbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZmFjZXQ6IHtcbiAgICAgICAgICBjZWxsOiB7XG4gICAgICAgICAgICB3aWR0aDogMTUwLFxuICAgICAgICAgICAgaGVpZ2h0OiAxNTBcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfTtcblxuICAgIENvbmZpZy51cGRhdGVEYXRhc2V0ID0gZnVuY3Rpb24oZGF0YXNldCwgdHlwZSkge1xuICAgICAgaWYgKGRhdGFzZXQudmFsdWVzKSB7XG4gICAgICAgIENvbmZpZy5kYXRhLnZhbHVlcyA9IGRhdGFzZXQudmFsdWVzO1xuICAgICAgICBkZWxldGUgQ29uZmlnLmRhdGEudXJsO1xuICAgICAgICBDb25maWcuZGF0YS5mb3JtYXRUeXBlID0gdW5kZWZpbmVkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgQ29uZmlnLmRhdGEudXJsID0gZGF0YXNldC51cmw7XG4gICAgICAgIGRlbGV0ZSBDb25maWcuZGF0YS52YWx1ZXM7XG4gICAgICAgIENvbmZpZy5kYXRhLmZvcm1hdFR5cGUgPSB0eXBlO1xuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gQ29uZmlnO1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmdkb2Mgc2VydmljZVxuICogQG5hbWUgdmVnYS1saXRlLXVpLmxvZ2dlclxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGxvZ2dlclxuICogU2VydmljZSBpbiB0aGUgdmVnYS1saXRlLXVpLlxuICovXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5zZXJ2aWNlKCdMb2dnZXInLCBmdW5jdGlvbiAoJGxvY2F0aW9uLCAkd2luZG93LCAkd2ViU3FsLCBfLCBjb25zdHMsIEFuYWx5dGljcywgUGFwYSwgQmxvYiwgVVJMKSB7XG5cbiAgICB2YXIgc2VydmljZSA9IHt9O1xuXG4gICAgc2VydmljZS5sZXZlbHMgPSB7XG4gICAgICBPRkY6IHtpZDonT0ZGJywgcmFuazowfSxcbiAgICAgIFRSQUNFOiB7aWQ6J1RSQUNFJywgcmFuazoxfSxcbiAgICAgIERFQlVHOiB7aWQ6J0RFQlVHJywgcmFuazoyfSxcbiAgICAgIElORk86IHtpZDonSU5GTycsIHJhbms6M30sXG4gICAgICBXQVJOOiB7aWQ6J1dBUk4nLCByYW5rOjR9LFxuICAgICAgRVJST1I6IHtpZDonRVJST1InLCByYW5rOjV9LFxuICAgICAgRkFUQUw6IHtpZDonRkFUQUwnLCByYW5rOjZ9XG4gICAgfTtcblxuICAgIHNlcnZpY2UuYWN0aW9ucyA9IHtcbiAgICAgIC8vIERBVEFcbiAgICAgIElOSVRJQUxJWkU6IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ0lOSVRJQUxJWkUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgVU5ETzoge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnVU5ETycsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIFJFRE86IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ1JFRE8nLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBEQVRBU0VUX0NIQU5HRToge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnREFUQVNFVF9DSEFOR0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBEQVRBU0VUX09QRU46IHtjYXRlZ29yeTogJ0RBVEEnLCBpZDogJ0RBVEFTRVRfT1BFTicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERBVEFTRVRfTkVXX1BBU1RFOiB7Y2F0ZWdvcnk6ICdEQVRBJywgaWQ6ICdEQVRBU0VUX05FV19QQVNURScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERBVEFTRVRfTkVXX1VSTDoge2NhdGVnb3J5OiAnREFUQScsIGlkOiAnREFUQVNFVF9ORVdfVVJMJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgLy8gQk9PS01BUktcbiAgICAgIEJPT0tNQVJLX0FERDoge2NhdGVnb3J5OiAnQk9PS01BUksnLCBpZDonQk9PS01BUktfQUREJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgQk9PS01BUktfUkVNT1ZFOiB7Y2F0ZWdvcnk6ICdCT09LTUFSSycsIGlkOidCT09LTUFSS19SRU1PVkUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBCT09LTUFSS19PUEVOOiB7Y2F0ZWdvcnk6ICdCT09LTUFSSycsIGlkOidCT09LTUFSS19PUEVOJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgQk9PS01BUktfQ0xPU0U6IHtjYXRlZ29yeTogJ0JPT0tNQVJLJywgaWQ6J0JPT0tNQVJLX0NMT1NFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgQk9PS01BUktfQ0xFQVI6IHtjYXRlZ29yeTogJ0JPT0tNQVJLJywgaWQ6ICdCT09LTUFSS19DTEVBUicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIC8vIENIQVJUXG4gICAgICBDSEFSVF9NT1VTRU9WRVI6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0NIQVJUX01PVVNFT1ZFUicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBDSEFSVF9NT1VTRU9VVDoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfTU9VU0VPVVQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgQ0hBUlRfUkVOREVSOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDSEFSVF9SRU5ERVInLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgQ0hBUlRfRVhQT1NFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOidDSEFSVF9FWFBPU0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuICAgICAgQ0hBUlRfVE9PTFRJUDoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfVE9PTFRJUCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5ERUJVR30sXG4gICAgICBDSEFSVF9UT09MVElQX0VORDoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0hBUlRfVE9PTFRJUF9FTkQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuREVCVUd9LFxuXG4gICAgICBTT1JUX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonU09SVF9UT0dHTEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBNQVJLX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonTUFSS19UT0dHTEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBEUklMTF9ET1dOX09QRU46IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0RSSUxMX0RPV05fT1BFTicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIERSSUxMX0RPV05fQ0xPU0U6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6ICdEUklMTF9ET1dOX0NMT1NFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgTE9HX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDogJ0xPR19UT0dHTEUnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBUUkFOU1BPU0VfVE9HR0xFOiB7Y2F0ZWdvcnk6ICdDSEFSVCcsIGlkOiAnVFJBTlNQT1NFX1RPR0dMRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIE5VTExfRklMVEVSX1RPR0dMRToge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonTlVMTF9GSUxURVJfVE9HR0xFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuXG4gICAgICBDTFVTVEVSX1NFTEVDVDoge2NhdGVnb3J5OiAnQ0hBUlQnLCBpZDonQ0xVU1RFUl9TRUxFQ1QnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBMT0FEX01PUkU6IHtjYXRlZ29yeTogJ0NIQVJUJywgaWQ6J0xPQURfTU9SRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcblxuICAgICAgLy8gRklFTERTXG4gICAgICBGSUVMRFNfQ0hBTkdFOiB7Y2F0ZWdvcnk6ICdGSUVMRFMnLCBpZDogJ0ZJRUxEU19DSEFOR0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBGSUVMRFNfUkVTRVQ6IHtjYXRlZ29yeTogJ0ZJRUxEUycsIGlkOiAnRklFTERTX1JFU0VUJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgRlVOQ19DSEFOR0U6IHtjYXRlZ29yeTogJ0ZJRUxEUycsIGlkOiAnRlVOQ19DSEFOR0UnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG4gICAgICBBRERfRklFTEQ6IHtjYXRlZ29yeTogJ0ZJRUxEUycsIGlkOiAnQUREX0ZJRUxEJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuXG4gICAgICAvLyBGaWVsZCBJbmZvXG4gICAgICBGSUVMRERFRl9ISUdITElHSFRFRDoge2NhdGVnb3J5OiAnRklFTERJTkZPJywgaWQ6ICdGSUVMRERFRl9ISUdITElHSFRFRCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEZJRUxEREVGX1VOSElHSExJR0hURUQ6IHtjYXRlZ29yeTogJ0ZJRUxESU5GTycsIGlkOiAnRklFTERERUZfVU5ISUdITElHSFRFRCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcblxuICAgICAgLy9QT0xFU1RBUlxuICAgICAgU1BFQ19DTEVBTjoge2NhdGVnb3J5OidQT0xFU1RBUicsIGlkOiAnU1BFQ19DTEVBTicsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIFNQRUNfQ0hBTkdFOiB7Y2F0ZWdvcnk6J1BPTEVTVEFSJywgaWQ6ICdTUEVDX0NIQU5HRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIEZJRUxEX0RST1A6IHtjYXRlZ29yeTogJ1BPTEVTVEFSJywgaWQ6ICdGSUVMRF9EUk9QJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgTUFSS19DSEFOR0U6IHtjYXRlZ29yeTogJ1BPTEVTVEFSJywgaWQ6ICdNQVJLX0NIQU5HRScsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcblxuICAgICAgLy8gVm95YWdlciAyXG4gICAgICBTUEVDX1NFTEVDVDoge2NhdGVnb3J5OidWT1lBR0VSMicsIGlkOiAnU1BFQ19TRUxFQ1QnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT30sXG5cbiAgICAgIC8vIEFsdGVybmF0aXZlc1xuICAgICAgU0VUX0FMVEVSTkFUSVZFU19UWVBFOiB7Y2F0ZWdvcnk6J0FMVEVSTkFUSVZFUycsIGlkOiAnU0VUX0FMVEVSTkFUSVZFU19UWVBFJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgVE9HR0xFX1NIT1dfQUxURVJOQVRJVkVTOiB7Y2F0ZWdvcnk6J0FMVEVSTkFUSVZFUycsIGlkOiAnVE9HR0xFX1NIT1dfQUxURVJOQVRJVkVTJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuICAgICAgVE9HR0xFX0hJREVfQUxURVJOQVRJVkVTOiB7Y2F0ZWdvcnk6J0FMVEVSTkFUSVZFUycsIGlkOiAnVE9HR0xFX0hJREVfQUxURVJOQVRJVkVTJywgbGV2ZWw6IHNlcnZpY2UubGV2ZWxzLklORk99LFxuXG4gICAgICAvLyBQcmV2aWV3XG4gICAgICBTUEVDX1BSRVZJRVdfRU5BQkxFRDoge2NhdGVnb3J5OidQUkVWSUVXJywgaWQ6ICdTUEVDX1BSRVZJRVdfRU5BQkxFRCcsIGxldmVsOiBzZXJ2aWNlLmxldmVscy5JTkZPfSxcbiAgICAgIFNQRUNfUFJFVklFV19ESVNBQkxFRDoge2NhdGVnb3J5OidQUkVWSUVXJywgaWQ6ICdTUEVDX1BSRVZJRVdfRElTQUJMRUQnLCBsZXZlbDogc2VydmljZS5sZXZlbHMuSU5GT31cbiAgICB9O1xuXG4gICAgLy8gY3JlYXRlIG5vb3Agc2VydmljZSBpZiB3ZWJzcWwgaXMgbm90IHN1cHBvcnRlZFxuICAgIGlmICgkd2luZG93Lm9wZW5EYXRhYmFzZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ05vIHdlYnNxbCBzdXBwb3J0IGFuZCB0aHVzIG5vIGxvZ2dpbmcuJyk7XG4gICAgICBzZXJ2aWNlLmxvZ0ludGVyYWN0aW9uID0gZnVuY3Rpb24oKSB7fTtcbiAgICAgIHJldHVybiBzZXJ2aWNlO1xuICAgIH1cblxuICAgIC8vIGdldCB1c2VyIGlkIG9uY2UgaW4gdGhlIGJlZ2lubmluZ1xuICAgIHZhciB1c2VyaWQgPSBzZXJ2aWNlLnVzZXJpZCA9ICRsb2NhdGlvbi5zZWFyY2goKS51c2VyaWQ7XG5cbiAgICBzZXJ2aWNlLmRiID0gJHdlYlNxbC5vcGVuRGF0YWJhc2UoJ2xvZ3MnLCAnMS4wJywgJ0xvZ3MnLCAyICogMTAyNCAqIDEwMjQpO1xuXG4gICAgc2VydmljZS50YWJsZU5hbWUgPSAnTG9nc18nICsgY29uc3RzLmFwcElkO1xuXG4gICAgLy8gKHplbmluZykgVE9ETzogY2hlY2sgaWYgdGhlIHRhYmxlIGlzIGNvcnJlY3QsIGRvIHdlIHJlYWxseSBuZWVkIHRpbWU/IHdpbGwgdGltZSBiZSBhdXRvbWF0aWNhbGx5IGFkZGVkP1xuICAgIHNlcnZpY2UuY3JlYXRlVGFibGVJZk5vdEV4aXN0cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgc2VydmljZS5kYi5jcmVhdGVUYWJsZShzZXJ2aWNlLnRhYmxlTmFtZSwge1xuICAgICAgICAndXNlcmlkJzoge1xuICAgICAgICAgICd0eXBlJzogJ0lOVEVHRVInLFxuICAgICAgICAgICdudWxsJzogJ05PVCBOVUxMJ1xuICAgICAgICB9LFxuICAgICAgICAndGltZSc6IHtcbiAgICAgICAgICAndHlwZSc6ICdUSU1FU1RBTVAnLFxuICAgICAgICAgICdudWxsJzogJ05PVCBOVUxMJ1xuICAgICAgICB9LFxuICAgICAgICAnYWN0aW9uQ2F0ZWdvcnknOiB7XG4gICAgICAgICAgJ3R5cGUnOiAnVEVYVCcsXG4gICAgICAgICAgJ251bGwnOiAnTk9UIE5VTEwnXG4gICAgICAgIH0sXG4gICAgICAgICdhY3Rpb25JZCc6IHtcbiAgICAgICAgICAndHlwZSc6ICdURVhUJyxcbiAgICAgICAgICAnbnVsbCc6ICdOT1QgTlVMTCdcbiAgICAgICAgfSxcbiAgICAgICAgJ2xhYmVsJzoge1xuICAgICAgICAgICd0eXBlJzogJ1RFWFQnLFxuICAgICAgICAgICdudWxsJzogJ05PVCBOVUxMJ1xuICAgICAgICB9LFxuICAgICAgICAnZGF0YSc6IHtcbiAgICAgICAgICAndHlwZSc6ICdURVhUJ1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgc2VydmljZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHIgPSAkd2luZG93LmNvbmZpcm0oJ1JlYWxseSBjbGVhciB0aGUgbG9ncz8nKTtcbiAgICAgIGlmIChyID09PSB0cnVlKSB7XG4gICAgICAgIHNlcnZpY2UuZGIuZHJvcFRhYmxlKHNlcnZpY2UudGFibGVOYW1lKTtcbiAgICAgICAgc2VydmljZS5jcmVhdGVUYWJsZUlmTm90RXhpc3RzKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHNlcnZpY2UuZXhwb3J0ID0gZnVuY3Rpb24oKSB7XG4gICAgICBzZXJ2aWNlLmRiLnNlbGVjdEFsbChzZXJ2aWNlLnRhYmxlTmFtZSkudGhlbihmdW5jdGlvbihyZXN1bHRzKSB7XG4gICAgICAgIGlmIChyZXN1bHRzLnJvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKCdObyBsb2dzJyk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHJvd3MgPSBbXTtcblxuICAgICAgICBmb3IodmFyIGk9MDsgaSA8IHJlc3VsdHMucm93cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIHJvd3MucHVzaChyZXN1bHRzLnJvd3MuaXRlbShpKSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgY3N2ID0gUGFwYS51bnBhcnNlKHJvd3MpO1xuXG4gICAgICAgIHZhciBjc3ZEYXRhID0gbmV3IEJsb2IoW2Nzdl0sIHsgdHlwZTogJ3RleHQvY3N2JyB9KTtcbiAgICAgICAgdmFyIGNzdlVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoY3N2RGF0YSk7XG5cbiAgICAgICAgdmFyIGVsZW1lbnQgPSBhbmd1bGFyLmVsZW1lbnQoJzxhLz4nKTtcbiAgICAgICAgZWxlbWVudC5hdHRyKHtcbiAgICAgICAgICBocmVmOiBjc3ZVcmwsXG4gICAgICAgICAgdGFyZ2V0OiAnX2JsYW5rJyxcbiAgICAgICAgICBkb3dubG9hZDogc2VydmljZS50YWJsZU5hbWUgKyAnXycgKyB1c2VyaWQgKyAnXycgKyBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkgKyAnLmNzdidcbiAgICAgICAgfSlbMF0uY2xpY2soKTtcbiAgICAgIH0pO1xuICAgIH07XG5cblxuICAgIHNlcnZpY2UubG9nSW50ZXJhY3Rpb24gPSBmdW5jdGlvbihhY3Rpb24sIGxhYmVsLCBkYXRhKSB7XG4gICAgICBpZiAoIWNvbnN0cy5sb2dnaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHZhciB2YWx1ZSA9IGRhdGEgPyBkYXRhLnZhbHVlIDogdW5kZWZpbmVkO1xuICAgICAgaWYoYWN0aW9uLmxldmVsLnJhbmsgPj0gc2VydmljZS5sZXZlbHNbY29uc3RzLmxvZ0xldmVsIHx8ICdJTkZPJ10ucmFuaykge1xuICAgICAgICBBbmFseXRpY3MudHJhY2tFdmVudChhY3Rpb24uY2F0ZWdvcnksIGFjdGlvbi5pZCwgbGFiZWwsIHZhbHVlKTtcblxuICAgICAgICBpZiAoY29uc3RzLmxvZ1RvV2ViU3FsKSB7XG4gICAgICAgICAgdmFyIHJvdyA9IHtcbiAgICAgICAgICAgIHVzZXJpZDogdXNlcmlkLFxuICAgICAgICAgICAgdGltZTogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgYWN0aW9uQ2F0ZWdvcnk6IGFjdGlvbi5jYXRlZ29yeSxcbiAgICAgICAgICAgIGFjdGlvbklkOiBhY3Rpb24uaWQsXG4gICAgICAgICAgICBsYWJlbDogXy5pc09iamVjdChsYWJlbCkgPyBKU09OLnN0cmluZ2lmeShsYWJlbCkgOiBsYWJlbCxcbiAgICAgICAgICAgIGRhdGE6IGRhdGEgPyBKU09OLnN0cmluZ2lmeShkYXRhKSA6IHVuZGVmaW5lZFxuICAgICAgICAgIH07XG4gICAgICAgICAgc2VydmljZS5kYi5pbnNlcnQoc2VydmljZS50YWJsZU5hbWUsIHJvdyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYWN0aW9uLmxldmVsLnJhbmsgPj0gc2VydmljZS5sZXZlbHNbY29uc3RzLmxvZ1ByaW50TGV2ZWwgfHwgJ0lORk8nXS5yYW5rKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ1tMb2dnaW5nXSAnLCBhY3Rpb24uaWQsIGxhYmVsLCBkYXRhKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBzZXJ2aWNlLmNyZWF0ZVRhYmxlSWZOb3RFeGlzdHMoKTtcbiAgICBjb25zb2xlLmxvZygnYXBwOicsIGNvbnN0cy5hcHBJZCwgJ3N0YXJ0ZWQnKTtcbiAgICBzZXJ2aWNlLmxvZ0ludGVyYWN0aW9uKHNlcnZpY2UuYWN0aW9ucy5JTklUSUFMSVpFLCBjb25zdHMuYXBwSWQpO1xuXG4gICAgcmV0dXJuIHNlcnZpY2U7XG4gIH0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5zZXJ2aWNlKCdQaWxscycsIGZ1bmN0aW9uIChBTlksIGNvbnN0cywgdXRpbCkge1xuICAgIHZhciBQaWxscyA9IHtcbiAgICAgIC8vIEZ1bmN0aW9uc1xuICAgICAgaXNBbnlDaGFubmVsOiBpc0FueUNoYW5uZWwsXG4gICAgICBnZXROZXh0QW55Q2hhbm5lbElkOiBnZXROZXh0QW55Q2hhbm5lbElkLFxuICAgICAgZ2V0RW1wdHlBbnlDaGFubmVsSWQ6IGdldEVtcHR5QW55Q2hhbm5lbElkLFxuICAgICAgaXNFbnVtZXJhdGVkQ2hhbm5lbDogaXNFbnVtZXJhdGVkQ2hhbm5lbCxcbiAgICAgIGlzRW51bWVyYXRlZEZpZWxkOiBpc0VudW1lcmF0ZWRGaWVsZCxcblxuICAgICAgZ2V0OiBnZXQsXG4gICAgICAvLyBFdmVudFxuICAgICAgZHJhZ1N0YXJ0OiBkcmFnU3RhcnQsXG4gICAgICBkcmFnU3RvcDogZHJhZ1N0b3AsXG4gICAgICAvLyBFdmVudCwgd2l0aCBoYW5kbGVyIGluIHRoZSBsaXN0ZW5lclxuXG4gICAgICAvKiogU2V0IGEgZmllbGREZWYgZm9yIGEgY2hhbm5lbCAqL1xuICAgICAgc2V0OiBzZXQsXG5cbiAgICAgIC8qKiBSZW1vdmUgYSBmaWVsZERlZiBmcm9tIGEgY2hhbm5lbCAqL1xuICAgICAgcmVtb3ZlOiByZW1vdmUsXG5cbiAgICAgIC8qKiBBZGQgbmV3IGZpZWxkIHRvIHRoZSBwaWxscyAqL1xuICAgICAgYWRkOiBhZGQsXG5cbiAgICAgIC8qKiBQYXNzIG1lc3NhZ2UgdG8gdG9nZ2xlciBsaXN0ZW5lcnMgKi9cbiAgICAgIHJlc2NhbGU6IHJlc2NhbGUsXG4gICAgICBzb3J0OiBzb3J0LFxuICAgICAgdG9nZ2xlRmlsdGVySW52YWxpZDogdG9nZ2xlRmlsdGVySW52YWxpZCxcbiAgICAgIHRyYW5zcG9zZTogdHJhbnNwb3NlLFxuXG4gICAgICAvKiogUGFyc2UgYSBuZXcgc3BlYyAqL1xuICAgICAgcGFyc2U6IHBhcnNlLFxuXG4gICAgICAvKiogUHJldmlldyBhIHNwZWMgKi9cbiAgICAgIHByZXZpZXc6IHByZXZpZXcsXG5cbiAgICAgIC8qKiBJZiB0aGUgc3BlYy9xdWVyeSBnZXRzIHVwZGF0ZWQgKi9cbiAgICAgIHVwZGF0ZTogdXBkYXRlLFxuXG4gICAgICByZXNldDogcmVzZXQsXG4gICAgICBkcmFnRHJvcDogZHJhZ0Ryb3AsXG5cbiAgICAgIC8vIERhdGFcbiAgICAgIC8vIFRPRE86IHNwbGl0IGJldHdlZW4gZW5jb2RpbmcgcmVsYXRlZCBhbmQgbm9uLWVuY29kaW5nIHJlbGF0ZWRcbiAgICAgIHBpbGxzOiB7fSxcbiAgICAgIGhpZ2hsaWdodGVkOiB7fSxcbiAgICAgIC8qKiBwaWxsIGJlaW5nIGRyYWdnZWQgKi9cbiAgICAgIGRyYWdnaW5nOiBudWxsLFxuICAgICAgLyoqIGNoYW5uZWxJZCB0aGF0J3MgdGhlIHBpbGwgaXMgYmVpbmcgZHJhZ2dlZCBmcm9tICovXG4gICAgICBjaWREcmFnRnJvbTogbnVsbCxcbiAgICAgIC8qKiBMaXN0ZW5lciAgKi9cbiAgICAgIGxpc3RlbmVyOiBudWxsXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgd2hldGhlciB0aGUgZ2l2ZW4gY2hhbm5lbCBpZCBpcyBhbiBcImFueVwiIGNoYW5uZWxcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7YW55fSBjaGFubmVsSWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc0FueUNoYW5uZWwoY2hhbm5lbElkKSB7XG4gICAgICByZXR1cm4gY2hhbm5lbElkICYmIGNoYW5uZWxJZC5pbmRleE9mKEFOWSkgPT09IDA7IC8vIHByZWZpeCBieSBBTllcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRFbXB0eUFueUNoYW5uZWxJZCgpIHtcbiAgICAgIHZhciBhbnlDaGFubmVscyA9IHV0aWwua2V5cyhQaWxscy5waWxscykuZmlsdGVyKGZ1bmN0aW9uKGNoYW5uZWxJZCkge1xuICAgICAgICByZXR1cm4gY2hhbm5lbElkLmluZGV4T2YoQU5ZKSA9PT0gMDtcbiAgICAgIH0pO1xuICAgICAgZm9yICh2YXIgaT0wIDsgaSA8IGFueUNoYW5uZWxzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjaGFubmVsSWQgPSBhbnlDaGFubmVsc1tpXTtcbiAgICAgICAgaWYgKCFQaWxscy5waWxsc1tjaGFubmVsSWRdLmZpZWxkKSB7XG4gICAgICAgICAgcmV0dXJuIGNoYW5uZWxJZDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBlbXB0eSBhbnkgY2hhbm5lbCBhdmFpbGFibGUhJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TmV4dEFueUNoYW5uZWxJZCgpIHtcbiAgICAgIHZhciBpID0gMDtcbiAgICAgIHdoaWxlIChQaWxscy5waWxsc1tBTlkgKyBpXSkge1xuICAgICAgICBpKys7XG4gICAgICB9XG5cbiAgICAgIGlmICghY29uc3RzLm1heEFueVNoZWxmIHx8IGkgPj0gY29uc3RzLm1heEFueVNoZWxmKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gQU5ZICsgaTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXQgYSBmaWVsZERlZiBvZiBhIHBpbGwgb2YgYSBnaXZlbiBjaGFubmVsSWRcbiAgICAgKiBAcGFyYW0gY2hhbm5lbElkIGNoYW5uZWwgaWQgb2YgdGhlIHBpbGwgdG8gYmUgdXBkYXRlZFxuICAgICAqIEBwYXJhbSBmaWVsZERlZiBmaWVsZERlZiB0byB0byBiZSB1cGRhdGVkXG4gICAgICogQHBhcmFtIHVwZGF0ZSB3aGV0aGVyIHRvIHByb3BhZ2F0ZSBjaGFuZ2UgdG8gdGhlIGNoYW5uZWwgdXBkYXRlIGxpc3RlbmVyXG4gICAgICovXG4gICAgZnVuY3Rpb24gc2V0KGNoYW5uZWxJZCwgZmllbGREZWYsIHVwZGF0ZSkge1xuICAgICAgUGlsbHMucGlsbHNbY2hhbm5lbElkXSA9IGZpZWxkRGVmO1xuXG4gICAgICBpZiAodXBkYXRlICYmIFBpbGxzLmxpc3RlbmVyKSB7XG4gICAgICAgIFBpbGxzLmxpc3RlbmVyLnNldChjaGFubmVsSWQsIGZpZWxkRGVmKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYSBmaWVsZERlZiBvZiBhIHBpbGwgb2YgYSBnaXZlbiBjaGFubmVsSWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXQoY2hhbm5lbElkKSB7XG4gICAgICByZXR1cm4gUGlsbHMucGlsbHNbY2hhbm5lbElkXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhZGQoZmllbGREZWYpIHtcbiAgICAgIGlmIChQaWxscy5saXN0ZW5lciAmJiBQaWxscy5saXN0ZW5lci5hZGQpIHtcbiAgICAgICAgUGlsbHMubGlzdGVuZXIuYWRkKGZpZWxkRGVmKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0VudW1lcmF0ZWRDaGFubmVsKGNoYW5uZWxJZCkge1xuICAgICAgaWYgKFBpbGxzLmxpc3RlbmVyICYmIFBpbGxzLmxpc3RlbmVyLmlzRW51bWVyYXRlZENoYW5uZWwpIHtcbiAgICAgICAgcmV0dXJuIFBpbGxzLmxpc3RlbmVyLmlzRW51bWVyYXRlZENoYW5uZWwoY2hhbm5lbElkLCBQaWxscy5waWxsc1tjaGFubmVsSWRdKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0VudW1lcmF0ZWRGaWVsZChjaGFubmVsSWQpIHtcbiAgICAgIGlmIChQaWxscy5saXN0ZW5lciAmJiBQaWxscy5saXN0ZW5lci5pc0VudW1lcmF0ZWRGaWVsZCkge1xuICAgICAgICByZXR1cm4gUGlsbHMubGlzdGVuZXIuaXNFbnVtZXJhdGVkRmllbGQoY2hhbm5lbElkLCBQaWxscy5waWxsc1tjaGFubmVsSWRdKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZW1vdmUoY2hhbm5lbElkKSB7XG4gICAgICBkZWxldGUgUGlsbHMucGlsbHNbY2hhbm5lbElkXTtcbiAgICAgIGlmIChQaWxscy5saXN0ZW5lcikge1xuICAgICAgICBQaWxscy5saXN0ZW5lci5yZW1vdmUoY2hhbm5lbElkKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzb3J0KGNoYW5uZWxJZCwgc29ydCkge1xuICAgICAgaWYgKFBpbGxzLmxpc3RlbmVyICYmIFBpbGxzLmxpc3RlbmVyLnNvcnQpIHtcbiAgICAgICAgUGlsbHMubGlzdGVuZXIuc29ydChjaGFubmVsSWQsIHNvcnQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlc2NhbGUoY2hhbm5lbElkLCBzY2FsZVR5cGUpIHtcbiAgICAgIGlmIChQaWxscy5saXN0ZW5lciAmJiBQaWxscy5saXN0ZW5lci5yZXNjYWxlKSB7XG4gICAgICAgIFBpbGxzLmxpc3RlbmVyLnJlc2NhbGUoY2hhbm5lbElkLCBzY2FsZVR5cGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRvZ2dsZUZpbHRlckludmFsaWQoKSB7XG4gICAgICBpZiAoUGlsbHMubGlzdGVuZXIgJiYgUGlsbHMubGlzdGVuZXIudG9nZ2xlRmlsdGVySW52YWxpZCkge1xuICAgICAgICBQaWxscy5saXN0ZW5lci50b2dnbGVGaWx0ZXJJbnZhbGlkKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdHJhbnNwb3NlKCkge1xuICAgICAgaWYgKFBpbGxzLmxpc3RlbmVyICYmIFBpbGxzLmxpc3RlbmVyLnRyYW5zcG9zZSkge1xuICAgICAgICBQaWxscy5saXN0ZW5lci50cmFuc3Bvc2UoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZS1wYXJzZSB0aGUgc3BlYy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7YW55fSBzcGVjXG4gICAgICovXG4gICAgZnVuY3Rpb24gcGFyc2Uoc3BlYykge1xuICAgICAgaWYgKFBpbGxzLmxpc3RlbmVyKSB7XG4gICAgICAgIFBpbGxzLmxpc3RlbmVyLnBhcnNlKHNwZWMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFkZCBTcGVjIHRvIGJlIHByZXZpZXdlZCAoZm9yIFZveWFnZXIyKVxuICAgICAqXG4gICAgICogQHBhcmFtIHthbnl9IHNwZWNcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBwcmV2aWV3KGVuYWJsZSwgY2hhcnQsIGxpc3RUaXRsZSkge1xuICAgICAgaWYgKFBpbGxzLmxpc3RlbmVyKSB7XG4gICAgICAgIFBpbGxzLmxpc3RlbmVyLnByZXZpZXcoZW5hYmxlLCBjaGFydCwgbGlzdFRpdGxlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHdob2xlIHBpbGwgc2V0XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2FueX0gc3BlY1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIHVwZGF0ZShzcGVjKSB7XG4gICAgICBpZiAoUGlsbHMubGlzdGVuZXIpIHtcbiAgICAgICAgUGlsbHMubGlzdGVuZXIudXBkYXRlKHNwZWMpO1xuICAgICAgfVxuICAgIH1cblxuXG4gICAgLyoqIFJlc2V0IFBpbGxzICovXG4gICAgZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgICBpZiAoUGlsbHMubGlzdGVuZXIpIHtcbiAgICAgICAgUGlsbHMubGlzdGVuZXIucmVzZXQoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge2FueX0gcGlsbCBwaWxsIGJlaW5nIGRyYWdnZWRcbiAgICAgKiBAcGFyYW0ge2FueX0gY2lkRHJhZ0Zyb20gY2hhbm5lbCBpZCB0aGF0IHRoZSBwaWxsIGlzIGRyYWdnZWQgZnJvbVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGRyYWdTdGFydChwaWxsLCBjaWREcmFnRnJvbSkge1xuICAgICAgUGlsbHMuZHJhZ2dpbmcgPSBwaWxsO1xuICAgICAgUGlsbHMuY2lkRHJhZ0Zyb20gPSBjaWREcmFnRnJvbTtcbiAgICB9XG5cbiAgICAvKiogU3RvcCBwaWxsIGRyYWdnaW5nICovXG4gICAgZnVuY3Rpb24gZHJhZ1N0b3AoKSB7XG4gICAgICBQaWxscy5kcmFnZ2luZyA9IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogV2hlbiBhIHBpbGwgaXMgZHJvcHBlZFxuICAgICAqIEBwYXJhbSBjaWREcmFnVG8gIGNoYW5uZWxJZCB0aGF0J3MgdGhlIHBpbGwgaXMgYmVpbmcgZHJhZ2dlZCB0b1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGRyYWdEcm9wKGNpZERyYWdUbykge1xuICAgICAgaWYgKFBpbGxzLmxpc3RlbmVyKSB7XG4gICAgICAgIFBpbGxzLmxpc3RlbmVyLmRyYWdEcm9wKGNpZERyYWdUbywgUGlsbHMuY2lkRHJhZ0Zyb20pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBQaWxscztcbiAgfSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIFNlcnZpY2UgZm9yIHNlcnZpbmcgVkwgU2NoZW1hXG5hbmd1bGFyLm1vZHVsZSgndmx1aScpXG4gIC5mYWN0b3J5KCdTY2hlbWEnLCBmdW5jdGlvbih2ZywgdmwsIHZsU2NoZW1hKSB7XG4gICAgdmFyIFNjaGVtYSA9IHt9O1xuXG4gICAgU2NoZW1hLnNjaGVtYSA9IHZsU2NoZW1hO1xuXG4gICAgU2NoZW1hLmdldENoYW5uZWxTY2hlbWEgPSBmdW5jdGlvbihjaGFubmVsKSB7XG4gICAgICB2YXIgZGVmID0gbnVsbDtcbiAgICAgIHZhciBlbmNvZGluZ0NoYW5uZWxQcm9wID0gU2NoZW1hLnNjaGVtYS5kZWZpbml0aW9ucy5FbmNvZGluZy5wcm9wZXJ0aWVzW2NoYW5uZWxdO1xuICAgICAgLy8gZm9yIGRldGFpbCwganVzdCBnZXQgdGhlIGZsYXQgdmVyc2lvblxuICAgICAgdmFyIHJlZiA9IGVuY29kaW5nQ2hhbm5lbFByb3AgP1xuICAgICAgICAoZW5jb2RpbmdDaGFubmVsUHJvcC4kcmVmIHx8IGVuY29kaW5nQ2hhbm5lbFByb3Aub25lT2ZbMF0uJHJlZikgOlxuICAgICAgICAnRmllbGREZWYnOyAvLyBqdXN0IHVzZSB0aGUgZ2VuZXJpYyB2ZXJzaW9uIGZvciBBTlkgY2hhbm5lbFxuICAgICAgZGVmID0gcmVmLnNsaWNlKHJlZi5sYXN0SW5kZXhPZignLycpKzEpO1xuICAgICAgcmV0dXJuIFNjaGVtYS5zY2hlbWEuZGVmaW5pdGlvbnNbZGVmXTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIFNjaGVtYTtcbiAgfSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
