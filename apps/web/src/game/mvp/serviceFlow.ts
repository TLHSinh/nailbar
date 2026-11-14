export type ServiceStage = "waiting" | "walking" | "seated" | "working" | "complete";
export type ServiceState = { stage: ServiceStage; progress: number; service: string };
export const SERVICE_NAME = "Sơn gel";
export const SERVICE_SECONDS = 12;
export const initialServiceState = (): ServiceState => ({ stage: "waiting", progress: 0, service: SERVICE_NAME });

export function advanceService(state: ServiceState, event: "accept" | "arrive" | "start" | "reset" | "tick", deltaSeconds = 0): ServiceState {
  if (event === "reset" && state.stage === "complete") return initialServiceState();
  if (event === "accept" && state.stage === "waiting") return { ...state, stage: "walking" };
  if (event === "arrive" && state.stage === "walking") return { ...state, stage: "seated" };
  if (event === "start" && state.stage === "seated") return { ...state, stage: "working" };
  if (event === "tick" && state.stage === "working") {
    const progress = Math.min(1, state.progress + Math.max(0, deltaSeconds) / SERVICE_SECONDS);
    return { ...state, progress, stage: progress >= 1 ? "complete" : "working" };
  }
  return state;
}
