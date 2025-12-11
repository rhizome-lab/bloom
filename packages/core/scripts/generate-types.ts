// oxlint-disable first
// Use in-memory DB
process.env.NODE_ENV = "test";
import * as CoreLib from "../src/runtime/lib/core";
import * as KernelLib from "../src/runtime/lib/kernel";
import {
  MathLib,
  BooleanLib,
  ListLib,
  ObjectLib,
  StringLib,
  TimeLib,
  StdLib,
  generateTypeDefinitions,
  RandomLib,
  type ClassMetadata,
  type MethodMetadata,
  type PropertyMetadata,
} from "@viwo/scripting";
import { Project, SyntaxKind, type ClassDeclaration, Scope } from "ts-morph";
import { join } from "node:path";
import { writeFileSync } from "node:fs";

const libraries = [
  CoreLib,
  KernelLib,
  MathLib,
  BooleanLib,
  ListLib,
  ObjectLib,
  StringLib,
  TimeLib,
  StdLib,
  RandomLib,
];
const opcodes = libraries.flatMap((lib) => Object.values(lib).map((value) => value.metadata));

// Introspect Classes using ts-morph
const project = new Project();
project.addSourceFilesAtPaths([
  // join(import.meta.dir, "../src/runtime/wrappers.ts"),
  join(import.meta.dir, "../src/runtime/capabilities.ts"),
]);

function extractMetadata(class_: ClassDeclaration, nameOverride?: string): ClassMetadata {
  const methods: MethodMetadata[] = class_
    .getMethods()
    .filter((method) => method.getScope() === Scope.Public && !method.isStatic())
    .map((method) => ({
      description: method.getJsDocs()[0]?.getDescription().trim(),
      name: method.getName(),
      parameters: method
        .getParameters()
        .filter((parameter) => {
          const typeText = parameter.getType().getText(parameter);
          const name = parameter.getName();
          return !typeText.includes("ScriptContext") && name !== "ctx" && name !== "_ctx";
        })
        .map((parameter) => ({
          name: parameter.getName(),
          optional: parameter.isOptional(),
          type: parameter.getType().getText(parameter), // Use type text
        })),
      returnType: method.getReturnType().getText(method),
    }));

  const properties: PropertyMetadata[] = class_
    .getProperties()
    .filter(
      (property) =>
        !property.isStatic() &&
        (property.getScope() === Scope.Public || property.getScope() === undefined),
    ) // default is public
    .map((property) => ({
      description: property.getJsDocs()[0]?.getDescription().trim(),
      name: property.getName(),
      type: property.getType().getText(property),
    }));

  // Handle index signature if present
  const indexSigs = class_.getDescendantsOfKind(SyntaxKind.IndexSignature);
  const indexSignature = indexSigs[0]?.getText();

  // Handle implements
  const implementsClauses = class_
    .getImplements()
    .map((implement) => implement.getExpression().getText());

  const staticProperties: PropertyMetadata[] = class_
    .getProperties()
    .filter((property) => property.isStatic() && property.getScope() === Scope.Public)
    .map((property) => ({
      description: property.getJsDocs()[0]?.getDescription().trim(),
      name: property.getName(),
      type: property.getType().getText(property),
      value: property.getInitializer()?.getText(),
    }));

  return {
    description: class_.getJsDocs()[0]?.getDescription().trim(),
    implements: implementsClauses.length > 0 ? implementsClauses : undefined,
    indexSignature,
    methods,
    name: nameOverride ?? class_.getName()!,
    properties,
    staticProperties,
  };
}

const classes: ClassMetadata[] = [];

// WrappedEntity -> Entity
// const wrappersFile = project.getSourceFileOrThrow("wrappers.ts");
// const wrappedEntity = wrappersFile.getClassOrThrow("WrappedEntity");
// classes.push(extractMetadata(wrappedEntity, "Entity"));

// Capabilities
const capabilitiesFile = project.getSourceFileOrThrow("capabilities.ts");
const exportedClasses = capabilitiesFile.getClasses().filter((clazz) => clazz.isExported());

for (const cls of exportedClasses) {
  classes.push(extractMetadata(cls));
}

let definitions = generateTypeDefinitions(opcodes, classes);

// Inject Entity interface
definitions = definitions.replace(
  "// Standard library functions",
  `interface Entity {
  /** Unique ID of the entity */
  id: number;
  /** Unique ID of the entity's prototype */
  prototype_id?: number | null;
  /** Dynamic properties */
  [key: string]: unknown;
}

// Standard library functions`,
);

const outputPath = join(import.meta.dir, "../src/generated_types.ts");

writeFileSync(outputPath, definitions);
console.log(`Generated type definitions at ${outputPath}`);
