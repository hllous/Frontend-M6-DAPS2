import { describe, expect, it } from "vitest";

import { containerSchema } from "./containers";
import { containerFixtures } from "./containers-fixtures";
import { greenPointSchema } from "./green-points";
import { greenPointFixtures } from "./green-point-fixtures";
import { greenSpaceSchema } from "./green-spaces";
import { greenSpaceFixtures } from "./green-space-fixtures";
import { treeSchema } from "./trees";
import { treeFixtures } from "./tree-fixtures";

const coordinateCases = [
  { name: "valid boundary values", input: { lat: -90, lng: 180 }, expected: { lat: -90, lng: 180 } },
  { name: "opposite boundary values", input: { lat: 90, lng: -180 }, expected: { lat: 90, lng: -180 } },
  { name: "out-of-range latitude", input: { lat: 90.01, lng: -58.4 }, expected: { lat: null, lng: null } },
  { name: "out-of-range longitude", input: { lat: -34.6, lng: -180.01 }, expected: { lat: null, lng: null } },
  { name: "infinite latitude", input: { lat: Number.POSITIVE_INFINITY, lng: -58.4 }, expected: { lat: null, lng: null } },
  { name: "exact origin pair", input: { lat: 0, lng: 0 }, expected: { lat: null, lng: null } },
  { name: "null coordinates", input: { lat: null, lng: null }, expected: { lat: null, lng: null } },
  { name: "partially missing coordinates", input: { lat: null, lng: -58.4 }, expected: { lat: null, lng: null } },
  { name: "equator coordinate away from the origin", input: { lat: 0, lng: -58.4 }, expected: { lat: 0, lng: -58.4 } },
] as const;

const responseSchemas = [
  { name: "Container", schema: containerSchema, fixture: containerFixtures[0]! },
  { name: "Tree", schema: treeSchema, fixture: treeFixtures[0]! },
  { name: "GreenPoint", schema: greenPointSchema, fixture: greenPointFixtures[0]! },
  { name: "GreenSpace", schema: greenSpaceSchema, fixture: greenSpaceFixtures[0]! },
] as const;

for (const { name, schema, fixture } of responseSchemas) {
  describe(`${name} response coordinates`, () => {
    it.each(coordinateCases)(`normalizes coordinates for ${name}: $name`, ({ input, expected }) => {
      const parsed = schema.safeParse({ ...fixture, ...input });

      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data).toMatchObject(expected);
    });
  });
}
