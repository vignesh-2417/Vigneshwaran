var process={env:{NODE_ENV:"production"}};var it = Object.defineProperty;
var ot = (t, e, a) => e in t ? it(t, e, { enumerable: !0, configurable: !0, writable: !0, value: a }) : t[e] = a;
var W = (t, e, a) => ot(t, typeof e != "symbol" ? e + "" : e, a);
var b;
(function(t) {
  t.assertEqual = (s) => {
  };
  function e(s) {
  }
  t.assertIs = e;
  function a(s) {
    throw new Error();
  }
  t.assertNever = a, t.arrayToEnum = (s) => {
    const n = {};
    for (const i of s)
      n[i] = i;
    return n;
  }, t.getValidEnumValues = (s) => {
    const n = t.objectKeys(s).filter((o) => typeof s[s[o]] != "number"), i = {};
    for (const o of n)
      i[o] = s[o];
    return t.objectValues(i);
  }, t.objectValues = (s) => t.objectKeys(s).map(function(n) {
    return s[n];
  }), t.objectKeys = typeof Object.keys == "function" ? (s) => Object.keys(s) : (s) => {
    const n = [];
    for (const i in s)
      Object.prototype.hasOwnProperty.call(s, i) && n.push(i);
    return n;
  }, t.find = (s, n) => {
    for (const i of s)
      if (n(i))
        return i;
  }, t.isInteger = typeof Number.isInteger == "function" ? (s) => Number.isInteger(s) : (s) => typeof s == "number" && Number.isFinite(s) && Math.floor(s) === s;
  function r(s, n = " | ") {
    return s.map((i) => typeof i == "string" ? `'${i}'` : i).join(n);
  }
  t.joinValues = r, t.jsonStringifyReplacer = (s, n) => typeof n == "bigint" ? n.toString() : n;
})(b || (b = {}));
var je;
(function(t) {
  t.mergeShapes = (e, a) => ({
    ...e,
    ...a
    // second overwrites first
  });
})(je || (je = {}));
const u = b.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]), j = (t) => {
  switch (typeof t) {
    case "undefined":
      return u.undefined;
    case "string":
      return u.string;
    case "number":
      return Number.isNaN(t) ? u.nan : u.number;
    case "boolean":
      return u.boolean;
    case "function":
      return u.function;
    case "bigint":
      return u.bigint;
    case "symbol":
      return u.symbol;
    case "object":
      return Array.isArray(t) ? u.array : t === null ? u.null : t.then && typeof t.then == "function" && t.catch && typeof t.catch == "function" ? u.promise : typeof Map < "u" && t instanceof Map ? u.map : typeof Set < "u" && t instanceof Set ? u.set : typeof Date < "u" && t instanceof Date ? u.date : u.object;
    default:
      return u.unknown;
  }
}, c = b.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
class $ extends Error {
  get errors() {
    return this.issues;
  }
  constructor(e) {
    super(), this.issues = [], this.addIssue = (r) => {
      this.issues = [...this.issues, r];
    }, this.addIssues = (r = []) => {
      this.issues = [...this.issues, ...r];
    };
    const a = new.target.prototype;
    Object.setPrototypeOf ? Object.setPrototypeOf(this, a) : this.__proto__ = a, this.name = "ZodError", this.issues = e;
  }
  format(e) {
    const a = e || function(n) {
      return n.message;
    }, r = { _errors: [] }, s = (n) => {
      for (const i of n.issues)
        if (i.code === "invalid_union")
          i.unionErrors.map(s);
        else if (i.code === "invalid_return_type")
          s(i.returnTypeError);
        else if (i.code === "invalid_arguments")
          s(i.argumentsError);
        else if (i.path.length === 0)
          r._errors.push(a(i));
        else {
          let o = r, d = 0;
          for (; d < i.path.length; ) {
            const f = i.path[d];
            d === i.path.length - 1 ? (o[f] = o[f] || { _errors: [] }, o[f]._errors.push(a(i))) : o[f] = o[f] || { _errors: [] }, o = o[f], d++;
          }
        }
    };
    return s(this), r;
  }
  static assert(e) {
    if (!(e instanceof $))
      throw new Error(`Not a ZodError: ${e}`);
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, b.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(e = (a) => a.message) {
    const a = {}, r = [];
    for (const s of this.issues)
      if (s.path.length > 0) {
        const n = s.path[0];
        a[n] = a[n] || [], a[n].push(e(s));
      } else
        r.push(e(s));
    return { formErrors: r, fieldErrors: a };
  }
  get formErrors() {
    return this.flatten();
  }
}
$.create = (t) => new $(t);
const pe = (t, e) => {
  let a;
  switch (t.code) {
    case c.invalid_type:
      t.received === u.undefined ? a = "Required" : a = `Expected ${t.expected}, received ${t.received}`;
      break;
    case c.invalid_literal:
      a = `Invalid literal value, expected ${JSON.stringify(t.expected, b.jsonStringifyReplacer)}`;
      break;
    case c.unrecognized_keys:
      a = `Unrecognized key(s) in object: ${b.joinValues(t.keys, ", ")}`;
      break;
    case c.invalid_union:
      a = "Invalid input";
      break;
    case c.invalid_union_discriminator:
      a = `Invalid discriminator value. Expected ${b.joinValues(t.options)}`;
      break;
    case c.invalid_enum_value:
      a = `Invalid enum value. Expected ${b.joinValues(t.options)}, received '${t.received}'`;
      break;
    case c.invalid_arguments:
      a = "Invalid function arguments";
      break;
    case c.invalid_return_type:
      a = "Invalid function return type";
      break;
    case c.invalid_date:
      a = "Invalid date";
      break;
    case c.invalid_string:
      typeof t.validation == "object" ? "includes" in t.validation ? (a = `Invalid input: must include "${t.validation.includes}"`, typeof t.validation.position == "number" && (a = `${a} at one or more positions greater than or equal to ${t.validation.position}`)) : "startsWith" in t.validation ? a = `Invalid input: must start with "${t.validation.startsWith}"` : "endsWith" in t.validation ? a = `Invalid input: must end with "${t.validation.endsWith}"` : b.assertNever(t.validation) : t.validation !== "regex" ? a = `Invalid ${t.validation}` : a = "Invalid";
      break;
    case c.too_small:
      t.type === "array" ? a = `Array must contain ${t.exact ? "exactly" : t.inclusive ? "at least" : "more than"} ${t.minimum} element(s)` : t.type === "string" ? a = `String must contain ${t.exact ? "exactly" : t.inclusive ? "at least" : "over"} ${t.minimum} character(s)` : t.type === "number" ? a = `Number must be ${t.exact ? "exactly equal to " : t.inclusive ? "greater than or equal to " : "greater than "}${t.minimum}` : t.type === "bigint" ? a = `Number must be ${t.exact ? "exactly equal to " : t.inclusive ? "greater than or equal to " : "greater than "}${t.minimum}` : t.type === "date" ? a = `Date must be ${t.exact ? "exactly equal to " : t.inclusive ? "greater than or equal to " : "greater than "}${new Date(Number(t.minimum))}` : a = "Invalid input";
      break;
    case c.too_big:
      t.type === "array" ? a = `Array must contain ${t.exact ? "exactly" : t.inclusive ? "at most" : "less than"} ${t.maximum} element(s)` : t.type === "string" ? a = `String must contain ${t.exact ? "exactly" : t.inclusive ? "at most" : "under"} ${t.maximum} character(s)` : t.type === "number" ? a = `Number must be ${t.exact ? "exactly" : t.inclusive ? "less than or equal to" : "less than"} ${t.maximum}` : t.type === "bigint" ? a = `BigInt must be ${t.exact ? "exactly" : t.inclusive ? "less than or equal to" : "less than"} ${t.maximum}` : t.type === "date" ? a = `Date must be ${t.exact ? "exactly" : t.inclusive ? "smaller than or equal to" : "smaller than"} ${new Date(Number(t.maximum))}` : a = "Invalid input";
      break;
    case c.custom:
      a = "Invalid input";
      break;
    case c.invalid_intersection_types:
      a = "Intersection results could not be merged";
      break;
    case c.not_multiple_of:
      a = `Number must be a multiple of ${t.multipleOf}`;
      break;
    case c.not_finite:
      a = "Number must be finite";
      break;
    default:
      a = e.defaultError, b.assertNever(t);
  }
  return { message: a };
};
let ct = pe;
function lt() {
  return ct;
}
const dt = (t) => {
  const { data: e, path: a, errorMaps: r, issueData: s } = t, n = [...a, ...s.path || []], i = {
    ...s,
    path: n
  };
  if (s.message !== void 0)
    return {
      ...s,
      path: n,
      message: s.message
    };
  let o = "";
  const d = r.filter((f) => !!f).slice().reverse();
  for (const f of d)
    o = f(i, { data: e, defaultError: o }).message;
  return {
    ...s,
    path: n,
    message: o
  };
};
function l(t, e) {
  const a = lt(), r = dt({
    issueData: e,
    data: t.data,
    path: t.path,
    errorMaps: [
      t.common.contextualErrorMap,
      // contextual error map is first priority
      t.schemaErrorMap,
      // then schema-bound map if available
      a,
      // then global override map
      a === pe ? void 0 : pe
      // then global default map
    ].filter((s) => !!s)
  });
  t.common.issues.push(r);
}
class A {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    this.value === "valid" && (this.value = "dirty");
  }
  abort() {
    this.value !== "aborted" && (this.value = "aborted");
  }
  static mergeArray(e, a) {
    const r = [];
    for (const s of a) {
      if (s.status === "aborted")
        return p;
      s.status === "dirty" && e.dirty(), r.push(s.value);
    }
    return { status: e.value, value: r };
  }
  static async mergeObjectAsync(e, a) {
    const r = [];
    for (const s of a) {
      const n = await s.key, i = await s.value;
      r.push({
        key: n,
        value: i
      });
    }
    return A.mergeObjectSync(e, r);
  }
  static mergeObjectSync(e, a) {
    const r = {};
    for (const s of a) {
      const { key: n, value: i } = s;
      if (n.status === "aborted" || i.status === "aborted")
        return p;
      n.status === "dirty" && e.dirty(), i.status === "dirty" && e.dirty(), n.value !== "__proto__" && (typeof i.value < "u" || s.alwaysSet) && (r[n.value] = i.value);
    }
    return { status: e.value, value: r };
  }
}
const p = Object.freeze({
  status: "aborted"
}), G = (t) => ({ status: "dirty", value: t }), C = (t) => ({ status: "valid", value: t }), Pe = (t) => t.status === "aborted", Ue = (t) => t.status === "dirty", B = (t) => t.status === "valid", ee = (t) => typeof Promise < "u" && t instanceof Promise;
var m;
(function(t) {
  t.errToObj = (e) => typeof e == "string" ? { message: e } : e || {}, t.toString = (e) => typeof e == "string" ? e : e == null ? void 0 : e.message;
})(m || (m = {}));
class U {
  constructor(e, a, r, s) {
    this._cachedPath = [], this.parent = e, this.data = a, this._path = r, this._key = s;
  }
  get path() {
    return this._cachedPath.length || (Array.isArray(this._key) ? this._cachedPath.push(...this._path, ...this._key) : this._cachedPath.push(...this._path, this._key)), this._cachedPath;
  }
}
const Ze = (t, e) => {
  if (B(e))
    return { success: !0, data: e.value };
  if (!t.common.issues.length)
    throw new Error("Validation failed but no issues detected.");
  return {
    success: !1,
    get error() {
      if (this._error)
        return this._error;
      const a = new $(t.common.issues);
      return this._error = a, this._error;
    }
  };
};
function _(t) {
  if (!t)
    return {};
  const { errorMap: e, invalid_type_error: a, required_error: r, description: s } = t;
  if (e && (a || r))
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  return e ? { errorMap: e, description: s } : { errorMap: (i, o) => {
    const { message: d } = t;
    return i.code === "invalid_enum_value" ? { message: d ?? o.defaultError } : typeof o.data > "u" ? { message: d ?? r ?? o.defaultError } : i.code !== "invalid_type" ? { message: o.defaultError } : { message: d ?? a ?? o.defaultError };
  }, description: s };
}
class v {
  get description() {
    return this._def.description;
  }
  _getType(e) {
    return j(e.data);
  }
  _getOrReturnCtx(e, a) {
    return a || {
      common: e.parent.common,
      data: e.data,
      parsedType: j(e.data),
      schemaErrorMap: this._def.errorMap,
      path: e.path,
      parent: e.parent
    };
  }
  _processInputParams(e) {
    return {
      status: new A(),
      ctx: {
        common: e.parent.common,
        data: e.data,
        parsedType: j(e.data),
        schemaErrorMap: this._def.errorMap,
        path: e.path,
        parent: e.parent
      }
    };
  }
  _parseSync(e) {
    const a = this._parse(e);
    if (ee(a))
      throw new Error("Synchronous parse encountered promise.");
    return a;
  }
  _parseAsync(e) {
    const a = this._parse(e);
    return Promise.resolve(a);
  }
  parse(e, a) {
    const r = this.safeParse(e, a);
    if (r.success)
      return r.data;
    throw r.error;
  }
  safeParse(e, a) {
    const r = {
      common: {
        issues: [],
        async: (a == null ? void 0 : a.async) ?? !1,
        contextualErrorMap: a == null ? void 0 : a.errorMap
      },
      path: (a == null ? void 0 : a.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data: e,
      parsedType: j(e)
    }, s = this._parseSync({ data: e, path: r.path, parent: r });
    return Ze(r, s);
  }
  "~validate"(e) {
    var r, s;
    const a = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data: e,
      parsedType: j(e)
    };
    if (!this["~standard"].async)
      try {
        const n = this._parseSync({ data: e, path: [], parent: a });
        return B(n) ? {
          value: n.value
        } : {
          issues: a.common.issues
        };
      } catch (n) {
        (s = (r = n == null ? void 0 : n.message) == null ? void 0 : r.toLowerCase()) != null && s.includes("encountered") && (this["~standard"].async = !0), a.common = {
          issues: [],
          async: !0
        };
      }
    return this._parseAsync({ data: e, path: [], parent: a }).then((n) => B(n) ? {
      value: n.value
    } : {
      issues: a.common.issues
    });
  }
  async parseAsync(e, a) {
    const r = await this.safeParseAsync(e, a);
    if (r.success)
      return r.data;
    throw r.error;
  }
  async safeParseAsync(e, a) {
    const r = {
      common: {
        issues: [],
        contextualErrorMap: a == null ? void 0 : a.errorMap,
        async: !0
      },
      path: (a == null ? void 0 : a.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data: e,
      parsedType: j(e)
    }, s = this._parse({ data: e, path: r.path, parent: r }), n = await (ee(s) ? s : Promise.resolve(s));
    return Ze(r, n);
  }
  refine(e, a) {
    const r = (s) => typeof a == "string" || typeof a > "u" ? { message: a } : typeof a == "function" ? a(s) : a;
    return this._refinement((s, n) => {
      const i = e(s), o = () => n.addIssue({
        code: c.custom,
        ...r(s)
      });
      return typeof Promise < "u" && i instanceof Promise ? i.then((d) => d ? !0 : (o(), !1)) : i ? !0 : (o(), !1);
    });
  }
  refinement(e, a) {
    return this._refinement((r, s) => e(r) ? !0 : (s.addIssue(typeof a == "function" ? a(r, s) : a), !1));
  }
  _refinement(e) {
    return new z({
      schema: this,
      typeName: y.ZodEffects,
      effect: { type: "refinement", refinement: e }
    });
  }
  superRefine(e) {
    return this._refinement(e);
  }
  constructor(e) {
    this.spa = this.safeParseAsync, this._def = e, this.parse = this.parse.bind(this), this.safeParse = this.safeParse.bind(this), this.parseAsync = this.parseAsync.bind(this), this.safeParseAsync = this.safeParseAsync.bind(this), this.spa = this.spa.bind(this), this.refine = this.refine.bind(this), this.refinement = this.refinement.bind(this), this.superRefine = this.superRefine.bind(this), this.optional = this.optional.bind(this), this.nullable = this.nullable.bind(this), this.nullish = this.nullish.bind(this), this.array = this.array.bind(this), this.promise = this.promise.bind(this), this.or = this.or.bind(this), this.and = this.and.bind(this), this.transform = this.transform.bind(this), this.brand = this.brand.bind(this), this.default = this.default.bind(this), this.catch = this.catch.bind(this), this.describe = this.describe.bind(this), this.pipe = this.pipe.bind(this), this.readonly = this.readonly.bind(this), this.isNullable = this.isNullable.bind(this), this.isOptional = this.isOptional.bind(this), this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (a) => this["~validate"](a)
    };
  }
  optional() {
    return L.create(this, this._def);
  }
  nullable() {
    return V.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return R.create(this);
  }
  promise() {
    return ne.create(this, this._def);
  }
  or(e) {
    return ae.create([this, e], this._def);
  }
  and(e) {
    return re.create(this, e, this._def);
  }
  transform(e) {
    return new z({
      ..._(this._def),
      schema: this,
      typeName: y.ZodEffects,
      effect: { type: "transform", transform: e }
    });
  }
  default(e) {
    const a = typeof e == "function" ? e : () => e;
    return new ie({
      ..._(this._def),
      innerType: this,
      defaultValue: a,
      typeName: y.ZodDefault
    });
  }
  brand() {
    return new Xe({
      typeName: y.ZodBranded,
      type: this,
      ..._(this._def)
    });
  }
  catch(e) {
    const a = typeof e == "function" ? e : () => e;
    return new oe({
      ..._(this._def),
      innerType: this,
      catchValue: a,
      typeName: y.ZodCatch
    });
  }
  describe(e) {
    const a = this.constructor;
    return new a({
      ...this._def,
      description: e
    });
  }
  pipe(e) {
    return Ee.create(this, e);
  }
  readonly() {
    return ce.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
}
const ut = /^c[^\s-]{8,}$/i, mt = /^[0-9a-z]+$/, ht = /^[0-9A-HJKMNP-TV-Z]{26}$/i, ft = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i, pt = /^[a-z0-9_-]{21}$/i, yt = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/, gt = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/, _t = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i, vt = "^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$";
let fe;
const bt = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/, xt = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/, kt = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/, wt = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/, Tt = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/, St = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/, Ye = "((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))", At = new RegExp(`^${Ye}$`);
function He(t) {
  let e = "[0-5]\\d";
  t.precision ? e = `${e}\\.\\d{${t.precision}}` : t.precision == null && (e = `${e}(\\.\\d+)?`);
  const a = t.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${e})${a}`;
}
function Et(t) {
  return new RegExp(`^${He(t)}$`);
}
function Ct(t) {
  let e = `${Ye}T${He(t)}`;
  const a = [];
  return a.push(t.local ? "Z?" : "Z"), t.offset && a.push("([+-]\\d{2}:?\\d{2})"), e = `${e}(${a.join("|")})`, new RegExp(`^${e}$`);
}
function Nt(t, e) {
  return !!((e === "v4" || !e) && bt.test(t) || (e === "v6" || !e) && kt.test(t));
}
function Rt(t, e) {
  if (!yt.test(t))
    return !1;
  try {
    const [a] = t.split(".");
    if (!a)
      return !1;
    const r = a.replace(/-/g, "+").replace(/_/g, "/").padEnd(a.length + (4 - a.length % 4) % 4, "="), s = JSON.parse(atob(r));
    return !(typeof s != "object" || s === null || "typ" in s && (s == null ? void 0 : s.typ) !== "JWT" || !s.alg || e && s.alg !== e);
  } catch {
    return !1;
  }
}
function It(t, e) {
  return !!((e === "v4" || !e) && xt.test(t) || (e === "v6" || !e) && wt.test(t));
}
class P extends v {
  _parse(e) {
    if (this._def.coerce && (e.data = String(e.data)), this._getType(e) !== u.string) {
      const n = this._getOrReturnCtx(e);
      return l(n, {
        code: c.invalid_type,
        expected: u.string,
        received: n.parsedType
      }), p;
    }
    const r = new A();
    let s;
    for (const n of this._def.checks)
      if (n.kind === "min")
        e.data.length < n.value && (s = this._getOrReturnCtx(e, s), l(s, {
          code: c.too_small,
          minimum: n.value,
          type: "string",
          inclusive: !0,
          exact: !1,
          message: n.message
        }), r.dirty());
      else if (n.kind === "max")
        e.data.length > n.value && (s = this._getOrReturnCtx(e, s), l(s, {
          code: c.too_big,
          maximum: n.value,
          type: "string",
          inclusive: !0,
          exact: !1,
          message: n.message
        }), r.dirty());
      else if (n.kind === "length") {
        const i = e.data.length > n.value, o = e.data.length < n.value;
        (i || o) && (s = this._getOrReturnCtx(e, s), i ? l(s, {
          code: c.too_big,
          maximum: n.value,
          type: "string",
          inclusive: !0,
          exact: !0,
          message: n.message
        }) : o && l(s, {
          code: c.too_small,
          minimum: n.value,
          type: "string",
          inclusive: !0,
          exact: !0,
          message: n.message
        }), r.dirty());
      } else if (n.kind === "email")
        _t.test(e.data) || (s = this._getOrReturnCtx(e, s), l(s, {
          validation: "email",
          code: c.invalid_string,
          message: n.message
        }), r.dirty());
      else if (n.kind === "emoji")
        fe || (fe = new RegExp(vt, "u")), fe.test(e.data) || (s = this._getOrReturnCtx(e, s), l(s, {
          validation: "emoji",
          code: c.invalid_string,
          message: n.message
        }), r.dirty());
      else if (n.kind === "uuid")
        ft.test(e.data) || (s = this._getOrReturnCtx(e, s), l(s, {
          validation: "uuid",
          code: c.invalid_string,
          message: n.message
        }), r.dirty());
      else if (n.kind === "nanoid")
        pt.test(e.data) || (s = this._getOrReturnCtx(e, s), l(s, {
          validation: "nanoid",
          code: c.invalid_string,
          message: n.message
        }), r.dirty());
      else if (n.kind === "cuid")
        ut.test(e.data) || (s = this._getOrReturnCtx(e, s), l(s, {
          validation: "cuid",
          code: c.invalid_string,
          message: n.message
        }), r.dirty());
      else if (n.kind === "cuid2")
        mt.test(e.data) || (s = this._getOrReturnCtx(e, s), l(s, {
          validation: "cuid2",
          code: c.invalid_string,
          message: n.message
        }), r.dirty());
      else if (n.kind === "ulid")
        ht.test(e.data) || (s = this._getOrReturnCtx(e, s), l(s, {
          validation: "ulid",
          code: c.invalid_string,
          message: n.message
        }), r.dirty());
      else if (n.kind === "url")
        try {
          new URL(e.data);
        } catch {
          s = this._getOrReturnCtx(e, s), l(s, {
            validation: "url",
            code: c.invalid_string,
            message: n.message
          }), r.dirty();
        }
      else n.kind === "regex" ? (n.regex.lastIndex = 0, n.regex.test(e.data) || (s = this._getOrReturnCtx(e, s), l(s, {
        validation: "regex",
        code: c.invalid_string,
        message: n.message
      }), r.dirty())) : n.kind === "trim" ? e.data = e.data.trim() : n.kind === "includes" ? e.data.includes(n.value, n.position) || (s = this._getOrReturnCtx(e, s), l(s, {
        code: c.invalid_string,
        validation: { includes: n.value, position: n.position },
        message: n.message
      }), r.dirty()) : n.kind === "toLowerCase" ? e.data = e.data.toLowerCase() : n.kind === "toUpperCase" ? e.data = e.data.toUpperCase() : n.kind === "startsWith" ? e.data.startsWith(n.value) || (s = this._getOrReturnCtx(e, s), l(s, {
        code: c.invalid_string,
        validation: { startsWith: n.value },
        message: n.message
      }), r.dirty()) : n.kind === "endsWith" ? e.data.endsWith(n.value) || (s = this._getOrReturnCtx(e, s), l(s, {
        code: c.invalid_string,
        validation: { endsWith: n.value },
        message: n.message
      }), r.dirty()) : n.kind === "datetime" ? Ct(n).test(e.data) || (s = this._getOrReturnCtx(e, s), l(s, {
        code: c.invalid_string,
        validation: "datetime",
        message: n.message
      }), r.dirty()) : n.kind === "date" ? At.test(e.data) || (s = this._getOrReturnCtx(e, s), l(s, {
        code: c.invalid_string,
        validation: "date",
        message: n.message
      }), r.dirty()) : n.kind === "time" ? Et(n).test(e.data) || (s = this._getOrReturnCtx(e, s), l(s, {
        code: c.invalid_string,
        validation: "time",
        message: n.message
      }), r.dirty()) : n.kind === "duration" ? gt.test(e.data) || (s = this._getOrReturnCtx(e, s), l(s, {
        validation: "duration",
        code: c.invalid_string,
        message: n.message
      }), r.dirty()) : n.kind === "ip" ? Nt(e.data, n.version) || (s = this._getOrReturnCtx(e, s), l(s, {
        validation: "ip",
        code: c.invalid_string,
        message: n.message
      }), r.dirty()) : n.kind === "jwt" ? Rt(e.data, n.alg) || (s = this._getOrReturnCtx(e, s), l(s, {
        validation: "jwt",
        code: c.invalid_string,
        message: n.message
      }), r.dirty()) : n.kind === "cidr" ? It(e.data, n.version) || (s = this._getOrReturnCtx(e, s), l(s, {
        validation: "cidr",
        code: c.invalid_string,
        message: n.message
      }), r.dirty()) : n.kind === "base64" ? Tt.test(e.data) || (s = this._getOrReturnCtx(e, s), l(s, {
        validation: "base64",
        code: c.invalid_string,
        message: n.message
      }), r.dirty()) : n.kind === "base64url" ? St.test(e.data) || (s = this._getOrReturnCtx(e, s), l(s, {
        validation: "base64url",
        code: c.invalid_string,
        message: n.message
      }), r.dirty()) : b.assertNever(n);
    return { status: r.value, value: e.data };
  }
  _regex(e, a, r) {
    return this.refinement((s) => e.test(s), {
      validation: a,
      code: c.invalid_string,
      ...m.errToObj(r)
    });
  }
  _addCheck(e) {
    return new P({
      ...this._def,
      checks: [...this._def.checks, e]
    });
  }
  email(e) {
    return this._addCheck({ kind: "email", ...m.errToObj(e) });
  }
  url(e) {
    return this._addCheck({ kind: "url", ...m.errToObj(e) });
  }
  emoji(e) {
    return this._addCheck({ kind: "emoji", ...m.errToObj(e) });
  }
  uuid(e) {
    return this._addCheck({ kind: "uuid", ...m.errToObj(e) });
  }
  nanoid(e) {
    return this._addCheck({ kind: "nanoid", ...m.errToObj(e) });
  }
  cuid(e) {
    return this._addCheck({ kind: "cuid", ...m.errToObj(e) });
  }
  cuid2(e) {
    return this._addCheck({ kind: "cuid2", ...m.errToObj(e) });
  }
  ulid(e) {
    return this._addCheck({ kind: "ulid", ...m.errToObj(e) });
  }
  base64(e) {
    return this._addCheck({ kind: "base64", ...m.errToObj(e) });
  }
  base64url(e) {
    return this._addCheck({
      kind: "base64url",
      ...m.errToObj(e)
    });
  }
  jwt(e) {
    return this._addCheck({ kind: "jwt", ...m.errToObj(e) });
  }
  ip(e) {
    return this._addCheck({ kind: "ip", ...m.errToObj(e) });
  }
  cidr(e) {
    return this._addCheck({ kind: "cidr", ...m.errToObj(e) });
  }
  datetime(e) {
    return typeof e == "string" ? this._addCheck({
      kind: "datetime",
      precision: null,
      offset: !1,
      local: !1,
      message: e
    }) : this._addCheck({
      kind: "datetime",
      precision: typeof (e == null ? void 0 : e.precision) > "u" ? null : e == null ? void 0 : e.precision,
      offset: (e == null ? void 0 : e.offset) ?? !1,
      local: (e == null ? void 0 : e.local) ?? !1,
      ...m.errToObj(e == null ? void 0 : e.message)
    });
  }
  date(e) {
    return this._addCheck({ kind: "date", message: e });
  }
  time(e) {
    return typeof e == "string" ? this._addCheck({
      kind: "time",
      precision: null,
      message: e
    }) : this._addCheck({
      kind: "time",
      precision: typeof (e == null ? void 0 : e.precision) > "u" ? null : e == null ? void 0 : e.precision,
      ...m.errToObj(e == null ? void 0 : e.message)
    });
  }
  duration(e) {
    return this._addCheck({ kind: "duration", ...m.errToObj(e) });
  }
  regex(e, a) {
    return this._addCheck({
      kind: "regex",
      regex: e,
      ...m.errToObj(a)
    });
  }
  includes(e, a) {
    return this._addCheck({
      kind: "includes",
      value: e,
      position: a == null ? void 0 : a.position,
      ...m.errToObj(a == null ? void 0 : a.message)
    });
  }
  startsWith(e, a) {
    return this._addCheck({
      kind: "startsWith",
      value: e,
      ...m.errToObj(a)
    });
  }
  endsWith(e, a) {
    return this._addCheck({
      kind: "endsWith",
      value: e,
      ...m.errToObj(a)
    });
  }
  min(e, a) {
    return this._addCheck({
      kind: "min",
      value: e,
      ...m.errToObj(a)
    });
  }
  max(e, a) {
    return this._addCheck({
      kind: "max",
      value: e,
      ...m.errToObj(a)
    });
  }
  length(e, a) {
    return this._addCheck({
      kind: "length",
      value: e,
      ...m.errToObj(a)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(e) {
    return this.min(1, m.errToObj(e));
  }
  trim() {
    return new P({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new P({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new P({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((e) => e.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((e) => e.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((e) => e.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((e) => e.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((e) => e.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((e) => e.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((e) => e.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((e) => e.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((e) => e.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((e) => e.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((e) => e.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((e) => e.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((e) => e.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((e) => e.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((e) => e.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((e) => e.kind === "base64url");
  }
  get minLength() {
    let e = null;
    for (const a of this._def.checks)
      a.kind === "min" && (e === null || a.value > e) && (e = a.value);
    return e;
  }
  get maxLength() {
    let e = null;
    for (const a of this._def.checks)
      a.kind === "max" && (e === null || a.value < e) && (e = a.value);
    return e;
  }
}
P.create = (t) => new P({
  checks: [],
  typeName: y.ZodString,
  coerce: (t == null ? void 0 : t.coerce) ?? !1,
  ..._(t)
});
function Ot(t, e) {
  const a = (t.toString().split(".")[1] || "").length, r = (e.toString().split(".")[1] || "").length, s = a > r ? a : r, n = Number.parseInt(t.toFixed(s).replace(".", "")), i = Number.parseInt(e.toFixed(s).replace(".", ""));
  return n % i / 10 ** s;
}
class H extends v {
  constructor() {
    super(...arguments), this.min = this.gte, this.max = this.lte, this.step = this.multipleOf;
  }
  _parse(e) {
    if (this._def.coerce && (e.data = Number(e.data)), this._getType(e) !== u.number) {
      const n = this._getOrReturnCtx(e);
      return l(n, {
        code: c.invalid_type,
        expected: u.number,
        received: n.parsedType
      }), p;
    }
    let r;
    const s = new A();
    for (const n of this._def.checks)
      n.kind === "int" ? b.isInteger(e.data) || (r = this._getOrReturnCtx(e, r), l(r, {
        code: c.invalid_type,
        expected: "integer",
        received: "float",
        message: n.message
      }), s.dirty()) : n.kind === "min" ? (n.inclusive ? e.data < n.value : e.data <= n.value) && (r = this._getOrReturnCtx(e, r), l(r, {
        code: c.too_small,
        minimum: n.value,
        type: "number",
        inclusive: n.inclusive,
        exact: !1,
        message: n.message
      }), s.dirty()) : n.kind === "max" ? (n.inclusive ? e.data > n.value : e.data >= n.value) && (r = this._getOrReturnCtx(e, r), l(r, {
        code: c.too_big,
        maximum: n.value,
        type: "number",
        inclusive: n.inclusive,
        exact: !1,
        message: n.message
      }), s.dirty()) : n.kind === "multipleOf" ? Ot(e.data, n.value) !== 0 && (r = this._getOrReturnCtx(e, r), l(r, {
        code: c.not_multiple_of,
        multipleOf: n.value,
        message: n.message
      }), s.dirty()) : n.kind === "finite" ? Number.isFinite(e.data) || (r = this._getOrReturnCtx(e, r), l(r, {
        code: c.not_finite,
        message: n.message
      }), s.dirty()) : b.assertNever(n);
    return { status: s.value, value: e.data };
  }
  gte(e, a) {
    return this.setLimit("min", e, !0, m.toString(a));
  }
  gt(e, a) {
    return this.setLimit("min", e, !1, m.toString(a));
  }
  lte(e, a) {
    return this.setLimit("max", e, !0, m.toString(a));
  }
  lt(e, a) {
    return this.setLimit("max", e, !1, m.toString(a));
  }
  setLimit(e, a, r, s) {
    return new H({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind: e,
          value: a,
          inclusive: r,
          message: m.toString(s)
        }
      ]
    });
  }
  _addCheck(e) {
    return new H({
      ...this._def,
      checks: [...this._def.checks, e]
    });
  }
  int(e) {
    return this._addCheck({
      kind: "int",
      message: m.toString(e)
    });
  }
  positive(e) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: !1,
      message: m.toString(e)
    });
  }
  negative(e) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: !1,
      message: m.toString(e)
    });
  }
  nonpositive(e) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: !0,
      message: m.toString(e)
    });
  }
  nonnegative(e) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: !0,
      message: m.toString(e)
    });
  }
  multipleOf(e, a) {
    return this._addCheck({
      kind: "multipleOf",
      value: e,
      message: m.toString(a)
    });
  }
  finite(e) {
    return this._addCheck({
      kind: "finite",
      message: m.toString(e)
    });
  }
  safe(e) {
    return this._addCheck({
      kind: "min",
      inclusive: !0,
      value: Number.MIN_SAFE_INTEGER,
      message: m.toString(e)
    })._addCheck({
      kind: "max",
      inclusive: !0,
      value: Number.MAX_SAFE_INTEGER,
      message: m.toString(e)
    });
  }
  get minValue() {
    let e = null;
    for (const a of this._def.checks)
      a.kind === "min" && (e === null || a.value > e) && (e = a.value);
    return e;
  }
  get maxValue() {
    let e = null;
    for (const a of this._def.checks)
      a.kind === "max" && (e === null || a.value < e) && (e = a.value);
    return e;
  }
  get isInt() {
    return !!this._def.checks.find((e) => e.kind === "int" || e.kind === "multipleOf" && b.isInteger(e.value));
  }
  get isFinite() {
    let e = null, a = null;
    for (const r of this._def.checks) {
      if (r.kind === "finite" || r.kind === "int" || r.kind === "multipleOf")
        return !0;
      r.kind === "min" ? (a === null || r.value > a) && (a = r.value) : r.kind === "max" && (e === null || r.value < e) && (e = r.value);
    }
    return Number.isFinite(a) && Number.isFinite(e);
  }
}
H.create = (t) => new H({
  checks: [],
  typeName: y.ZodNumber,
  coerce: (t == null ? void 0 : t.coerce) || !1,
  ..._(t)
});
class Q extends v {
  constructor() {
    super(...arguments), this.min = this.gte, this.max = this.lte;
  }
  _parse(e) {
    if (this._def.coerce)
      try {
        e.data = BigInt(e.data);
      } catch {
        return this._getInvalidInput(e);
      }
    if (this._getType(e) !== u.bigint)
      return this._getInvalidInput(e);
    let r;
    const s = new A();
    for (const n of this._def.checks)
      n.kind === "min" ? (n.inclusive ? e.data < n.value : e.data <= n.value) && (r = this._getOrReturnCtx(e, r), l(r, {
        code: c.too_small,
        type: "bigint",
        minimum: n.value,
        inclusive: n.inclusive,
        message: n.message
      }), s.dirty()) : n.kind === "max" ? (n.inclusive ? e.data > n.value : e.data >= n.value) && (r = this._getOrReturnCtx(e, r), l(r, {
        code: c.too_big,
        type: "bigint",
        maximum: n.value,
        inclusive: n.inclusive,
        message: n.message
      }), s.dirty()) : n.kind === "multipleOf" ? e.data % n.value !== BigInt(0) && (r = this._getOrReturnCtx(e, r), l(r, {
        code: c.not_multiple_of,
        multipleOf: n.value,
        message: n.message
      }), s.dirty()) : b.assertNever(n);
    return { status: s.value, value: e.data };
  }
  _getInvalidInput(e) {
    const a = this._getOrReturnCtx(e);
    return l(a, {
      code: c.invalid_type,
      expected: u.bigint,
      received: a.parsedType
    }), p;
  }
  gte(e, a) {
    return this.setLimit("min", e, !0, m.toString(a));
  }
  gt(e, a) {
    return this.setLimit("min", e, !1, m.toString(a));
  }
  lte(e, a) {
    return this.setLimit("max", e, !0, m.toString(a));
  }
  lt(e, a) {
    return this.setLimit("max", e, !1, m.toString(a));
  }
  setLimit(e, a, r, s) {
    return new Q({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind: e,
          value: a,
          inclusive: r,
          message: m.toString(s)
        }
      ]
    });
  }
  _addCheck(e) {
    return new Q({
      ...this._def,
      checks: [...this._def.checks, e]
    });
  }
  positive(e) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: !1,
      message: m.toString(e)
    });
  }
  negative(e) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: !1,
      message: m.toString(e)
    });
  }
  nonpositive(e) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: !0,
      message: m.toString(e)
    });
  }
  nonnegative(e) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: !0,
      message: m.toString(e)
    });
  }
  multipleOf(e, a) {
    return this._addCheck({
      kind: "multipleOf",
      value: e,
      message: m.toString(a)
    });
  }
  get minValue() {
    let e = null;
    for (const a of this._def.checks)
      a.kind === "min" && (e === null || a.value > e) && (e = a.value);
    return e;
  }
  get maxValue() {
    let e = null;
    for (const a of this._def.checks)
      a.kind === "max" && (e === null || a.value < e) && (e = a.value);
    return e;
  }
}
Q.create = (t) => new Q({
  checks: [],
  typeName: y.ZodBigInt,
  coerce: (t == null ? void 0 : t.coerce) ?? !1,
  ..._(t)
});
class ye extends v {
  _parse(e) {
    if (this._def.coerce && (e.data = !!e.data), this._getType(e) !== u.boolean) {
      const r = this._getOrReturnCtx(e);
      return l(r, {
        code: c.invalid_type,
        expected: u.boolean,
        received: r.parsedType
      }), p;
    }
    return C(e.data);
  }
}
ye.create = (t) => new ye({
  typeName: y.ZodBoolean,
  coerce: (t == null ? void 0 : t.coerce) || !1,
  ..._(t)
});
class te extends v {
  _parse(e) {
    if (this._def.coerce && (e.data = new Date(e.data)), this._getType(e) !== u.date) {
      const n = this._getOrReturnCtx(e);
      return l(n, {
        code: c.invalid_type,
        expected: u.date,
        received: n.parsedType
      }), p;
    }
    if (Number.isNaN(e.data.getTime())) {
      const n = this._getOrReturnCtx(e);
      return l(n, {
        code: c.invalid_date
      }), p;
    }
    const r = new A();
    let s;
    for (const n of this._def.checks)
      n.kind === "min" ? e.data.getTime() < n.value && (s = this._getOrReturnCtx(e, s), l(s, {
        code: c.too_small,
        message: n.message,
        inclusive: !0,
        exact: !1,
        minimum: n.value,
        type: "date"
      }), r.dirty()) : n.kind === "max" ? e.data.getTime() > n.value && (s = this._getOrReturnCtx(e, s), l(s, {
        code: c.too_big,
        message: n.message,
        inclusive: !0,
        exact: !1,
        maximum: n.value,
        type: "date"
      }), r.dirty()) : b.assertNever(n);
    return {
      status: r.value,
      value: new Date(e.data.getTime())
    };
  }
  _addCheck(e) {
    return new te({
      ...this._def,
      checks: [...this._def.checks, e]
    });
  }
  min(e, a) {
    return this._addCheck({
      kind: "min",
      value: e.getTime(),
      message: m.toString(a)
    });
  }
  max(e, a) {
    return this._addCheck({
      kind: "max",
      value: e.getTime(),
      message: m.toString(a)
    });
  }
  get minDate() {
    let e = null;
    for (const a of this._def.checks)
      a.kind === "min" && (e === null || a.value > e) && (e = a.value);
    return e != null ? new Date(e) : null;
  }
  get maxDate() {
    let e = null;
    for (const a of this._def.checks)
      a.kind === "max" && (e === null || a.value < e) && (e = a.value);
    return e != null ? new Date(e) : null;
  }
}
te.create = (t) => new te({
  checks: [],
  coerce: (t == null ? void 0 : t.coerce) || !1,
  typeName: y.ZodDate,
  ..._(t)
});
class Me extends v {
  _parse(e) {
    if (this._getType(e) !== u.symbol) {
      const r = this._getOrReturnCtx(e);
      return l(r, {
        code: c.invalid_type,
        expected: u.symbol,
        received: r.parsedType
      }), p;
    }
    return C(e.data);
  }
}
Me.create = (t) => new Me({
  typeName: y.ZodSymbol,
  ..._(t)
});
class ge extends v {
  _parse(e) {
    if (this._getType(e) !== u.undefined) {
      const r = this._getOrReturnCtx(e);
      return l(r, {
        code: c.invalid_type,
        expected: u.undefined,
        received: r.parsedType
      }), p;
    }
    return C(e.data);
  }
}
ge.create = (t) => new ge({
  typeName: y.ZodUndefined,
  ..._(t)
});
class _e extends v {
  _parse(e) {
    if (this._getType(e) !== u.null) {
      const r = this._getOrReturnCtx(e);
      return l(r, {
        code: c.invalid_type,
        expected: u.null,
        received: r.parsedType
      }), p;
    }
    return C(e.data);
  }
}
_e.create = (t) => new _e({
  typeName: y.ZodNull,
  ..._(t)
});
class Fe extends v {
  constructor() {
    super(...arguments), this._any = !0;
  }
  _parse(e) {
    return C(e.data);
  }
}
Fe.create = (t) => new Fe({
  typeName: y.ZodAny,
  ..._(t)
});
class ve extends v {
  constructor() {
    super(...arguments), this._unknown = !0;
  }
  _parse(e) {
    return C(e.data);
  }
}
ve.create = (t) => new ve({
  typeName: y.ZodUnknown,
  ..._(t)
});
class Z extends v {
  _parse(e) {
    const a = this._getOrReturnCtx(e);
    return l(a, {
      code: c.invalid_type,
      expected: u.never,
      received: a.parsedType
    }), p;
  }
}
Z.create = (t) => new Z({
  typeName: y.ZodNever,
  ..._(t)
});
class De extends v {
  _parse(e) {
    if (this._getType(e) !== u.undefined) {
      const r = this._getOrReturnCtx(e);
      return l(r, {
        code: c.invalid_type,
        expected: u.void,
        received: r.parsedType
      }), p;
    }
    return C(e.data);
  }
}
De.create = (t) => new De({
  typeName: y.ZodVoid,
  ..._(t)
});
class R extends v {
  _parse(e) {
    const { ctx: a, status: r } = this._processInputParams(e), s = this._def;
    if (a.parsedType !== u.array)
      return l(a, {
        code: c.invalid_type,
        expected: u.array,
        received: a.parsedType
      }), p;
    if (s.exactLength !== null) {
      const i = a.data.length > s.exactLength.value, o = a.data.length < s.exactLength.value;
      (i || o) && (l(a, {
        code: i ? c.too_big : c.too_small,
        minimum: o ? s.exactLength.value : void 0,
        maximum: i ? s.exactLength.value : void 0,
        type: "array",
        inclusive: !0,
        exact: !0,
        message: s.exactLength.message
      }), r.dirty());
    }
    if (s.minLength !== null && a.data.length < s.minLength.value && (l(a, {
      code: c.too_small,
      minimum: s.minLength.value,
      type: "array",
      inclusive: !0,
      exact: !1,
      message: s.minLength.message
    }), r.dirty()), s.maxLength !== null && a.data.length > s.maxLength.value && (l(a, {
      code: c.too_big,
      maximum: s.maxLength.value,
      type: "array",
      inclusive: !0,
      exact: !1,
      message: s.maxLength.message
    }), r.dirty()), a.common.async)
      return Promise.all([...a.data].map((i, o) => s.type._parseAsync(new U(a, i, a.path, o)))).then((i) => A.mergeArray(r, i));
    const n = [...a.data].map((i, o) => s.type._parseSync(new U(a, i, a.path, o)));
    return A.mergeArray(r, n);
  }
  get element() {
    return this._def.type;
  }
  min(e, a) {
    return new R({
      ...this._def,
      minLength: { value: e, message: m.toString(a) }
    });
  }
  max(e, a) {
    return new R({
      ...this._def,
      maxLength: { value: e, message: m.toString(a) }
    });
  }
  length(e, a) {
    return new R({
      ...this._def,
      exactLength: { value: e, message: m.toString(a) }
    });
  }
  nonempty(e) {
    return this.min(1, e);
  }
}
R.create = (t, e) => new R({
  type: t,
  minLength: null,
  maxLength: null,
  exactLength: null,
  typeName: y.ZodArray,
  ..._(e)
});
function q(t) {
  if (t instanceof k) {
    const e = {};
    for (const a in t.shape) {
      const r = t.shape[a];
      e[a] = L.create(q(r));
    }
    return new k({
      ...t._def,
      shape: () => e
    });
  } else return t instanceof R ? new R({
    ...t._def,
    type: q(t.element)
  }) : t instanceof L ? L.create(q(t.unwrap())) : t instanceof V ? V.create(q(t.unwrap())) : t instanceof F ? F.create(t.items.map((e) => q(e))) : t;
}
class k extends v {
  constructor() {
    super(...arguments), this._cached = null, this.nonstrict = this.passthrough, this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const e = this._def.shape(), a = b.objectKeys(e);
    return this._cached = { shape: e, keys: a }, this._cached;
  }
  _parse(e) {
    if (this._getType(e) !== u.object) {
      const f = this._getOrReturnCtx(e);
      return l(f, {
        code: c.invalid_type,
        expected: u.object,
        received: f.parsedType
      }), p;
    }
    const { status: r, ctx: s } = this._processInputParams(e), { shape: n, keys: i } = this._getCached(), o = [];
    if (!(this._def.catchall instanceof Z && this._def.unknownKeys === "strip"))
      for (const f in s.data)
        i.includes(f) || o.push(f);
    const d = [];
    for (const f of i) {
      const g = n[f], E = s.data[f];
      d.push({
        key: { status: "valid", value: f },
        value: g._parse(new U(s, E, s.path, f)),
        alwaysSet: f in s.data
      });
    }
    if (this._def.catchall instanceof Z) {
      const f = this._def.unknownKeys;
      if (f === "passthrough")
        for (const g of o)
          d.push({
            key: { status: "valid", value: g },
            value: { status: "valid", value: s.data[g] }
          });
      else if (f === "strict")
        o.length > 0 && (l(s, {
          code: c.unrecognized_keys,
          keys: o
        }), r.dirty());
      else if (f !== "strip") throw new Error("Internal ZodObject error: invalid unknownKeys value.");
    } else {
      const f = this._def.catchall;
      for (const g of o) {
        const E = s.data[g];
        d.push({
          key: { status: "valid", value: g },
          value: f._parse(
            new U(s, E, s.path, g)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: g in s.data
        });
      }
    }
    return s.common.async ? Promise.resolve().then(async () => {
      const f = [];
      for (const g of d) {
        const E = await g.key, M = await g.value;
        f.push({
          key: E,
          value: M,
          alwaysSet: g.alwaysSet
        });
      }
      return f;
    }).then((f) => A.mergeObjectSync(r, f)) : A.mergeObjectSync(r, d);
  }
  get shape() {
    return this._def.shape();
  }
  strict(e) {
    return m.errToObj, new k({
      ...this._def,
      unknownKeys: "strict",
      ...e !== void 0 ? {
        errorMap: (a, r) => {
          var n, i;
          const s = ((i = (n = this._def).errorMap) == null ? void 0 : i.call(n, a, r).message) ?? r.defaultError;
          return a.code === "unrecognized_keys" ? {
            message: m.errToObj(e).message ?? s
          } : {
            message: s
          };
        }
      } : {}
    });
  }
  strip() {
    return new k({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new k({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(e) {
    return new k({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...e
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(e) {
    return new k({
      unknownKeys: e._def.unknownKeys,
      catchall: e._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...e._def.shape()
      }),
      typeName: y.ZodObject
    });
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(e, a) {
    return this.augment({ [e]: a });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(e) {
    return new k({
      ...this._def,
      catchall: e
    });
  }
  pick(e) {
    const a = {};
    for (const r of b.objectKeys(e))
      e[r] && this.shape[r] && (a[r] = this.shape[r]);
    return new k({
      ...this._def,
      shape: () => a
    });
  }
  omit(e) {
    const a = {};
    for (const r of b.objectKeys(this.shape))
      e[r] || (a[r] = this.shape[r]);
    return new k({
      ...this._def,
      shape: () => a
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return q(this);
  }
  partial(e) {
    const a = {};
    for (const r of b.objectKeys(this.shape)) {
      const s = this.shape[r];
      e && !e[r] ? a[r] = s : a[r] = s.optional();
    }
    return new k({
      ...this._def,
      shape: () => a
    });
  }
  required(e) {
    const a = {};
    for (const r of b.objectKeys(this.shape))
      if (e && !e[r])
        a[r] = this.shape[r];
      else {
        let n = this.shape[r];
        for (; n instanceof L; )
          n = n._def.innerType;
        a[r] = n;
      }
    return new k({
      ...this._def,
      shape: () => a
    });
  }
  keyof() {
    return Qe(b.objectKeys(this.shape));
  }
}
k.create = (t, e) => new k({
  shape: () => t,
  unknownKeys: "strip",
  catchall: Z.create(),
  typeName: y.ZodObject,
  ..._(e)
});
k.strictCreate = (t, e) => new k({
  shape: () => t,
  unknownKeys: "strict",
  catchall: Z.create(),
  typeName: y.ZodObject,
  ..._(e)
});
k.lazycreate = (t, e) => new k({
  shape: t,
  unknownKeys: "strip",
  catchall: Z.create(),
  typeName: y.ZodObject,
  ..._(e)
});
class ae extends v {
  _parse(e) {
    const { ctx: a } = this._processInputParams(e), r = this._def.options;
    function s(n) {
      for (const o of n)
        if (o.result.status === "valid")
          return o.result;
      for (const o of n)
        if (o.result.status === "dirty")
          return a.common.issues.push(...o.ctx.common.issues), o.result;
      const i = n.map((o) => new $(o.ctx.common.issues));
      return l(a, {
        code: c.invalid_union,
        unionErrors: i
      }), p;
    }
    if (a.common.async)
      return Promise.all(r.map(async (n) => {
        const i = {
          ...a,
          common: {
            ...a.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await n._parseAsync({
            data: a.data,
            path: a.path,
            parent: i
          }),
          ctx: i
        };
      })).then(s);
    {
      let n;
      const i = [];
      for (const d of r) {
        const f = {
          ...a,
          common: {
            ...a.common,
            issues: []
          },
          parent: null
        }, g = d._parseSync({
          data: a.data,
          path: a.path,
          parent: f
        });
        if (g.status === "valid")
          return g;
        g.status === "dirty" && !n && (n = { result: g, ctx: f }), f.common.issues.length && i.push(f.common.issues);
      }
      if (n)
        return a.common.issues.push(...n.ctx.common.issues), n.result;
      const o = i.map((d) => new $(d));
      return l(a, {
        code: c.invalid_union,
        unionErrors: o
      }), p;
    }
  }
  get options() {
    return this._def.options;
  }
}
ae.create = (t, e) => new ae({
  options: t,
  typeName: y.ZodUnion,
  ..._(e)
});
const O = (t) => t instanceof xe ? O(t.schema) : t instanceof z ? O(t.innerType()) : t instanceof se ? [t.value] : t instanceof D ? t.options : t instanceof ke ? b.objectValues(t.enum) : t instanceof ie ? O(t._def.innerType) : t instanceof ge ? [void 0] : t instanceof _e ? [null] : t instanceof L ? [void 0, ...O(t.unwrap())] : t instanceof V ? [null, ...O(t.unwrap())] : t instanceof Xe || t instanceof ce ? O(t.unwrap()) : t instanceof oe ? O(t._def.innerType) : [];
class Ae extends v {
  _parse(e) {
    const { ctx: a } = this._processInputParams(e);
    if (a.parsedType !== u.object)
      return l(a, {
        code: c.invalid_type,
        expected: u.object,
        received: a.parsedType
      }), p;
    const r = this.discriminator, s = a.data[r], n = this.optionsMap.get(s);
    return n ? a.common.async ? n._parseAsync({
      data: a.data,
      path: a.path,
      parent: a
    }) : n._parseSync({
      data: a.data,
      path: a.path,
      parent: a
    }) : (l(a, {
      code: c.invalid_union_discriminator,
      options: Array.from(this.optionsMap.keys()),
      path: [r]
    }), p);
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(e, a, r) {
    const s = /* @__PURE__ */ new Map();
    for (const n of a) {
      const i = O(n.shape[e]);
      if (!i.length)
        throw new Error(`A discriminator value for key \`${e}\` could not be extracted from all schema options`);
      for (const o of i) {
        if (s.has(o))
          throw new Error(`Discriminator property ${String(e)} has duplicate value ${String(o)}`);
        s.set(o, n);
      }
    }
    return new Ae({
      typeName: y.ZodDiscriminatedUnion,
      discriminator: e,
      options: a,
      optionsMap: s,
      ..._(r)
    });
  }
}
function be(t, e) {
  const a = j(t), r = j(e);
  if (t === e)
    return { valid: !0, data: t };
  if (a === u.object && r === u.object) {
    const s = b.objectKeys(e), n = b.objectKeys(t).filter((o) => s.indexOf(o) !== -1), i = { ...t, ...e };
    for (const o of n) {
      const d = be(t[o], e[o]);
      if (!d.valid)
        return { valid: !1 };
      i[o] = d.data;
    }
    return { valid: !0, data: i };
  } else if (a === u.array && r === u.array) {
    if (t.length !== e.length)
      return { valid: !1 };
    const s = [];
    for (let n = 0; n < t.length; n++) {
      const i = t[n], o = e[n], d = be(i, o);
      if (!d.valid)
        return { valid: !1 };
      s.push(d.data);
    }
    return { valid: !0, data: s };
  } else return a === u.date && r === u.date && +t == +e ? { valid: !0, data: t } : { valid: !1 };
}
class re extends v {
  _parse(e) {
    const { status: a, ctx: r } = this._processInputParams(e), s = (n, i) => {
      if (Pe(n) || Pe(i))
        return p;
      const o = be(n.value, i.value);
      return o.valid ? ((Ue(n) || Ue(i)) && a.dirty(), { status: a.value, value: o.data }) : (l(r, {
        code: c.invalid_intersection_types
      }), p);
    };
    return r.common.async ? Promise.all([
      this._def.left._parseAsync({
        data: r.data,
        path: r.path,
        parent: r
      }),
      this._def.right._parseAsync({
        data: r.data,
        path: r.path,
        parent: r
      })
    ]).then(([n, i]) => s(n, i)) : s(this._def.left._parseSync({
      data: r.data,
      path: r.path,
      parent: r
    }), this._def.right._parseSync({
      data: r.data,
      path: r.path,
      parent: r
    }));
  }
}
re.create = (t, e, a) => new re({
  left: t,
  right: e,
  typeName: y.ZodIntersection,
  ..._(a)
});
class F extends v {
  _parse(e) {
    const { status: a, ctx: r } = this._processInputParams(e);
    if (r.parsedType !== u.array)
      return l(r, {
        code: c.invalid_type,
        expected: u.array,
        received: r.parsedType
      }), p;
    if (r.data.length < this._def.items.length)
      return l(r, {
        code: c.too_small,
        minimum: this._def.items.length,
        inclusive: !0,
        exact: !1,
        type: "array"
      }), p;
    !this._def.rest && r.data.length > this._def.items.length && (l(r, {
      code: c.too_big,
      maximum: this._def.items.length,
      inclusive: !0,
      exact: !1,
      type: "array"
    }), a.dirty());
    const n = [...r.data].map((i, o) => {
      const d = this._def.items[o] || this._def.rest;
      return d ? d._parse(new U(r, i, r.path, o)) : null;
    }).filter((i) => !!i);
    return r.common.async ? Promise.all(n).then((i) => A.mergeArray(a, i)) : A.mergeArray(a, n);
  }
  get items() {
    return this._def.items;
  }
  rest(e) {
    return new F({
      ...this._def,
      rest: e
    });
  }
}
F.create = (t, e) => {
  if (!Array.isArray(t))
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  return new F({
    items: t,
    typeName: y.ZodTuple,
    rest: null,
    ..._(e)
  });
};
class ze extends v {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(e) {
    const { status: a, ctx: r } = this._processInputParams(e);
    if (r.parsedType !== u.map)
      return l(r, {
        code: c.invalid_type,
        expected: u.map,
        received: r.parsedType
      }), p;
    const s = this._def.keyType, n = this._def.valueType, i = [...r.data.entries()].map(([o, d], f) => ({
      key: s._parse(new U(r, o, r.path, [f, "key"])),
      value: n._parse(new U(r, d, r.path, [f, "value"]))
    }));
    if (r.common.async) {
      const o = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const d of i) {
          const f = await d.key, g = await d.value;
          if (f.status === "aborted" || g.status === "aborted")
            return p;
          (f.status === "dirty" || g.status === "dirty") && a.dirty(), o.set(f.value, g.value);
        }
        return { status: a.value, value: o };
      });
    } else {
      const o = /* @__PURE__ */ new Map();
      for (const d of i) {
        const f = d.key, g = d.value;
        if (f.status === "aborted" || g.status === "aborted")
          return p;
        (f.status === "dirty" || g.status === "dirty") && a.dirty(), o.set(f.value, g.value);
      }
      return { status: a.value, value: o };
    }
  }
}
ze.create = (t, e, a) => new ze({
  valueType: e,
  keyType: t,
  typeName: y.ZodMap,
  ..._(a)
});
class X extends v {
  _parse(e) {
    const { status: a, ctx: r } = this._processInputParams(e);
    if (r.parsedType !== u.set)
      return l(r, {
        code: c.invalid_type,
        expected: u.set,
        received: r.parsedType
      }), p;
    const s = this._def;
    s.minSize !== null && r.data.size < s.minSize.value && (l(r, {
      code: c.too_small,
      minimum: s.minSize.value,
      type: "set",
      inclusive: !0,
      exact: !1,
      message: s.minSize.message
    }), a.dirty()), s.maxSize !== null && r.data.size > s.maxSize.value && (l(r, {
      code: c.too_big,
      maximum: s.maxSize.value,
      type: "set",
      inclusive: !0,
      exact: !1,
      message: s.maxSize.message
    }), a.dirty());
    const n = this._def.valueType;
    function i(d) {
      const f = /* @__PURE__ */ new Set();
      for (const g of d) {
        if (g.status === "aborted")
          return p;
        g.status === "dirty" && a.dirty(), f.add(g.value);
      }
      return { status: a.value, value: f };
    }
    const o = [...r.data.values()].map((d, f) => n._parse(new U(r, d, r.path, f)));
    return r.common.async ? Promise.all(o).then((d) => i(d)) : i(o);
  }
  min(e, a) {
    return new X({
      ...this._def,
      minSize: { value: e, message: m.toString(a) }
    });
  }
  max(e, a) {
    return new X({
      ...this._def,
      maxSize: { value: e, message: m.toString(a) }
    });
  }
  size(e, a) {
    return this.min(e, a).max(e, a);
  }
  nonempty(e) {
    return this.min(1, e);
  }
}
X.create = (t, e) => new X({
  valueType: t,
  minSize: null,
  maxSize: null,
  typeName: y.ZodSet,
  ..._(e)
});
class xe extends v {
  get schema() {
    return this._def.getter();
  }
  _parse(e) {
    const { ctx: a } = this._processInputParams(e);
    return this._def.getter()._parse({ data: a.data, path: a.path, parent: a });
  }
}
xe.create = (t, e) => new xe({
  getter: t,
  typeName: y.ZodLazy,
  ..._(e)
});
class se extends v {
  _parse(e) {
    if (e.data !== this._def.value) {
      const a = this._getOrReturnCtx(e);
      return l(a, {
        received: a.data,
        code: c.invalid_literal,
        expected: this._def.value
      }), p;
    }
    return { status: "valid", value: e.data };
  }
  get value() {
    return this._def.value;
  }
}
se.create = (t, e) => new se({
  value: t,
  typeName: y.ZodLiteral,
  ..._(e)
});
function Qe(t, e) {
  return new D({
    values: t,
    typeName: y.ZodEnum,
    ..._(e)
  });
}
class D extends v {
  _parse(e) {
    if (typeof e.data != "string") {
      const a = this._getOrReturnCtx(e), r = this._def.values;
      return l(a, {
        expected: b.joinValues(r),
        received: a.parsedType,
        code: c.invalid_type
      }), p;
    }
    if (this._cache || (this._cache = new Set(this._def.values)), !this._cache.has(e.data)) {
      const a = this._getOrReturnCtx(e), r = this._def.values;
      return l(a, {
        received: a.data,
        code: c.invalid_enum_value,
        options: r
      }), p;
    }
    return C(e.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const e = {};
    for (const a of this._def.values)
      e[a] = a;
    return e;
  }
  get Values() {
    const e = {};
    for (const a of this._def.values)
      e[a] = a;
    return e;
  }
  get Enum() {
    const e = {};
    for (const a of this._def.values)
      e[a] = a;
    return e;
  }
  extract(e, a = this._def) {
    return D.create(e, {
      ...this._def,
      ...a
    });
  }
  exclude(e, a = this._def) {
    return D.create(this.options.filter((r) => !e.includes(r)), {
      ...this._def,
      ...a
    });
  }
}
D.create = Qe;
class ke extends v {
  _parse(e) {
    const a = b.getValidEnumValues(this._def.values), r = this._getOrReturnCtx(e);
    if (r.parsedType !== u.string && r.parsedType !== u.number) {
      const s = b.objectValues(a);
      return l(r, {
        expected: b.joinValues(s),
        received: r.parsedType,
        code: c.invalid_type
      }), p;
    }
    if (this._cache || (this._cache = new Set(b.getValidEnumValues(this._def.values))), !this._cache.has(e.data)) {
      const s = b.objectValues(a);
      return l(r, {
        received: r.data,
        code: c.invalid_enum_value,
        options: s
      }), p;
    }
    return C(e.data);
  }
  get enum() {
    return this._def.values;
  }
}
ke.create = (t, e) => new ke({
  values: t,
  typeName: y.ZodNativeEnum,
  ..._(e)
});
class ne extends v {
  unwrap() {
    return this._def.type;
  }
  _parse(e) {
    const { ctx: a } = this._processInputParams(e);
    if (a.parsedType !== u.promise && a.common.async === !1)
      return l(a, {
        code: c.invalid_type,
        expected: u.promise,
        received: a.parsedType
      }), p;
    const r = a.parsedType === u.promise ? a.data : Promise.resolve(a.data);
    return C(r.then((s) => this._def.type.parseAsync(s, {
      path: a.path,
      errorMap: a.common.contextualErrorMap
    })));
  }
}
ne.create = (t, e) => new ne({
  type: t,
  typeName: y.ZodPromise,
  ..._(e)
});
class z extends v {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === y.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(e) {
    const { status: a, ctx: r } = this._processInputParams(e), s = this._def.effect || null, n = {
      addIssue: (i) => {
        l(r, i), i.fatal ? a.abort() : a.dirty();
      },
      get path() {
        return r.path;
      }
    };
    if (n.addIssue = n.addIssue.bind(n), s.type === "preprocess") {
      const i = s.transform(r.data, n);
      if (r.common.async)
        return Promise.resolve(i).then(async (o) => {
          if (a.value === "aborted")
            return p;
          const d = await this._def.schema._parseAsync({
            data: o,
            path: r.path,
            parent: r
          });
          return d.status === "aborted" ? p : d.status === "dirty" || a.value === "dirty" ? G(d.value) : d;
        });
      {
        if (a.value === "aborted")
          return p;
        const o = this._def.schema._parseSync({
          data: i,
          path: r.path,
          parent: r
        });
        return o.status === "aborted" ? p : o.status === "dirty" || a.value === "dirty" ? G(o.value) : o;
      }
    }
    if (s.type === "refinement") {
      const i = (o) => {
        const d = s.refinement(o, n);
        if (r.common.async)
          return Promise.resolve(d);
        if (d instanceof Promise)
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        return o;
      };
      if (r.common.async === !1) {
        const o = this._def.schema._parseSync({
          data: r.data,
          path: r.path,
          parent: r
        });
        return o.status === "aborted" ? p : (o.status === "dirty" && a.dirty(), i(o.value), { status: a.value, value: o.value });
      } else
        return this._def.schema._parseAsync({ data: r.data, path: r.path, parent: r }).then((o) => o.status === "aborted" ? p : (o.status === "dirty" && a.dirty(), i(o.value).then(() => ({ status: a.value, value: o.value }))));
    }
    if (s.type === "transform")
      if (r.common.async === !1) {
        const i = this._def.schema._parseSync({
          data: r.data,
          path: r.path,
          parent: r
        });
        if (!B(i))
          return p;
        const o = s.transform(i.value, n);
        if (o instanceof Promise)
          throw new Error("Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.");
        return { status: a.value, value: o };
      } else
        return this._def.schema._parseAsync({ data: r.data, path: r.path, parent: r }).then((i) => B(i) ? Promise.resolve(s.transform(i.value, n)).then((o) => ({
          status: a.value,
          value: o
        })) : p);
    b.assertNever(s);
  }
}
z.create = (t, e, a) => new z({
  schema: t,
  typeName: y.ZodEffects,
  effect: e,
  ..._(a)
});
z.createWithPreprocess = (t, e, a) => new z({
  schema: e,
  effect: { type: "preprocess", transform: t },
  typeName: y.ZodEffects,
  ..._(a)
});
class L extends v {
  _parse(e) {
    return this._getType(e) === u.undefined ? C(void 0) : this._def.innerType._parse(e);
  }
  unwrap() {
    return this._def.innerType;
  }
}
L.create = (t, e) => new L({
  innerType: t,
  typeName: y.ZodOptional,
  ..._(e)
});
class V extends v {
  _parse(e) {
    return this._getType(e) === u.null ? C(null) : this._def.innerType._parse(e);
  }
  unwrap() {
    return this._def.innerType;
  }
}
V.create = (t, e) => new V({
  innerType: t,
  typeName: y.ZodNullable,
  ..._(e)
});
class ie extends v {
  _parse(e) {
    const { ctx: a } = this._processInputParams(e);
    let r = a.data;
    return a.parsedType === u.undefined && (r = this._def.defaultValue()), this._def.innerType._parse({
      data: r,
      path: a.path,
      parent: a
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
}
ie.create = (t, e) => new ie({
  innerType: t,
  typeName: y.ZodDefault,
  defaultValue: typeof e.default == "function" ? e.default : () => e.default,
  ..._(e)
});
class oe extends v {
  _parse(e) {
    const { ctx: a } = this._processInputParams(e), r = {
      ...a,
      common: {
        ...a.common,
        issues: []
      }
    }, s = this._def.innerType._parse({
      data: r.data,
      path: r.path,
      parent: {
        ...r
      }
    });
    return ee(s) ? s.then((n) => ({
      status: "valid",
      value: n.status === "valid" ? n.value : this._def.catchValue({
        get error() {
          return new $(r.common.issues);
        },
        input: r.data
      })
    })) : {
      status: "valid",
      value: s.status === "valid" ? s.value : this._def.catchValue({
        get error() {
          return new $(r.common.issues);
        },
        input: r.data
      })
    };
  }
  removeCatch() {
    return this._def.innerType;
  }
}
oe.create = (t, e) => new oe({
  innerType: t,
  typeName: y.ZodCatch,
  catchValue: typeof e.catch == "function" ? e.catch : () => e.catch,
  ..._(e)
});
class Ve extends v {
  _parse(e) {
    if (this._getType(e) !== u.nan) {
      const r = this._getOrReturnCtx(e);
      return l(r, {
        code: c.invalid_type,
        expected: u.nan,
        received: r.parsedType
      }), p;
    }
    return { status: "valid", value: e.data };
  }
}
Ve.create = (t) => new Ve({
  typeName: y.ZodNaN,
  ..._(t)
});
class Xe extends v {
  _parse(e) {
    const { ctx: a } = this._processInputParams(e), r = a.data;
    return this._def.type._parse({
      data: r,
      path: a.path,
      parent: a
    });
  }
  unwrap() {
    return this._def.type;
  }
}
class Ee extends v {
  _parse(e) {
    const { status: a, ctx: r } = this._processInputParams(e);
    if (r.common.async)
      return (async () => {
        const n = await this._def.in._parseAsync({
          data: r.data,
          path: r.path,
          parent: r
        });
        return n.status === "aborted" ? p : n.status === "dirty" ? (a.dirty(), G(n.value)) : this._def.out._parseAsync({
          data: n.value,
          path: r.path,
          parent: r
        });
      })();
    {
      const s = this._def.in._parseSync({
        data: r.data,
        path: r.path,
        parent: r
      });
      return s.status === "aborted" ? p : s.status === "dirty" ? (a.dirty(), {
        status: "dirty",
        value: s.value
      }) : this._def.out._parseSync({
        data: s.value,
        path: r.path,
        parent: r
      });
    }
  }
  static create(e, a) {
    return new Ee({
      in: e,
      out: a,
      typeName: y.ZodPipeline
    });
  }
}
class ce extends v {
  _parse(e) {
    const a = this._def.innerType._parse(e), r = (s) => (B(s) && (s.value = Object.freeze(s.value)), s);
    return ee(a) ? a.then((s) => r(s)) : r(a);
  }
  unwrap() {
    return this._def.innerType;
  }
}
ce.create = (t, e) => new ce({
  innerType: t,
  typeName: y.ZodReadonly,
  ..._(e)
});
var y;
(function(t) {
  t.ZodString = "ZodString", t.ZodNumber = "ZodNumber", t.ZodNaN = "ZodNaN", t.ZodBigInt = "ZodBigInt", t.ZodBoolean = "ZodBoolean", t.ZodDate = "ZodDate", t.ZodSymbol = "ZodSymbol", t.ZodUndefined = "ZodUndefined", t.ZodNull = "ZodNull", t.ZodAny = "ZodAny", t.ZodUnknown = "ZodUnknown", t.ZodNever = "ZodNever", t.ZodVoid = "ZodVoid", t.ZodArray = "ZodArray", t.ZodObject = "ZodObject", t.ZodUnion = "ZodUnion", t.ZodDiscriminatedUnion = "ZodDiscriminatedUnion", t.ZodIntersection = "ZodIntersection", t.ZodTuple = "ZodTuple", t.ZodRecord = "ZodRecord", t.ZodMap = "ZodMap", t.ZodSet = "ZodSet", t.ZodFunction = "ZodFunction", t.ZodLazy = "ZodLazy", t.ZodLiteral = "ZodLiteral", t.ZodEnum = "ZodEnum", t.ZodEffects = "ZodEffects", t.ZodNativeEnum = "ZodNativeEnum", t.ZodOptional = "ZodOptional", t.ZodNullable = "ZodNullable", t.ZodDefault = "ZodDefault", t.ZodCatch = "ZodCatch", t.ZodPromise = "ZodPromise", t.ZodBranded = "ZodBranded", t.ZodPipeline = "ZodPipeline", t.ZodReadonly = "ZodReadonly";
})(y || (y = {}));
const h = P.create, le = ye.create, Ce = ve.create;
Z.create;
const T = R.create, x = k.create;
ae.create;
const Lt = Ae.create;
re.create;
F.create;
const he = se.create, I = D.create;
ne.create;
L.create;
V.create;
const $t = I(["high", "medium", "low"]), jt = h().regex(/^[a-zA-Z0-9]{15}(?:[a-zA-Z0-9]{3})?$/, "Invalid Salesforce id"), Pt = h().regex(/^[A-Za-z][A-Za-z0-9_]{0,79}$/, "Invalid object API name"), Ut = x({
  hostname: h().min(1).max(255),
  url: h().min(1).max(2048),
  route: h().max(2048).nullable(),
  objectApiName: Pt.nullable(),
  recordId: jt.nullable(),
  confidence: $t
}), Zt = I([
  "permission_sets",
  "permission_set_groups",
  "profiles",
  "sharing_rules",
  "sharing_settings",
  "user_access",
  "login_authentication",
  "connected_apps",
  "named_credentials",
  "external_credentials",
  "production_data",
  "destructive_metadata",
  "apex_callouts"
]), Mt = x({
  type: Zt,
  reason: h().min(1).max(500),
  whySensitive: h().min(1).max(500),
  manualAction: h().min(1).max(500),
  matchedPhrase: h().min(1).max(120)
}), Ft = x({
  id: h().min(1).max(80),
  prompt: h().min(1).max(500)
}), Dt = x({
  id: h().min(1).max(80),
  title: h().min(1).max(200),
  detail: h().min(1).max(2e3),
  metadataType: h().min(1).max(80)
}), zt = x({
  summary: h().min(1).max(500),
  objectApiName: h().max(80).nullable(),
  requestedChanges: T(h().min(1).max(300)).max(20)
}), Vt = x({
  filePath: h().min(1).max(260),
  metadataType: h().min(1).max(80),
  before: h().max(2e4).nullable(),
  after: h().min(1).max(2e4)
}), qt = x({
  severity: I(["info", "warning", "error"]),
  message: h().min(1).max(500),
  filePath: h().max(260).nullable()
}), Bt = x({
  status: I(["passed", "failed", "not_run"]),
  issues: T(qt).max(50)
}), Wt = I([
  "ANALYZE",
  "PLAN",
  "GENERATE",
  "VALIDATE",
  "REVIEW",
  "DEPLOY"
]), Gt = x({
  componentType: h().min(1).max(80),
  apiName: h().min(1).max(120),
  purpose: h().min(1).max(500),
  dependencies: T(h().min(1).max(200)).max(20),
  assumptions: T(h().min(1).max(300)).max(20),
  deploymentOrder: h().min(1).max(400),
  testScenarios: T(h().min(1).max(300)).max(20),
  securityImpact: h().min(1).max(500),
  manualSetup: h().min(1).max(500)
}), Yt = x({
  interpretation: h().min(1).max(2e3),
  assumptions: T(h().min(1).max(400)).max(20),
  filesCreatedOrChanged: T(h().min(1).max(260)).max(50),
  generatedComponents: T(Gt).max(20),
  securityAndPermissionImpact: h().min(1).max(2e3),
  validationAndTestResults: h().min(1).max(2e3),
  deploymentPreview: h().min(1).max(2e3),
  remainingManualSteps: T(h().min(1).max(400)).max(20),
  knownLimitations: T(h().min(1).max(400)).max(20)
}), Ht = I([
  "not_requested",
  "blocked",
  "awaiting_approval",
  "in_progress",
  "succeeded",
  "failed"
]), Ne = x({
  requirement: h().trim().min(1, "Requirement cannot be empty").max(8e3, "Requirement is too large"),
  salesforceContext: Ut
}), Qt = x({
  ok: he(!0),
  correlationId: h().uuid(),
  blockedOperations: T(Mt),
  clarifyingQuestions: T(Ft),
  structuredRequirement: zt.nullable(),
  implementationPlan: T(Dt),
  metadataArtifacts: T(Vt),
  validation: Bt,
  deploymentStatus: Ht,
  operatingMode: Wt,
  taskReport: Yt.nullable(),
  warning: h().max(2e3).nullable()
}), Xt = x({
  ok: he(!1),
  correlationId: h().uuid(),
  code: I([
    "INVALID_REQUEST",
    "EMPTY_REQUIREMENT",
    "REQUIREMENT_TOO_LARGE",
    "MISSING_CONTEXT",
    "TIMEOUT",
    "UNAUTHORIZED",
    "INTERNAL_ERROR"
  ]),
  message: h().min(1).max(500)
}), Kt = Lt("ok", [
  Qt,
  Xt
]), Re = 1, Jt = x({
  environment: I(["production", "sandbox"])
});
x({
  authenticated: le(),
  username: h().max(255).nullable(),
  userId: h().max(80).nullable(),
  orgId: h().max(80).nullable(),
  instanceUrl: h().max(255).nullable(),
  environment: I(["production", "sandbox"]).nullable()
});
const ea = x({
  requirement: h().trim().min(1, "Requirement cannot be empty").max(8e3, "Requirement is too large"),
  objectApiName: h().max(80).nullable()
});
x({
  fullName: h().min(1).max(160),
  id: h().max(80).nullable(),
  created: le(),
  alreadyExists: le(),
  message: h().min(1).max(500)
});
const ta = I([
  "ANALYZE_REQUIREMENT",
  "CREATE_CUSTOM_FIELD",
  "CONNECT_SALESFORCE",
  "LOGOUT_SALESFORCE",
  "GET_AUTH_STATE",
  "PING"
]), aa = x({
  v: he(Re),
  type: ta,
  requestId: h().uuid(),
  payload: Ce().optional()
});
x({
  v: he(Re),
  requestId: h().uuid(),
  ok: le(),
  payload: Ce().optional(),
  error: x({
    code: h().min(1).max(80),
    message: h().min(1).max(500)
  }).optional()
});
const ra = [
  {
    type: "permission_set_groups",
    reason: "Permission set groups were requested.",
    whySensitive: "They grant bundled access across objects and can escalate privileges.",
    manualAction: "A Salesforce administrator must review and change permission set groups in Setup.",
    pattern: /\bpermission[\s_-]*set[\s_-]*groups?\b/i
  },
  {
    type: "permission_sets",
    reason: "Permission sets were requested.",
    whySensitive: "They change object, field, and user capabilities.",
    manualAction: "Create or assign permission sets manually in Setup after security review.",
    pattern: /\bpermission[\s_-]*sets?\b/i
  },
  {
    type: "profiles",
    reason: "Profile changes were requested.",
    whySensitive: "Profiles control baseline user access and are high-risk to automate.",
    manualAction: "An administrator must clone or edit the profile in Setup.",
    pattern: /\b(clone|update|edit|deploy|change|modify|create|assign)\b.{0,40}\bprofiles?\b|\bprofiles?\b.{0,40}\b(metadata|permissions?|object settings?)\b/i
  },
  {
    type: "sharing_rules",
    reason: "Sharing rules were requested.",
    whySensitive: "Sharing rules expand record visibility across the org.",
    manualAction: "Configure sharing rules manually in Setup → Sharing Settings.",
    pattern: /\bsharing[\s_-]*rules?\b/i
  },
  {
    type: "sharing_settings",
    reason: "Sharing settings or organization-wide defaults were requested.",
    whySensitive: "OWD and sharing settings change who can see records org-wide.",
    manualAction: "An administrator must change sharing settings in Setup.",
    pattern: /\bsharing settings\b|\borg[\s-]*wide[\s-]*defaults?\b|\bowd\b|\bmanual sharing\b/i
  },
  {
    type: "user_access",
    reason: "User access changes were requested.",
    whySensitive: "Assigning users or resetting access can grant unintended privileges.",
    manualAction: "Perform user assignment and access changes in Setup as an administrator.",
    pattern: /\b(user access|assign users?|reset password|login access)\b/i
  },
  {
    type: "login_authentication",
    reason: "Login or authentication settings were requested.",
    whySensitive: "SSO, MFA, password, and session settings affect how every user authenticates.",
    manualAction: "Change authentication in Setup → Identity / Session Settings after security review.",
    pattern: /\b(sso|saml|oauth provider|mfa|multi-factor|login hours|password policy|session settings|authentication provider)\b/i
  },
  {
    type: "connected_apps",
    reason: "Connected apps were requested.",
    whySensitive: "Connected apps can expose org APIs to external clients.",
    manualAction: "Create or modify connected apps in Setup after an integration review.",
    pattern: /\bconnected[\s_-]*apps?\b/i
  },
  {
    type: "named_credentials",
    reason: "Named credentials were requested.",
    whySensitive: "They store endpoints and secrets used for callouts.",
    manualAction: "Configure named credentials in Setup. Never paste secrets into this assistant.",
    pattern: /\bnamed[\s_-]*credentials?\b/i
  },
  {
    type: "external_credentials",
    reason: "External credentials were requested.",
    whySensitive: "They hold authentication material for outbound integrations.",
    manualAction: "Configure external credentials in Setup. Do not store secrets in source or prompts.",
    pattern: /\bexternal[\s_-]*credentials?\b/i
  },
  {
    type: "production_data",
    reason: "Production data changes were requested.",
    whySensitive: "Inserting, deleting, or anonymizing production records can cause data loss.",
    manualAction: "Use a sandbox and an approved data job. This assistant will not change production data.",
    pattern: /\b(production data|delete records?|insert \d+ records?|anonymize data)\b/i
  },
  {
    type: "destructive_metadata",
    reason: "A destructive metadata change was requested.",
    whySensitive: "Deleting fields or objects can permanently drop data and break dependents.",
    manualAction: "Use a destructiveChanges manifest reviewed by an administrator. Never auto-delete.",
    pattern: /\b(destructive(?:changes)?|delete (?:the )?field|remove custom object|purge metadata)\b/i
  },
  {
    type: "apex_callouts",
    reason: "Apex that performs external callouts was requested.",
    whySensitive: "Callouts can send org data to external systems without review.",
    manualAction: "Design the callout, remote site or named credential, and tests for explicit human review.",
    pattern: /\b(http callout|httprequest|external callout|callout=)\b/i
  }
];
function Ie(t) {
  const e = [], a = /* @__PURE__ */ new Set();
  for (const r of ra) {
    const s = r.pattern.exec(t);
    s && !a.has(r.type) && (a.add(r.type), e.push({
      type: r.type,
      reason: r.reason,
      whySensitive: r.whySensitive,
      manualAction: r.manualAction,
      matchedPhrase: s[0].slice(0, 120)
    }));
  }
  return e;
}
function sa(t) {
  return {
    ...t,
    url: t.url.split("?")[0] ?? t.url
  };
}
class na extends Error {
  constructor(a) {
    super(a);
    W(this, "name", "MessageValidationError");
  }
}
function ia(t) {
  const e = aa.safeParse(t);
  if (!e.success)
    throw new na("Invalid extension message");
  return e.data;
}
x({
  requirement: h(),
  salesforceContext: Ce()
});
const oa = [
  "Text and numeric",
  "Selection",
  "Specialized",
  "Structural and dynamic",
  "Relationship"
], de = [
  {
    id: "Text",
    metadataType: "Text",
    label: "Text",
    category: "Text and numeric",
    summary: "Letters, numbers, or symbols up to 255 characters.",
    aliases: ["string", "text field"]
  },
  {
    id: "TextArea",
    metadataType: "TextArea",
    label: "Text Area",
    category: "Text and numeric",
    summary: "Up to 255 characters across multiple lines.",
    aliases: ["textarea", "text-area"]
  },
  {
    id: "LongTextArea",
    metadataType: "LongTextArea",
    label: "Text Area (Long)",
    category: "Text and numeric",
    summary: "Up to 131,072 characters on separate lines.",
    aliases: ["long text", "long textarea", "long text area"]
  },
  {
    id: "Html",
    metadataType: "Html",
    label: "Text Area (Rich)",
    category: "Text and numeric",
    summary: "Formatted text, images, and links (rich text / HTML).",
    aliases: ["rich text", "rich textarea", "html", "rich text area"]
  },
  {
    id: "EncryptedText",
    metadataType: "EncryptedText",
    label: "Text (Encrypted)",
    category: "Text and numeric",
    summary: "Encrypted text up to 175 characters. Mask metadata only; never store secrets in source.",
    aliases: ["encrypted", "encrypted text"]
  },
  {
    id: "Number",
    metadataType: "Number",
    label: "Number",
    category: "Text and numeric",
    summary: "Integer or decimal values up to 18 digits total.",
    aliases: ["integer", "numeric"]
  },
  {
    id: "Percent",
    metadataType: "Percent",
    label: "Percent",
    category: "Text and numeric",
    summary: "Decimal values displayed with a percent sign.",
    aliases: ["percentage"]
  },
  {
    id: "Currency",
    metadataType: "Currency",
    label: "Currency",
    category: "Text and numeric",
    summary: "Monetary amounts using the org currency symbol.",
    aliases: ["money"]
  },
  {
    id: "Picklist",
    metadataType: "Picklist",
    label: "Picklist",
    category: "Selection",
    summary: "Single value from a predefined list.",
    aliases: ["drop down", "dropdown"]
  },
  {
    id: "MultiselectPicklist",
    metadataType: "MultiselectPicklist",
    label: "Picklist (Multi-Select)",
    category: "Selection",
    summary: "Multiple values stored as semicolon-delimited text.",
    aliases: ["multi-select", "multiselect", "multi select picklist"]
  },
  {
    id: "Checkbox",
    metadataType: "Checkbox",
    label: "Checkbox",
    category: "Selection",
    summary: "True/false boolean toggle.",
    aliases: ["boolean", "checkbox field"]
  },
  {
    id: "Email",
    metadataType: "Email",
    label: "Email",
    category: "Specialized",
    summary: "Validates a standard email address format.",
    aliases: ["e-mail"]
  },
  {
    id: "Phone",
    metadataType: "Phone",
    label: "Phone",
    category: "Specialized",
    summary: "Telephone numbers; client apps own final formatting.",
    aliases: ["telephone"]
  },
  {
    id: "Url",
    metadataType: "Url",
    label: "URL",
    category: "Specialized",
    summary: "Web address stored and displayed as a hyperlink.",
    aliases: ["hyperlink", "website"]
  },
  {
    id: "Date",
    metadataType: "Date",
    label: "Date",
    category: "Specialized",
    summary: "Calendar day, month, and year.",
    aliases: []
  },
  {
    id: "DateTime",
    metadataType: "DateTime",
    label: "Date/Time",
    category: "Specialized",
    summary: "Calendar date plus a time of day.",
    aliases: ["datetime", "date time", "date-time"]
  },
  {
    id: "AutoNumber",
    metadataType: "AutoNumber",
    label: "Auto Number",
    category: "Specialized",
    summary: "System-generated sequential number using an admin format.",
    aliases: ["autonumber", "auto-number"]
  },
  {
    id: "Formula",
    metadataType: null,
    label: "Formula",
    category: "Structural and dynamic",
    summary: "Read-only calculated value from an expression.",
    aliases: ["calculated"]
  },
  {
    id: "Summary",
    metadataType: "Summary",
    label: "Roll-Up Summary",
    category: "Structural and dynamic",
    summary: "Aggregates child records on a master-detail parent (COUNT, SUM, MIN, MAX).",
    aliases: ["rollup", "roll-up", "roll up summary"]
  },
  {
    id: "Lookup",
    metadataType: "Lookup",
    label: "Lookup Relationship",
    category: "Relationship",
    summary: "Loose foreign-key link to another object.",
    aliases: ["lookup field"]
  },
  {
    id: "MasterDetail",
    metadataType: "MasterDetail",
    label: "Master-Detail Relationship",
    category: "Relationship",
    summary: "Tight parent-child link; master controls delete, sharing, and visibility.",
    aliases: ["master detail", "master-detail"]
  },
  {
    id: "ExternalLookup",
    metadataType: "ExternalLookup",
    label: "External Lookup Relationship",
    category: "Relationship",
    summary: "Link to an external object whose data lives outside Salesforce.",
    aliases: ["external lookup"]
  }
];
oa.map((t) => ({
  category: t,
  types: de.filter((e) => e.category === t)
}));
function ca(t) {
  const e = t.trim().toLowerCase().replace(/\s+/g, " ");
  return de.find((a) => a.id.toLowerCase() === e || a.label.toLowerCase() === e || a.metadataType && a.metadataType.toLowerCase() === e ? !0 : a.aliases.some((r) => r.toLowerCase() === e));
}
const la = [
  { id: "ExternalLookup", pattern: /\bexternal[\s-]*lookup\b/i },
  { id: "MasterDetail", pattern: /\bmaster[\s-]*detail\b/i },
  { id: "Summary", pattern: /\broll[\s-]*up(?:\s+summary)?\b|\bsummary\s+field\b/i },
  { id: "Formula", pattern: /\bformula\b/i },
  { id: "EncryptedText", pattern: /\bencrypted(?:\s+text)?\b|\btext\s*\(\s*encrypted\s*\)/i },
  { id: "Html", pattern: /\brich(?:\s+text)?(?:\s+area)?\b|\bhtml\b|\btext\s*area\s*\(\s*rich\s*\)/i },
  { id: "LongTextArea", pattern: /\blong[\s-]*text(?:\s*area)?\b|\btext\s*area\s*\(\s*long\s*\)/i },
  { id: "MultiselectPicklist", pattern: /\bmulti[\s-]*select(?:\s+picklist)?\b|\bpicklist\s*\(\s*multi/i },
  { id: "AutoNumber", pattern: /\bauto[\s-]*number\b/i },
  { id: "DateTime", pattern: /\bdate[\s/:-]*time\b|\bdatetime\b/i },
  { id: "Lookup", pattern: /\blookup(?:\s+relationship)?\b/i },
  { id: "TextArea", pattern: /\btext[\s-]*area\b|\btextarea\b/i },
  { id: "Picklist", pattern: /\bpicklist\b|\bdrop[\s-]*down\b/i },
  { id: "Checkbox", pattern: /\bcheckbox\b|\bboolean\b/i },
  { id: "Currency", pattern: /\bcurrency\b|\bmoney\b/i },
  { id: "Percent", pattern: /\bpercent(?:age)?\b/i },
  { id: "Email", pattern: /\be-?mail\b/i },
  { id: "Phone", pattern: /\bphone\b|\btelephone\b/i },
  { id: "Url", pattern: /\burl\b|\bhyperlink\b|\bwebsite\b/i },
  { id: "Number", pattern: /\bnumber\b|\binteger\b|\bnumeric\b/i },
  { id: "Date", pattern: /\bdate\b/i },
  { id: "Text", pattern: /\btext\b|\bstring\b/i }
];
function qe(t) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function da(t) {
  const e = t.replace(/__c$/i, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 36), a = e.length > 0 ? e : "Custom_Field";
  return `${/^[A-Za-z]/.test(a) ? a : `X_${a}`}__c`;
}
function ua(t) {
  const e = t.replace(/__c$/i, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40), a = e.length > 0 ? e : "Related";
  return /^[A-Za-z]/.test(a) ? a : `X_${a}`;
}
function ma(t) {
  const e = t.match(/Field data type:\s*([^\n.]+)/i);
  if (e != null && e[1])
    return ca(e[1]);
}
function ha(t) {
  const e = ma(t);
  if (e)
    return e.id;
  const a = la.find((r) => r.pattern.test(t));
  return (a == null ? void 0 : a.id) ?? "Text";
}
function fa(t) {
  var a, r;
  const e = ((a = t.match(/\b(?:values?|options?)\s*[:\-]\s*([^\n]+)/i)) == null ? void 0 : a[1]) ?? ((r = t.match(/\bwith\s+(.+?)\s+values?\b/i)) == null ? void 0 : r[1]);
  return e ? e.split(/[;,]|\band\b/i).map((s) => s.replace(/[.]+$/, "").trim()).filter((s) => s.length > 0 && s.length <= 255).slice(0, 40) : [];
}
function pa(t, e) {
  const a = t.match(
    /\b(?:lookup\s+to|related\s+to|parent(?:\s+object)?|reference(?:\s*to)?|external\s+object)\s*:?\s*([A-Za-z][A-Za-z0-9_]{0,79})\b/i
  );
  if (a != null && a[1])
    return a[1];
  if (e === "Lookup" || e === "MasterDetail" || e === "ExternalLookup") {
    const r = t.match(
      /\bto\s+(?:the\s+)?([A-Za-z][A-Za-z0-9_]{0,79})(?:\s+object)?\b/i
    );
    if (r != null && r[1] && !/^(?:the|a|an|this)$/i.test(r[1]))
      return r[1];
  }
}
function ya(t) {
  const e = t.match(/\bformula\s*[:\-]\s*([^\n]+)/i);
  if (!(e != null && e[1]))
    return;
  const a = e[1].replace(
    /\s+returns?\s+(text|number|currency|percent|checkbox|date(?:\s*\/\s*time)?|datetime)\s*$/i,
    ""
  ).trim();
  if (a && !/^field data type/i.test(a))
    return a.slice(0, 1300);
}
function ga(t) {
  var r;
  const e = t.match(
    /\breturns?\s+(text|number|currency|percent|checkbox|date(?:\s*\/\s*time)?|datetime)\b/i
  ), a = ((r = e == null ? void 0 : e[1]) == null ? void 0 : r.toLowerCase().replace(/\s+/g, "")) ?? "";
  return a === "number" ? "Number" : a === "currency" ? "Currency" : a === "percent" ? "Percent" : a === "checkbox" ? "Checkbox" : a === "date" ? "Date" : a === "datetime" || a === "date/time" ? "DateTime" : "Text";
}
function _a(t) {
  if (/\bcount\b/i.test(t)) return "Count";
  if (/\bsum\b/i.test(t)) return "Sum";
  if (/\bmin(?:imum)?\b/i.test(t)) return "Min";
  if (/\bmax(?:imum)?\b/i.test(t)) return "Max";
}
function va(t) {
  const e = t.match(
    /\b(?:sum|min(?:imum)?|max(?:imum)?)\s+(?:of\s+)?([A-Za-z][A-Za-z0-9_.]{0,79})\b/i
  );
  return e == null ? void 0 : e[1];
}
function ba(t) {
  const e = t.match(
    /\b(?:from|child)\s+(?:the\s+)?([A-Za-z][A-Za-z0-9_]{0,79})(?:\s+object)?\b/i
  );
  return e == null ? void 0 : e[1];
}
function xa(t) {
  var a;
  const e = t.match(/\bformat\s*[:\-]\s*([^\n]+)/i);
  return (a = e == null ? void 0 : e[1]) == null ? void 0 : a.trim().slice(0, 30);
}
function ka(t) {
  for (const e of de)
    if (e.id === t)
      return e;
  return de.filter((e) => e.id === "Text")[0] ?? {
    id: "Text",
    metadataType: "Text",
    label: "Text",
    category: "Text and numeric",
    summary: "Letters, numbers, or symbols up to 255 characters.",
    aliases: []
  };
}
function wa(t) {
  return t.catalogId === "Formula" ? t.formulaReturnType ?? "Text" : t.fieldType;
}
function Ta(t) {
  const e = [];
  return (t.catalogId === "Picklist" || t.catalogId === "MultiselectPicklist") && t.picklistValues.length === 0 && e.push({
    id: "picklist-values",
    prompt: "List the picklist values (comma or semicolon separated). Example: values: New, Working, Closed."
  }), (t.catalogId === "Lookup" || t.catalogId === "MasterDetail" || t.catalogId === "ExternalLookup") && !t.referenceTo && e.push({
    id: "relationship-target",
    prompt: `Which object should ${t.displayName} ${t.label} point to? Example: lookup to Contact.`
  }), t.catalogId === "Formula" && !t.formula && e.push({
    id: "formula-expression",
    prompt: "Provide the formula expression and return type. Example: formula: 1 + 1 returns Number."
  }), t.catalogId === "Summary" && (t.summaryOperation || e.push({
    id: "summary-operation",
    prompt: "Which roll-up operation: COUNT, SUM, MIN, or MAX?"
  }), t.summaryForeignKey || e.push({
    id: "summary-child",
    prompt: "Which child object in the master-detail relationship should roll up? Example: from Opportunity."
  }), t.summaryOperation && t.summaryOperation !== "Count" && !t.summarizedField && e.push({
    id: "summary-field",
    prompt: "Which child field should be aggregated? Example: of Amount."
  })), e;
}
function Oe(t, e) {
  var $e;
  const a = t.match(/["“”']([^"“”']{1,80})["“”']/), r = t.match(
    /\b(?:on|in|for)\s+(?:the\s+)?([A-Za-z][A-Za-z0-9_]{0,79})(?:\s+object)?\b/i
  ), s = ha(t), n = ka(s), i = (($e = a == null ? void 0 : a[1]) == null ? void 0 : $e.trim()) || "Custom Field", o = (r == null ? void 0 : r[1]) ?? e ?? "Account", d = s === "Formula" ? ga(t) : void 0, f = s === "Formula" ? d ?? "Text" : n.metadataType ?? "Text", g = pa(t, s), E = s === "Formula" ? ya(t) : void 0, M = s === "Summary" ? _a(t) : void 0, K = s === "Summary" ? va(t) : void 0, Le = s === "Summary" ? ba(t) : void 0, w = {
    label: i,
    apiName: da(i),
    catalogId: s,
    fieldType: f,
    objectApiName: o,
    displayName: n.label,
    picklistValues: fa(t),
    relationshipName: ua(i),
    relationshipLabel: i,
    ...g ? { referenceTo: g } : {},
    ...E ? { formula: E } : {},
    ...d ? { formulaReturnType: d } : {},
    ...M ? { summaryOperation: M } : {},
    ...K ? { summarizedField: K } : {},
    ...Le ? { summaryForeignKey: Le } : {},
    ...s === "AutoNumber" ? { displayFormat: xa(t) ?? "A-{0000}", startingNumber: 1 } : {},
    ...s === "EncryptedText" ? { maskType: "all", maskChar: "asterisk" } : {},
    ...s === "Checkbox" ? { defaultValue: "false" } : {}
  };
  return s === "Text" && (w.length = 255), s === "TextArea" && (w.length = 255), s === "LongTextArea" && (w.length = 32768, w.visibleLines = 5), s === "Html" && (w.length = 32768, w.visibleLines = 10), s === "EncryptedText" && (w.length = 175), s === "Number" && (w.precision = 18, w.scale = 0), (s === "Currency" || s === "Percent") && (w.precision = 18, w.scale = 2), s === "Formula" && (d === "Number" || d === "Currency" || d === "Percent") && (w.precision = 18, w.scale = 2), s === "MultiselectPicklist" && (w.visibleLines = 4), {
    ...w,
    clarifyingQuestions: Ta(w)
  };
}
function Ke(t) {
  const a = {
    type: wa(t),
    label: t.label
  };
  if (t.catalogId === "Checkbox" || t.catalogId === "AutoNumber" || t.catalogId === "Formula" || t.catalogId === "Summary" || (a.required = !1), t.length !== void 0 && (a.length = t.length), t.visibleLines !== void 0 && (a.visibleLines = t.visibleLines), t.precision !== void 0 && (a.precision = t.precision), t.scale !== void 0 && (a.scale = t.scale), t.defaultValue !== void 0 && (a.defaultValue = t.defaultValue === "true"), t.displayFormat && (a.displayFormat = t.displayFormat), t.startingNumber !== void 0 && (a.startingNumber = t.startingNumber), t.maskType && (a.maskType = t.maskType), t.maskChar && (a.maskChar = t.maskChar), t.formula) {
    a.formula = t.formula;
    const s = t.formulaReturnType === "Number" || t.formulaReturnType === "Currency" || t.formulaReturnType === "Percent";
    a.formulaTreatBlanksAs = s ? "BlankAsZero" : "BlankAsBlank";
  }
  if ((t.catalogId === "Picklist" || t.catalogId === "MultiselectPicklist") && (a.valueSet = {
    restricted: !0,
    valueSetDefinition: {
      sorted: !1,
      value: t.picklistValues.map((s, n) => ({
        fullName: s,
        default: n === 0,
        label: s
      }))
    }
  }), t.referenceTo && (a.referenceTo = t.referenceTo, a.relationshipName = t.relationshipName, a.relationshipLabel = t.relationshipLabel), t.catalogId === "Lookup" && (a.deleteConstraint = "SetNull"), t.catalogId === "MasterDetail" && (a.reparentableMasterDetail = !1, a.writeRequiresMasterRead = !1), t.catalogId === "Summary") {
    if (a.summaryOperation = t.summaryOperation, t.summaryForeignKey) {
      const s = t.summaryForeignKey.includes(".") ? t.summaryForeignKey : `${t.summaryForeignKey}.${t.objectApiName}Id`;
      a.summaryForeignKey = s;
    }
    t.summarizedField && t.summaryOperation !== "Count" && (a.summarizedField = t.summarizedField.includes(".") ? t.summarizedField : `${t.summaryForeignKey ?? "Child"}.${t.summarizedField}`);
  }
  return a;
}
function we(t, e = "  ") {
  const a = [];
  for (const [r, s] of Object.entries(t))
    if (s != null) {
      if (Array.isArray(s)) {
        for (const n of s)
          n && typeof n == "object" ? (a.push(`${e}<${r}>`), a.push(...we(n, `${e}  `)), a.push(`${e}</${r}>`)) : a.push(`${e}<${r}>${qe(String(n))}</${r}>`);
        continue;
      }
      if (typeof s == "object") {
        a.push(`${e}<${r}>`), a.push(...we(s, `${e}  `)), a.push(`${e}</${r}>`);
        continue;
      }
      a.push(`${e}<${r}>${qe(String(s))}</${r}>`);
    }
  return a;
}
function Sa(t) {
  const e = Ke(t), { type: a, label: r, ...s } = e, n = {
    fullName: t.apiName,
    label: r,
    type: a,
    ...s
  };
  return `<CustomField>
${we(n).join(`
`)}
</CustomField>`;
}
function Te(t, e) {
  return {
    ok: !0,
    correlationId: t,
    blockedOperations: [],
    clarifyingQuestions: e,
    structuredRequirement: null,
    implementationPlan: [],
    metadataArtifacts: [],
    validation: { status: "not_run", issues: [] },
    deploymentStatus: "not_requested",
    operatingMode: "ANALYZE",
    taskReport: null,
    warning: "ANALYZE mode only. No files were created or modified."
  };
}
function Aa(t, e) {
  const a = e[0];
  return {
    ok: !0,
    correlationId: t,
    blockedOperations: e,
    clarifyingQuestions: [],
    structuredRequirement: null,
    implementationPlan: [],
    metadataArtifacts: [],
    validation: { status: "not_run", issues: [] },
    deploymentStatus: "blocked",
    operatingMode: "ANALYZE",
    taskReport: a ? {
      interpretation: a.reason,
      assumptions: [],
      filesCreatedOrChanged: [],
      generatedComponents: [],
      securityAndPermissionImpact: `1. ${a.reason} 2. ${a.whySensitive} 3. ${a.manualAction}`,
      validationAndTestResults: "Not run. Security-sensitive work is stopped in ANALYZE.",
      deploymentPreview: "No deployment. The request is blocked.",
      remainingManualSteps: [a.manualAction],
      knownLimitations: ["The assistant will not generate or deploy this change."]
    } : null,
    warning: "Stopped for a security-sensitive change. See what was requested, why it is sensitive, and the manual administrator action."
  };
}
const Be = "Correctness and reviewability come first. Source-format metadata was generated in ANALYZE→REVIEW. DEPLOY is never automatic, never production, and requires a sandbox or scratch org with a check-only pass plus explicit human approval.";
function Ea(t) {
  return Sa(t);
}
function Ca(t, e, a, r, s, n, i) {
  const o = n ? [
    "State Flow type, object, trigger, entry criteria, data updates, recursion and bulk risks, failure path, and before-save vs after-save before generating a Flow."
  ] : [], d = i ? [
    "Explain why Apex is required instead of Flow. Use bulk-safe Apex, no SOQL/DML in loops, CRUD/FLS, sharing, tests (positive/negative/null/bulk/permission), and never SeeAllData=true unless unavoidable."
  ] : [];
  return {
    interpretation: `The request is to add ${r} field ${a} on ${e} from: ${t.slice(0, 400)}`,
    assumptions: [
      "Salesforce DX source format is the delivery format.",
      "No Salesforce IDs are hard-coded.",
      "Profiles, permission sets, sharing, credentials, and production data are out of scope.",
      "No secrets are stored in source, prompts, or logs.",
      ...o,
      ...d
    ],
    filesCreatedOrChanged: [s],
    generatedComponents: [
      {
        componentType: "CustomField",
        apiName: `${e}.${a}`,
        purpose: `Hold the "${Oe(t, e).label}" value on ${e}.`,
        dependencies: [`${e} object`],
        assumptions: ["Field-level security is left unchanged and must be set by an administrator."],
        deploymentOrder: `1) Deploy ${s} to a sandbox or scratch org after check-only validation. Never production automatically.`,
        testScenarios: [
          "Positive: field exists with the planned type and label.",
          "Negative: required-field rules are not assumed.",
          "Null: field may be empty.",
          "Bulk: Data Loader load of 200 records does not depend on this field.",
          "Permission: users without FLS cannot see the field until an admin grants it."
        ],
        securityImpact: "No profile, permission set, sharing, or credential change is included. FLS remains a manual Setup step.",
        manualSetup: "Set FLS, page layouts, and Lightning record pages in Setup after sandbox validation."
      }
    ],
    securityAndPermissionImpact: "No permission sets, profiles, sharing rules, sharing settings, user access, login settings, connected apps, or credentials are changed. CRUD/FLS for the new field is not auto-granted.",
    validationAndTestResults: "Static checks: DX source XML well-formed, no hard-coded IDs, no secrets, no destructiveChanges, no deploy commands. Salesforce CLI validation was not executed in this browser session.",
    deploymentPreview: "Field create is never automatic on ANALYZE. After you click Create field in this org, the Tooling API creates this CustomField in the signed-in sandbox, scratch, or Developer Edition org. Production create is blocked.",
    remainingManualSteps: [
      "Review the generated CustomField XML.",
      "Click Create field in this org (sandbox, scratch, or Developer Edition only).",
      "Set FLS, layouts, and list views in Setup.",
      "Confirm the field on the object in Object Manager."
    ],
    knownLimitations: [
      "This assistant does not modify org files until PLAN is approved; GENERATE emits source text only.",
      "Broad refactors and unrelated files are out of scope.",
      "Apex tests, Flow XML, and CLI runs require a project workspace outside this popup.",
      ...o,
      ...d
    ]
  };
}
function Na(t) {
  const e = t.trim();
  return /\bvalidation\s+rule\b/i.test(e) ? !0 : /\bcustom\s+object\b/i.test(e) && !/\bfield\b/i.test(e);
}
function Ra(t, e, a) {
  if (Na(t))
    return Te(a, [
      {
        id: "unsupported-metadata",
        prompt: "This assistant currently generates CustomField metadata only. Custom objects and validation rules are not created in the org from this panel."
      }
    ]);
  const r = Oe(t, e), s = `force-app/main/default/objects/${r.objectApiName}/fields/${r.apiName}.field-meta.xml`, n = /\bflow\b/i.test(t), i = /\bapex\b|\btrigger\b/i.test(t);
  if (r.clarifyingQuestions.length > 0)
    return {
      ...Te(a, r.clarifyingQuestions),
      structuredRequirement: {
        summary: t.slice(0, 500),
        objectApiName: r.objectApiName,
        requestedChanges: [
          `Need more detail to generate ${r.displayName} field ${r.apiName} on ${r.objectApiName}`
        ]
      }
    };
  const o = Ca(
    t,
    r.objectApiName,
    r.apiName,
    r.catalogId === "Formula" ? `Formula (${r.fieldType})` : r.displayName,
    s,
    n,
    i
  );
  return {
    ok: !0,
    correlationId: a,
    blockedOperations: [],
    clarifyingQuestions: [],
    structuredRequirement: {
      summary: t.slice(0, 500),
      objectApiName: r.objectApiName,
      requestedChanges: [
        `Generate ${r.apiName} (${r.displayName}, metadata type ${r.fieldType}) on ${r.objectApiName} in source format`
      ]
    },
    implementationPlan: [
      {
        id: "analyze",
        title: "ANALYZE",
        detail: o.interpretation,
        metadataType: "CustomField"
      },
      {
        id: "plan",
        title: "PLAN",
        detail: `Metadata type CustomField. Dependency: ${r.objectApiName}. Risk: FLS/layouts are manual. Tests: field presence and type. No files are modified in the org yet.`,
        metadataType: "CustomField"
      },
      {
        id: "generate",
        title: "GENERATE",
        detail: `Source-format XML for ${r.objectApiName}.${r.apiName} only. Small, traceable, no deploy.`,
        metadataType: "CustomField"
      },
      {
        id: "validate",
        title: "VALIDATE",
        detail: o.validationAndTestResults,
        metadataType: "CustomField"
      },
      {
        id: "review",
        title: "REVIEW",
        detail: "Changed file listed below. Security: FLS unchanged. Side effects: page layouts will not show the field until updated. Explicit approval is required before any deploy.",
        metadataType: "CustomField"
      },
      {
        id: "deploy",
        title: "DEPLOY",
        detail: "Not run yet. After REVIEW, Create field in this org calls the Tooling API on sandbox, scratch, or Developer Edition only. Never production. Never automatic on ANALYZE.",
        metadataType: "CustomField"
      }
    ],
    metadataArtifacts: [
      {
        filePath: s,
        metadataType: "CustomField",
        before: null,
        after: Ea(r)
      }
    ],
    validation: {
      status: "passed",
      issues: [
        {
          severity: "info",
          message: Be,
          filePath: s
        }
      ]
    },
    deploymentStatus: "awaiting_approval",
    operatingMode: "REVIEW",
    taskReport: o,
    warning: Be
  };
}
function Ia(t) {
  try {
    return new URL(t).hostname.toLowerCase();
  } catch {
    return "";
  }
}
function Oa(t) {
  const e = Ia(t);
  return e ? e.includes(".sandbox.") || e.includes("scratch.") || e.includes("-dev-ed.") || e.includes(".develop.") || /--[a-z0-9]+\.(sandbox\.)?my\.salesforce\.com$/i.test(e) : !1;
}
const La = "This org is not a sandbox, scratch org, or Developer Edition. The assistant will not create fields in production.", $a = "http://127.0.0.1:8787";
function J() {
  return crypto.randomUUID();
}
async function Je(t, e) {
  const a = Ne.safeParse({
    requirement: t,
    salesforceContext: sa(e)
  });
  if (!a.success) {
    const n = a.error.issues[0], i = (n == null ? void 0 : n.message) ?? "Invalid request", o = i.includes("empty") ? "EMPTY_REQUIREMENT" : i.includes("too large") ? "REQUIREMENT_TOO_LARGE" : "INVALID_REQUEST";
    return {
      ok: !1,
      correlationId: J(),
      code: o,
      message: i
    };
  }
  const r = Ie(a.data.requirement);
  return r.length > 0 ? Aa(J(), r) : a.data.requirement.trim().split(/\s+/).length < 6 ? Te(J(), [
    {
      id: "object",
      prompt: "Which Salesforce object should receive this change?"
    },
    {
      id: "values",
      prompt: "What field label, type, or picklist values are required?"
    }
  ]) : Ra(
    a.data.requirement,
    a.data.salesforceContext.objectApiName,
    J()
  );
}
function ja(t, e, a) {
  if (!Oa(a))
    throw new Error(La);
  const s = Ie(t)[0];
  if (s)
    throw new Error(s.reason);
  const n = Oe(t, e), i = n.clarifyingQuestions[0];
  if (i)
    throw new Error(i.prompt);
  return n;
}
const et = {
  authenticated: !1,
  username: null,
  userId: null,
  orgId: null,
  instanceUrl: null,
  environment: null
}, ue = "sfcopilot.sfAuth";
function Pa(t) {
  return t ? {
    authenticated: !0,
    username: t.username,
    userId: t.userId,
    orgId: t.orgId,
    instanceUrl: t.instanceUrl,
    environment: t.environment
  } : et;
}
function tt(t) {
  return t.replace(/Bearer\s+\S+/gi, "[redacted]").replace(/access_token[=:]\S+/gi, "[redacted]").replace(/refresh_token[=:]\S+/gi, "[redacted]").replace(/code_verifier[=:]\S+/gi, "[redacted]").replace(/[?&]code=[^&\s]+/gi, "[redacted]").replace(/client_secret[=:]\S+/gi, "[redacted]").slice(0, 400);
}
class S extends Error {
  constructor(a, r, s = 0) {
    super(tt(r));
    W(this, "name", "SalesforceApiError");
    W(this, "status");
    W(this, "code");
    this.code = a, this.status = s;
  }
}
function Ua(t, e) {
  return t === 401 ? new S(
    "expired",
    "Your Salesforce session has expired.",
    401
  ) : t === 403 ? new S(
    "forbidden",
    "You don't have permission to perform this operation.",
    403
  ) : t === 400 ? new S("validation", e, 400) : new S("unknown", e, t);
}
const Za = "62.0";
function Ma(t) {
  const e = t.startsWith("/") ? t : `/${t}`;
  return e.startsWith("/services/") ? e : `/services/data/v${Za}${e}`;
}
async function Fa(t, e, a = {}, r = fetch) {
  const s = new Headers(a.headers);
  s.set("authorization", `Bearer ${t.accessToken}`), a.body && !s.has("content-type") && s.set("content-type", "application/json");
  try {
    return await r(`${t.instanceUrl}${Ma(e)}`, {
      ...a,
      headers: s
    });
  } catch {
    throw new S(
      "network",
      "Unable to reach Salesforce. Please check your connection."
    );
  }
}
function We(t, e) {
  if (t.ok)
    return;
  const a = at(e);
  throw Ua(t.status, a || `Salesforce rejected the request (${t.status}).`);
}
function at(t) {
  if (Array.isArray(t) && t[0] && typeof t[0] == "object" && "message" in t[0]) {
    const e = t[0].message;
    return typeof e == "string" ? e : null;
  }
  return t && typeof t == "object" && "message" in t && typeof t.message == "string" ? t.message : null;
}
function Da(t) {
  return {
    FullName: `${t.objectApiName}.${t.apiName}`,
    Metadata: Ke(t)
  };
}
async function za(t, e, a = fetch) {
  const r = await Fa(
    t,
    "/tooling/sobjects/CustomField/",
    {
      method: "POST",
      body: JSON.stringify(Da(e))
    },
    a
  ), s = await r.json().catch(() => null);
  if (r.ok)
    return {
      id: s && typeof s == "object" && "id" in s && typeof s.id == "string" ? s.id : null,
      created: !0,
      alreadyExists: !1,
      message: `Created ${e.objectApiName}.${e.apiName} in this org. Set FLS and page layouts in Setup.`
    };
  const n = at(s) || `Salesforce rejected the field (${r.status}).`;
  if (Va(n))
    return {
      id: null,
      created: !1,
      alreadyExists: !0,
      message: `${e.objectApiName}.${e.apiName} already exists in this org. Open Object Manager → ${e.objectApiName} → Fields & Relationships.`
    };
  throw (r.status === 401 || r.status === 403) && We(r, s), r.status === 400 ? new S("validation", n, 400) : (We(r, s), new S("unknown", n, r.status));
}
function Va(t) {
  return /already has a field|already exists|duplicate developer name|duplicate value/i.test(
    t
  );
}
const me = {
  clientId: "YOUR_CONNECTED_APP_CLIENT_ID",
  productionLoginUrl: "https://login.salesforce.com",
  sandboxLoginUrl: "https://test.salesforce.com"
};
function qa(t) {
  return t === "sandbox" ? me.sandboxLoginUrl : me.productionLoginUrl;
}
function Ba(t = me.clientId) {
  return !!t && !t.startsWith("YOUR_");
}
const Wa = "api id refresh_token";
function Se(t) {
  let e = "";
  for (const a of t)
    e += String.fromCharCode(a);
  return btoa(e).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function Ga() {
  const t = new Uint8Array(32);
  crypto.getRandomValues(t);
  const e = Se(t), a = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(e));
  return {
    codeVerifier: e,
    codeChallenge: Se(new Uint8Array(a)),
    codeChallengeMethod: "S256"
  };
}
function Ya() {
  const t = new Uint8Array(16);
  return crypto.getRandomValues(t), Se(t);
}
function Ha() {
  return {
    getRedirectURL: () => chrome.identity.getRedirectURL("oauth2"),
    launchWebAuthFlow: (t) => new Promise((e, a) => {
      chrome.identity.launchWebAuthFlow(t, (r) => {
        if (chrome.runtime.lastError) {
          a(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!r) {
          a(new Error("Salesforce authentication was cancelled."));
          return;
        }
        e(r);
      });
    }),
    fetch
  };
}
function Qa(t) {
  const e = new URLSearchParams({
    response_type: "code",
    client_id: t.clientId,
    redirect_uri: t.redirectUri,
    code_challenge: t.codeChallenge,
    code_challenge_method: "S256",
    scope: Wa,
    state: t.state
  });
  return `${t.loginUrl}/services/oauth2/authorize?${e.toString()}`;
}
function Xa(t, e) {
  const a = new URL(t), r = new URLSearchParams(a.search || a.hash.replace(/^#/, "")), s = r.get("error");
  if (s)
    throw s === "access_denied" ? new Error("Salesforce authentication was cancelled.") : new Error("Unable to connect to Salesforce.");
  const n = r.get("state");
  if (!n || n !== e)
    throw new Error("Unable to connect to Salesforce.");
  const i = r.get("code");
  if (!i)
    throw new Error("Unable to connect to Salesforce.");
  return i;
}
async function Ka(t) {
  const e = new URLSearchParams({
    grant_type: "authorization_code",
    code: t.code,
    client_id: t.clientId,
    redirect_uri: t.redirectUri,
    code_verifier: t.codeVerifier
  });
  let a;
  try {
    a = await (t.fetchImpl ?? fetch)(`${t.loginUrl}/services/oauth2/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: e
    });
  } catch {
    throw new S("network", "Unable to reach Salesforce. Please check your connection.");
  }
  const r = await a.json().catch(() => ({}));
  if (!a.ok || !r.access_token || !r.instance_url)
    throw r.error === "invalid_grant" ? new Error("Unable to connect to Salesforce.") : new Error("Unable to connect to Salesforce.");
  return {
    accessToken: r.access_token,
    refreshToken: r.refresh_token ?? null,
    instanceUrl: r.instance_url.replace(/\/$/, ""),
    idUrl: r.id ?? ""
  };
}
async function Ja(t, e, a = fetch) {
  let r;
  try {
    r = await a(`${t}/services/oauth2/userinfo`, {
      headers: { authorization: `Bearer ${e}` }
    });
  } catch {
    throw new S("network", "Unable to reach Salesforce. Please check your connection.");
  }
  const s = await r.json().catch(() => ({}));
  if (!r.ok)
    throw new Error("Unable to connect to Salesforce.");
  const n = s.user_id ?? "", i = s.organization_id ?? "", o = s.preferred_username || s.email || "Salesforce user";
  if (!n || !o)
    throw new Error("Unable to connect to Salesforce.");
  return { userId: n, orgId: i, username: o };
}
async function er(t, e = Ha()) {
  const a = e.clientId ?? me.clientId;
  if (!Ba(a))
    throw new Error(
      "Add your Salesforce Connected App consumer key to extension/src/salesforce/oauthConfig.ts, then rebuild."
    );
  const r = qa(t), s = e.getRedirectURL(), n = await Ga(), i = Ya(), o = Qa({
    loginUrl: r,
    clientId: a,
    redirectUri: s,
    codeChallenge: n.codeChallenge,
    state: i
  });
  let d;
  try {
    d = await e.launchWebAuthFlow({ url: o, interactive: !0 });
  } catch (M) {
    const K = M instanceof Error ? M.message : "";
    throw /cancel|denied|closed|ended the auth/i.test(K) ? new Error("Salesforce authentication was cancelled.") : new Error("Unable to connect to Salesforce.");
  }
  const f = Xa(d, i), g = await Ka({
    loginUrl: r,
    clientId: a,
    redirectUri: s,
    code: f,
    codeVerifier: n.codeVerifier,
    fetchImpl: e.fetch
  }), E = await Ja(g.instanceUrl, g.accessToken, e.fetch);
  return {
    isAuthenticated: !0,
    accessToken: g.accessToken,
    refreshToken: g.refreshToken,
    instanceUrl: g.instanceUrl,
    userId: E.userId,
    username: E.username,
    orgId: E.orgId,
    environment: t
  };
}
function tr(t) {
  if (t instanceof S)
    return t.message;
  const e = t instanceof Error ? t.message : "Unable to connect to Salesforce.";
  return tt(e);
}
let Y = null;
function ar(t) {
  if (!t || typeof t != "object")
    return !1;
  const e = t;
  return e.isAuthenticated === !0 && typeof e.accessToken == "string" && typeof e.instanceUrl == "string" && typeof e.username == "string" && (e.environment === "production" || e.environment === "sandbox");
}
async function rt() {
  var r;
  const t = (r = chrome.storage) == null ? void 0 : r.session;
  if (!t)
    return Y;
  const a = (await t.get(ue))[ue];
  return ar(a) ? (Y = a, a) : Y;
}
async function rr(t) {
  var a;
  Y = t;
  const e = (a = chrome.storage) == null ? void 0 : a.session;
  e && await e.set({ [ue]: t });
}
async function st() {
  var e;
  Y = null;
  const t = (e = chrome.storage) == null ? void 0 : e.session;
  t && await t.remove(ue);
}
async function sr() {
  return await st(), et;
}
async function Ge() {
  return Pa(await rt());
}
const nr = 8e3;
let nt = "mock-session-token";
function N(t, e, a, r) {
  return {
    v: Re,
    requestId: t,
    ok: e,
    ...a === void 0 ? {} : { payload: a },
    ...r ? { error: r } : {}
  };
}
async function ir(t) {
  const e = Ne.parse(t), a = new AbortController(), r = setTimeout(() => a.abort(), nr);
  try {
    const n = await (await fetch(`${$a}/api/requirements/analyze`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${nt}`
      },
      body: JSON.stringify(e),
      signal: a.signal
    })).json();
    return Kt.parse(n);
  } catch {
    return Je(e.requirement, e.salesforceContext);
  } finally {
    clearTimeout(r);
  }
}
chrome.runtime.onMessage.addListener((t, e, a) => {
  try {
    const r = ia(t);
    if (r.type === "PING")
      return a(N(r.requestId, !0, { pong: !0 })), !1;
    if (r.type === "GET_AUTH_STATE")
      return Ge().then((s) => {
        a(N(r.requestId, !0, s));
      }), !0;
    if (r.type === "LOGOUT_SALESFORCE")
      return sr().then((s) => {
        a(N(r.requestId, !0, s));
      }), !0;
    if (r.type === "CONNECT_SALESFORCE")
      return (async () => {
        const s = Jt.parse(r.payload), n = await er(s.environment);
        return await rr(n), Ge();
      })().then((s) => a(N(r.requestId, !0, s))).catch((s) => {
        a(
          N(r.requestId, !1, void 0, {
            code: "UNAUTHORIZED",
            message: tr(s)
          })
        );
      }), !0;
    if (r.type === "ANALYZE_REQUIREMENT")
      return (async () => {
        const s = Ne.parse(r.payload);
        return Ie(s.requirement).length > 0 ? Je(s.requirement, s.salesforceContext) : ir(r.payload);
      })().then((s) => a(N(r.requestId, !0, s))).catch((s) => {
        const n = s instanceof Error ? s.message : "Analyze request failed";
        a(
          N(r.requestId, !1, void 0, {
            code: "INTERNAL_ERROR",
            message: n
          })
        );
      }), !0;
    if (r.type === "CREATE_CUSTOM_FIELD")
      return (async () => {
        const s = await rt();
        if (!s)
          throw new S(
            "expired",
            "Your Salesforce session has expired."
          );
        const n = ea.parse(r.payload), i = ja(
          n.requirement,
          n.objectApiName,
          s.instanceUrl
        ), o = await za(s, i);
        return {
          fullName: `${i.objectApiName}.${i.apiName}`,
          id: o.id,
          created: o.created,
          alreadyExists: o.alreadyExists,
          message: o.message
        };
      })().then((s) => a(N(r.requestId, !0, s))).catch(async (s) => {
        s instanceof S && s.code === "expired" && await st();
        const n = s instanceof Error ? s.message : "Field create failed";
        a(
          N(r.requestId, !1, void 0, {
            code: s instanceof S ? s.code.toUpperCase() : "INTERNAL_ERROR",
            message: n.slice(0, 400)
          })
        );
      }), !0;
    a(
      N(r.requestId, !1, void 0, {
        code: "UNSUPPORTED",
        message: "Unsupported message type"
      })
    );
  } catch {
    a(
      N(crypto.randomUUID(), !1, void 0, {
        code: "INVALID_MESSAGE",
        message: "Message failed validation"
      })
    );
  }
  return !1;
});
chrome.runtime.onInstalled.addListener(() => {
  nt = `mock-session-${Date.now()}`;
});
