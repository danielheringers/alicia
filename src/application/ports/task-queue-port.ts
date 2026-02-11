export interface TaskQueuePort {
  schedule<T>(task: () => Promise<T>): Promise<T>;
  getConcurrency(): number;
  setConcurrency(value: number): void;
}
