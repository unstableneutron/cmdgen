import { main } from "./cli";

const exitCode = await main(process.argv.slice(2));
process.exit(exitCode);
