// jp: ExtendScript環境ではline番号とsourceプロパティがErrorオブジェクトに存在するため、型定義を拡張します。
// en: In the ExtendScript environment, the Error object has line number and source properties, so we extend the type definition.
interface Error {
  line: number;
  source: string;
}

// jp: ExtendScript環境のApplicationオブジェクトに存在する可能性のあるメソッドを型定義に追加します。
// en: Add methods that may exist on the Application object in the ExtendScript environment to the type definition.
interface Application {
  /**
   * jp: Undoグループ化を開始するメソッド。Aeの場合のみ存在します。\
   * en: Method to begin an undo group. Exists only in After Effects.
   */
  beginUndoGroup?: (undoString: string) => void;
  /**
   * jp: Undoグループ化を終了するメソッド。Aeの場合のみ存在します。\
   * en: Method to end an undo group. Exists only in After Effects.
   */
  endUndoGroup?: () => void;
}
