import { StatementBuilder } from "../src";
import { getPQLValueRepresentation } from "../src/statement";

import { describe, it, beforeEach } from "mocha";
import * as assert from "assert";

describe("StatementBuilder", () => {
  let statement: StatementBuilder;

  beforeEach(() => {
    statement = new StatementBuilder();
  });

  it("Provides an empty statement if nothing is done", () => {
    assert.deepStrictEqual(statement.toStatement(), { query: "", values: [] });
  });

  it("Provides a WHERE clause", () => {
    assert.strictEqual(
      statement.where("foo = bar").toStatement().query,
      "WHERE foo = bar"
    );
  });

  it("Provides a LIMIT clause", () => {
    assert.strictEqual(statement.limit(20).toStatement().query, "LIMIT 20");
  });

  it("Provides an OFFSET clause", () => {
    assert.strictEqual(
      statement.limit(10, 20).toStatement().query,
      "LIMIT 10,20"
    );
  });

  it("Chains", () => {
    assert.strictEqual(
      statement.limit(20).where("foo = bar").toStatement().query,
      "WHERE foo = bar LIMIT 20"
    );
  });

  it("Does SELECT and FROM", () => {
    assert.strictEqual(
      statement.select(["foo", "bar"]).from("baz").toStatement().query,
      "SELECT foo,bar FROM baz"
    );
  });

  it("Doesn't SELECT without FROM", () => {
    assert.throws(statement.select(["foo", "bar"]).toStatement, Error);
  });

  it("Doesn't FROM without SELECT", () => {
    assert.throws(statement.from("baz").toStatement, Error);
  });

  it("Provides an ORDER BY clause", () => {
    assert.strictEqual(
      statement.orderBy("foo").toStatement().query,
      "ORDER BY foo ASC"
    );
  });

  it("Provides an ORDER BY clause with multiple ordering", () => {
    assert.strictEqual(
      statement.orderBy(["foo", "bar"]).toStatement().query,
      "ORDER BY foo,bar ASC"
    );
  });

  it("Provides DESC ORDER BY", () => {
    assert.strictEqual(
      statement.orderBy(["foo", "bar"], false).toStatement().query,
      "ORDER BY foo,bar DESC"
    );
  });

  it("Provides binding variables", () => {
    assert.deepStrictEqual(
      statement
        .where("foo = :name")
        .bind("name", 5)
        .bind("key", "foo")
        .toStatement(),
      {
        query: "WHERE foo = :name",
        values: [
          {
            key: "name",
            value: {
              value: 5,
              attributes: {
                xsi_type: {
                  type: "NumberValue",
                  xmlns: "https://www.google.com/apis/ads/publisher/v202108",
                },
              },
            },
          },
          {
            key: "key",
            value: {
              value: "foo",
              attributes: {
                xsi_type: {
                  type: "TextValue",
                  xmlns: "https://www.google.com/apis/ads/publisher/v202108",
                },
              },
            },
          },
        ],
      }
    );
  });
});

describe("PQLValue coericion", () => {
  it("coerieces numbers", () => {
    assert.deepStrictEqual(getPQLValueRepresentation(5), {
      value: 5,
      attributes: {
        xsi_type: {
          type: "NumberValue",
          xmlns: "https://www.google.com/apis/ads/publisher/v202108",
        },
      },
    });
  });

  it("coerieces booleans", () => {
    assert.deepStrictEqual(getPQLValueRepresentation(false), {
      value: false,
      attributes: {
        xsi_type: {
          type: "BooleanValue",
          xmlns: "https://www.google.com/apis/ads/publisher/v202108",
        },
      },
    });
  });

  it("coerieces strings", () => {
    assert.deepStrictEqual(getPQLValueRepresentation("Hello World"), {
      value: "Hello World",
      attributes: {
        xsi_type: {
          type: "TextValue",
          xmlns: "https://www.google.com/apis/ads/publisher/v202108",
        },
      },
    });
  });

  it("coerieces javascript Dates (Datetime)", () => {
    assert.deepStrictEqual(
      getPQLValueRepresentation(new Date(2001, 1, 28, 18, 30)),
      {
        value: {
          date: { year: 2001, month: 1, day: 28 },
          hour: 18,
          minute: 30,
          second: 0,
          timeZoneId: "GMT",
        },
        attributes: {
          xsi_type: {
            type: "DateTimeValue",
            xmlns: "https://www.google.com/apis/ads/publisher/v202108",
          },
        },
      }
    );
  });

  it("coerieces Date objects", () => {
    assert.deepStrictEqual(
      getPQLValueRepresentation({ year: 2002, month: 12, day: 19 }),
      {
        value: { year: 2002, month: 12, day: 19 },
        attributes: {
          xsi_type: {
            type: "DateValue",
            xmlns: "https://www.google.com/apis/ads/publisher/v202108",
          },
        },
      }
    );
  });

  it("coerieces arrays", () => {
    assert.deepStrictEqual(getPQLValueRepresentation(["foo", "bar"]), {
      value: [
        getPQLValueRepresentation("foo"),
        getPQLValueRepresentation("bar"),
      ],
      attributes: {
        xsi_type: {
          type: "SetValue",
          xmlns: "https://www.google.com/apis/ads/publisher/v202108",
        },
      },
    });
  });
  it("errors when coerieces arrays of multiple types", () => {
    assert.throws(() => {
      getPQLValueRepresentation(["foo", 5]);
    }, Error);
  });
});
