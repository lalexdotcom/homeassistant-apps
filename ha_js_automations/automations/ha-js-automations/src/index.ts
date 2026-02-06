import type { Connection, CoreRegisteredDomains } from "ha-ws-js-sugar";
import { ChildProcessConnection } from "./connection/ChildProcessConnection";
import type actions from "./const/actions";
import type entities from "./const/entities";

export const connection = new ChildProcessConnection() as Connection<
	{
		[K in (typeof CoreRegisteredDomains)[number] as K["domain"]]: K;
	},
	(typeof entities)[number],
	typeof actions
>;
