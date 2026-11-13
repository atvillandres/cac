/**
 * In-memory stand-in for CAC working tables used by daily process.
 * Replace with real SQL adapters when ODBC/Postgres is wired.
 */

export interface CurrLedgeRow {
  id: string;
  foCode: string;
  docNo: string;
  amount: number;
  tranDate: string; // YYYY-MM-DD
  source: string;
}

export interface BdoApMstRow {
  company: string;
  bdoCode: string;
  source: string; // appsrce 1=FOCUS 2=CDR
  processDate: string;
  status: string;
  subFile: string;
  userId: string;
}

export interface DailyStore {
  currLedge: CurrLedgeRow[];
  currLedgeX: CurrLedgeRow[];
  bdoApMst: BdoApMstRow[];
  bpyFile: Record<string, unknown>[];
  grpFile: Record<string, unknown>[];
}

export function createStore(seed?: Partial<DailyStore>): DailyStore {
  return {
    currLedge: seed?.currLedge ? [...seed.currLedge] : [],
    currLedgeX: seed?.currLedgeX ? [...seed.currLedgeX] : [],
    bdoApMst: seed?.bdoApMst ? [...seed.bdoApMst] : [],
    bpyFile: seed?.bpyFile ? [...seed.bpyFile] : [],
    grpFile: seed?.grpFile ? [...seed.grpFile] : [],
  };
}

export function seedDemoLedger(store: DailyStore, count = 3): void {
  const today = new Date().toISOString().slice(0, 10);
  for (let i = 1; i <= count; i++) {
    store.currLedge.push({
      id: `DEMO-${i}`,
      foCode: "001",
      docNo: `OR${String(i).padStart(6, "0")}`,
      amount: 1000 * i,
      tranDate: today,
      source: "DEMO",
    });
  }
}
