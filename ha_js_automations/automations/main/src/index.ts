import { type ChildProcess, fork } from "node:child_process";
import { dirname } from "node:path";
import { env } from "node:process";
import chokidar from "chokidar";
import { createConnection } from "ha-ws-js-sugar";
import type { HassEvent } from "home-assistant-js-websocket";
import type { Child, Main } from "./types";

console.log(
	"Starting main process with PID",
	process.pid,
	process.argv,
	process.execArgv,
);

process.on("uncaughtException", (err) => {
	console.error("Uncaught exception:", err);
});

(async () => {
	const connection = await createConnection({
		host: env.HA_HOST ?? "http://supervisor/core",
		token:
			(env.HA_HOST ? env.HA_TOKEN : env.SUPERVISOR_TOKEN) ??
			(() => {
				throw new Error("No token provided", {
					cause: "No token provided in environment variables",
				});
			})(),
	});

	const registeredChildren: Set<ChildProcess> = new Set();
	const listeningChildren: Set<ChildProcess> = new Set();

	const handleConnectionEvent = (event: HassEvent) => {
		for (const child of listeningChildren) {
			if (registeredChildren.has(child)) {
				const message: Main.EventMessage = {
					type: "event",
					event,
				};
				sendMessage(child, message);
			} else {
				removeListeningChild(child);
			}
		}
	};

	const addListeningChild = (child: ChildProcess) => {
		listeningChildren.add(child);
		if (listeningChildren.size === 1) {
			connection.addEventsListener(handleConnectionEvent);
		}
	};

	const removeListeningChild = (child: ChildProcess) => {
		listeningChildren.delete(child);
		if (listeningChildren.size === 0) {
			connection.removeEventsListener(handleConnectionEvent);
		}
	};

	const sendMessage = (child: ChildProcess, message: Main.Message) => {
		try {
			if (child.connected)
				// console.log(
				// 	`Sending message to child process PID ${child.pid}:`,
				// 	message,
				// );
				child.send(message);
		} catch (error) {
			console.log(
				"Error sending message to child process:",
				child.pid,
				error instanceof Error ? error.message : error,
			);
		}
	};

	const registerChild = (child: ChildProcess) => {
		registeredChildren.add(child);
		console.log(`Registered child process with PID ${child.pid}`);
		child.on("error", (err) => {
			console.log(`Error in child process ${child.pid}:`, err);
		});
		child.on("exit", () => {
			if (registeredChildren.delete(child)) {
				console.log(`Child process ${child.pid} exited and unregistered`);
			}
		});
		child.on("close", () => {
			if (registeredChildren.delete(child)) {
				console.log(`Child process ${child.pid} closed and unregistered`);
			}
		});
		child.on("message", (msg: Child.Message) => {
			switch (msg.type) {
				case "call": {
					const { callId, action, target, data, result } = msg;
					connection.callAction(action, target, data, result).then((res) => {
						const message: Main.ResultMessage = {
							type: "result",
							callId,
							result: res,
						};
						sendMessage(child, message);
					});
					break;
				}
				case "get_states": {
					const { callId } = msg;
					connection.getStates().then((states) => {
						const message: Main.ResultMessage = {
							type: "result",
							callId,
							result: states,
						};
						sendMessage(child, message);
					});
					break;
				}
				case "subscribe_events": {
					const { callId } = msg;
					addListeningChild(child);
					const message: Main.ResultMessage = {
						type: "result",
						callId,
						result: null,
					};
					sendMessage(child, message);
					break;
				}
				case "unsubscribe_events": {
					// const { callId } = msg;
					removeListeningChild(child);
					break;
				}
			}
		});
	};

	const unregisterChild = (child: ChildProcess) => {
		if (registeredChildren.has(child)) {
			child.disconnect();
			child.kill();
			registeredChildren.delete(child);
			console.log(`Unregistered child process with PID ${child.pid}`);
		}
	};
	/**/
	/**/
	// Watch files in the scripts directory and start a child process for each file
	const watcher = chokidar.watch("./scripts", {
		ignored: (path, stats) => {
			return (
				dirname(path) !== "scripts" &&
				!!stats &&
				stats.isFile() &&
				!path.endsWith(".ha.js") &&
				!path.endsWith(".ha.ts")
			);
		}, // only watch js files
		persistent: true,
	});

	const runningFiles: Record<string, ChildProcess> = {};

	const loadScript = (file: string) => {
		unloadScript(file);

		runningFiles[file] = fork("./src/script.ts", [`../${file}`], {
			cwd: process.cwd(),
			env: process.env,
			stdio: ["inherit", "inherit", "inherit", "ipc"],
		});
		console.log(
			"Starting script for file",
			file,
			"with pid",
			runningFiles[file].pid,
		);
		registerChild(runningFiles[file]);
	};

	const unloadScript = (file: string) => {
		if (runningFiles[file]) {
			unregisterChild(runningFiles[file]);
			delete runningFiles[file];
		}
	};

	watcher
		.on("add", (path) => {
			console.log(`File ${path} has been added`);
			loadScript(path);
		})
		.on("change", (path) => {
			console.log(`File ${path} has been changed`);
			loadScript(path);
		})
		.on("unlink", (path) => {
			console.log(`File ${path} has been removed`);
			unloadScript(path);
		});

	console.log("Src folder", "./scripts");
	/**/
})();
// const connection = (await new Promise<void>((res) => {
// 	res();
// })) as unknown as ReturnType<typeof createConnection>;
/***/
// Create a proxy between the main process and child processes to handle communication with Home Assistant
