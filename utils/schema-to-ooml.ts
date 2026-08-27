#!/usr/bin/env tsx
/**
 * schema-to-ooml.ts
 *
 * Transforms schema.org types and properties (from the canonical JSON-LD vocabulary)
 * into OOML 0.1.0 class artefacts stored as individual JSON files.
 *
 * Requirements: Node >=18, tsx (npm install -g tsx) or ts-node.
 *
 * Usage:
 *   tsx schema-to-ooml.ts <output-dir> [options]
 *   npx tsx schema-to-ooml.ts <output-dir> [options]
 *
 * Options:
 *   --source <url|path>   URL or local path to schemaorg-current-https.jsonld
 *                         (default: https://schema.org/version/latest/schemaorg-current-https.jsonld)
 *   --pretty              Pretty-print output JSON (default: true)
 *   --no-pretty           Compact output JSON
 *   --help                Show this message
 *
 * All produced OOML artefacts use the namespace "org.schema".
 */

import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";

// ---------------------------------------------------------------------------
// OOML types (subset sufficient for generation)
// ---------------------------------------------------------------------------

type OomlVersion = "0.1.0";
const OOML_VERSION: OomlVersion = "0.1.0";
const NAMESPACE = "org.schema";
const CLASS_VERSION = "1.0.0";
const LICENSE = "CC-BY-4.0"; // schema.org licence

interface OomlSlot {
    kind: string;
    type?: string;
    valueKind?: string;
    valueType?: string;
    name: string;
    description?: string;
    required?: true;
    nullable?: true;
    static?: true;
    final?: true;
    local?: true;
    deprecated?: string;
}

interface OomlClass {
    ooml: OomlVersion;
    fqn: string;
    name: string;
    description?: string;
    authors: string[];
    license: string;
    abstract?: true;
    extends?: string | string[];
    aliases?: Record<string, string>;
    attributes?: Record<string, OomlSlot>;
}

// ---------------------------------------------------------------------------
// schema.org JSON-LD shapes
// ---------------------------------------------------------------------------

interface SchemaGraph {
    "@context": unknown;
    "@graph": SchemaNode[];
}

interface SchemaNode {
    "@id": string;
    "@type": string | string[];
    "rdfs:label"?: string | { "@language": string; "@value": string } | Array<{
        "@language": string;
        "@value": string
    }>;
    "rdfs:comment"?: string | { "@language": string; "@value": string } | Array<{
        "@language": string;
        "@value": string
    }>;
    "rdfs:subClassOf"?: { "@id": string } | Array<{ "@id": string }>;
    "schema:domainIncludes"?: { "@id": string } | Array<{ "@id": string }>;
    "schema:rangeIncludes"?: { "@id": string } | Array<{ "@id": string }>;
    "schema:supersededBy"?: { "@id": string } | Array<{ "@id": string }>;
    "schema:isPartOf"?: { "@id": string };
    "schema:source"?: unknown;
    "owl:equivalentClass"?: unknown;

