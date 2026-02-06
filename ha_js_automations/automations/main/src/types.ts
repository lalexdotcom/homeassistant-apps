import type { HassEvent } from "home-assistant-js-websocket";

export namespace Main {
	export type EventMessage = {
		type: "event";
		event: HassEvent;
	};

	export type ResultMessage = {
		type: "result";
		callId: number;
		result: unknown;
	};

	export type Message = EventMessage | ResultMessage;
}

export namespace Child {
	export type CallActionMessage = {
		type: "call";
		action: `${string}.${string}`;
		target?: MessageActionTarget;
		data?: Record<string, unknown>;
		result?: boolean;
	};

	export type GetStatesMessage = {
		type: "get_states";
	};

	export type SubscribeEventsMessage = {
		type: "subscribe_events";
	};

	export type UnsubscribeEventsMessage = {
		type: "unsubscribe_events";
	};

	export type Message = { callId: number } & (
		| CallActionMessage
		| GetStatesMessage
		| SubscribeEventsMessage
		| UnsubscribeEventsMessage
	);
}

export type MessageActionTarget = {
	entityId?: string | string[];
	deviceId?: string | string[];
	areaId?: string | string[];
	floorId?: string | string[];
	labelId?: string | string[];
};
