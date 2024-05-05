export abstract class Base {
  protected readonly _namespace: string;
  protected initialized = false;

  protected constructor({ namespace }: { namespace: string }) {
    this._namespace = namespace;
  }

  protected abstract init(): Promise<void>;

  public get namespace() {
    return this._namespace;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }
}