    [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureArray<T>(val: T | T[] | undefined): T[] {
    if (val === undefined || val === null) return [];
    return Array.isArray(val) ? val : [val];
}

function extractLabel(val: SchemaNode["rdfs:label"]): string {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (Array.isArray(val)) {
        const en = val.find((v) => v["@language"] === "en");
        return en ? en["@value"] : (val[0]?.["@value"] ?? "");
    }
    return (val as { "@value": string })["@value"] ?? "";
}

function extractComment(val: SchemaNode["rdfs:comment"]): string | undefined {
    const s = extractLabel(val as SchemaNode["rdfs:label"]);
    return s.length > 0 ? s : undefined;
}

/** Strip the "schema:" or full URL prefix and return the local name. */
function localName(id: string): string {
    // e.g. "schema:Person" → "Person", "https://schema.org/Person" → "Person"
    const m = id.match(/(?:schema:|https?:\/\/schema\.org\/)(.+)$/);
    return m ? m[1] : id;
}

/** Convert a schema.org local name to a valid OOML camelCase slot identifier. */
function toCamel(name: string): string {
    // Handle leading uppercase (schema.org properties are already camelCase, but start caps)
    return name.charAt(0).toLowerCase() + name.slice(1);
}

/** Build a stable OOML FQN range for a schema.org type. */
function fqnRange(typeName: string): string {
    return `${NAMESPACE}/${typeName}@^${CLASS_VERSION}`;
}

/** Build an exact FQN for the generated class. */
function exactFqn(typeName: string): string {
    return `${NAMESPACE}/${typeName}@${CLASS_VERSION}`;
}

/**
 * Map schema.org DataType leaf names to OOML primitive types.
 * schema.org defines: Text, Boolean, Number, Integer, Float, Date, Time, DateTime, URL
 */
const SCHEMA_DATATYPE_MAP: Record<string, string> = {
    Text: "string",
    Boolean: "boolean",
    Number: "float64",
    Integer: "integer",
    Float: "float64",
    Date: "date",
    Time: "time",
    DateTime: "datetime",
    URL: "uri",
    XPathType: "string",
    CssSelectorType: "string",
    PronounceableText: "string",
};

// These are the abstract DataType hierarchy classes in schema.org that we
// treat specially (as abstract classes or skip as they map to primitives).
const DATATYPE_ROOTS = new Set([
    "DataType",
    "Text",
    "Boolean",
    "Number",
    "Integer",
    "Float",
    "Date",
    "Time",
    "DateTime",
    "URL",
    "XPathType",
    "CssSelectorType",
    "PronounceableText",
]);

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

function fetchUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith("https") ? https : http;
        lib
            .get(url, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
                    return;
                }
                const chunks: Buffer[] = [];
                res.on("data", (c: Buffer) => chunks.push(c));
                res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
                res.on("error", reject);
            })
            .on("error", reject);
    });
}

async function loadSchemaGraph(source: string): Promise<SchemaGraph> {
    let raw: string;
    if (source.startsWith("http://") || source.startsWith("https://")) {
        console.log(`  Fetching ${source} …`);
        raw = await fetchUrl(source);
    } else {
        console.log(`  Reading ${source} …`);
        raw = fs.readFileSync(source, "utf8");
    }
    return JSON.parse(raw) as SchemaGraph;
}

// ---------------------------------------------------------------------------
// Core transformer
// ---------------------------------------------------------------------------

class SchemaToOoml {
    private graph: SchemaNode[] = [];
    private typeMap = new Map<string, SchemaNode>();    // localName → node
    private propertyMap = new Map<string, SchemaNode>(); // localName → node

    // Set of classes that have at least one subclass (non-leaf)
    private hasSubclasses = new Set<string>();

    // Enum roots: classes whose ALL subclasses have no further subclasses
    // and are themselves concrete values (schema.org Enumeration subtypes)
    private enumRoots = new Set<string>();

    // ---------------------------------------------------------------------------

    async transform(
        source: string,
        outputDir: string,
        pretty: boolean
    ): Promise<void> {
        const schemaGraph = await loadSchemaGraph(source);
        this.graph = schemaGraph["@graph"];

        console.log(`  Loaded ${this.graph.length} graph nodes.`);

        // ---- Phase 1: index nodes ----
        this.buildIndexes();
        console.log(
            `  Indexed ${this.typeMap.size} types and ${this.propertyMap.size} properties.`
        );

        // ---- Phase 2: identify enum roots ----
        this.identifyEnumRoots();

        // ---- Phase 3: emit OOML classes ----
        fs.mkdirSync(outputDir, {recursive: true});

        let written = 0;
        let skipped = 0;

        for (const [name, node] of this.typeMap) {
            // Skip raw DataType leaves — they map to primitives, not classes
            if (DATATYPE_ROOTS.has(name) && name !== "DataType") {
                skipped++;
                continue;
            }
            const oomlClass = this.buildClass(name, node);
            const filePath = path.join(outputDir, `${name}.json`);
            const content = pretty
                ? JSON.stringify(oomlClass, null, "\t")
                : JSON.stringify(oomlClass);
            fs.writeFileSync(filePath, content + "\n", "utf8");
            written++;
        }

        console.log(
            `  Done. Written: ${written} classes, skipped: ${skipped} datatype primitives.`
        );
    }

