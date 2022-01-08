export type VNode = import('preact').VNode;

export type ModuleLoader = (
  specifier: string,
  importer: SourceTextModule,
) => SourceTextModule;

export class SourceTextModule {
  link(loader: ModuleLoader): Promise<undefined>;
  evaluate(): Promise<undefined>;
  status:
    | 'unlinked'
    | 'linking'
    | 'linked'
    | 'evaluating'
    | 'evaluated'
    | 'errored';
  identifier: string;
  namespace: {
    default(): VNode | Promise<VNode>;
  };
}

export interface Importer {
  identifier: string;
}

export interface CachedModuleRecord {
  mod: SourceTextModule;
  importers: Set<string>;
  abort: AbortController;
}

export interface FileData {
  file: string;
  cwd: string;
  src: string;
  dest: string;
}

export interface ModuleRecord {
  data: FileData;
  mod: SourceTextModule;
}

export interface RenderRecord {
  data: FileData;
  render: string;
}

export type Merge<A, B> = {
  [K in keyof A]: K extends keyof B ? B[K] : A[K];
} & B;
