/* eslint-disable @typescript-eslint/no-explicit-any */
export type MockSessionsState = {
  sessions: Record<string, any>[];
  session_schedules: Record<string, any>[];
  session_swimmers: Record<string, any>[];
  swimmers: Record<string, any>[];
  attendance_swimmers: Record<string, any>[];
  attendance_records: Record<string, any>[];
  nextId: number;
  fkBehavior?: {
    session_swimmers?: "CASCADE" | "SET NULL" | "RESTRICT";
    attendance_swimmers?: "CASCADE" | "SET NULL" | "RESTRICT";
  };
  simulateError?: boolean;
};

export function createMockSessionsState(): MockSessionsState {
  return {
    sessions: [],
    session_schedules: [],
    session_swimmers: [],
    swimmers: [],
    attendance_swimmers: [],
    attendance_records: [],
    nextId: 1000,
    fkBehavior: {
      session_swimmers: "CASCADE",
      attendance_swimmers: "SET NULL",
    },
  };
}

type Filter = {
  column: string;
  value: any;
  negate?: boolean;
  operator?: string;
};

type NestedSelect = {
  table: string;
  nestedTable?: string;
};

function parseNestedSelect(selectArg: string): NestedSelect | null {
  if (!selectArg || typeof selectArg !== "string") return null;
  const match = selectArg.match(/^(\w+)\s*\(/);
  if (!match) return null;
  const table = match[1];
  const allMatches = selectArg.match(/(\w+)\s*\(/g);
  let nestedTable: string | undefined;
  if (allMatches && allMatches.length > 1) {
    const second = allMatches[1].match(/(\w+)\s*\(/);
    if (second) nestedTable = second[1];
  }
  return { table, nestedTable };
}

export function createSessionsQueryBuilder(
  table: string,
  state: MockSessionsState,
) {
  const filters: Filter[] = [];
  let pendingInsert: any = null;
  let pendingUpdate: any = null;
  let isDelete = false;
  let isSelect = false;
  let isSingle = false;
  let nestedSelect: NestedSelect | null = null;

  function getTableData(): Record<string, any>[] {
    return state[table as keyof MockSessionsState] as Record<string, any>[];
  }

  function applyFilters(): Record<string, any>[] {
    const tableData = getTableData();
    return tableData.filter((row) =>
      filters.every((f) => {
        if (f.negate) {
          return row[f.column] !== f.value;
        }
        if (f.operator === "gte") {
          return row[f.column] >= f.value;
        }
        if (f.operator === "lte") {
          return row[f.column] <= f.value;
        }
        if (f.operator === "neq") {
          return row[f.column] !== f.value;
        }
        if (Array.isArray(f.value)) {
          return f.value.includes(row[f.column]);
        }
        return row[f.column] === f.value;
      }),
    );
  }

  function hydrateSession(row: Record<string, any>): Record<string, any> {
    const schedules = state.session_schedules.filter(
      (s) => s.session_id === row.id,
    );
    const sessionSwimmers = state.session_swimmers
      .filter((ss) => ss.session_id === row.id)
      .map((ss) => {
        const swimmer = state.swimmers.find((s) => s.id === ss.swimmer_id);
        return {
          swimmer_id: ss.swimmer_id,
          session_id: ss.session_id,
          swimmers: swimmer || null,
        };
      });
    return {
      ...row,
      session_schedules: schedules,
      session_swimmers: sessionSwimmers,
    };
  }

  function hydrateSwimmer(row: Record<string, any>): Record<string, any> {
    const sessions = state.session_swimmers
      .filter((ss) => ss.swimmer_id === row.id)
      .map((ss) => {
        const session = state.sessions.find((s) => s.id === ss.session_id);
        if (!session) return null;
        const schedules = state.session_schedules.filter(
          (s) => s.session_id === session.id,
        );
        return { ...session, session_schedules: schedules };
      })
      .filter((s) => s !== null);
    return { ...row, sessions };
  }

  const builder = {
    select(arg?: string | { count?: string; head?: boolean }, options?: { count?: string; head?: boolean }) {
      isSelect = true;
      // Handle select("*", { count: "exact", head: true })
      const opts = options ?? (arg && typeof arg === "object" ? arg : undefined);
      if (opts?.head) {
        // Return a builder-like object that supports chaining and returns count when awaited
        const headBuilder = {
          neq(col: string, val: any) {
            filters.push({ column: col, value: val, operator: "neq" });
            return headBuilder;
          },
          eq(col: string, val: any) {
            filters.push({ column: col, value: val });
            return headBuilder;
          },
          gte(col: string, val: any) {
            filters.push({ column: col, value: val, operator: "gte" });
            return headBuilder;
          },
          lte(col: string, val: any) {
            filters.push({ column: col, value: val, operator: "lte" });
            return headBuilder;
          },
          then(resolve: any, reject: any) {
            const filtered = applyFilters();
            return Promise.resolve({ count: filtered.length, error: null }).then(resolve, reject);
          },
        };
        return headBuilder;
      }
      if (arg && typeof arg === "string") {
        nestedSelect = parseNestedSelect(arg);
      }
      return builder;
    },
    insert(data: any) {
      pendingInsert = data;
      return builder;
    },
    update(data: any) {
      pendingUpdate = data;
      return builder;
    },
    delete() {
      isDelete = true;
      return builder;
    },
    eq(column: string, value: any) {
      filters.push({ column, value });
      return builder;
    },
    neq(column: string, value: any) {
      filters.push({ column, value, negate: true });
      return builder;
    },
    gte(column: string, value: any) {
      filters.push({ column, value, operator: "gte" });
      return builder;
    },
    lte(column: string, value: any) {
      filters.push({ column, value, operator: "lte" });
      return builder;
    },
    in(column: string, values: any[]) {
      filters.push({ column, value: values });
      return builder;
    },
    order() {
      return builder;
    },
    maybeSingle() {
      isSingle = true;
      return execute();
    },
    single() {
      isSingle = true;
      return execute();
    },
    then(resolve: any, reject: any) {
      return execute().then(resolve, reject);
    },
  };

  async function execute(): Promise<{ data: any; error: any }> {
    const tableData = getTableData();

    // Handle insert
    if (pendingInsert !== null) {
      const rows = Array.isArray(pendingInsert)
        ? pendingInsert
        : [pendingInsert];
      const insertedRows = rows.map((row) => {
        const newRow = { id: state.nextId++, ...row };
        tableData.push(newRow);
        return newRow;
      });
      if (isSelect) {
        return { data: insertedRows[0], error: null };
      }
      return { data: insertedRows, error: null };
    }

    // Apply filters
    const results = applyFilters();

    // Handle update
    if (pendingUpdate !== null) {
      results.forEach((row) => {
        Object.assign(row, pendingUpdate);
      });
      if (isSelect) {
        const row = results[0] ?? null;
        if (row) {
          if (table === "swimmers") {
            return { data: hydrateSwimmer(row), error: null };
          }
          return { data: row, error: null };
        }
        return { data: null, error: null };
      }
      return { data: null, error: null };
    }

    // Handle delete
    if (isDelete) {
      // Simulate database error for testing error handling
      if (state.simulateError) {
        return { data: null, error: { message: "Database connection failed" } };
      }

      // Simulate FK behaviour when deleting swimmers
      if (table === "swimmers" && state.fkBehavior) {
        const deletedIds = results.map((r) => r.id);

        // CASCADE: remove session_swimmers rows for deleted swimmers
        if (state.fkBehavior.session_swimmers === "CASCADE") {
          state.session_swimmers = state.session_swimmers.filter(
            (ss) => !deletedIds.includes(ss.swimmer_id),
          );
        }

        // SET NULL: set swimmer_id to null in attendance_swimmers rows
        if (state.fkBehavior.attendance_swimmers === "SET NULL") {
          state.attendance_swimmers = state.attendance_swimmers.map((as) => {
            if (deletedIds.includes(as.swimmer_id)) {
              return { ...as, swimmer_id: null };
            }
            return as;
          });
        }
      }

      // Simulate FK behaviour when deleting sessions
      if (table === "sessions") {
        const deletedIds = results.map((r) => r.id);

        // CASCADE: remove session_schedules rows for deleted sessions
        state.session_schedules = state.session_schedules.filter(
          (s) => !deletedIds.includes(s.session_id),
        );

        // CASCADE: remove session_swimmers rows for deleted sessions
        state.session_swimmers = state.session_swimmers.filter(
          (ss) => !deletedIds.includes(ss.session_id),
        );

        // CASCADE: remove attendance_records rows for deleted sessions
        state.attendance_records = state.attendance_records.filter(
          (ar) => !deletedIds.includes(ar.session_id),
        );
      }

      results.forEach((row) => {
        const index = tableData.indexOf(row);
        if (index > -1) tableData.splice(index, 1);
      });
      return { data: null, error: null };
    }

    // Handle select
    if (isSelect) {
      // Handle nested select (e.g., session_swimmers → sessions → session_schedules)
      if (nestedSelect) {
        const { table, nestedTable } = nestedSelect;
        const singularTable = table.replace(/s$/, "");
        const fkColumn = [`${singularTable}_id`, `${table}_id`].find(
          (col) => col in results[0],
        );

        const hydrated = results.map((row) => {
          if (!fkColumn) return { ...row, [table]: null };

          const fkValue = row[fkColumn];
          const nestedRows = (state[table as keyof MockSessionsState] as Record<string, any>[]) || [];
          const nestedRow = nestedRows.find((r) => r.id === fkValue);

          if (!nestedRow) return { ...row, [table]: null };

          let hydratedNested = { ...nestedRow };

          if (nestedTable) {
            const childRows = (state[nestedTable as keyof MockSessionsState] as Record<string, any>[]) || [];
            const children = childRows.filter(
              (child) => child[`${singularTable}_id`] === nestedRow.id,
            );
            hydratedNested = { ...hydratedNested, [nestedTable]: children };
          }

          return { ...row, [table]: hydratedNested };
        });

        if (isSingle) {
          return { data: hydrated[0] ?? null, error: null };
        }
        return { data: hydrated, error: null };
      }

      // Handle attendance_swimmers nested select for attendance-history
      if (table === "attendance_swimmers") {
        const hydrated = results.map((row) => {
          const attendanceRecord = state.attendance_records.find(
            (ar) => ar.id === row.attendance_id,
          );
          if (!attendanceRecord) return { ...row, attendance_records: null };

          const session = state.sessions.find(
            (s) => s.id === attendanceRecord.session_id,
          );

          return {
            ...row,
            attendance_records: {
              ...attendanceRecord,
              sessions: session || null,
            },
          };
        });

        if (isSingle) {
          return { data: hydrated[0] ?? null, error: null };
        }
        return { data: hydrated, error: null };
      }

      if (isSingle) {
        const row = results[0] ?? null;
        if (row) {
          if (table === "sessions") {
            return { data: hydrateSession(row), error: null };
          }
          if (table === "swimmers") {
            return { data: hydrateSwimmer(row), error: null };
          }
          return { data: row, error: null };
        }
        return { data: null, error: null };
      }
      if (table === "sessions") {
        return { data: results.map(hydrateSession), error: null };
      }
      return { data: results, error: null };
    }

    return { data: results, error: null };
  }

  return builder;
}