    // ---------------------------------------------------------------------------
    // Indexing
    // ---------------------------------------------------------------------------

    private buildIndexes(): void {
        for (const node of this.graph) {

            const types = ensureArray(node["@type"]);
            const id = node["@id"];
            const name = localName(id);

            // Skip non-schema.org nodes
            if (!id.startsWith("schema:") && !id.startsWith("https://schema.org/")) continue;

            if (!name || name.startsWith("_:")) continue;

            // Classes and Datatypes
            if (
                types.includes("rdfs:Class") ||
                types.includes("schema:DataType") ||
                types.some((t) => localName(t) === "Class")
            ) {
                this.typeMap.set(name, node);
            }

            // Properties
            if (
                types.includes("rdf:Property") ||
                types.some((t) => localName(t) === "Property")
            ) {
                this.propertyMap.set(name, node);
            }
        }

        // Compute hasSubclasses
        let schemaNodes = this.typeMap.values();
        for (const node of schemaNodes) {
            const supers = ensureArray(node["rdfs:subClassOf"]).map((r) =>
                localName(r["@id"])
            );
            for (const s of supers) {
                if (this.typeMap.has(s)) this.hasSubclasses.add(s);
            }
        }
    }

    // ---------------------------------------------------------------------------
    // Enum root detection
    //
    // In schema.org, an Enumeration is a class that subclasses schema:Enumeration.
    // Its individual members are themselves classes (not instances), with @type
    // including the enum type name. We map this to OOML enum roots.
    // ---------------------------------------------------------------------------

    private identifyEnumRoots(): void {
        // A class is an enum root if:
        //  1. It extends schema:Enumeration (directly or transitively), AND
        //  2. It has subclasses / enum values in the graph

        const isDescendantOfEnumeration = (name: string, visited = new Set<string>()): boolean => {
            if (visited.has(name)) return false;
            visited.add(name);
            const node = this.typeMap.get(name);
            if (!node) return false;
            const supers = ensureArray(node["rdfs:subClassOf"]).map((r) => localName(r["@id"]));
            if (supers.includes("Enumeration")) return true;
            return supers.some((s) => isDescendantOfEnumeration(s, visited));
        };

        for (const [name] of this.typeMap) {
            if (isDescendantOfEnumeration(name) && this.hasSubclasses.has(name)) {
                this.enumRoots.add(name);
            }
        }

        console.log(`  Identified ${this.enumRoots.size} enum roots.`);
    }

    // ---------------------------------------------------------------------------
    // Class builder
    // ---------------------------------------------------------------------------

