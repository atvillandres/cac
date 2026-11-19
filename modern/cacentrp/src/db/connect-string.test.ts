import { buildConnectString, extractDsn } from "./connect-string.js";

function check(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("ok:", msg);
  }
}

check(extractDsn("ConnectString='DSN=CACDB;UID=x;PWD=y',StaticBind = 0") === "CACDB", "extract PB DSN");
check(extractDsn("DSN=APMODDTA") === "APMODDTA", "extract plain DSN");

check(
  buildConnectString({
    profileName: "CACDB",
    userId: "DEMO",
    password: "secret",
    database: "CACDB",
  }) === "DSN=CACDB;UID=DEMO;PWD=secret",
  "default DSN from database",
);

check(
  buildConnectString({
    profileName: "APMODDTA",
    userId: "OP1",
    password: "p",
    dbParm: "ConnectString='DSN=APMODDTA',StaticBind = 0",
  }) === "DSN=APMODDTA;UID=OP1;PWD=p",
  "DSN from PB DbParm",
);

check(
  buildConnectString({
    profileName: "CACDB",
    userId: "OP1",
    password: "p",
    dbParm: "DSN=CACDB;Naming=1",
  }) === "DSN=CACDB;Naming=1;UID=OP1;PWD=p",
  "passthrough connection string",
);

if (!process.exitCode) console.log("connect-string tests passed");
