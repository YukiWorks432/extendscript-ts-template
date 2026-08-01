export interface ScriptConfig {
  /** @description スクリプトの名前 */
  name: string;
  /** @description スクリプトのバージョン */
  version: string;
  /** @deprecated 非推奨です。pn build では自動的に変更があったスクリプトのみビルドします。 */
  build?: boolean;
  /** @description ライセンスファイルを含めるかどうか */
  license?: boolean;
}

export interface EsConfig {
  scripts: Record<string, ScriptConfig[]>;
  common?: ScriptConfig[];
}