    private buildClass(name: string, node: SchemaNode): OomlClass {
        const label = extractLabel(node["rdfs:label"]) || name;
        const description = extractComment(node["rdfs:comment"]);
        const types = ensureArray(node["@type"]);

        // Superclasses
        const superRefs = ensureArray(node["rdfs:subClassOf"]).map((r) =>
            localName(r["@id"])
        );

        // Filter to only those we've actually indexed (avoid dangling refs)
        const validSupers = superRefs.filter(
            (s) => this.typeMap.has(s) && !DATATYPE_ROOTS.has(s)
        );

        // Determine abstractness:
        // - DataType root → abstract
        // - Enumeration root (has sub-enum types) → abstract
        // - schema.org types that are never "leaf" classes tend to be abstract
        // - schema:Enumeration itself → abstract enum root
        // - Known abstract markers: isEnumRoot, schema:Enumeration lineage
        const isAbstract =
            name === "DataType" ||
            name === "Enumeration" ||
            this.enumRoots.has(name) ||
            types.includes("schema:DataType");

        // Deprecated?
        const supersededBy = ensureArray(node["schema:supersededBy"]);
        const deprecated = supersededBy.length > 0;
        const deprecatedMsg = deprecated
            ? `Superseded by ${supersededBy.map((s) => localName((s as { "@id": string })["@id"])).join(", ")}.`
            : undefined;

        // Properties that belong to this type
        const ownProperties = this.getPropertiesForType(name);

        // Build attributes
        const attributes: Record<string, OomlSlot> = {};

        // Populate attributes from schema.org properties
        for (const prop of ownProperties) {
            const propName = localName(prop["@id"]);
            const slotId = toCamel(propName);
            if (!slotId || slotId === "schemaOrgType") continue;

            // Skip if already present (duplicates from multi-domain)
            if (attributes[slotId]) continue;

            const propLabel = extractLabel(prop["rdfs:label"]) || propName;
            const propDesc = extractComment(prop["rdfs:comment"]);
            const propSuperseded = ensureArray(prop["schema:supersededBy"]);
            const propDeprecated =
                propSuperseded.length > 0
                    ? `Superseded by ${propSuperseded.map((s) => localName((s as {
                        "@id": string
                    })["@id"])).join(", ")}.`
                    : undefined;

            const slot = this.buildSlot(propLabel, propDesc, prop);
            if (propDeprecated) slot.deprecated = propDeprecated;
            if (slot) attributes[slotId] = slot;
        }

        // Build extends array
        const extendsValue: string[] =
            validSupers.length > 0 ? validSupers.map(fqnRange) : [];

        // Compose the class
        const oomlClass: OomlClass = {
            ooml: OOML_VERSION,
            fqn: exactFqn(name),
            name: label,
            authors: ["schema.org Authors"],
            license: LICENSE,
        };

        if (description) oomlClass.description = description;
        if (isAbstract) oomlClass.abstract = true;
        if (extendsValue.length > 0) {
            oomlClass.extends =
                extendsValue.length === 1 ? extendsValue[0] : extendsValue;
        }
        if (Object.keys(attributes).length > 0) {
            oomlClass.attributes = sortedKeys(attributes);
        }
        if (deprecatedMsg) oomlClass["deprecated" as keyof OomlClass] = deprecatedMsg as never;

        return oomlClass;
    }

    // ---------------------------------------------------------------------------
    // Slot builder
    // ---------------------------------------------------------------------------

    private buildSlot(
        label: string,
        description: string | undefined,
        prop: SchemaNode
    ): OomlSlot {
        const ranges = ensureArray(prop["schema:rangeIncludes"]).map((r) =>
            localName((r as { "@id": string })["@id"])
        );

        // Classify ranges into primitives vs class refs
        const primitiveRanges = ranges.filter((r) => SCHEMA_DATATYPE_MAP[r]);
        const classRanges = ranges.filter(
            (r) => !SCHEMA_DATATYPE_MAP[r] && this.typeMap.has(r) && !DATATYPE_ROOTS.has(r)
        );

        // Choose the best mapping strategy
        if (ranges.length === 0) {
            // No range declared → use "any"
            return {
                kind: "primitive",
                type: "any",
                name: label,
                ...(description ? {description} : {}),
                nullable: true,
            };
        }

        // Pure primitive ranges
        if (primitiveRanges.length > 0 && classRanges.length === 0) {
            // Pick the "richest" primitive type
            const primitiveType = this.pickBestPrimitive(primitiveRanges);
            return {
                kind: "primitive",
                type: primitiveType,
                name: label,
                ...(description ? {description} : {}),
                nullable: true,
            };
        }

        // Mixed or pure class ranges
        if (classRanges.length === 1 && primitiveRanges.length === 0) {
            const className = classRanges[0];
            const isEnum = this.enumRoots.has(className);
            return {
                kind: isEnum ? "enum" : "object",
                type: fqnRange(className),
                name: label,
                ...(description ? {description} : {}),
                nullable: true,
            };
        }

        // Multiple class ranges → use the first one, or if it's an Enumeration
        // hierarchy, use set of class references
        if (classRanges.length > 0) {
            // If all class ranges are enum roots → enum of first (OOML enum is single-root)
            const enumRanges = classRanges.filter((r) => this.enumRoots.has(r));
            const objectRanges = classRanges.filter((r) => !this.enumRoots.has(r));

            if (enumRanges.length > 0 && objectRanges.length === 0 && primitiveRanges.length === 0) {
                // All enums: use the first as the enum root (OOML limitation: single root)
                const enumRoot = enumRanges[0];
                return {
                    kind: "enum",
                    type: fqnRange(enumRoot),
                    name: label,
                    ...(description ? {description} : {}),
                    nullable: true,
                };
            }

            // Mixed or multiple object ranges → use a list (captures cardinality openness)
            // For true polymorphism with multiple class ranges, use the most general supertype.
            // As a practical simplification: use Thing (the root) if all are schema types,
            // or use the first class range.
            const firstClass = objectRanges[0] ?? classRanges[0];
            if (firstClass && this.typeMap.has(firstClass)) {
                return {
                    kind: "object",
                    type: fqnRange(firstClass),
                    name: label,
                    ...(description ? {description} : {}),
                    nullable: true,
                };
            }
        }

        // Fallback: mixed primitive+class → use "any" via primitive
        return {
            kind: "primitive",
            type: "any",
            name: label,
            ...(description ? {description} : {}),
            nullable: true,
        };
    }

