# OOML — Object-Oriented Modelling Language

**OOML** is a JSON-based, schema-definition language for describing data models. It brings familiar object-oriented concepts — classes, inheritance, namespacing, type safety — together with the versioning and dependency management mindset of modern software ecosystems.

OOML is designed to be accessible to both technical and business practitioners, independent of any database, query language, storage engine, or programming language runtime.

---

## What OOML defines

- **Classes** — versioned, named, uniquely identifiable collections of typed attribute slots
- **Attribute definitions** — reusable, independently versioned semantic contracts for typed slots
- **Multi-inheritance** — classes may extend multiple superclasses; the diamond problem is dissolved by FQN-based attribute identity
- **Enumerations via the type hierarchy** — enum roots are ordinary abstract classes; their subtypes are the enum values
- **Aliases** — locally-scoped accessor names for inherited or imported attributes
- **Metadata** — structured, typed, versioned annotations on any artefact, defined using OOML itself
- **A dependency graph** — a directed acyclic graph of class-to-class relationships, queryable without any packaging layer

## What OOML does not define

- A query language
- A storage engine or persistence format
- A serialisation format for data instances
- A registry service or distribution protocol (see the forthcoming OOML Registry Specification)

---

## Key design decisions

**The class is the unit of versioning.** Each class carries its own semantic version. There is no package or schema version that forces collective re-release when one class changes. Dependency queries are direct class-to-class lookups — no intermediate packaging layer.

**Enumerations are classes.** An enum root is an ordinary class whose subtypes are the valid enum values. Enum values can carry their own attributes, participate in further type hierarchies, and be independently versioned — capabilities a traditional enum value cannot provide.

**Metadata uses OOML itself.** Metadata schemas are ordinary OOML classes. This means metadata is typed, versioned, inheritable, and tool-supported with no additional language machinery.

**`self` for self-reference.** A class may reference itself in an attribute slot using the reserved token `"self"`, avoiding the chicken-and-egg problem of needing a version number before committing. Tooling expands `self` to the class's FQN range at commit time.

---

## Specification

| File | Description |
|------|-------------|
| [`Specification.md`](OOML.md) | Current draft specification |

The specification is a single Markdown document organised into 20 sections:

1. Introduction
2. Design Goals and Non-Goals
3. Terminology and Definitions
4. Namespaces and Identity — including the `self` type reference
5. Versioning — semantic versioning with a defined change-impact contract
6. Primitive Types
7. Attribute Definitions
8. Classes
9. Attributes — all slot kinds: `primitive`, `object`, `class`, `enum`, `list`, `set`, `map`, `attribute`
10. Metadata
11. Inheritance: Superclasses and Subclasses
12. Aliases
13. Type Hierarchy: Supertypes and Subtypes
14. Dependencies
15. The Dependency Graph
16. Serialisation Format
17. Validation Rules
18. Complete Example
19. Grammar (ABNF)
20. Design Notes and Rationale

---

## Quick example

A minimal class:

```json
{
  "ooml": "0.1.0",
  "fqn": "com.example.hr/Employee@1.0.0",
  "name": "Employee",
  "description": "A person employed by the organisation.",
  "extends": ["com.example.hr/Person@^1.0.0"],
  "attributes": {
    "employeeNumber": {
      "kind": "primitive",
      "type": "string",
      "name": "Employee Number",
      "required": true
    },
    "manager": {
      "kind": "class",
      "type": "self",
      "name": "Manager"
    }
  }
}
```

An enum root and its values:

```json
{
  "ooml": "0.1.0",
  "fqn": "com.example.hr/EmploymentType@1.0.0",
  "name": "Employment Type",
  "description": "Enum root — extend to define employment type values.",
  "abstract": true
}
```

```json
{
  "ooml": "0.1.0",
  "fqn": "com.example.hr/FullTime@1.0.0",
  "name": "Full Time",
  "extends": ["com.example.hr/EmploymentType@^1.0.0"],
  "attributes": {
    "weeklyHours": {
      "kind": "primitive",
      "type": "integer",
      "minimum": 0,
      "maximum": 168,
      "name": "Weekly Hours",
      "required": true
    }
  }
}
```

An `enum` slot referencing the root:

```json
"employmentType": {
  "kind": "enum",
  "type": "com.example.hr/EmploymentType@^1.0.0",
  "name": "Employment Type",
  "required": true
}
```

---

## Versioning

OOML uses a three-part semantic version — `MAJOR.MINOR.TRIVIAL` — applied to each class and attribute definition independently.

| Increment | When |
|-----------|------|
| `MAJOR` | Breaking change (removing a slot, narrowing a type, changing inheritance) |
| `MINOR` | Non-breaking, data-significant addition (new optional slot, new enum subclass) |
| `TRIVIAL` | Non-breaking, data-insignificant change (documentation, description edits) |

---

## Contributing

Contributions to the specification are welcome. Please open an issue to discuss a proposed change before submitting a pull request. Changes that affect the formal language semantics, validation rules, or ABNF grammar require particular care and should reference prior discussion in the issue tracker.

When proposing a change, indicate which version component it would increment (MAJOR, MINOR, or TRIVIAL) and why.

---

## Licence

BSD-3-Clause. See the licence header in the specification document.
