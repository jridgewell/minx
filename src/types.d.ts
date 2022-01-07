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

export interface ModuleRecord {
  dir: string;
  filename: string;
  mod: SourceTextModule;
}

export interface RenderRecord {
  dir: string;
  filename: string;
  render: string;
}
