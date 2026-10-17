export { cn } from "./cn"
export { indexBy } from "./collections"
export { toCsv, downloadCsv } from "./csv"
export { PLATFORM_TIMEZONE, localDateKey, todayKey } from "./date"
export { createEditorTabs, openTab, closeTab, renameTabs, type EditorTabs } from "./editor-tabs"
export { buildTree, type TreeNode } from "./file-tree"
export {
  formatNumber,
  formatXp,
  formatPercent,
  formatDate,
  formatDateTime,
  formatTime,
  formatTimeAgo,
  formatRelativeDay,
  truncatePlainText,
  type DateStyle,
} from "./format"
export { computeLevelProgress, toClampedPercent, type LevelProgress } from "./gamification"
export {
  normalizePath,
  isValidPath,
  parseProjectFiles,
  resolveStarterFiles,
  hasFile,
  updateFileContent,
  addFile,
  isFolderPath,
  renamePath,
  renameEntry,
  removeFile,
  pickEntryFile,
  type FileOperationResult,
  type FilesChange,
} from "./project-files"
export { safeRedirectPath } from "./redirect"
export { computeTrailStatuses, type TrailStatus } from "./trail"
export { getInitials } from "./user"
export {
  applyLessonCompletion,
  summarizeGamification,
  type GamificationSummary,
  type LessonCompletion,
} from "./progress"
