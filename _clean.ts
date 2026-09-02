import { getDb } from "./api/queries/connection";
import { socialStats, pageViews } from "@db/schema";

async function main() {
  const db = getDb();
  await db.delete(socialStats);
  await db.delete(pageViews);
  console.log("test data cleaned");
  process.exit(0);
}
main();
