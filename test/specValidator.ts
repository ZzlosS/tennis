import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFileSync } from "fs";
import { join } from "path";

// Checks every response the tests receive against openapi/v1.json, so the code cannot drift from the contract.

type Json = Record<string, unknown>;

const spec = JSON.parse(readFileSync(join(__dirname, "../openapi/v1.json"), "utf8")) as {
  servers: { url: string }[];
  paths: Record<string, Record<string, { responses: Record<string, { content?: Json }> }>>;
};

const basePath = spec.servers[0].url;

// tsoa writes a nullable reference as { allOf: [ref], nullable: true }; JSON Schema needs the null spelled out.
function spellOutNull(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(spellOutNull);
  }
  if (node && typeof node === "object") {
    const copy: Json = {};
    for (const [key, value] of Object.entries(node)) {
      copy[key] = spellOutNull(value);
    }
    if (copy.nullable === true && copy.type === undefined) {
      delete copy.nullable;
      return { anyOf: [{ type: "null" }, copy] };
    }
    return copy;
  }
  return node;
}

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
for (const format of ["double", "float", "int32", "int64"]) {
  ajv.addFormat(format, true);
}
ajv.addSchema(spellOutNull(spec) as Json, "spec");

const templates = Object.keys(spec.paths)
  .map((template) => ({
    template,
    regex: new RegExp(`^${basePath}${template.replace(/\{[^}]+\}/g, "[^/]+")}$`),
    params: (template.match(/\{/g) ?? []).length,
  }))
  // A fixed path such as /courts/unassigned wins over /courts/{id}.
  .sort((a, b) => a.params - b.params);

export const violations: string[] = [];

const encode = (segment: string) => encodeURIComponent(segment.replace(/~/g, "~0").replace(/\//g, "~1"));
const validators = new Map<string, ReturnType<typeof ajv.compile>>();

export function checkResponse(method: string, url: string, status: number, body: unknown, text: string) {
  // Preflight requests are answered by the CORS middleware and are not part of the API.
  if (method.toLowerCase() === "options") {
    return;
  }
  const path = url.split("?")[0];
  const found = templates.find((candidate) => candidate.regex.test(path));
  if (!found) {
    return;
  }
  const operation = spec.paths[found.template][method.toLowerCase()];
  const label = `${method.toUpperCase()} ${found.template} -> ${status}`;
  if (!operation) {
    violations.push(`${label}: the spec has no such operation`);
    return;
  }
  const declared = operation.responses[String(status)] ?? operation.responses.default;
  if (!declared) {
    violations.push(`${label}: status not declared in the spec`);
    return;
  }
  if (!declared.content) {
    if (text) {
      violations.push(`${label}: the spec declares no body but one was sent`);
    }
    return;
  }

  const key = `${found.template} ${method.toLowerCase()} ${status}`;
  let validate = validators.get(key);
  if (!validate) {
    const code = operation.responses[String(status)] ? String(status) : "default";
    const pointer = [
      "paths",
      found.template,
      method.toLowerCase(),
      "responses",
      code,
      "content",
      "application/json",
      "schema",
    ]
      .map(encode)
      .join("/");
    validate = ajv.compile({ $ref: `spec#/${pointer}` });
    validators.set(key, validate);
  }
  if (!validate(body)) {
    const problems = (validate.errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message}`);
    violations.push(`${label}: response does not match the spec: ${problems.join("; ")}`);
  }
}

// Every example in the spec (they are what `npm run mock` serves) must match the schema it sits beside.
export let examplesChecked = 0;

export function badExamples(): string[] {
  const problems: string[] = [];
  for (const [template, operations] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(operations)) {
      for (const [status, response] of Object.entries(operation.responses)) {
        const content = (
          response.content as Record<string, { examples?: Record<string, { value: unknown }> }> | undefined
        )?.["application/json"];
        if (!content?.examples) {
          continue;
        }
        const pointer = ["paths", template, method, "responses", status, "content", "application/json", "schema"]
          .map(encode)
          .join("/");
        const validate = ajv.compile({ $ref: `spec#/${pointer}` });
        for (const [name, example] of Object.entries(content.examples)) {
          examplesChecked += 1;
          if (!validate(example.value)) {
            const errors = (validate.errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message}`);
            problems.push(`${method.toUpperCase()} ${template} -> ${status} (${name}): ${errors.join("; ")}`);
          }
        }
      }
    }
  }
  return problems;
}
