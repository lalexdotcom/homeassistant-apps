import { argv, execArgv } from "node:process";

console.log("Starting script process with PID", argv, execArgv);

await import(argv[2]);
