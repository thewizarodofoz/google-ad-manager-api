export type PQLValue = {
  attributes: {
    xsi_type: {
      type: string;
      xmlns: string;
    };
  };
  value?: string | number | boolean | PQLDate | PQLDateTime | PQLValue[];
};

export type PQLDate = {
  year: number;
  month: number;
  day: number;
};

export type PQLDateTime = {
  date: PQLDate;
  hour: number;
  minute: number;
  second: number;
  timeZoneId: string;
};

type PQLValues = [{ key: string; value: PQLValue }];

type Statement = {
  query: string;
  values: PQLValues;
};

type coercibleTypes = boolean | Date | number | string | PQLDate;
type coercibleType = coercibleTypes | coercibleTypes[];

export interface StatementBuilder {
  select(columns: string[]): StatementBuilder;
  from(table: string): StatementBuilder;
  where(clause: string): StatementBuilder;
  limit(count: number): StatementBuilder;
  limit(offset: number, count: number): StatementBuilder;
  orderBy(fields: string | string[], ascending?: boolean): StatementBuilder;
  bind(key: string, value: coercibleType): StatementBuilder;
}

export class StatementBuilder {
  private query: string;
  private values: {
    [key: string]: PQLValue;
  };
  private _select?: string[];
  private _from?: string;
  private _where?: string;
  private _limit?: [number, number?];
  private _orderBy?: string;

  constructor() {
    this.query = "";
    this.values = {};
  }

  public select(columns: string[]): StatementBuilder {
    this._select = columns;
    return this;
  }

  public from(table: string): StatementBuilder {
    this._from = table;
    return this;
  }

  public where(clause: string): StatementBuilder {
    this._where = clause;
    return this;
  }

  public limit(count: number): StatementBuilder;
  public limit(offset: number, count: number): StatementBuilder;
  public limit(offset_or_count: number, count?: number): StatementBuilder {
    this._limit = [offset_or_count];
    if (count) {
      this._limit.push(count);
    }
    return this;
  }

  public orderBy(
    fields: string | string[],
    ascending: boolean = true
  ): StatementBuilder {
    let f = fields;
    if (typeof fields !== "string") {
      f = fields.join(",");
    }
    this._orderBy = `${f} ${ascending ? "ASC" : "DESC"}`;
    return this;
  }

  public bind(
    key: string,
    value: PQLDate | boolean | Date | number | [] | string
  ): StatementBuilder {
    this.values[key] = getPQLValueRepresentation(value);
    return this;
  }

  public toStatement(): Statement {
    if (this._select && this._from) {
      this.query = `SELECT ${this._select.join(",")} FROM ${this._from}`;
    } else if (this._select || this._from) {
      throw new Error("SELECT clause required with FROM.");
    }

    if (this._where) {
      this.query = this.query + ` WHERE ${this._where}`;
    }

    if (this._orderBy) {
      this.query = this.query + ` ORDER BY ${this._orderBy}`;
    }

    if (this._limit) {
      this.query = this.query + ` LIMIT ${this._limit.join(",")}`;
    }

    const values = Object.keys(this.values).map((key: string) => {
      return {
        key,
        value: this.values[key],
      };
    }) as PQLValues;

    return {
      query: this.query.trim(),
      values,
    } as Statement;
  }
}

function createPQLValue(
  value: string | boolean | number | PQLDate | PQLDateTime | PQLValue[],
  type: string
): PQLValue {
  return {
    attributes: {
      xsi_type: {
        type,
        // There is a bug in node-soap, this namespace is required until https://github.com/vpulim/node-soap/pull/1159
        xmlns: "https://www.google.com/apis/ads/publisher/v202108",
      },
    },
    value,
  } as PQLValue;
}

export function getPQLValueRepresentation(value: coercibleType): PQLValue {
  switch (typeof value) {
    case "string":
      return createPQLValue(value as string, "TextValue");
    case "boolean":
      return createPQLValue(value as boolean, "BooleanValue");
    case "number":
      return createPQLValue(value as number, "NumberValue");
    case "object":
      if (Array.isArray(value)) {
        const pqlArr = (value as []).map(getPQLValueRepresentation);
        if (
          !pqlArr.every(
            (x) =>
              x.attributes.xsi_type.type == pqlArr[0].attributes.xsi_type.type
          )
        ) {
          throw new Error("All Array types must be the same");
        }
        return createPQLValue(pqlArr, "SetValue");
      } else if (
        // I feel like there should be a better idea for this type checking
        (value as PQLDate).year &&
        (value as PQLDate).month &&
        (value as PQLDate).day
      ) {
        return createPQLValue(value as PQLDate, "DateValue");
      } else if (value instanceof Date) {
        return createPQLValue(
          {
            date: {
              year: value.getFullYear(),
              month: value.getMonth(),
              day: value.getDate(),
            } as PQLDate,
            hour: value.getHours(),
            minute: value.getMinutes(),
            second: value.getSeconds(),
            timeZoneId: "GMT",
          } as PQLDateTime,
          "DateTimeValue"
        );
      }
      // With Typescript we should never get here because the type is already checked
      throw new Error(
        `Type Object is not a supported PQL Value (unless Date or Array). Value is ${value}`
      );
    default:
      // With Typescript we should never get here because the type is already checked
      throw new Error(
        `Type ${typeof value} is not a supported PQL Value. Value is ${value}`
      );
  }
}
