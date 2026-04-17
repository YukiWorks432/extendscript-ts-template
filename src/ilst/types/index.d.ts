// jp: Illustrator 固有の型定義を記述するファイルです。
// en: Type definitions specific to Illustrator.

/**
 * Location to move element to.
 * @see https://ai-scripting.docsforadobe.dev/jsobjref/scripting-constants/?h=elementplacement#elementplacement
 */
declare enum ElementPlacement {
  /**
   * Inside
   */
  INSIDE = "INSIDE",
  /**
   * Place After
   */
  PLACEAFTER = "PLACEAFTER",
  /**
   * Place At Beginning
   */
  PLACEATBEGINNING = "PLACEATBEGINNING",
  /**
   * Place At End
   */
  PLACEATEND = "PLACEATEND",
  /**
   * Place Before
   */
  PLACEBEFORE = "PLACEBEFORE",
}
