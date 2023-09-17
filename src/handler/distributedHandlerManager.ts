// import {AbstractHandlerManager} from "./types";
// import {Client} from "pg";
// import {createHandlerTable} from "../queries";
// import {CheckInitialized} from "../../util";
//
// export class DistributedHandlerManager extends AbstractHandlerManager {
//   protected taskHandlers: Record<String, any>;
//
//   protected constructor() {
//     super();
//     this.taskHandlers = {};
//   }
//
//   public async init(client: Client) {
//     this.client = client;
//     await this.client.query(createHandlerTable);
//     this.initialized = true;
//   }
//
//   // Class instances should only fetch tasks for which they have a registered handler
//   @CheckInitialized
//   public async registerTaskHandler(name: string, handler: () => Promise<void>) {
//     if (this.taskHandlers[name]) {
//       // throw new Error(`Task handler ${name} already registered`);
//       return false;
//     }
//
//     this.taskHandlers[name] = handler;
//   }
//
//   @CheckInitialized
//   public async removeTaskHandler() {}
//
//   @CheckInitialized
//   public async getTaskHandlers() {}
// }

import {AbstractHandlerManager} from "./types";

// @ts-ignore
export class DistributedHandlerManager extends AbstractHandlerManager {
  constructor() {
    super();
  }
}
