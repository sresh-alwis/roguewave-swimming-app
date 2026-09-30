/* eslint-disable @typescript-eslint/no-explicit-any */
export type MockSupabaseState = {
  sessions: Record<string, any>[];
  attendance_records: Record<string, any>[];
  attendance_swimmers: Record<string, any>[];
  nextId: number;
};

export function createMockSupabaseState(): MockSupabaseState {
  return {
    sessions: [],
    attendance_records: [],
    attendance_swimmers: [],
    nextId: 1,
  };
}

export function createQueryBuilder(table: string, state: MockSupabaseState) {
  const filters: { column: string; value: any }[] = [];
  let pendingInsert: any = null;
  let pendingUpdate: any = null;
  let isDelete = false;
  let isSelect = false;

  function applyFilters(): Record<string, any>[] {
    const tableData = state[table as keyof MockSupabaseState] as Record<string, any>[];
    return tableData.filter((row) =>
      filters.every((f) => row[f.column] === f.value),
    );
  }

  function hydrateRecord(row: Record<string, any>): Record<string, any> {
    if (table === "attendance_records") {
      const swimmers = state.attendance_swimmers.filter(
        (s) => s.attendance_id === row.id,
      );
      return { ...row, attendance_swimmers: swimmers };
    }
    return row;
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
    maybeSingle() {
      return execute();
    },
    single() {
      return execute();
    },
    then(resolve: any, reject: any) {
      return execute().then(resolve, reject);
    },
  };

  async function execute(): Promise<{ data: any; error: any }> {
    const tableData = state[table as keyof MockSupabaseState] as Record<string, any>[];

    // Handle insert
    if (pendingInsert !== null) {
      const rows = Array.isArray(pendingInsert) ? pendingInsert : [pendingInsert];
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
      const row = results[0] ?? null;
      if (row) {
        return { data: hydrateRecord(row), error: null };
      }
      return { data: null, error: null };
    }

    return { data: results, error: null };
  }

  return builder;
}
