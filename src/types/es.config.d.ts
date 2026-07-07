export interface ScriptConfig {
  name: string;
  version: string;
  build?: boolean;
  license?: boolean;
}

export interface EsConfig {
  scripts: Record<string, ScriptConfig[]>;
  common?: ScriptConfig[];
}