    // ---------------------------------------------------------------------------

    private pickBestPrimitive(names: string[]): string {
        // Preference order for ambiguous multi-primitive ranges
        const priority = [
            "DateTime", "Date", "Time", "URL", "Float", "Integer", "Number",
            "Boolean", "PronounceableText", "XPathType", "CssSelectorType", "Text",
        ];
        for (const p of priority) {
            if (names.includes(p)) return SCHEMA_DATATYPE_MAP[p];
        }
        return SCHEMA_DATATYPE_MAP[names[0]] ?? "string";
    }

    // ---------------------------------------------------------------------------

    private getPropertiesForType(typeName: string): SchemaNode[] {
        const result: SchemaNode[] = [];
        for (const [, prop] of this.propertyMap) {
            const domains = ensureArray(prop["schema:domainIncludes"]).map((d) =>
                localName((d as { "@id": string })["@id"])
            );
            if (domains.includes(typeName)) result.push(prop);
        }
        return result;
    }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function sortedKeys<T extends Record<string, unknown>>(obj: T): T {
    return Object.fromEntries(
        Object.entries(obj).sort(([a], [b]) => a.localeCompare(b))
    ) as T;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
    const args = process.argv.slice(2);

    if (args.includes("--help") || args.includes("-h")) {
        console.log(`
schema-to-ooml — Transform schema.org vocabulary into OOML 0.1.0 artefacts

Usage:
  tsx schema-to-ooml.ts <output-dir> [options]
  npx tsx schema-to-ooml.ts <output-dir> [options]

Arguments:
  <output-dir>        Required. Directory where OOML JSON files will be written.
                      Created if it does not exist.

Options:
  --source <url|path> URL or local path to schemaorg-current-https.jsonld
                      Default: https://schema.org/version/latest/schemaorg-current-https.jsonld
  --pretty            Pretty-print JSON output (default)
  --no-pretty         Compact JSON output
  --help, -h          Show this help message

Examples:
  tsx schema-to-ooml.ts ./ooml-schema
  tsx schema-to-ooml.ts ./ooml-schema --source ./schemaorg-current-https.jsonld
  tsx schema-to-ooml.ts ./ooml-schema --no-pretty
`);
        process.exit(0);
    }

    // Parse positional output-dir
    const positional = args.filter((a) => !a.startsWith("--"));
    if (positional.length === 0) {
        console.error(
            "Error: <output-dir> is required.\nRun with --help for usage."
        );
        process.exit(1);
    }
    const outputDir = positional[0];

    // Parse options
    let source =
        "https://schema.org/version/latest/schemaorg-current-https.jsonld";
    let pretty = true;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--source" && args[i + 1]) {
            source = args[++i];
        } else if (args[i] === "--no-pretty") {
            pretty = false;
        } else if (args[i] === "--pretty") {
            pretty = true;
        }
    }

    console.log("schema-to-ooml");
    console.log(`  Output directory : ${path.resolve(outputDir)}`);
    console.log(`  Source           : ${source}`);
    console.log(`  Pretty JSON      : ${pretty}`);
    console.log("");

    const transformer = new SchemaToOoml();
    await transformer.transform(source, outputDir, pretty);
}

main().catch((err) => {
    console.error("Fatal error:", err.message ?? err);
    process.exit(1);
});
