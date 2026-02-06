import { type ActionTarget, Connection } from "ha-ws-js-sugar";
import type { HassEntity, HassEvent } from "home-assistant-js-websocket";
import type { Child, Main, MessageActionTarget } from "./types";

const actionTargetToMessageTarget = (target?: ActionTarget) => {
	if (!target) return undefined;
	const msgTarget: MessageActionTarget = {};
	if ("entityId" in target && target.entityId)
		msgTarget.entityId = target.entityId;
	else if ("entity" in target && target.entity)
		msgTarget.entityId = Array.isArray(target.entity)
			? target.entity.map((e) => e.id)
			: target.entity.id;
	if (target.deviceId) msgTarget.deviceId = target.deviceId;
	if (target.areaId) msgTarget.areaId = target.areaId;
	if (target.floorId) msgTarget.floorId = target.floorId;
	if (target.labelId) msgTarget.labelId = target.labelId;
	return msgTarget;
};

export class ChildProcessConnection extends Connection {
	static #nextCallId = 1;

	#pendingCalls: Map<number, (result: any) => void>;
	#eventHandler?: (event: HassEvent) => void;

	constructor() {
		super();
		this.#pendingCalls = new Map();
		if (!process?.send) {
			throw new Error(
				"ChildProcessConnection can only be used in a child process",
			);
		}
		process.on("message", (msg: Main.Message) =>
			this.handleProcessMessage(msg),
		);
	}

	private handleProcessMessage(event: Main.Message) {
		switch (event.type) {
			case "result":
				this.handleResultMessage(event);
				break;
			case "event":
				this.handleEventMessage(event);
				break;
		}
	}

	private handleResultMessage(message: Main.ResultMessage) {
		const { callId, result } = message;
		const resolve = this.#pendingCalls.get(callId);
		if (resolve) {
			resolve(result);
			this.#pendingCalls.delete(callId);
		}
	}

	private handleEventMessage(message: Main.EventMessage) {
		this.#eventHandler?.(message.event);
	}

	protected async sendMessage<T = any>(message: Child.Message): Promise<T> {
		return new Promise<T>((resolve) => {
			const callId = ChildProcessConnection.#nextCallId++;
			this.#pendingCalls.set(callId, resolve);
			console.log("Send message to parent process:", { ...message, callId });
			if (process.connected) {
				process.send?.({ ...message, callId });
			}
		});
	}

	callAction(
		action: `${string}.${string}`,
		target?: ActionTarget,
		data?: Record<string, unknown>,
		result?: boolean,
	) {
		return this.sendMessage({
			type: "call",
			action,
			target: actionTargetToMessageTarget(target),
			data,
			result,
		});
	}

	getStates() {
		return this.sendMessage<HassEntity[]>({
			type: "get_states",
		});
	}

	subscribeEvents(handler: (event: HassEvent) => void) {
		return this.sendMessage({
			type: "subscribe_events",
		}).then(() => {
			this.#eventHandler = handler;
			return () =>
				this.sendMessage<void>({
					type: "unsubscribe_events",
				});
		});
	}
}
