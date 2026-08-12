# OOML — Object-Oriented Modelling Language
## Formal Specification — Draft 0.1.0

---

> **Status:** Draft  
> **Version:** 0.1.0  
> **Date:** 2026-06-26  
> **License:** BSD-3-Clause


---

Copyright (c) 2026 OOML Specification Authors

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Design Goals and Non-Goals](#2-design-goals-and-non-goals)
3. [Terminology and Definitions](#3-terminology-and-definitions)
4. [Namespaces and Identity](#4-namespaces-and-identity)
5. [Versioning](#5-versioning)
6. [Primitive Types](#6-primitive-types)
7. [Global Attributes](#7-global-attributes)
8. [Classes](#8-classes)
9. [Attributes](#9-attributes)
10. [Metadata](#10-metadata)
11. [Inheritance: Superclasses and Subclasses](#11-inheritance-superclasses-and-subclasses)
12. [Renaming and Overriding Inherited Attributes](#12-renaming-and-overriding-inherited-attributes)
13. [Type Hierarchy: Supertypes and Subtypes](#13-type-hierarchy-supertypes-and-subtypes)
14. [The Dependency Graph](#14-the-dependency-graph)
15. [Serialisation Format](#15-serialisation-format)
16. [Validation Rules](#16-validation-rules)
17. [Complete Example](#17-complete-example)
18. [Grammar (ABNF)](#18-grammar-abnf)
19. [Design Notes and Rationale](#19-design-notes-and-rationale)

---

## 1. Introduction

**OOML** (Object-Oriented Modelling Language) is a JSON-based schema-definition language for describing data models in a way that is simultaneously rigorous, human-readable, and accessible to practitioners across business and engineering disciplines.

OOML borrows the best-understood abstractions from object-oriented programming — classes, inheritance, namespacing, type safety — and applies to them a versioning and distribution mindset borrowed from modern software ecosystems: individual, independently versioned artefacts referenced by precise, stable identifiers.

The central insight of OOML is that **the class, not a collection of classes, is the correct unit of versioning for data models**. This keeps the dependency graph simple and its edges meaningful: every edge represents an actual structural relationship between two classes, and dependency queries are answerable by direct graph traversal with no intermediate packaging layer.

OOML does **not** define:

- A query language
- A storage engine or persistence format
- A serialisation format for data instances
- A protocol for data exchange

OOML **does** define:

- A vocabulary and JSON encoding for classes, attributes, and their relationships
- A versioning contract with clear semantics for breaking and non-breaking changes
- A namespace and identity system enabling global, unambiguous class references
- An inheritance mechanism for attribute reuse and type hierarchy
- A class-to-class dependency model forming a directed acyclic graph
- A metadata model for attaching structured, typed, versioned annotations to artefacts

How artefacts are authored, grouped, and published to a distribution system is outside the scope of this specification and addressed in a separate tooling document.

---

## 2. Design Goals and Non-Goals

### 2.1 Goals

| Goal | Description |
|------|-------------|
| **Intuitive** | Prefer familiar OOP concepts over logic-based formalisms (cf. RDF/OWL) |
| **Business-agnostic** | No domain vocabulary baked in; models domain via composition |
| **Tech-agnostic** | No coupling to any database, language runtime, or serialisation format |
| **Versioned at class granularity** | Each class carries its own semantic version; no collective versioning obligation |
| **Composable** | Classes depend on, extend, and reference other independently versioned classes |
| **Dependency-transparent** | The dependency graph is a direct graph of class-to-class edges; easily traversed by implementations |
| **Extensible via metadata** | Artefacts carry structured, typed, versioned annotations defined using OOML itself |
| **Type-safe** | Attribute types and class hierarchies are checked by a well-defined validation algorithm |
| **Machine-readable** | JSON as the canonical encoding; tooling-friendly |
| **Human-readable** | A compact, predictable structure with clear naming conventions and optional documentation properties |

### 2.2 Non-Goals

- Defining instance data (OOML describes shapes, not records)
- Providing a query or constraint language
- Prescribing a runtime or code-generation target
- Replacing programming-language type systems
- Defining a versioned package or bundle concept
- Defining a registry service, its wire protocol, or its governance model (see the OOML Registry Specification)

---

## 3. Terminology and Definitions

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

| Term | Definition |
|------|------------|
| **Resolution context** | The implementation-defined mechanism by which FQN ranges are resolved to specific artefact versions; outside the scope of this specification |
| **Namespace** | A reverse-domain organisational scope that governs who may publish names within it |
| **Class** | A versioned, named, uniquely identifiable collection of attributes; the primary unit of the OOML type system |
| **Enum root** | A class whose subtypes (excluding itself) serve as the valid values of an `enum` attribute; no dedicated artefact type |
| **Global attribute** | A versioned, named, reusable semantic contract for a typed attribute; a first-class artefact in the OOML identity model, independent of any class |
| **Attribute** | A named position within a class that either declares an inline type or references a standalone global attribute |
| **Sub-attribute** | An attribute declared within the `attributes` property of a `nested`-kind attribute; has no identity of its own beyond its position within its containing artefact |
| **Superclass** | A class whose attributes and type identity are inherited by another class (its subclass) via `extends` |
| **Subclass** | A class that names one or more classes in its `extends` property, thereby inheriting their attributes |
| **Supertype** | A class that has one or more descendant classes anywhere in the inheritance chain |
| **Subtype** | A class that has one or more ancestor classes anywhere in the inheritance chain |
| **Primitive** | A scalar value type built into the OOML type system (see §6) |
| **`object` attribute** | An attribute whose value is a reference to an instance of a named class or any of its subtypes |
| **`class` attribute** | An attribute whose value is a reference to a class — the named class itself or any of its subtypes |
| **`enum` attribute** | An attribute whose value is a reference to a class that is a subtype of the named root class, excluding the named root class itself |
| **Collection** | An ordered or unordered group of values sharing a declared element type: `list`, `set`, or `map` |
| **Static attribute** | An attribute whose value belongs to the class rather than to instances; subclasses may redeclare it unless `final` is also set |
| **Rename** | Replacing an inherited attribute's exposed name via `use.as` (§12.3); the old name is no longer reachable from this class or its subclasses |
| **Override** | Adjusting a limited, override-eligible set of properties on an inherited attribute via `use.override` (§12.4), without changing its identity |
| **MRO** | Method Resolution Order; the deterministic linearisation of a class's ancestor list used to compute its full attribute set |
| **FQN** | Fully Qualified Name; the globally unique identity of a class or global attribute (see §4) |
| **`self`** | A reserved type reference used during authoring to refer to the declaring class itself; expanded to the class's FQN range before distribution |
| **Name** | A free-form, human-readable label on an artefact, independent of the FQN and unconstrained by language |
| **Dependency** | A versioned reference from one artefact to another that it structurally relies upon, derived from the referencing artefact's own body |
| **Dependency Graph** | The directed acyclic graph (DAG) whose nodes are artefact versions and whose edges are dependencies |
| **Metadata** | Structured, typed, versioned annotations on an OOML artefact, defined using OOML classes as schemas |
| **Metadata Schema** | An ordinary OOML class used as the schema for a metadata entry; carries no special marker |
| **Metadata Entry** | A single key-value pair in the `metadata` object, keyed by a metadata schema FQN range |
| **`cascade`** | A metadata entry control property: when `true`, the value propagates to subclasses that do not set their own value |
| **`local`** | A control property on attributes and metadata entries: when `true`, the attribute or entry is not inherited by subclasses |
| **`final`** | A control property on attributes and metadata entries: when `true`, subclasses cannot override or shadow it |

---


## 4. Namespaces and Identity

### 4.1 Namespace

A namespace is a reverse-domain identifier using dot notation, following Java package conventions:

```
namespace      = lc-segment 1*("." lc-segment)
lc-segment     = ALPHA *( ALPHA / DIGIT )
```

All segments are lowercase. Examples: `com.example`, `org.opendata`, `io.mycompany.platform`.

Namespaces are organisationally controlled. The mechanism by which namespace ownership is established and enforced is outside the scope of this specification and belongs to any registry or distribution system built on top of OOML.

### 4.2 Fully Qualified Name (FQN)

Every class and global attribute has an FQN that is globally unique:

```
class-fqn      = namespace "/" class-name "@" version
global-attr-fqn    = namespace "/" global-attr-name "@" version
owned-attr-fqn = class-fqn "#" attr-path
attr-path      = attr-name *( "." attr-name )
```

`class-fqn` and `global-attr-fqn` are the identities of the two OOML artefact types. Enum roots are ordinary classes and use `class-fqn`. `owned-attr-fqn` identifies an attribute declared inline within a class, or a sub-attribute nested within one — `attr-path` is a dot-separated chain of attribute identifiers descending into successive `nested`-kind attributes. Attributes that reference a standalone global attribute are identified by the global attribute's own `global-attr-fqn`, not by a `class-fqn#name` path.

A sub-attribute has no identity of its own: `owned-attr-fqn` with a multi-segment `attr-path` is purely a positional address, useful for documentation and tooling, not an independently resolvable artefact reference. It identifies a position within the containing class, exactly as a single-segment `owned-attr-fqn` already does for an ordinary owned attribute.

Examples:

```
com.example.hr/Employee@1.2.0
com.example.hr/Employee@1.2.0#employeeNumber
com.example.hr/Employee@1.2.0#homeAddress.streetName
com.example.hr/EmploymentStatus@1.0.0
com.example.physics/temperature@1.0.0
```

The namespace alone scopes all artefact names. There is no intermediate model or package layer in the identity structure. Global uniqueness of FQNs is guaranteed by the reverse-domain namespace convention combined with the namespace governance policy of any distribution system built on OOML.

### 4.3 The `self` Type Reference

The literal string `"self"` is a reserved authoring token. It may appear in any position where a class FQN range is expected — in an attribute's `type`, `valueType`, or `keyType` — and means: *the class in which this attribute is declared*.

`self` is an authoring convenience that solves the chicken-and-egg problem of a class needing to reference itself before its own version is known. It is valid only during authoring. Before an artefact is committed and distributed, tooling MUST expand every occurrence of `self` to the FQN range of the declaring class (rule T-self). The distributed form of an OOML artefact MUST NOT contain `self`.

`self` resolves to the **declaring class** — the class in which the attribute is written — not to the inheriting class. A subclass that inherits an attribute whose `type` was declared as `self` inherits an attribute typed to the superclass that declared it, not to itself.

`self` is valid on attributes of kind `class`, `object`, or `enum`, and in `valueType` and `keyType` positions on `list`, `set`, and `map` attributes. It is not valid on attributes of kind `primitive` or `attribute`.

```json
"manager": {
	"kind": "object",
	"type": "self",
	"name": "Manager",
	"description": "This employee's direct line manager.",
	"nullable": true
}
```

When committed as `com.example.hr/Employee@1.3.0`, the above expands to:

```json
"manager": {
	"kind": "object",
	"type": "com.example.hr/Employee@^1.3.0",
	"name": "Manager",
	"description": "This employee's direct line manager.",
	"nullable": true
}
```

### 4.4 Uniqueness Constraints

- A class name MUST be unique within a namespace (i.e. `com.example.hr/Employee` identifies a single evolving class, versioned over time).
- A global attribute name MUST be unique within a namespace.
- Because class names are PascalCase and global attribute names are camelCase (see §4.5), a class and a global attribute can never share an identical name within the same namespace — the two uniqueness constraints above never need to be checked against each other.
- Inline attribute identifiers MUST be unique within the class that declares them.
- The full accessible name surface of a class — its own attribute identifiers and its inherited attribute identifiers (by their canonical local names where unambiguous, or as adjusted by `use`, §12) — MUST be collision-free (rule U03).

### 4.5 Name Conventions

| Artefact | Convention | Pattern |
|----------|------------|---------|
| Namespace segment | lowercase alphanumeric | `[a-z][a-z0-9]*` |
| Class name | PascalCase | `[A-Z][A-Za-z0-9]*` |
| Global attribute name | camelCase | `[a-z][a-zA-Z0-9]*` |
| Attribute identifier | camelCase | `[a-z][a-zA-Z0-9]*` |

---

## 5. Versioning

### 5.1 Scope

In OOML 0.1.0, versioning applies to **individual classes and global attributes**. There is no version at the namespace level or any grouping level.

### 5.2 Version Format

```
version  = major "." minor "." trivial [ pre-release ] [ build ]
major    = non-neg-int
minor    = non-neg-int
trivial  = non-neg-int
```

Examples: `0.1.0`, `1.0.0`, `2.14.3`.

Pre-release and build metadata suffixes (`-alpha.1`, `+build.5`) MAY be appended following the same syntactic rules as semver 2.0.0, but carry no additional OOML-defined semantics beyond ordering.

### 5.3 Change Impact Contract

| Component | Increment when | Effect on consumers |
|-----------|---------------|---------------------|
| `MAJOR` | A **breaking change** is introduced to the class or global attribute | Consumers depending on a prior version MUST explicitly migrate. Existing instance data MAY no longer conform. |
| `MINOR` | A **non-breaking, data- or query-significant** addition is made | Existing valid data remains valid. New optional attributes, widened types, new enum subclasses. |
| `TRIVIAL` | A **non-breaking, data- and query-insignificant** change is made | No structural change. Documentation, descriptions, author metadata, tags. |

### 5.4 Breaking Changes (MAJOR)

The following changes are breaking and MUST increment the MAJOR version:

*Class changes:*
- Removing an attribute
- Renaming an attribute
- Changing an attribute's `kind`
- Narrowing an attribute's `type`
- Switching a `nested` attribute between the inline `attributes` form and the type-borrowed `type` form, or changing which class a type-borrowed `nested` attribute's `type` points at (to an incompatible class not already covering the same shape)
- Changing an attribute from optional to required
- Changing the `valueType` or `valueKind` of a `list`, `set`, or `map` attribute
- Changing the `keyType` or `keyKind` of a `map` attribute
- Changing an `object` or `class` attribute's `type` to an incompatible class (one that is not a subtype of the original)
- Removing a class from the `extends` array
- Changing the `value` of a `static: true, final: true` attribute
- Renaming an inherited attribute via `use.as` (§12.3), or changing an existing `use.as` value to a different name
- Removing a `use` entry that previously renamed or overrode an inherited attribute
- Narrowing an inherited attribute's mechanically-verified or `pattern` property via `use.override` (§12.4)
- Changing the `value` of an inherited `static`, non-`final` attribute via `use.override.value`
- Adjusting an override-eligible property on an imported global attribute (§9.9), except `name` and `description`
- Adding `local: true` to a previously non-local attribute
- Adding `final: true` to a previously non-final attribute (locks it for the hierarchy)
- Removing a `required: true` metadata slot declaration from the hierarchy
- Changing a metadata entry from `cascade: true` to `cascade: false`
- Changing a metadata entry value when `final: true`

*Enum root changes:*
- Removing a subclass that served as an enum value (removing a member of an enum)
- Renaming a class or global attribute (equivalent to removing the old and adding a new one)

*Global attribute changes:*
- Changing the `kind` or `type` of a global attribute
- Narrowing constraints of a global attribute (e.g. reducing `maxLength`)

### 5.5 Non-Breaking Additions (MINOR)

The following changes require a MINOR increment:

*Class changes:*
- Adding a new optional attribute
- Adding a new class to the `extends` array
- Widening an attribute's `type` (e.g. `int32` → `int64`)
- Changing a required attribute to optional
- Adding a `deprecated` message to an inherited attribute via `use.override.deprecated`, or to an imported global attribute's own `deprecated` override (§9.9), where none existed before
- Changing a `class` attribute's `type` to a subtype of the original
- Adding a new metadata entry
- Adding a new metadata slot declaration (`required: true`, `value: null`)
- Changing `cascade: false` to `cascade: true` on a metadata entry

*Enum root changes:*
- Adding a new subclass of an enum root (adding a member of an enum)

*Global attribute changes:*
- Widening constraints of a global attribute (e.g. increasing `maxLength`)

### 5.6 Trivial Changes (TRIVIAL)

- Editing any `name` or `description` property
- Editing `examples`
- Editing `authors`, `license`, the `deprecated` message string
- Adding, editing, or removing `tags`

### 5.7 Initial Development

A MAJOR version of `0` indicates the class or global attribute is in initial development. Any change MAY be breaking. Consumers of `0.y.z` artefacts SHOULD treat every MINOR increment as potentially breaking.

### 5.8 Version Monotonicity

OOML RECOMMENDS that implementations treat a given artefact version as immutable once it has been shared or distributed: the content of `com.example.hr/Employee@1.2.0` SHOULD NOT change after it has been made available to consumers. How this convention is enforced is a concern for any distribution system built on OOML, not for this specification.

Within the language, a new version of the same artefact MUST have a strictly higher version number than any prior version of the same FQN base name in the same resolution context.

---

## 6. Primitive Types

OOML defines the following built-in primitive types. Implementations MUST support all of them.

| Type name | Description | Constraints |
|-----------|-------------|-------------|
| `boolean` | True or false | — |
| `int8` | Signed 8-bit integer | −128 to 127 |
| `int16` | Signed 16-bit integer | −32,768 to 32,767 |
| `int32` | Signed 32-bit integer | −2,147,483,648 to 2,147,483,647 |
| `int64` | Signed 64-bit integer | −2⁶³ to 2⁶³−1 |
| `uint8` | Unsigned 8-bit integer | 0 to 255 |
| `uint16` | Unsigned 16-bit integer | 0 to 65,535 |
| `uint32` | Unsigned 32-bit integer | 0 to 4,294,967,295 |
| `uint64` | Unsigned 64-bit integer | 0 to 2⁶⁴−1 |
| `float32` | IEEE 754 single-precision float | — |
| `float64` | IEEE 754 double-precision float | — |
| `decimal` | Arbitrary-precision decimal | `precision` and `scale` MAY be specified |
| `string` | Unicode text | `minLength`, `maxLength`, `pattern` MAY be specified |
| `date` | Calendar date (no time) | ISO 8601: `YYYY-MM-DD` |
| `time` | Wall-clock time (no date) | ISO 8601: `HH:MM:SS[.fff][Z\|±HH:MM]` |
| `datetime` | Date and time with optional timezone | ISO 8601 combined form |
| `duration` | ISO 8601 duration | e.g. `P1Y2M3DT4H` |
| `uuid` | UUID / GUID | RFC 4122 string form |
| `uri` | Uniform Resource Identifier | RFC 3986 |
| `binary` | Arbitrary byte sequence | `encoding` SHOULD be specified (e.g. `"base64"`) |
| `any` | Unconstrained value | Use sparingly; disables type checking for that attribute |

---


## 7. Global Attributes

Global attributes are first-class, independently versioned artefacts. A global attribute describes a reusable, typed semantic contract for a named attribute — independent of any class. Any class may reference a global attribute in an attribute of `"kind": "attribute"`.

Global attributes are appropriate for domain concepts that are genuinely global: `unitOfMeasure`, `monetaryAmount`, `geoCoordinate`, `isoLanguageCode`. They are not appropriate for attributes that are intrinsic to a specific class and have no meaning outside it.

### 7.1 Global Attribute Structure

A global attribute is a JSON object published as a standalone artefact:

```json
{
	"ooml": "0.1.0",
	"fqn": "com.example.physics/temperature@1.0.0",
	"name": "Temperature",
	"description": "A temperature measurement.",
	"authors": ["Jane Smith <jane@example.com>"],
	"license": "Apache-2.0",
	"kind": "primitive",
	"type": "decimal",
	"precision": 7,
	"scale": 4
}

```

### 7.2 Global Attribute Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `ooml` | string | REQUIRED | OOML specification version targeted. |
| `fqn` | string | REQUIRED | Fully qualified name and version of this global attribute (see §4.2). |
| `name` | string | REQUIRED | Free-form human-readable label for this global attribute. |
| `description` | string | RECOMMENDED | Human-readable purpose of this global attribute. |
| `authors` | array of string | RECOMMENDED | Authors in `Name <email>` format. |
| `license` | string | RECOMMENDED | SPDX licence expression. |
| `kind` | string | REQUIRED | Structural role. One of: `primitive`, `object`, `class`, `enum`, `list`, `set`, `map`, `nested`. Same vocabulary as attributes declared within a class (see §9), except `attribute` — a global attribute cannot reference another global attribute. |
| `type` | string | REQUIRED (where applicable) | Value type: primitive type name or class FQN range. Same rules as attributes declared within a class. Not present when `kind` is `nested`. |
| `attributes` | object | REQUIRED (where applicable) | Map of sub-attribute identifier to sub-attribute definition. REQUIRED and non-empty when `kind` is `nested`; not present otherwise. Same structure and rules as a class's `attributes` property (§9). |
| `deprecated` | string | OPTIONAL | If present, this artefact is deprecated; the value is the deprecation message. MUST be a non-empty string. Omit when not deprecated. |

All additional type-specific properties that apply to an attribute of the given `kind` (e.g. `minLength`, `pattern`, `precision`, `scale`, `valueKind`, `valueType`, `keyType`) also apply to global attributes. A global attribute of `kind` `nested` supports both forms available to a class attribute of that kind (§9.10): an inline `attributes` map, or a `type` borrowing a class's full resolved shape. Either way, the published global attribute becomes a reusable, independently-versioned nested shape, referenced from any class the ordinary way via `"kind": "attribute"`.

### 7.3 FQN of a Global Attribute

The FQN of a global attribute follows the same pattern as a class FQN:

```
global-attr-fqn = namespace "/" global-attr-name "@" version
```

Example: `com.example.physics/temperature@1.0.0`

The name uses camelCase, distinct from a class name's PascalCase. This is a deliberate choice: a global attribute is not a type — it is never instantiated, extended, or used as an enum root — so it does not carry the "type-ness" that PascalCase signals for classes throughout OOML. camelCase instead aligns a global attribute's name with the attribute identifiers it is functionally equivalent to (§9.1), and it has a structural benefit: because classes and global attributes now use disjoint casing conventions, a class and a global attribute can never share an identical name within the same namespace (§4.4). Given an FQN alone, its casing already tells you which of the two artefact types it identifies, without needing to resolve it first.

### 7.4 Referencing a Global Attribute in a Class

An attribute references a standalone global attribute using `"kind": "attribute"` and a `type` holding the global attribute's FQN range:

```json
"surfaceTemp": {
	"kind": "attribute",
	"type": "com.example.physics/temperature@^1.0.0",
	"name": "Surface Temperature",
	"description": "The surface temperature of this body.",
	"nullable": true
}
```

The attribute identifier (`surfaceTemp`) is the local name within the class. The global attribute's identity is `com.example.physics/temperature@^1.0.0`. The two are independent: the attribute identifier is how instances are navigated; the global attribute FQN is how the semantic contract is referenced and versioned.

### 7.5 Versioning of Global Attributes

Global attributes follow the same change-impact contract as classes (§6). Because changing a `type` fundamentally alters the semantic contract, it is a MAJOR change. The same logic applies here as discussed in §6.4: a type-changed global attribute is effectively a new thing, and consumers pinned to the old version are unaffected.

### 7.6 Global Attributes and the Dependency Graph

When a class references a global attribute, this is read as an edge in the (derived) dependency graph from the class to the global attribute. This edge is of type `attribute-import` and participates in cycle detection (rule D02), since importing a global attribute incorporates its constraints into the class's own definition — the same structural reasoning that applies to `extends` and `metadata` edges.

Enum roots are ordinary classes. A dependency on an enum root appears as a standard class edge in the dependency graph, identical to any other class dependency.

> **Note:** How global attributes are stored, resolved, and distributed is outside the scope of this specification.

---

## 8. Classes

A class is the central construct of OOML: a versioned, named, uniquely identifiable collection of attributes.

### 8.1 Class Definition

A class is a JSON object published as a standalone artefact:

```json
{
	"ooml": "0.1.0",
	"fqn": "com.example.hr/Employee@1.2.0",
	"name": "Employee",
	"description": "A person employed by the organisation.",
	"authors": ["Jane Smith <jane@example.com>"],
	"license": "Apache-2.0",
	"extends": [
		"com.example.hr/Person@^1.0.0",
		"com.example.common/Auditable@^1.0.0"
	]
}
```

### 8.2 Class Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `ooml` | string | REQUIRED | — | OOML specification version targeted. |
| `fqn` | string | REQUIRED | — | Fully qualified name and version of this class (see §4.2). |
| `name` | string | REQUIRED | — | Free-form human-readable label for this class. |
| `description` | string | RECOMMENDED | — | Human-readable purpose of this class. |
| `authors` | array of string | RECOMMENDED | — | Authors in `Name <email>` format. |
| `license` | string | RECOMMENDED | — | SPDX licence expression. |
| `extends` | string, array of string, or null | OPTIONAL | `null` | FQN range(s) of superclasses. A single string is equivalent to a one-element array. Order is significant: determines MRO (see §12). |
| `abstract` | boolean | OPTIONAL | `false` | If `true`, cannot be instantiated directly. |
| `final` | boolean | OPTIONAL | `false` | If `true`, cannot be extended by any subclass. |
| `deprecated` | string | OPTIONAL | — | If present, this class is deprecated; the value is the deprecation message. MUST be a non-empty string. Omit when not deprecated. |
| `use` | object | OPTIONAL | `{}` | Map of attribute identifier or FQN range to a renaming and/or override adjustment (see §12). |
| `metadata` | object | OPTIONAL | `{}` | Map of metadata schema FQN range to metadata entry (see §10). |
| `attributes` | object | OPTIONAL | `{}` | Map of attribute identifier to attribute (see §9). Omit when empty. |

### 8.3 The `fqn` Property

The `fqn` property is the class's own identity. It enables a class definition to be validated and identified independently of any distribution system. A class definition is self-describing: its identity is carried within the document itself.

---

## 9. Attributes

An attribute is a named, typed position within a class. Every attribute has a `kind` that classifies its structural role and a `type` that specifies its value type.

### 9.1 Common Properties

#### The Attribute Identifier

The JSON property name used as the key in a class's `attributes` object is the **attribute identifier** — a camelCase string that addresses this attribute within the class's own attribute namespace. It has three distinct roles and must not be confused with related concepts:

| Concept | Example | Description |
|---------|---------|-------------|
| **Attribute identifier** | `employeeNumber` | The JSON key in the `attributes` object. Follows `[a-z][a-zA-Z0-9]*`. Locally scoped to the class. Used by tooling, code generation, and instance navigation. |
| **`name` property** | `"Employee Number"` | The free-form human-readable label. Unconstrained. Used in UIs and documentation. |
| **Owned attribute FQN** | `com.example.hr/Employee@1.2.0#employeeNumber` | The globally unique identity of this attribute. Composed of the class FQN and the attribute identifier. |
| **Referenced global attribute FQN** | `com.example.finance/salary@1.0.0` | When `"kind": "attribute"`, the FQN of the standalone global attribute being referenced. Independent of the attribute identifier. |

The attribute identifier and the `name` often convey the same concept in different forms (`employeeNumber` / `"Employee Number"`), but they are independent: the attribute identifier is a syntactic key, the `name` is a human label.

Every attribute, regardless of `kind`, shares the following properties:

```json
"attributeName": {
	"kind": "<kind>",
	"type": "<type>",
	"name": "Human-readable name",
	"description": "..."
}
```

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `kind` | string | REQUIRED | — | Structural role of this attribute. One of: `primitive`, `object`, `class`, `enum`, `list`, `set`, `map`, `attribute`, `nested`. |
| `type` | string | REQUIRED (see §9.2) | — | Value type. A primitive type name (§6), a class FQN range, a global attribute FQN range, or `"self"` (see §4.3), depending on `kind`. Not present on `list`, `set`, and `map` — those use `valueKind` and `valueType` instead. Not present on `nested` — see `attributes` below. |
| `name` | string | REQUIRED | — | Free-form human-readable label for this attribute. Independent of the attribute identifier used as its JSON property name. |
| `description` | string | RECOMMENDED | — | Human-readable purpose of this attribute. |
| `required` | boolean | OPTIONAL | `false` | Whether instances of this class MUST carry a value for this attribute. Applies only to non-static attributes (see rule S11). |
| `nullable` | boolean | OPTIONAL | `false` | Whether the instance-level value MAY be JSON `null` when present. Applies only to non-static attributes (see rule S12). |
| `static` | boolean | OPTIONAL | `false` | If `true`, the value belongs to the class, not to instances. Instances cannot set or override it. The `value` property MAY be provided; if absent the value is `undefined`. A subclass MAY change an inherited `static` attribute's value via `use.override.value` (§12.4), unless `final: true` is also set. MUST NOT be combined with `required: true` (rule S11) or `nullable: true` (rule S12). |
| `value` | any | OPTIONAL | — | The class-level value for a `static` attribute. MUST be consistent with `type`. When absent on a `static` attribute, the value is `undefined`. MUST NOT appear on non-static attributes. |
| `local` | boolean | OPTIONAL | `false` | If `true`, this attribute is scoped to the declaring class and is not inherited by subclasses. Remains fully visible and accessible to consumers of the declaring class. |
| `final` | boolean | OPTIONAL | `false` | If `true`, subclasses cannot shadow or further constrain this attribute. Combined with `static: true`, locks the class-level value for the entire hierarchy (`use.override.value` does not apply). Renaming via `use.as` (§12.3) is still permitted, since it does not change the attribute's structural contract. |
| `deprecated` | string | OPTIONAL | — | If present, this attribute is deprecated; the value is the deprecation message. MUST be a non-empty string. Omit when not deprecated. |

**`static` examples:**

```json
"schemaVersion": {
	"kind": "primitive",
	"type": "string",
	"name": "Schema Version",
	"static": true,
	"final": true,
	"value": "2",
	"description": "Schema version discriminator. Fixed for this class and all subclasses."
}
```

```json
"symbol": {
	"kind": "primitive",
	"type": "string",
	"name": "Symbol",
	"static": true,
	"description": "The symbol for this unit of measure. Subclasses should provide a value."
}
```

```json
"symbol": {
	"kind": "primitive",
	"type": "string",
	"name": "Symbol",
	"static": true,
	"value": "m/s",
	"description": "The symbol for velocity."
}
```

### 9.2 Kind: `primitive`

A scalar value of a built-in primitive type.

```json
"birthDate": {
	"kind": "primitive",
	"type": "date",
	"name": "Date of Birth",
	"description": "The employee's date of birth.",
	"nullable": true
}
```

`type` MUST be one of the primitive type names defined in §7.

Additional properties that constrain the value, applicable by primitive type:

| Property | Applies to | Description |
|----------|-----------|-------------|
| `minLength` | `string` | Minimum character count (inclusive). |
| `maxLength` | `string` | Maximum character count (inclusive). |
| `pattern` | `string` | ECMA 262 regex the value MUST match. |
| `minimum` | numeric types | Inclusive lower bound. |
| `maximum` | numeric types | Inclusive upper bound. |
| `exclusiveMinimum` | numeric types | Exclusive lower bound. |
| `exclusiveMaximum` | numeric types | Exclusive upper bound. |
| `precision` | `decimal` | Total number of significant digits. |
| `scale` | `decimal` | Digits to the right of the decimal point. |
| `encoding` | `binary` | Encoding hint (e.g. `"base64"`, `"hex"`). |

### 9.3 Kind: `object`

A reference to an **instance** of a named class, or an instance of any subtype, identified by that instance's identity. OOML does not prescribe how identity is encoded; it only constrains the type of the instance being referenced.

```json
"department": {
	"kind": "object",
	"type": "com.example.hr/Department@^1.0.0",
	"name": "Department",
	"description": "The department this employee belongs to.",
	"required": true
}
```

`type` MUST be a class FQN range resolving to a known class, or `"self"` (see §4.3).

### 9.4 Kind: `class`

A reference to a **class** — the named class itself, or any of its subtypes. The value is a class, not an instance of one: it identifies a type, not a record.

```json
"legacyType": {
	"kind": "class",
	"type": "com.example.equipment/DrillPipe@^1.0.0",
	"name": "Legacy Type",
	"description": "The equipment class this record was classified under in a prior system, retained for migration compatibility. May reference DrillPipe or any of its subtypes."
}
```

`type` MUST be a class FQN range resolving to a known class, or `"self"` (see §4.3).

### 9.5 Kind: `enum`

An `enum` attribute holds a **reference to a class** that is a subtype of the named root class, excluding the named root class itself. This is the enumerative pattern: the root class defines the category; its subtypes define the members. Neither the root nor its subtypes are required to be abstract or concrete — that is the modeller's choice.

```json
"employmentType": {
	"kind": "enum",
	"type": "com.example.hr/EmploymentType@^1.0.0",
	"name": "Employment Type",
	"description": "The nature of this person's engagement.",
	"required": true
}
```

`type` MUST be a class FQN range resolving to a known class, or `"self"` (see §4.3). Valid values are references to any class that is a subtype of the named class, excluding the named class itself.

**`class` vs `enum`:**

| | `class` | `enum` |
|-|---------|--------|
| Value is | A reference to a class | A reference to a class |
| Named class valid as value? | **Yes** | **No** — valid values are subtypes of the named class, excluding the named class itself |
| Typical use | General class reference | Enumerative selection from a category |
| Root or value abstractness | Any | Any — neither root nor subtypes need be abstract or concrete |

### 9.6 Kind: `list`

An ordered sequence of values of a declared value type. Duplicate values are permitted.

```json
"phoneNumbers": {
	"kind": "list",
	"valueKind": "primitive",
	"valueType": "string",
	"name": "Phone Numbers",
	"description": "Phone numbers associated with this employee.",
	"minItems": 0,
	"maxItems": 10
}
```

| Property | Required | Default | Description |
|----------|----------|---------|-------------|
| `valueKind` | REQUIRED | — | Kind of each value. Same vocabulary as attribute kinds. |
| `valueType` | REQUIRED (where applicable) | — | Shape of each value. A primitive type name, class FQN range, global attribute FQN range, or `"self"`, consistent with `valueKind` — **except** when `valueKind` is `nested`, in which case `valueType` is either an inline map of sub-attribute identifier to sub-attribute definition (using exactly the same structure as an `attributes` property) or a class FQN range whose full resolved shape is borrowed, following exactly the same two-form rule as a singular `nested` attribute (§9.10). `"self"` is never valid here, even in the class-FQN-range case. For `valueKind: "enum"`, valid values are subtypes of the named class, excluding the named class itself. |
| `minItems` | OPTIONAL | — | Minimum number of values (inclusive). |
| `maxItems` | OPTIONAL | — | Maximum number of values (inclusive). |

`valueType` and `attributes` play different roles and are never interchangeable: `attributes` (§8.2, §9.10) describes what the artefact or attribute *declaring it* is itself composed of. `valueType` describes the shape of *each value held by* a collection — the collection attribute itself is not that shape, its elements are. For `valueKind: "nested"`, that shape is given either inline (an ad hoc `attributes`-style map with no external name) or by borrowing a published class's shape (a compact class FQN range, §9.10); every other `valueKind` always uses the latter, string-identifier form. The property differs in representation, never in role.

### 9.7 Kind: `set`

An unordered collection of values of a declared value type. Duplicate values are NOT permitted.

```json
"roles": {
	"kind": "set",
	"valueKind": "class",
	"valueType": "com.example.hr/Role@^1.0.0",
	"name": "Roles",
	"description": "Roles assigned to this employee.",
	"required": true,
	"minItems": 1
}
```

Properties are identical to `list` (§9.6).

A set MAY hold nested values, using `valueKind: "nested"` with `valueType` as an inline sub-attribute map:

```json
"addresses": {
	"kind": "set",
	"valueKind": "nested",
	"valueType": {
		"streetName": {
			"kind": "primitive", "type": "string",
			"name": "Street Name",
			"required": true,
			"description": "The name of the street of this address."
		},
		"houseNumber": {
			"kind": "primitive", "type": "string",
			"name": "House Number",
			"required": true,
			"description": "The house number of this address."
		}
	},
	"name": "Addresses",
	"description": "Postal addresses associated with this employee."
}
```

Because nested values have no identity of their own (§9.10), duplicate detection for a `set` of nested values is necessarily structural rather than identity-based: two nested values are duplicates, and MUST NOT coexist in the same set, if and only if they are deeply equal — every sub-attribute holds an identical value, recursively, such that the two would produce byte-identical canonical JSON serialisations. This is a direct consequence of the general "no duplicates" rule (§9.7), not a separate rule: nested values simply have no other basis for comparison.

### 9.8 Kind: `map`

A collection of key-value pairs. Keys MUST be unique within an instance. Values may be of any attribute kind, including `nested`. Keys MUST NOT be `nested`: a map key requires a well-defined notion of equality for lookup, which a nested structure does not provide as reliably as a scalar, identity-bearing, or class-referencing value does.

```json
"localizedTitles": {
	"kind": "map",
	"name": "Localized Titles",
	"description": "Job title translated into multiple languages, keyed by ISO 639-1 language code."
}
```

When `keyKind` and `keyType` are omitted the map has `primitive`/`string` keys — the most common case. A more explicit example with non-default key and value kinds:

```json
"salaryByEmploymentType": {
	"kind": "map",
	"keyKind": "enum",
	"keyType": "com.example.hr/EmploymentType@^1.0.0",
	"valueKind": "attribute",
	"valueType": "com.example.finance/salary@^1.0.0",
	"name": "Salary By Employment Type",
	"description": "Standard salary for each employment type."
}
```

| Property | Required | Default | Description |
|----------|----------|---------|-------------|
| `keyKind` | OPTIONAL | `primitive` | Kind of each map key. One of `primitive`, `object`, `class`, `enum`, `attribute`. MUST NOT be `nested`. |
| `keyType` | OPTIONAL | `string` | Type of each map key. A primitive type name, class FQN range, or global attribute FQN range, consistent with `keyKind`. |
| `valueKind` | REQUIRED | — | Kind of each map value. Same vocabulary as attribute kinds, including `nested`. |
| `valueType` | REQUIRED (where applicable) | — | Shape of each map value. A primitive type name, class FQN range, global attribute FQN range, or `"self"`, consistent with `valueKind` — or, when `valueKind` is `nested`, an inline sub-attribute map, exactly as for `list` and `set` (§9.6). For `valueKind: "enum"`, valid values are subtypes of the named class, excluding the named class itself. |
| `minItems` | OPTIONAL | — | Minimum number of entries (inclusive). |
| `maxItems` | OPTIONAL | — | Maximum number of entries (inclusive). |

---

### 9.9 Kind: `attribute`

An attribute that references a standalone global attribute (see §9). The attribute inherits the `kind`, `type`, and all type-specific constraints from the global attribute. The attribute identifier within the class is the local accessor name for that attribute.

```json
"surfaceTemp": {
	"kind": "attribute",
	"type": "com.example.physics/temperature@^1.0.0",
	"name": "Surface Temperature",
	"description": "Surface temperature of this celestial body.",
	"nullable": true
}
```

| Property | Required | Description |
|----------|----------|-------------|
| `type` | REQUIRED | FQN range of the global attribute. |

All common properties (`name`, `required`, `nullable`, `static`, `local`, `final`, `deprecated`) apply to attributes of kind `attribute`. `kind` and `type` are always inherited from the referenced global attribute and MUST NOT be redeclared. `required`, `nullable`, `static`, `local`, and `final` are properties of the importing slot itself — a global attribute never declares these (§7.2) — so there is no inherited value to override; the importing class simply sets them as it would on any other attribute.

The global attribute's own type-specific constraint properties (e.g. `minLength`, `maxLength`, `pattern`, `precision`, `scale`) and `deprecated` MAY be adjusted directly as siblings, following exactly the override-eligibility and narrowing rules of §12.4 — no wrapper is needed here, since the importing attribute's own JSON object is already the place a class states its own properties for this attribute:

```json
"zipCode": {
	"kind": "attribute",
	"type": "org.ooml.address/postalNumber@1.0.2",
	"name": "ZIP Code",
	"required": true,
	"pattern": "^\\d{5}(-\\d{4})?$",
	"description": "A US ZIP code, formatted for the checkout form."
}
```

Here `postalNumber`'s own `pattern` and `description` are narrowed and clarified respectively for this specific use, without altering the global attribute's own published definition. As with `use.override` (§12.4), every such adjustment except `name` and `description` is a MAJOR (breaking) change (§5.4), and `deprecated` MAY only be added, never changed or removed, if the global attribute does not already carry one.

### 9.10 Kind: `nested`

An ad hoc, locally-scoped data structure with no independent identity. Its shape comes from exactly one of two sources:

- **`attributes`** — an inline sub-attribute map, described directly on the attribute, using the same structure as a class's `attributes` property (§9.1).
- **`type`** — a class FQN range whose full resolved shape (its own attributes plus everything it inherits, §11.2) is borrowed and embedded. The referenced class is never instantiated by this; only its shape is used. `abstract` and `final` on the referenced class are irrelevant here — a `nested` attribute may borrow the shape of an abstract class, or of a class nothing else is permitted to extend, since shape-borrowing is neither instantiation nor inheritance.

A `nested` attribute MUST have exactly one of `attributes` or `type` — never both, never neither (rule T10). `type`, when present, MUST NOT be `"self"`: a class borrowing its own full shape is a guaranteed structural cycle, and is rejected outright rather than left to general cycle detection (rule T13).

**Inline form:**

```json
"homeAddress": {
	"kind": "nested",
	"name": "Home Address",
	"required": true,
	"description": "The address the employee has registered as primary residence in the national register.",
	"attributes": {
		"streetName": {
			"kind": "primitive", "type": "string",
			"name": "Street Name",
			"required": true,
			"description": "The name of the street of primary residence."
		},
		"houseNumber": {
			"kind": "primitive", "type": "string",
			"name": "House Number",
			"required": true,
			"description": "The house number of primary residence."
		}
	}
}
```

**Type-borrowed form**, embedding a published, independently-reusable class's shape without instantiating or referencing it:

```json
"coordinates": {
	"kind": "nested",
	"type": "com.example.geo/GeoCoordinates@^1.0.0",
	"name": "Geographic Coordinates",
	"description": "Precise coordinates for this address, used for delivery routing."
}
```

The same class remains fully usable as an ordinary `object` reference elsewhere — a `nested` attribute never claims exclusive use of a class's shape:

```json
"lastKnownVehicleLocation": {
	"kind": "object",
	"type": "com.example.geo/GeoCoordinates@^1.0.0",
	"name": "Last Known Vehicle Location",
	"description": "A separately-stored, independently-updatable location record for the delivery vehicle."
}
```

| Property | Required | Description |
|----------|----------|-------------|
| `attributes` | Exactly one of `attributes` or `type` REQUIRED | Map of sub-attribute identifier to sub-attribute definition. When present, MUST be non-empty. Uses the same structure and validation rules as a class's `attributes` property (§9.1, §8.2). |
| `type` | Exactly one of `attributes` or `type` REQUIRED | A class FQN range whose full resolved shape is embedded. MUST NOT be `"self"`. |

Whichever form is used, a sub-attribute MAY itself be of kind `nested` (in either form), allowing arbitrarily deep nesting. A global attribute MAY also be of kind `nested`, in either form (§7.2) — the type-borrowed form is itself a natural way to publish a reusable nested shape, alongside simply publishing the source class and letting classes borrow it directly, as shown above.

A `nested` attribute MUST NOT have `valueKind`, `valueType`, `keyKind`, or `keyType`. `extends`, `use`, and `metadata` are not valid within a nested attribute's inline structure — a nested attribute is not a class, and does not carry class-level concepts such as inheritance or an independent metadata surface, regardless of which form supplies its shape.

A `list`, `set`, or `map` MAY hold nested values via `valueKind: "nested"`, in which case the collection attribute's `valueType` carries either an inline sub-attribute map or a class FQN range, following exactly the same two-form rule as a singular `nested` attribute (§9.6). A map's *keys* MUST NOT be nested (§9.8).

### 9.11 Nested Attributes and the Dependency Graph

The **inline form** introduces no edge of its own: it has no `type` and no FQN. Dependencies arising from its sub-attributes (at any depth) attach to the nearest containing artefact — the class or global attribute the nested structure is ultimately declared within — exactly as an ordinary top-level attribute's dependencies do. Nested attributes are never independently resolvable and never appear as their own node in the dependency graph, regardless of form.

The **type-borrowed form** is different: it is a genuinely structural dependency, exactly like `attribute-import`, since the containing artefact's own shape now incorporates the referenced class's shape. It MUST participate in cycle detection alongside `extends`, `attribute-import`, and `metadata` (§14.2, §14.4) — unlike an `object`, `class`, or `enum` reference to the same class, which would remain identity-only and cycle-exempt. The same class may be referenced both ways in the same model without conflict: a `nested` attribute borrowing its shape, and an `object`/`class`/`enum` attribute referencing it by identity, are structurally independent relationships.

A sub-attribute MAY be addressed, for documentation or tooling purposes, using the dotted extension of the owned attribute FQN form (§4.2): `com.example.hr/Employee@1.2.0#homeAddress.streetName`. This identifies the sub-attribute's position within its containing artefact; it is not an independent FQN, since a sub-attribute has no identity beyond that position. This applies identically regardless of whether the sub-attribute's shape came from an inline `attributes` map or was borrowed via `type`.

---


## 10. Metadata

### 10.1 Purpose

Metadata in OOML is a mechanism for attaching structured, typed, versioned annotations to any artefact — a class or a global attribute. Rather than defining a separate metadata modelling language, OOML uses itself: metadata schemas are ordinary OOML classes, independently versioned, and referenced by FQN range. This means metadata schemas automatically inherit all OOML capabilities: inheritance, attributes, type safety, and dependency tracking.

A metadata schema carries no special marker. Any class may serve as a metadata schema. Whether a class is intended for metadata use is a convention recorded in its `description` and `tags`, not a language-level distinction.

### 10.2 The `metadata` Property

The `metadata` property on a class or global attribute is a JSON object. Each key is the FQN range of a metadata schema class. Each value is either a **short-form** scalar value or a **compound-form** object with control properties.

```json
{
	"ooml": "0.1.0",
	"fqn": "com.example.hr/Employee@1.3.0",
	"name": "Employee",
	"description": "A person employed by the organisation.",
	"metadata": {
		"com.osdu.schema/SchemaInfo@^1.0.0": {
			"status": "com.osdu.schema/Published@1.0.0",
			"license": {
				"value": "Apache-2.0",
				"cascade": true,
				"final": true
			},
			"author": {
				"value": "Jane Smith <jane@example.com>",
				"cascade": false
			},
			"deprecationDate": {
				"value": null,
				"local": true
			}
		}
	}
}
```

The value of each metadata schema entry is itself an object whose keys are attribute identifiers defined on the metadata schema class, and whose values are either short-form or compound-form.

### 10.3 Short Form vs Compound Form

A metadata attribute value may be expressed in two forms:

**Short form** — a scalar value assigned directly. All control properties take their defaults.

```json
"status": "com.osdu.schema/Published@1.0.0"
```

**Compound form** — an object with a `value` property and optional control properties.

```json
"license": {
	"value": "Apache-2.0",
	"cascade": true,
	"final": true
}
```

A validator normalises short form to compound form internally. The two are semantically equivalent when all control properties are at their defaults.

### 10.4 Metadata Entry Control Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `value` | any | — | REQUIRED in compound form. The metadata value. MUST conform to the type declared in the metadata schema class for this attribute. MAY be `null` when `required: false`. |
| `required` | boolean | `true` | Whether a concrete value MUST be present. If `true` and `value` is `null`, this entry is a **slot declaration**: it signals that a value must be set somewhere in the inheritance chain before the artefact (or any subclass) is considered valid. |
| `cascade` | boolean | `false` | If `true`, the value propagates to subclasses that do not set their own value for this entry. Subclasses may always override a cascaded value unless `final: true`. |
| `local` | boolean | `false` | If `true`, this entry is scoped to the declaring artefact and is not inherited by subclasses. The entry remains fully visible and accessible to consumers of the declaring artefact. |
| `final` | boolean | `false` | If `true`, subclasses cannot override this entry's value. |

### 10.5 Slot Declarations

A metadata entry with `value: null` and `required: true` is a **slot declaration** — a statement that a value must eventually be provided, without the declaring artefact providing one. This is useful for base classes that mandate a metadata requirement without being in a position to supply the value themselves.

```json
"metadata": {
	"com.osdu.schema/SchemaInfo@^1.0.0": {
		"status": {
			"value": null
		}
	}
}
```

A concrete subclass satisfies this requirement by providing a non-null value for the same entry.

### 10.6 Interaction Rules

The following combinations of control properties have defined semantics or are validation errors:

| Combination | Result |
|-------------|--------|
| `local: true` + `cascade: true` | **Validation error (M01).** A value cannot cascade to subclasses that do not receive the slot. |
| `local: true` + `final: true` | Permitted but redundant. If subclasses do not receive the slot, locking the value is a no-op. Tooling SHOULD warn. |
| `local: true` + `required: true` | Valid. The declaring artefact itself must have a non-null value. Subclasses are not obligated to carry this slot. |
| `final: true` + `cascade: false` | Valid. The value is locked but does not propagate; subclasses that do not receive it via cascade must set their own (if the slot is required). |
| `final: true` + `cascade: true` | Valid and common. The value cascades and cannot be overridden. |

### 10.7 Metadata Inheritance

Metadata entries are inherited by subclasses subject to the following rules:

1. A subclass inherits all non-`local` metadata entries from all its ancestors, transitively.
2. A subclass MAY set its own value for any inherited entry, unless that entry is `final: true` in any ancestor.
3. A subclass MAY declare additional metadata entries not present in any ancestor.
4. A `cascade: true` entry whose value is set by an ancestor propagates to all descendants that do not set their own value. The cascaded value is overridable unless `final: true`.
5. A `local: true` entry is not inherited. It exists only on the declaring artefact.
6. A subclass MUST NOT remove a required slot declaration inherited from an ancestor. It satisfies it by providing a non-null value.

### 10.8 `local` and `final` on Attributes

The `local` and `final` modifiers apply to attributes with the same semantics as metadata entries:

**`local: true` on an attribute** means the attribute is declared on this class and is fully accessible to consumers of this class, but subclasses do not inherit it. It does not appear in a subclass's MRO-resolved attribute set. A subclass may declare its own attribute with the same name without it being considered a redeclaration conflict.

**`final: true` on an attribute** means no subclass may shadow or further constrain the attribute. Attempting to declare an attribute with the same canonical local name in a subclass is a validation error (rule I06). Renaming a `final` attribute via `use.as` (§12.3) in a subclass is permitted — renaming does not touch the attribute's `kind`, `type`, or constraints, so it is not the kind of structural modification `final` guards against.

Interaction rules for attributes:

| Combination | Result |
|-------------|--------|
| `local: true` + `final: true` | Permitted but redundant. Tooling SHOULD warn. |
| `local: true` + `static: true` | Valid. The static value is scoped to this class only; subclasses do not inherit the attribute. |
| `final: true` + `static: true` | Valid. The class-level value is locked; subclasses cannot redeclare the attribute. |
| `final: true` + `static: true` + `value` | The closest OOML equivalent to a traditional constant. |

### 10.9 Metadata and the Dependency Graph

Each metadata schema FQN range declared as a key in the `metadata` object creates a `metadata` edge in the dependency graph from the declaring artefact to the metadata schema class. This edge participates in the same dependency resolution and cycle-detection rules as all other edges. Specifically:

- A `metadata` edge is treated as a structural dependency for cycle detection purposes. A class that uses itself as its own metadata schema would create a structural cycle and is rejected (rule D02).

---

## 11. Inheritance: Superclasses and Subclasses

### 11.1 Declaring a Subclass

A class declares its superclass or superclasses using the `extends` property. `extends` accepts either a single FQN range string or an array of FQN range strings. A single string is treated as a one-element array.

```json
{
	"ooml": "0.1.0",
	"fqn": "com.example.hr/Employee@1.0.0",
	"name": "Employee",
	"description": "A person employed by the organisation.",
	"extends": [
		"com.example.hr/Person@^1.0.0",
		"com.example.common/Auditable@^1.0.0"
	],
	"attributes": {
		"employeeNumber": { "kind": "primitive", "type": "string", "name": "Employee Number", "required": true, "description": "Employee reference number." },
		"startDate":      { "kind": "primitive", "type": "date",   "name": "Start Date",      "required": true, "description": "Employment start date." },
		"manager":        { "kind": "object",     "type": "self",   "name": "Manager",         "description": "Direct line manager." }
	}
}
```

Here `com.example.hr/Person` and `com.example.common/Auditable` are both **superclasses** of `Employee`. `Employee` is a **subclass** of both.

### 11.2 Attribute Inheritance Rules

1. A subclass inherits all attributes from all its superclasses that are not marked `local: true`, and transitively from all ancestors.
2. Inherited attributes MUST NOT be re-declared in a subclass, unless the inherited attribute is `local: true` in the ancestor (in which case the subclass is free to declare its own attribute with the same name).
3. A subclass MUST NOT override an inherited attribute's `kind` or `type`. A limited set of other properties MAY be adjusted via the `use` property (§12), including the `value` of an inherited `static`, non-`final` attribute — this is the only mechanism by which such a value may be changed by a subclass.
4. A subclass MUST NOT shadow or re-declare an attribute inherited from any ancestor that is marked `final: true` (rule I06).
5. Inherited attributes from different ancestors whose **global attribute FQNs differ** are always distinct, regardless of whether their local attribute identifiers happen to match. There is no conflict between them at the type level.
6. Inherited attributes from different ancestors that share the **same global attribute FQN** are the same attribute and appear once in the resolved attribute set. This is the only true diamond case and requires no resolution rule beyond deduplication.
7. Where two or more ancestors have independently applied a `use.override` to the same underlying attribute (rule 6), the narrowest value for each mechanically-verified property (§12.4) applies automatically in the inheriting class, with no action required from it.
8. Where two or more ancestors have applied conflicting `pattern` overrides to the same underlying attribute, the inheriting class MUST explicitly resolve the conflict with its own `use.override.pattern` entry (§12.5, rule U06).

### 11.3 Attribute Resolution Order (MRO)

The full attribute set of a class is computed by a depth-first, left-to-right traversal of the `extends` array (the class's own attributes come last). This is consistent with the C3 linearisation algorithm.

For a class `C` with `"extends": [A, B]`:
1. Resolve `C`'s own attributes.
2. Prepend the linearisation of `A` (recursively).
3. Prepend the linearisation of `B` (recursively), deduplicating any ancestors already included from step 2.
4. The resulting ordered list is the MRO of `C`.

The MRO determines the order in which attributes appear in tooling output (e.g. schema documentation, code generation). Attributes earlier in the MRO take precedence for local-name access where no `use.as` rename has been applied and no collision exists.

### 11.4 Local Name Access and Collisions

An inherited attribute is accessible by its **canonical local name** (the attribute identifier as declared in the ancestor class) if and only if that name is unambiguous — i.e. no other inherited attribute in the same class shares the same local name (regardless of FQN).

If two inherited attributes share a local name, neither is accessible by that name unless one is given a new name via `use` (see §12). Tooling SHOULD warn when a local name collision is left unresolved.

### 11.5 Abstract Classes

An abstract class (`"abstract": true`):

- MUST NOT be instantiated directly.
- MAY define attributes.
- MAY itself extend other classes.
- MAY be the target of `class` and `object` attributes; the resolved instance at runtime will be a concrete subtype.

### 11.6 Final Classes

A final class (`"final": true`) cannot appear in any other class's `extends` array. Attempting to extend a final class is a validation error (rule I03).

### 11.7 Version Compatibility of `extends`

Each entry in `extends` carries a version range, not a pinned version. When a new version of a superclass is published:

- If the new version is compatible with the declared range (MINOR or TRIVIAL change), the subclass automatically resolves to the new version without a new publication.
- If the new version is a MAJOR change, the subclass author MUST evaluate whether to publish a new version with an updated range.

This is the principal mechanism by which OOML propagates inheritance changes without requiring simultaneous re-publication of all descendants.

---


## 12. Renaming and Overriding Inherited Attributes

### 12.1 Purpose

A subclass may need to adjust an attribute it inherits — without redeclaring the attribute itself, which is not possible (§11.2 rule 3). The `use` property exists for exactly this, and covers two distinct needs:

1. **Disambiguating a name collision.** When two ancestors each contribute an attribute under the same local attribute identifier but with different underlying FQNs, neither is reachable by that shared name (§11.4). `use` resolves this by giving one specific attribute — identified by its FQN range, since the name alone cannot distinguish it — a new, unambiguous name.
2. **Renaming or narrowing an already-unambiguous inherited attribute.** When an attribute is already reachable under one clear name, `use` can rename it for local clarity, adjust a small set of override-eligible properties, or both.

There is no separate aliasing mechanism. Renaming an inherited attribute via `use` fully replaces its exposed name — the old name is no longer reachable from this class or any of its subclasses (§12.3). This is a deliberate, precedented design choice (Eiffel's `rename` clause resolves multiple-inheritance name clashes and provides contextual renaming the same way, with the same non-additive semantics), and it keeps OOML's naming model simple: at any point in the hierarchy, an attribute has exactly one current name, never several.

### 12.2 The `use` Property

`use` is declared on a class, as a JSON object whose keys identify an inherited attribute and whose values describe the adjustment to apply. A key is either:

- **A bare attribute identifier** (e.g. `gravity`) — valid only when that name is currently unambiguous on this class, per the normal local-name-access rules (§11.4).
- **An FQN range** (e.g. `com.example.physics/temperature@^1.0.0`) — used specifically to pick one attribute out from under a name collision, since the collision itself makes the bare name unusable. Distinguished from a bare identifier purely by shape: an FQN range always contains both `/` and `@`; a bare attribute identifier never does.

Each entry MAY contain `as` (a new local name), `override` (adjustments to a limited set of properties, §12.4), or both. An entry with neither is meaningless and MUST NOT be used (rule U02).

```json
{
	"fqn": "com.example.planets/CelestialBody@1.0.0",
	"name": "Celestial Body",
	"description": "A body in a planetary system.",
	"extends": [
		"com.example.planets/Surface@^1.0.0",
		"com.example.planets/Core@^1.0.0"
	],
	"use": {
		"com.example.physics/temperature@^1.0.0": {
			"as": "surfaceTemperature"
		},
		"com.example.geology/coreTemperature@^1.0.0": {
			"as": "coreTemperature"
		},
		"gravity": {
			"as": "surfaceGravity",
			"override": {
				"description": "Surface gravity of this celestial body, relative to Earth's (1.0 = Earth gravity)."
			}
		}
	},
	"attributes": {}
}
```

`temperature` is contributed by both `Surface` and `Core`, each backed by a different global attribute — the bare name alone cannot say which is meant, so each is picked out by its FQN range. `gravity` is contributed only by `Surface`; there is nothing else it could mean, so it is already reachable by that one bare name, and `use` refers to it that way while renaming it and adjusting its description.

### 12.3 Renaming (`as`)

`as` replaces the attribute's exposed name with a new one, for this class and every subclass beneath it. The previous name — whether it was the attribute's original local identifier or a name established by an ancestor's own `use.as` — is no longer reachable from this point in the hierarchy onward. Renaming is not additive: it does not leave the old name usable alongside the new one.

Because renaming removes a name from where it worked before, it is always a MAJOR (breaking) change (§5.4).

A class MAY, after renaming a name away, declare its own unrelated attribute using that now-freed name. Doing so is permitted but SHOULD be approached with caution, since reusing a name an ancestor's data once meant something different under can be confusing to anyone tracing the class hierarchy.

### 12.4 Overriding (`override`)

`override` adjusts a limited set of properties on an inherited attribute, without changing its identity (`kind`, `type`) or its structural role. Only the following properties are override-eligible:

| Property | Rule |
|----------|------|
| `name`, `description` | Freely overridable. No directional constraint. |
| `minLength`, `minimum`, `minItems`, `exclusiveMinimum` | Overridable only by increasing the value (narrowing). |
| `maxLength`, `maximum`, `maxItems`, `exclusiveMaximum`, `precision`, `scale` | Overridable only by decreasing the value (narrowing). |
| `required` | Overridable only `false → true` (narrowing). |
| `nullable` | Overridable only `true → false` (narrowing). |
| `pattern` | Overridable; the override is asserted to be narrower than the inherited pattern, but — unlike the properties above — this is not mechanically verified (§21, pattern containment is undecidable in general for the full ECMA 262 dialect OOML's `pattern` property uses). |
| `deprecated` | Addable only. MUST NOT be used where the inherited attribute already carries a `deprecated` message — `override` cannot change or remove an existing deprecation. |
| `value` | Overridable only when the inherited attribute is `static: true` and NOT `final: true`. Not directionally constrained — a static value has no notion of narrower or wider, only different (§9.1). |

No other property is override-eligible. `kind`, `type`, `static`, `final`, `local`, `valueKind`, `keyKind`, `valueType`, and `keyType` MUST NOT appear in `override` under any circumstances — these define the attribute's identity and structural role, not a value restriction on it (rule U04).

For every mechanically-verified property above, if the inherited attribute never declared that property at all, it is treated as maximally permissive — any value the subclass supplies for it is automatically valid narrowing, with nothing further to check. Each property is verified independently against its own prior value; there is no combined-range logic. An `override` property MUST be applicable to the target attribute's actual `kind` — `pattern` cannot be overridden on something that is not string-typed, `minItems` cannot be overridden on something that is not a collection, and so on (rule U04a).

```json
{
	"fqn": "com.example.hr/SeniorEmployee@1.0.0",
	"extends": ["com.example.hr/Employee@^1.2.0"],
	"name": "Senior Employee",
	"use": {
		"employeeNumber": {
			"as": "legacyStaffNumber",
			"override": {
				"description": "Senior staff reference number, using the legacy 8-digit format.",
				"maxLength": 8
			}
		}
	},
	"attributes": {}
}
```

Because narrowing may invalidate previously-valid data, and changing a `deprecated`/`value` state is a substantive change to the attribute's contract, every `override` adjustment except `name` and `description` is classified as a MAJOR (breaking) change, following the same logic already applied to narrowing a global attribute's own declared constraints (§5.4). `name` and `description` overrides fall under the general TRIVIAL rule for editing descriptive text (§5.6).

### 12.5 Multiple Inheritance and Conflicting Overrides

Where a class inherits the same underlying attribute through two or more ancestors (§11.2 rule 6 — the diamond case), each ancestor may independently have applied its own `use.override` to that attribute before the class in question ever sees it. For every mechanically-verified property, the narrowest value among all contributing ancestors applies automatically — no action is required from the inheriting class, since taking the narrowest is always safe (anything satisfying the tightest bound necessarily satisfies every looser one it was narrowed from).

`pattern` has no such automatic resolution, since pattern narrowing cannot be mechanically compared. If two ancestors supply conflicting `pattern` overrides for the same underlying attribute, the inheriting class MUST explicitly resolve the conflict with its own `use.override.pattern` entry; leaving it unresolved is a validation error (rule U06). Authoring tooling SHOULD detect and surface this situation to the class author rather than leaving it to be discovered at validation time.

---

## 13. Type Hierarchy: Supertypes and Subtypes

The type hierarchy is the transitive closure of the superclass relationship across all resolvable class versions within the resolution context.

### 13.1 Definitions

- Class **A** is a **supertype** of class **B** if A appears anywhere in the MRO of B (excluding B itself).
- Class **B** is a **subtype** of class **A** if **A** is a supertype of **B**.
- A class is both a supertype and a subtype of itself (reflexive).

Because OOML supports multi-inheritance, the type hierarchy is a DAG (directed acyclic graph) rather than a tree. A class may have multiple direct supertypes, each of which may in turn have multiple supertypes.

### 13.2 Type Compatibility

Type compatibility differs by `kind`:

- **`object`** — accepts a reference to an instance whose type is **A or any subtype** of A.
- **`class`** — accepts a reference to **class A itself or any subtype** of A.
- **`enum`** — accepts a reference to a class that is a subtype of A, excluding A itself.

This is covariant substitution following the Liskov Substitution Principle, with `enum` applying an additional exclusion of the root.

### 13.3 Required Type Hierarchy Operations

OOML-conformant tools MUST be capable of computing:

| Operation | Description |
|-----------|-------------|
| `ancestors(C)` | The ordered list of superclasses from C's immediate superclass to the root |
| `descendants(C)` | All classes that are subtypes of C within the resolution context |
| `isSubtype(A, B)` | Whether A is a subtype of B |
| `dependents(C)` | All artefacts that declare any direct dependency on C |

The `dependents` operation is the direct answer to the query that motivated this specification's class-level versioning model: "what depends on this class?" is a simple graph-edge lookup, not a scan of package contents.

---

## 14. The Dependency Graph

### 14.1 Structure

The OOML dependency graph is a directed acyclic graph (DAG) where:

- **Nodes** are class and global attribute versions, identified by their exact FQN (including version).
- **Edges** are directed from a dependent to its dependency, labelled with the version range found at the point of reference.

There is no separate `dependencies` property. The dependency graph is **derived**, not declared: every edge is read directly from the referencing properties already present in a class definition — `extends`, attribute `type` properties, collection `valueType`/`keyType` properties, and `metadata` keys. A class definition is fully self-describing; nothing beyond its own body is needed to compute its dependency edges.

There are no package nodes. Every node is an individual versioned class or global attribute. The dependency graph is a logical structure implied by the language; how it is computed, cached, or traversed by any particular tool is outside the scope of this specification.

### 14.2 Edge Types

Edges arise from the following sources:

| Source | Edge meaning |
|--------|-------------|
| `extends` property (each entry) | Inheritance dependency: the subclass structurally incorporates the superclass |
| `object` attribute `type` property | Reference dependency: the class refers to an instance of another class by identity |
| `class` attribute `type` property | Class reference dependency: the class refers to another class itself, or any of its subtypes |
| `enum` attribute `type` property | Enum root dependency: the class references a class as an enum root |
| `attribute`-kind attribute `type` property | Attribute import dependency: the class uses a standalone global attribute |
| `nested`-kind attribute `type` property (type-borrowed form) | Shape embedding dependency: the class's own shape incorporates the referenced class's full resolved shape (§9.11) |
| `list`, `set`, or `map` `valueType`/`keyType` property | Collection element dependency |
| `metadata` object key (each entry) | Metadata schema dependency: the class carries metadata conforming to a metadata schema class |

A self-referential `"self"` token (§4.3) resolves to the declaring class's own FQN once expanded, and is treated identically to an explicit self-referential FQN for edge purposes. This does not apply to a `nested` attribute's `type` — `"self"` is not a valid value there (§9.10, rule T13).

A `nested`-kind attribute's inline form (`attributes`) introduces no edge of its own: it has no `type` and no FQN. Edges arising from its sub-attributes (at any depth) are attributed to the nearest containing artefact, exactly as if those sub-attributes were declared directly on that artefact. The type-borrowed form (`type`) is different: it is a genuine structural dependency, and MUST participate in cycle detection alongside `extends`, `attribute-import`, and `metadata` (§9.11, §14.4).

The `use` property (§12) introduces no edge of its own either. An FQN range used as a `use` key identifies an attribute that is, by construction, already reachable via an existing `extends` or `attribute-import` edge — `use` only ever adjusts something already structurally present, never references anything new.

Tools MAY distinguish edge types in visualisations and impact analysis.

### 14.3 Version Range Syntax

OOML adopts the npm-compatible semver version range syntax for expressing version constraints wherever an FQN range appears (`extends`, attribute `type`/`valueType`/`keyType`, `use` FQN-range keys, `metadata` keys):

| Specifier | Meaning |
|-----------|---------|
| `1.2.3` | Exact version |
| `^1.2.3` | Same MAJOR, `>= 1.2.3` |
| `~1.2.3` | Same MAJOR and MINOR, `>= 1.2.3` |
| `>=1.2.0 <2.0.0` | Explicit range |
| `*` | Any version (not recommended for production) |

For MAJOR version 0, `^0.y.z` is treated as `~0.y.z`, reflecting the initial-development instability convention.

### 14.4 Acyclicity

The dependency graph MUST be acyclic across `extends`, `attribute-import`, `metadata`, and the type-borrowed form of `nested` attributes (§9.11) — this last one being structurally identical in kind to `attribute-import`, since it too causes one artefact's shape to genuinely incorporate another's. Self-referential `object`, `class`, and `enum` attribute edges — including those declared via `"self"` — remain exempt: all three are references by identity to a class or an instance, not structural embedding, and do not constitute a definition cycle (see §19.6 for the underlying rationale). `"self"` is not a valid `type` for a `nested` attribute (rule T13), precisely because that exemption does not extend to it.

### 14.5 Resolution

The OOML language defines the *structure* of dependencies: which artefacts depend on which other artefacts, and under what version constraints, as derived from a class's own body. The *resolution* of those dependencies — fetching specific versions, selecting among multiple candidates that satisfy overlapping ranges, and handling version conflicts — is the concern of any distribution or tooling system built on OOML and is outside the scope of this specification.

### 14.6 Dependency Insight

Because the dependency graph is a flat graph of class nodes with no package-level indirection, the following queries are structurally straightforward for any tooling system that indexes the (derived) graph:

| Query | How |
|-------|-----|
| Direct dependents of C | Find all nodes with an edge pointing to C |
| All classes that extend C | Filter edges to inheritance type |
| All classes that reference C by instance identity | Filter edges to `object` type |
| All classes that reference C as a class itself | Filter edges to `class` type |
| Impact of a MAJOR change to C | BFS/DFS over dependent edges from C |
| Full ancestry of C | Traverse `extends` edges from C to root |
| All subtypes of C | Traverse `extends` edges inbound to C, recursively |

---


## 15. Serialisation Format

OOML artefacts (classes and global attributes) are serialised as UTF-8 encoded JSON.

### 15.1 Omission-Over-Default Convention

Optional properties whose value equals their declared default SHOULD be omitted rather than stated explicitly. This applies across all artefact types:

| Property | Default | Omit when value is |
|----------|---------|-------------------|
| `abstract` | `false` | `false` |
| `final` | `false` | `false` |
| `static` | `false` | `false` |
| `local` | `false` | `false` |
| `required` | `false` | `false` |
| `nullable` | `false` | `false` |
| `extends` | `null` | `null` or `[]` |
| `use` | `{}` | `{}` |
| `metadata` | `{}` | `{}` |
| `attributes` | `{}` | `{}` |
| `cascade` (metadata) | `false` | `false` |
| `keyKind` (map) | `primitive` | `primitive` |
| `keyType` (map) | `string` | `string` |

A property that carries only its default value adds noise without information. Omitting it makes artefact definitions more readable and concise.

Conformant parsers MUST accept explicit defaults — the convention is a SHOULD for authors, not a MUST for parsers.

### 15.2 Formatting Conventions

The following formatting conventions are RECOMMENDED for canonical output:

- Two-space indentation
- Object keys sorted alphabetically
- No trailing commas
- LF (`\n`) line endings

These are informative conventions. Parsers MUST accept any valid JSON.

---

## 16. Validation Rules

An OOML artefact (class or global attribute) is **valid** if and only if all applicable rules below pass. Conformant tools MUST enforce these rules when processing artefacts and SHOULD enforce them during authoring.

### 16.1 Structural Rules

| Rule ID | Description |
|---------|-------------|
| S01 | The `ooml` property MUST be a valid semver string identifying a known specification version. |
| S02 | The namespace portion of `fqn` MUST match `[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+`. |
| S03 | For a class, the name portion of `fqn` MUST match `[A-Z][A-Za-z0-9]*` (PascalCase). |
| S03b | For a global attribute, the name portion of `fqn` MUST match `[a-z][a-zA-Z0-9]*` (camelCase). |
| S03a | The `name` property MUST be present and non-empty on all artefacts (classes and global attributes). |
| S04 | The version portion of `fqn` MUST be a valid, exact (non-range) semver string. |
| S05 | Attribute identifiers MUST match `[a-z][a-zA-Z0-9]*` (camelCase). |

| S08 | A class MUST NOT be both `abstract: true` and `final: true`. |
| S09 | The `value` property MUST NOT appear on non-`static` attributes. |
| S-deprecated | The `deprecated` property, when present on any artefact or attribute, MUST be a non-empty string. The value `null` is not permitted; omit the property instead. |
| S10 | A `static` attribute's `value`, when provided, MUST be consistent with the attribute's declared `type`. |
| S11 | A `static` attribute MUST NOT have `required: true`. (Since the default is `false`, omitting `required` on a static attribute is always correct.) |
| S12 | A `static` attribute MUST NOT have `nullable: true`. |

### 16.2 Type Rules

| Rule ID | Description |
|---------|-------------|
| T01 | The `type` on an attribute of kind `primitive` MUST be one of the primitive type names in §7. |
| T02 | The `type` on an attribute of kind `object`, `class`, or `enum` MUST resolve to a known class within the resolution context. |
| T03 | The `type` on an attribute of kind `enum` defines the enum root. Valid values at runtime are references to classes that are subtypes of the named class, excluding the named class itself. |
| T04 | The `type` on an attribute of kind `attribute` MUST resolve to a known global attribute within the resolution context. |

| T06 | When `valueKind` is `primitive`, `valueType` MUST be a valid primitive type name (§6). |
| T07 | When `valueKind` is `object`, `class`, or `enum`, `valueType` MUST resolve to a known class. When `valueKind` is `attribute`, `valueType` MUST resolve to a known global attribute. For `valueKind: "enum"`, valid values are subtypes of the resolved class, excluding the resolved class itself. |
| T08 | The `keyType` on an attribute of kind `map` MUST be a primitive type name from §7. |
| T09 | An attribute of kind `nested` MUST NOT have `valueKind`, `valueType`, `keyKind`, or `keyType`. |
| T10 | An attribute of kind `nested` MUST have exactly one of `attributes` or `type` — never both, never neither. When `attributes` is present, it MUST be non-empty and is validated per the same rules as a class's `attributes` property (§9.1, §8.2). When `type` is present, it MUST resolve to a known class, and the embedded shape is that class's full resolved attribute set (its own attributes plus everything it inherits, §11.2). This applies equally to a global attribute of kind `nested` (§7.2). |
| T11 | When `valueKind` is `nested`, `valueType` MUST be either a non-empty inline map of sub-attribute identifier to sub-attribute definition (validated per the same rules as an `attributes` property, §9.1, §8.2), or a class FQN range whose full resolved shape is embedded — following exactly the same two-form rule as `attributes`/`type` on a singular `nested` attribute (rule T10). |
| T12 | `keyKind` MUST NOT be `nested`. |
| T13 | `type` on an attribute of kind `nested`, and `valueType` on a `list`, `set`, or `map` with `valueKind: "nested"` when given as a class FQN range, MUST NOT be `"self"`. |

### 16.3 Inheritance Rules

| Rule ID | Description |
|---------|-------------|
| I01 | Every FQN range in `extends` MUST resolve to a known class within the resolution context. |
| I02 | A class MUST NOT extend itself (direct or transitive cycle via inheritance edges). |
| I03 | A class MUST NOT extend a class marked `final: true`. |
| I04 | A class MUST NOT declare an attribute whose name conflicts with any non-`local` inherited attribute's canonical local name. |
| I05 | A class marked `abstract: false` MUST provide (via its own or inherited attributes) all required non-`local` attributes needed for instantiation. |
| I06 | A class MUST NOT declare an attribute that shadows a `final: true` attribute in any ancestor. |

### 16.4 Use Rules

| Rule ID | Description |
|---------|-------------|
| U01 | Each key in `use` MUST be either a bare attribute identifier that is currently unambiguous on the class (§11.4), or an FQN range that resolves to an attribute in the class's resolved attribute set. |
| U02 | A `use` entry MUST specify at least one of `as` or `override`. An entry with neither is a validation error. |
| U03 | An `as` value MUST NOT collide with any own attribute identifier declared by the same class, nor with the unambiguous canonical local name or any other `as` target already established (by this class or an ancestor) elsewhere in the resolved attribute set. |
| U04 | `override` MUST NOT contain `kind`, `type`, `static`, `final`, `local`, `valueKind`, `keyKind`, `valueType`, or `keyType`. Only the properties listed in §12.4 are override-eligible. |
| U04a | Each property present in `override` MUST be applicable to the target attribute's actual `kind` (e.g. `pattern` only applies to string-typed `primitive` attributes; `minItems`/`maxItems` only apply to `list`, `set`, or `map`). |
| U05 | For every mechanically-verified override-eligible property (§12.4) except `pattern`, the overriding value MUST be narrower than or equal to the inherited value, where "narrower" follows the direction given in §12.4's table. An ancestor property that was never set is treated as maximally permissive for this check. |
| U06 | Where two or more ancestors contribute conflicting `pattern` overrides for the same underlying attribute (§12.5), the inheriting class MUST supply its own `use.override.pattern` entry resolving the conflict. Leaving it unresolved is a validation error. |
| U07 | `override.value` MUST NOT appear unless the target attribute is `static: true` and NOT `final: true`. |
| U08 | `override.deprecated` MUST NOT appear if the target attribute already carries a `deprecated` message — `override` may only add a deprecation, never change or remove one. |

### 16.5 Metadata Rules

| Rule ID | Description |
|---------|-------------|
| M01 | A metadata entry MUST NOT have both `local: true` and `cascade: true`. |
| M02 | A subclass MUST NOT set a value for a metadata entry that is marked `final: true` in any ancestor. |
| M03 | A subclass MUST NOT declare a metadata entry as `local: true` for a slot that is non-local in any ancestor. |
| M04 | A required metadata slot declaration (`required: true`, `value: null`) inherited from an ancestor MUST be satisfied (a non-null value set) somewhere in the inheritance chain before the class is considered fully valid for instantiation. |
| M05 | The `value` of a metadata entry MUST conform to the type declared for that attribute in the metadata schema class. |
| M06 | Each key in the `metadata` object MUST be a syntactically valid FQN range resolving to a known class within the resolution context. |

### 16.6 Dependency Rules

| Rule ID | Description |
|---------|-------------|
| D01 | All version ranges appearing in `extends`, attribute `type`/`valueType`/`keyType` properties, `use` FQN-range keys, and `metadata` object keys MUST be syntactically valid per §14.3. |
| D02 | The dependency graph, derived from `extends`, `attribute-import`, `metadata`, and the type-borrowed form of `nested` attributes (§9.11), MUST be acyclic. Self-referential `object`, `class`, and `enum` attribute edges are exempt (they are references by identity to a class or an instance, not structural embedding). |
| D03 | All referenced version ranges SHOULD be satisfiable by at least one known artefact version within the resolution context at the time of validation. |

### 16.7 Versioning Rules

| Rule ID | Description |
|---------|-------------|
| V01 | Within a given resolution context, a new version of a class or global attribute MUST have a strictly higher version number than all previously known versions of the same FQN base name. |
| V02 | A change classified as MAJOR per §6.4 MUST result in a MAJOR version increment. |
| V03 | A change classified as MINOR per §6.5 MUST result in at least a MINOR version increment. |
| V04 | OOML RECOMMENDS that artefact versions be treated as immutable once distributed. Distribution systems SHOULD reject attempts to overwrite an existing versioned artefact. |

---

## 17. Complete Example

The following example demonstrates multi-inheritance, standalone global attributes, renaming and overriding inherited attributes, and metadata. All artefacts are shown in their distributed form with full FQNs.

### 17.1 Standalone Global Attribute and Enum Root

`salary` is published as a standalone global attribute, usable by any class:

```json
{
	"ooml": "0.1.0",
	"fqn": "com.example.finance/salary@1.0.0",
	"name": "Annual Salary",
	"description": "An annual gross salary amount in the organisation's base currency.",
	"kind": "primitive",
	"type": "decimal",
	"precision": 14,
	"scale": 2,
	"minimum": 0
}
```

`EmploymentType` is the enum root — an ordinary class whose subtypes (excluding itself) are the valid employment type values:

```json
{
	"ooml": "0.1.0",
	"fqn": "com.example.hr/EmploymentType@1.0.0",
	"name": "Employment Type",
	"description": "The nature of an employment relationship. Extend this class to define recognised employment types.",
	"abstract": true
}
```

```json
{
	"ooml": "0.1.0",
	"fqn": "com.example.hr/FullTime@1.0.0",
	"name": "Full Time",
	"description": "Full-time permanent employment.",
	"extends": ["com.example.hr/EmploymentType@^1.0.0"],
	"attributes": {
		"weeklyHours": {
			"kind": "primitive", "type": "uint8",
			"name": "Weekly Hours",
			"required": true,
			"description": "Standard contracted weekly hours."
		}
	}
}
```

Note that `FullTime` carries its own attribute `weeklyHours` — something a traditional enum value could never express.

A metadata schema class `HrSchemaInfo` is published as an ordinary class:

```json
{
	"ooml": "0.1.0",
	"fqn": "com.example.hr.meta/HrSchemaInfo@1.0.0",
	"name": "HR Schema Info",
	"description": "HR-specific schema annotations. Use as a metadata schema on HR artefacts.",
	"attributes": {
		"status": {
			"kind": "enum",
			"type": "com.example.hr.meta/HrSchemaStatus@^1.0.0",
			"name": "Status",
			"required": true,
			"description": "Publication status of this schema."
		},
		"maintainer": {
			"kind": "primitive",
			"type": "string",
			"name": "Maintainer",
			"description": "Team or individual responsible for this schema."
		}
	}
}
```

### 17.2 Example Distributed Class

`Employee` as a standalone distributed artefact with all short names expanded to full FQN ranges:

```json
{
	"ooml": "0.1.0",
	"fqn": "com.example.hr/Employee@1.2.0",
	"name": "Employee",
	"description": "A natural person in an employment relationship with the organisation.",
	"authors": ["Jane Smith <jane@example.com>"],
	"license": "Apache-2.0",
	"extends": ["com.example.hr/Person@^1.0.0"],
	"attributes": {
		"employeeNumber": {
			"kind": "primitive", "type": "string",
			"name": "Employee Number",
			"required": true,
			"pattern": "^EMP-[0-9]{6}$",
			"description": "Human-readable employee reference number, e.g. EMP-001234."
		},
		"employmentType": {
			"kind": "enum",
			"type": "com.example.hr/EmploymentType@^1.0.0",
			"name": "Employment Type",
			"required": true,
			"description": "The nature of this person's engagement. Valid values are subtypes of EmploymentType, excluding EmploymentType itself."
		},
		"startDate": {
			"kind": "primitive", "type": "date",
			"name": "Start Date",
			"required": true,
			"description": "Employment start date."
		},
		"endDate": {
			"kind": "primitive", "type": "date",
			"name": "End Date",
			"description": "Employment end date, if applicable.",
			"nullable": true
		},
		"department": {
			"kind": "object",
			"type": "com.example.hr/Department@^1.0.0",
			"name": "Department",
			"required": true,
			"description": "The organisational unit this employee belongs to."
		},
		"manager": {
			"kind": "object",
			"type": "com.example.hr/Employee@^1.2.0",
			"name": "Manager",
			"description": "Direct line manager.",
			"nullable": true
		},
		"annualSalary": {
			"kind": "attribute",
			"type": "com.example.finance/salary@^1.0.0",
			"name": "Annual Salary",
			"description": "Annual gross salary in the organisation's base currency.",
			"nullable": true
		},
		"schemaVersion": {
			"kind": "primitive", "type": "string",
			"name": "Schema Version",
			"static": true, "final": true, "value": "1",
			"description": "Schema version discriminator for Employee. Fixed for this class and all subclasses."
		}
	}
}
```

### 17.3 Type Hierarchy

With multi-inheritance, the hierarchy is a DAG rather than a tree:

```
com.example.hr/Auditable@1.0.0  (abstract)
└── com.example.hr/Party@1.1.0  (abstract)
    ├── com.example.hr/Department@1.0.0
    └── com.example.hr/Person@1.0.0  (abstract)
        ├── com.example.hr/Employee@1.2.0
        └── com.example.hr/Contractor@1.0.0

com.example.hr/EmploymentType@1.0.0  (enum root)
├── com.example.hr/FullTime@1.0.0
├── com.example.hr/PartTime@1.0.0
├── com.example.hr/Contract@1.0.0
└── com.example.hr/Freelance@1.0.0
```

`EmploymentType` and its subtypes are ordinary classes. The `employmentType` attribute on `Employee` uses `"kind": "enum"` to restrict values to subtypes of `EmploymentType`, excluding `EmploymentType` itself — so valid values are `FullTime`, `PartTime`, `Contract`, `Freelance`, or any future subtype.

MRO of `Employee@1.2.0` (depth-first, left-to-right):
`Employee` → `Person` → `Party` → `Auditable`

Full resolved attribute surface of an `Employee` instance (in MRO order):

| Accessor name | Source | Attribute identity |
|---------------|--------|-------------------|
| `createdAt` | `Auditable` | `com.example.hr/Auditable@1.0.0#createdAt` |
| `updatedAt` | `Auditable` | `com.example.hr/Auditable@1.0.0#updatedAt` |
| `id` | `Party` | `com.example.hr/Party@1.1.0#id` |
| `firstName` | `Person` | `com.example.hr/Person@1.0.0#firstName` |
| `lastName` | `Person` | `com.example.hr/Person@1.0.0#lastName` |
| `dateOfBirth` | `Person` | `com.example.hr/Person@1.0.0#dateOfBirth` |
| `addresses` | `Person` | `com.example.hr/Person@1.0.0#addresses` |
| `displayName` *(transient)* | `Person` | `com.example.hr/Person@1.0.0#displayName` |
| `employeeNumber` | `Employee` | `com.example.hr/Employee@1.2.0#employeeNumber` |
| `employmentType` *(enum: EmploymentType subtypes)* | `Employee` | `com.example.hr/Employee@1.2.0#employmentType` |
| `startDate` | `Employee` | `com.example.hr/Employee@1.2.0#startDate` |
| `endDate` | `Employee` | `com.example.hr/Employee@1.2.0#endDate` |
| `department` | `Employee` | `com.example.hr/Employee@1.2.0#department` |
| `manager` | `Employee` | `com.example.hr/Employee@1.2.0#manager` |
| `annualSalary` | `Employee` | `com.example.finance/salary@1.0.0` |
| `schemaVersion` | `Employee` | `com.example.hr/Employee@1.2.0#schemaVersion` |

### 17.4 Dependency Graph

```
com.example.hr/Employee@1.2.0
  --[extends]-->          com.example.hr/Person@^1.0.0
  --[object]-->           com.example.hr/Department@^1.0.0
  --[object]-->           com.example.hr/Employee@^1.2.0   (self-reference; exempt)
  --[enum]-->             com.example.hr/EmploymentType@^1.0.0
  --[attribute-import]--> com.example.finance/salary@^1.0.0

com.example.hr/Person@1.0.0
  --[extends]-->   com.example.hr/Party@^1.1.0
  --[object]-->    com.example.hr/PostalAddress@^1.0.0

com.example.hr/Party@1.1.0
  --[extends]-->   com.example.hr/Auditable@^1.0.0

com.example.hr/Department@1.0.0
  --[extends]-->   com.example.hr/Party@^1.1.0
  --[object]-->    com.example.hr/Department@^1.0.0  (self-reference; exempt)

com.example.hr/PostalAddress@1.0.0
  --[enum]-->        com.example.hr/AddressType@^1.0.0
```

**Example dependency insight query:** "What directly depends on `com.example.hr/Department@1.0.0`?"

Result (from any tooling that indexes the dependency graph):
- `com.example.hr/Employee@1.2.0` (object edge)
- `com.example.hr/Contractor@1.0.0` (set element object edge)
- `com.example.hr/Department@1.0.0` (self-reference object edge)

**Example dependency insight query:** "What directly depends on `com.example.finance/salary@1.0.0`?"

Result:
- `com.example.hr/Employee@1.2.0` (attribute-import edge)

---

## 18. Grammar (ABNF)

The following ABNF provides a normative grammar for the non-JSON structural elements of OOML.

```abnf
; Namespace
namespace         = lc-segment 1*("." lc-segment)
lc-segment        = LOWER *( LOWER / DIGIT )

; Names
class-name        = UPPER *( ALPHA / DIGIT )        ; PascalCase (classes and enum roots)
global-attr-name  = LOWER *( ALPHA / DIGIT )        ; camelCase
attr-name         = LOWER *( ALPHA / DIGIT )        ; camelCase
group-name        = LOWER *( LOWER / DIGIT / "-" )

; Version (exact)
version           = major "." minor "." trivial [ pre-release ] [ build ]
major             = non-neg-int
minor             = non-neg-int
trivial           = non-neg-int
pre-release       = "-" identifier *("." identifier)
build             = "+" identifier *("." identifier)
identifier        = 1*( ALPHA / DIGIT / "-" )
non-neg-int       = "0" / ( %x31-39 *DIGIT )

; FQN (exact version — OOML artefact identities)
class-fqn         = namespace "/" class-name        "@" version
global-attr-fqn   = namespace "/" global-attr-name  "@" version
owned-attr-fqn    = class-fqn "#" attr-path  ; inline-owned attributes and sub-attributes
attr-path         = attr-name *( "." attr-name )

; FQN range (used in extends, type properties, use keys, metadata keys)
class-fqn-range        = namespace "/" class-name       "@" version-range
global-attr-fqn-range  = namespace "/" global-attr-name "@" version-range

; use key: a bare attribute identifier (valid only when currently unambiguous
; on the class) or an FQN range (used to pick one attribute out from under a
; name collision). Distinguished purely by shape: a bare attr-name never
; contains "/" or "@"; an FQN range always contains both.
use-key = attr-name / class-fqn-range / global-attr-fqn-range

; Note: enum roots are ordinary classes; no separate enum-fqn form exists

; self — reserved authoring token; only valid in type, valueType, keyType positions
;        where a class FQN range is expected; MUST be expanded before distribution
self-ref = %s"self"   ; case-sensitive literal

; Version ranges
version-range    = exact-ver / caret-range / tilde-range / wildcard / comparison-range
exact-ver        = version
caret-range      = "^" version
tilde-range      = "~" version
wildcard         = "*"
comparison-range = ">=" version SP "<" version

; Character classes
UPPER  = %x41-5A   ; A-Z
LOWER  = %x61-7A   ; a-z
ALPHA  = UPPER / LOWER
DIGIT  = %x30-39
SP     = %x20
```

---

## 19. Design Notes and Rationale

### 19.1 Why JSON?

JSON is universally supported, human-editable, and requires no specialist tooling to read or write. Alternatives such as YAML or TOML were considered but introduce ambiguities (YAML's multi-document files, TOML's table-ordering behaviour) that complicate deterministic parsing.

### 19.2 Why multi-inheritance, and why does the diamond problem not apply?

OOML adopts multi-inheritance because real-world modelling requires orthogonal concerns to be composable independently of the primary taxonomic hierarchy. The `Commentable`, `Auditable`, `Taggable` pattern is ubiquitous in practice, and single inheritance forces either combinatorial class explosion or pollution of base classes with concerns that only some subtypes need.

The classical diamond problem — where two ancestors provide different definitions of the same attribute, creating an ambiguous resolution — does not arise in OOML because attributes are identified by FQN, not by local name. Two ancestors can both declare an attribute named `temperature` without conflict: if they reference different global attributes, they are simply different attributes that happen to share a local name. The collision is a presentation inconvenience, resolved by renaming one or both via `use` (§12), not an identity or semantic conflict requiring a resolution rule.

The only genuine diamond case — where two ancestors both reference the exact same global attribute FQN — is resolved by deduplication: the attribute appears once in the resolved set. No precedence rule is needed.

### 19.3 Why is the class (not a collection) the unit of versioning?

See the detailed rationale in the §0.2.0 changelog above. The short form: a versioned collection (package/model) creates a coarse, lossy dependency signal and turns dependency insight queries into expensive content-scanning operations. A flat registry of individually versioned classes makes those queries O(1) index lookups. Data models, unlike software libraries, have no holistic runtime behaviour that needs to be tested at collection level, so there is nothing lost by removing the collection as a versioning unit.

### 19.4 Why are authoring workflows not part of the language specification?

How classes are authored, grouped, and published before they become distributed artefacts is a tooling concern, not a language concern. Different tools may use file-based authoring, visual designers, database-backed editors, or direct JSON editing. The language defines only what a valid distributed artefact looks like. Authoring conventions are addressed in a separate tooling document.

### 19.5 Why are enumerations not a first-class artefact type?

Early versions of this specification included a dedicated `Enumeration` artefact type. This was removed in 0.4.0 because enumerations are fully subsumed by the class type hierarchy. A class serves as the enumeration root; its subtypes (excluding itself) are the members. This approach reduces the language surface, keeps the number of artefact types minimal, and gives enumeration members genuine expressive power — they can carry attributes, participate in further type hierarchies, and be independently versioned. The `"kind": "enum"` attribute preserves the enumerative constraint (subtypes of the root, excluding the root itself) without requiring a separate artefact type.

### 19.6 Why are self-referential `object`, `class`, and `enum` attributes exempt from cycle detection?

An `object`, `class`, or `enum` attribute holds a reference by identity — to an instance, to a class, or to a subtype-class respectively — never a structural embedding of another artefact's definition. A class declaring an `object` attribute whose `type` is itself (e.g. `Employee.manager: Employee`) is expressing a data-level relationship: "the value of this attribute is a reference to an instance of this class or one of its subtypes." The class does not need to structurally contain or inherit from itself to express this. The same reasoning applies to a `class` attribute whose `type` is itself or an ancestor of itself ("the value of this attribute is a reference to this class or one of its subtypes," as a type-tag rather than an instance), and to an `enum` attribute whose root is an ancestor of the declaring class ("the value must be chosen from a known set of classes"). In every case, the declaring class's own shape does not depend on the referenced class's shape — only its identity is recorded. Only `extends`, `attribute-import`, and `metadata` create structural dependencies, where one artefact's own definition genuinely incorporates another's, and can therefore form genuine definition cycles.

### 19.7 Why `self` resolves to the declaring class rather than the inheriting class

Making `self` covariant — where `self` in a superclass attribute resolves to the subclass in each inheriting context — would mean an attribute effectively has a different type at each level of the hierarchy. This is a form of implicit type override, which conflicts with OOML's explicit no-override rule (§11.2 rule 3). It also complicates the dependency graph: a covariant `self` attribute would create a dependency from every subclass to itself, which is circular.

Non-covariant `self` keeps the semantics simple: the attribute is typed to the declaring class, and any subclass that wants a self-typed attribute with its own type may declare one explicitly. The inherited attribute and the new attribute have different types and different attribute identifiers, which is unambiguous.

### 19.8 Why use OOML itself as the metadata modelling language?

The alternative — restricting metadata to string key-value pairs — would make metadata human-readable but machine-opaque. A consuming tool could display a `schemaStatus` string but could not validate it, query it structurally, or depend on it with type safety. By using OOML classes as metadata schemas, the metadata system inherits the full capability of the language at no additional specification cost: versioning, inheritance, type safety, registry publication, and dependency tracking all apply automatically. The OSDU interoperability case illustrates this clearly — OSDU-specific schema properties that OOML does not natively support can be carried as typed, versioned metadata rather than freeform strings, enabling tooling to reason about them with the same machinery it uses for native OOML concepts. Metadata schemas are ordinary OOML classes and are managed identically to any other class.

### 19.9 Relationship to OWL/RDF

OWL and RDF provide powerful formal semantics including open-world assumption, reasoning, and logical inference. OOML deliberately adopts the closed-world assumption common in OOP: a class defines exactly the attributes it declares plus what it inherits, and no more. This tradeoff sacrifices some expressive power for significantly greater accessibility and tooling simplicity.

---

*End of OOML Specification Draft 0.1.0*
