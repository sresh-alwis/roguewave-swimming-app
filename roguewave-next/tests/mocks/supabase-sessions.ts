/* eslint-disable @typescript-eslint/no-explicit-any */
export type MockSessionsState = {
  sessions: Record<string, any>[];
  session_schedules: Record<string, any>[];
  session_swimmers: Record<string, any>[];
  swimmers: Record<string, any>[];
  nextId: number;
};

export function createMockSessionsState(): MockSessionsState {
  return {
    sessions: [],
    session_schedules: [],
    session_swimmers: [],
    swimmers: [],
    nextId: 1000,
  };
}

type Filter = {
  column: string;
  value: any;
  negate?: boolean;
};

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

  const builder = {
    select() {
      isSelect = true;
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
      return { data: null, error: null };
    }

    // Handle delete
    if (isDelete) {
      results.forEach((row) => {
        const index = tableData.indexOf(row);
        if (index > -1) tableData.splice(index, 1);
      });
      return { data: null, error: null };
    }

    // Handle select
    if (isSelect) {
      if (isSingle) {
        const row = results[0] ?? null;
        if (row) {
          if (table === "sessions") {
            return { data: hydrateSession(row), error: null };
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
