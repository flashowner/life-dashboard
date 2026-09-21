"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type QuestKind = "daily" | "habit" | "one_off";
type AttributeKey = "vitality" | "focus" | "connection" | "growth" | "order";
type Locale = "en" | "zh";
type TabKey = "dashboard" | "quests" | "attributes" | "achievements" | "review";
type AchievementDifficulty = "starter" | "steady" | "bold" | "legendary";
type AnalyticsRange = "week" | "month";
type ProfessionKey = "wayfinder" | "ranger" | "arcanist" | "bard" | "architect";
type FocusLog = {
  id: string;
  taskId: string;
  taskTitle: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
};
type FocusSession = {
  taskId: string;
  taskTitle: string;
  startedAt: string;
  accumulatedSeconds: number;
  resumedAt: number | null;
  status: "running" | "paused";
};
type Task = {
  id: string;
  title: string;
  kind: QuestKind;
  xp: 10 | 20 | 30 | 50;
  attribute: AttributeKey;
  date: string;
  isMainQuest: boolean;
  completedAt: string | null;
  createdAt: string;
};
type AppData = {
  version: 1;
  profile: { name: string; createdAt: string; profession?: ProfessionKey };
  tasks: Task[];
  focusLogs?: FocusLog[];
};
type EditorState = { mode: "create" | "edit"; taskId?: string };
type Draft = {
  title: string;
  kind: QuestKind;
  xp: 10 | 20 | 30 | 50;
  attribute: AttributeKey;
  isMainQuest: boolean;
};
type NoticeTone = "success" | "error";
type ArchiveStatus =
  | "unsupported"
  | "not_connected"
  | "permission_needed"
  | "connected"
  | "saving"
  | "saved"
  | "error";
type LocalWritableFile = {
  write(data: Blob | string): Promise<void>;
  close(): Promise<void>;
};
type LocalFileHandle = {
  getFile(): Promise<File>;
  createWritable(): Promise<LocalWritableFile>;
};
type LocalDirectoryHandle = {
  name: string;
  getFileHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<LocalFileHandle>;
  getDirectoryHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<LocalDirectoryHandle>;
  queryPermission(options?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
  requestPermission(options?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
};

declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      id?: string;
      mode?: "read" | "readwrite";
    }) => Promise<LocalDirectoryHandle>;
  }
}
type AchievementStats = {
  completedCount: number;
  totalXp: number;
  activeDays: number;
  mainQuestCount: number;
  maxDailyCompleted: number;
  attributeCounts: Record<AttributeKey, number>;
};
type AchievementDefinition = {
  key: string;
  difficulty: AchievementDifficulty;
  icon: string;
  title: { en: string; zh: string };
  hint: { en: string; zh: string };
  unlocks: (stats: AchievementStats) => boolean;
};

const STORAGE_KEY = "life-dashboard:v1";
const LEGACY_KEY = "life-dashboard-quests";
const ARCHIVE_AUTOSAVE_KEY = "life-dashboard:archive-autosave";
const ARCHIVE_DB_NAME = "life-dashboard-files";
const ARCHIVE_DB_STORE = "handles";
const ARCHIVE_HANDLE_KEY = "archive-directory";
const ARCHIVE_FILE_NAME = "life-dashboard-save.json";
const FOCUS_SESSION_KEY = "life-dashboard:focus-session";
const DEMO_BACKUP_KEY = "life-dashboard:pre-demo-backup";
const attributeKeys: AttributeKey[] = [
  "vitality",
  "focus",
  "connection",
  "growth",
  "order",
];

const attributes = [
  {
    key: "vitality" as AttributeKey,
    name: { en: "Vitality", zh: "活力" },
    hint: { en: "Body & energy", zh: "身体与能量" },
    icon: "♥",
    tone: "rose",
  },
  {
    key: "focus" as AttributeKey,
    name: { en: "Focus", zh: "专注" },
    hint: { en: "Mind & craft", zh: "思考与创造" },
    icon: "⌁",
    tone: "blue",
  },
  {
    key: "connection" as AttributeKey,
    name: { en: "Connection", zh: "连接" },
    hint: { en: "People & presence", zh: "关系与陪伴" },
    icon: "◌",
    tone: "violet",
  },
  {
    key: "growth" as AttributeKey,
    name: { en: "Growth", zh: "成长" },
    hint: { en: "Learning & courage", zh: "学习与勇气" },
    icon: "↗",
    tone: "green",
  },
  {
    key: "order" as AttributeKey,
    name: { en: "Order", zh: "秩序" },
    hint: { en: "Home & finances", zh: "生活与财务" },
    icon: "◇",
    tone: "gold",
  },
];

const professionCatalog: Record<
  ProfessionKey,
  {
    icon: string;
    name: { en: string; zh: string };
    description: { en: string; zh: string };
    affinity: AttributeKey;
    ranks: Array<{ level: number; en: string; zh: string }>;
  }
> = {
  wayfinder: {
    icon: "◈",
    name: { en: "Wayfinder", zh: "寻路者" },
    description: { en: "A balanced path across every part of life.", zh: "在生活的每个维度之间寻找平衡。" },
    affinity: "growth",
    ranks: [
      { level: 1, en: "Wanderer", zh: "漫游者" },
      { level: 2, en: "Trailseeker", zh: "探路人" },
      { level: 3, en: "Pathfinder", zh: "开拓者" },
      { level: 5, en: "Wayfinder", zh: "寻路者" },
      { level: 8, en: "Horizon Keeper", zh: "地平线守望者" },
      { level: 12, en: "Star Cartographer", zh: "星图绘制者" },
    ],
  },
  ranger: {
    icon: "↟",
    name: { en: "Ranger", zh: "游侠" },
    description: { en: "Build energy through movement and consistency.", zh: "以行动和耐力积累生命能量。" },
    affinity: "vitality",
    ranks: [
      { level: 1, en: "Scout", zh: "斥候" },
      { level: 2, en: "Tracker", zh: "追迹者" },
      { level: 3, en: "Strider", zh: "长行者" },
      { level: 5, en: "Ranger", zh: "游侠" },
      { level: 8, en: "Wildwarden", zh: "荒野守卫" },
      { level: 12, en: "Verdant Legend", zh: "苍翠传奇" },
    ],
  },
  arcanist: {
    icon: "✦",
    name: { en: "Arcanist", zh: "秘术师" },
    description: { en: "Turn deep focus and learning into mastery.", zh: "把深度专注与学习转化为精通。" },
    affinity: "focus",
    ranks: [
      { level: 1, en: "Spark", zh: "微光学徒" },
      { level: 2, en: "Scribe", zh: "符文书吏" },
      { level: 3, en: "Channeler", zh: "引能者" },
      { level: 5, en: "Arcanist", zh: "秘术师" },
      { level: 8, en: "Mindweaver", zh: "心智编织者" },
      { level: 12, en: "Astral Sage", zh: "星界贤者" },
    ],
  },
  bard: {
    icon: "♫",
    name: { en: "Bard", zh: "吟游者" },
    description: { en: "Grow through connection, stories, and presence.", zh: "在连接、故事与陪伴中成长。" },
    affinity: "connection",
    ranks: [
      { level: 1, en: "Listener", zh: "倾听者" },
      { level: 2, en: "Storykeeper", zh: "故事守护者" },
      { level: 3, en: "Harmonist", zh: "和鸣者" },
      { level: 5, en: "Bard", zh: "吟游者" },
      { level: 8, en: "Heartcaller", zh: "唤心者" },
      { level: 12, en: "Voice of Dawn", zh: "黎明之声" },
    ],
  },
  architect: {
    icon: "◇",
    name: { en: "Architect", zh: "筑城者" },
    description: { en: "Create calm through systems, order, and craft.", zh: "用系统、秩序与创造构筑安定。" },
    affinity: "order",
    ranks: [
      { level: 1, en: "Tinkerer", zh: "修造学徒" },
      { level: 2, en: "Planner", zh: "规划师" },
      { level: 3, en: "Builder", zh: "建造者" },
      { level: 5, en: "Architect", zh: "筑城者" },
      { level: 8, en: "Cityshaper", zh: "城邦塑造者" },
      { level: 12, en: "Worldsmith", zh: "世界铸造师" },
    ],
  },
};

const professionKeys = Object.keys(professionCatalog) as ProfessionKey[];

const achievementDifficultyLabels: Record<
  Locale,
  Record<AchievementDifficulty | "all", string>
> = {
  en: {
    all: "All",
    starter: "Starter",
    steady: "Steady",
    bold: "Bold",
    legendary: "Legendary",
  },
  zh: {
    all: "全部",
    starter: "入门",
    steady: "进阶",
    bold: "挑战",
    legendary: "传奇",
  },
};

const starterAchievementNames: Array<{ en: string; zh: string }> = [
  { en: "First Quest", zh: "初入征途" },
  { en: "Second Strike", zh: "再战一回" },
  { en: "Triple Start", zh: "三连起势" },
  { en: "Hold the Line", zh: "稳住阵脚" },
  { en: "First Edge", zh: "小试锋芒" },
  { en: "Novice Hunter", zh: "初阶猎手" },
  { en: "Sparks Align", zh: "星火成阵" },
  { en: "Eightfold Call", zh: "八方来战" },
  { en: "Nine Unbroken", zh: "九战未怠" },
  { en: "Tenfold Mark", zh: "十步成章" },
  { en: "Courage +1", zh: "勇气加一" },
  { en: "Twelve Trials", zh: "十二试炼" },
  { en: "Thirteen Against", zh: "逆风十三" },
  { en: "Rising Resolve", zh: "战意渐浓" },
  { en: "Vanguard Debut", zh: "新锐登场" },
  { en: "Forward Edge", zh: "锋线推进" },
  { en: "Another Gate Down", zh: "再破一关" },
  { en: "First Battle Scars", zh: "战痕初成" },
  { en: "Fearless Road", zh: "无惧前路" },
  { en: "Proven in Battle", zh: "小有战绩" },
  { en: "Endless Combo", zh: "连击不止" },
  { en: "Seasoned Hands", zh: "身手渐熟" },
  { en: "Victory in Hand", zh: "胜势在握" },
  { en: "Final Blow", zh: "临门一击" },
  { en: "Rookie No More", zh: "新手毕业" },
];

const steadyAchievementNames: Array<{ en: string; zh: string }> = [
  { en: "XP Secured", zh: "经验入账" },
  { en: "Junior Adventurer", zh: "初级冒险家" },
  { en: "Arcane Awakening", zh: "魔力苏醒" },
  { en: "Level Warm-Up", zh: "等级预热" },
  { en: "Vanguard Trainee", zh: "见习先锋" },
  { en: "Gear Takes Shape", zh: "装备成形" },
  { en: "Power Revealed", zh: "战力初显" },
  { en: "Ready to Charge", zh: "蓄势待发" },
  { en: "Glory Ahead", zh: "荣光在望" },
  { en: "Thousand Break", zh: "千点突破" },
  { en: "XP Surge", zh: "经验涌流" },
  { en: "Ascendant Walker", zh: "进阶行者" },
  { en: "Silver Mark", zh: "银阶印记" },
  { en: "Growing Edge", zh: "锋芒渐盛" },
  { en: "Hero's Proof", zh: "勇者之证" },
  { en: "Forged by Trials", zh: "百炼成章" },
  { en: "Battlecraft Adept", zh: "战技精熟" },
  { en: "Eve of Ascension", zh: "破境前夜" },
  { en: "Crown of Honor", zh: "荣誉加冕" },
  { en: "Two-Thousand Trail", zh: "双千里程" },
  { en: "Senior Adventurer", zh: "高阶冒险家" },
  { en: "Resolve Ablaze", zh: "战意如虹" },
  { en: "Golden Mark", zh: "黄金印记" },
  { en: "Next Rank Near", zh: "登阶在即" },
  { en: "XP Master", zh: "经验大师" },
];

const boldAchievementNames: Array<{ en: string; zh: string }> = [
  { en: "Three-Day Oath", zh: "三日誓约" },
  { en: "Five-Day Watch", zh: "五日守望" },
  { en: "Seven-Day Trial", zh: "七日试炼" },
  { en: "Nine-Day Campaign", zh: "九日连战" },
  { en: "Eleven-Day Journey", zh: "十一日征途" },
  { en: "Seed of Resolve", zh: "恒心萌芽" },
  { en: "Half-Moon Mark", zh: "半月之印" },
  { en: "Tireless Walker", zh: "不息行者" },
  { en: "Sunwheel Guard", zh: "日轮守卫" },
  { en: "Three-Week Stand", zh: "三周坚守" },
  { en: "Time Traveler", zh: "时间旅人" },
  { en: "Daily Conqueror", zh: "日常征服者" },
  { en: "Twenty-Seven Streak", zh: "二十七连胜" },
  { en: "Month's Vanguard", zh: "月前哨站" },
  { en: "Monthly Hero", zh: "月度勇者" },
  { en: "Thirty-Three Scars", zh: "三十三战痕" },
  { en: "Five-Week Oath", zh: "五周誓言" },
  { en: "Road of Grit", zh: "坚韧之路" },
  { en: "Constant Heart", zh: "恒常之心" },
  { en: "Forty-One Watch", zh: "四十一守望" },
  { en: "Dawn Without End", zh: "日升不辍" },
  { en: "Silent Expedition", zh: "静默远征" },
  { en: "Unbroken Return", zh: "不屈回归" },
  { en: "Seven-Seven Pact", zh: "七七之约" },
  { en: "Time Hunter", zh: "时光猎手" },
];

const legendaryAchievementNames: Array<{ en: string; zh: string }> = [
  { en: "Triple Star Slash", zh: "三星连斩" },
  { en: "Fourfold Break", zh: "四方破阵" },
  { en: "Fivefold Art", zh: "五连绝技" },
  { en: "Six Victories", zh: "六战全胜" },
  { en: "Sevenfold Resonance", zh: "七曜齐鸣" },
  { en: "Main Quest Unsealed", zh: "主线启封" },
  { en: "Twin Triumph", zh: "双线凯旋" },
  { en: "Three Chapters Cleared", zh: "三章征服" },
  { en: "Four Realms Cleared", zh: "四境通关" },
  { en: "Main Quest Sovereign", zh: "主线霸者" },
  { en: "Vitality Awakened", zh: "生命觉醒" },
  { en: "Eye of Focus", zh: "专注之瞳" },
  { en: "Bond Resonance", zh: "羁绊共鸣" },
  { en: "Growth Ascendant", zh: "成长飞升" },
  { en: "Crown of Order", zh: "秩序王冠" },
  { en: "Epic Proof", zh: "史诗之证" },
  { en: "Starforged Record", zh: "星耀战绩" },
  { en: "Path of Legend", zh: "传说之径" },
  { en: "Mythic Echo", zh: "神话回响" },
  { en: "Glory Eternal", zh: "荣光永驻" },
  { en: "Moonlit Watch", zh: "月影守望" },
  { en: "Twin-Moon Expedition", zh: "双月远征" },
  { en: "Season of Legend", zh: "季度传奇" },
  { en: "Hundred-Day Epic", zh: "百日史诗" },
  { en: "Immortal Traveler", zh: "不朽旅者" },
];

const starterAchievements: AchievementDefinition[] = Array.from(
  { length: 25 },
  (_, index): AchievementDefinition => {
    const target = index + 1;
    return {
      key: `starter-${target}`,
      difficulty: "starter",
      icon: ["↗", "✦", "◷", "★", "○"][index % 5],
      title: starterAchievementNames[index],
      hint: {
        en: `Complete ${target} quest${target === 1 ? "" : "s"}`,
        zh: `完成 ${target} 个任务`,
      },
      unlocks: (stats) => stats.completedCount >= target,
    };
  },
);

const steadyAchievements: AchievementDefinition[] = Array.from(
  { length: 25 },
  (_, index): AchievementDefinition => {
    const target = (index + 1) * 100;
    return {
      key: `steady-${target}`,
      difficulty: "steady",
      icon: ["◆", "✹", "◇", "✧", "●"][index % 5],
      title: steadyAchievementNames[index],
      hint: {
        en: `Earn ${target} total XP`,
        zh: `累计获得 ${target} XP`,
      },
      unlocks: (stats) => stats.totalXp >= target,
    };
  },
);

const boldAchievements: AchievementDefinition[] = Array.from(
  { length: 25 },
  (_, index): AchievementDefinition => {
    const target = 3 + index * 2;
    return {
      key: `bold-${target}-days`,
      difficulty: "bold",
      icon: ["☼", "↺", "⌁", "⬡", "☽"][index % 5],
      title: boldAchievementNames[index],
      hint: {
        en: `Show up on ${target} different days`,
        zh: `在 ${target} 个不同日期完成任务`,
      },
      unlocks: (stats) => stats.activeDays >= target,
    };
  },
);

const legendaryAchievements: AchievementDefinition[] = Array.from(
  { length: 25 },
  (_, index): AchievementDefinition => {
    if (index < 5) {
      const target = 3 + index;
      return {
        key: `legendary-day-${target}`,
        difficulty: "legendary",
        icon: "◒",
        title: legendaryAchievementNames[index],
        hint: {
          en: `Complete ${target} quests in one day`,
          zh: `在同一天完成 ${target} 个任务`,
        },
        unlocks: (stats) => stats.maxDailyCompleted >= target,
      };
    }
    if (index < 10) {
      const target = index - 4;
      return {
        key: `legendary-main-${target}`,
        difficulty: "legendary",
        icon: "↗",
        title: legendaryAchievementNames[index],
        hint: {
          en: `Complete ${target} main quests`,
          zh: `完成 ${target} 个主线任务`,
        },
        unlocks: (stats) => stats.mainQuestCount >= target,
      };
    }
    if (index < 15) {
      const target = index - 9;
      const attribute = attributeKeys[index - 10];
      const label = attributes.find((item) => item.key === attribute)!;
      return {
        key: `legendary-${attribute}-${target}`,
        difficulty: "legendary",
        icon: label.icon,
        title: legendaryAchievementNames[index],
        hint: {
          en: `Complete ${target} quests tied to ${label.name.en}`,
          zh: `完成 ${target} 个${label.name.zh}相关任务`,
        },
        unlocks: (stats) => stats.attributeCounts[attribute] >= target,
      };
    }
    if (index < 20) {
      const target = (index - 14) * 1000 + 3000;
      return {
        key: `legendary-xp-${target}`,
        difficulty: "legendary",
        icon: "✧",
        title: legendaryAchievementNames[index],
        hint: {
          en: `Earn ${target} total XP`,
          zh: `累计获得 ${target} XP`,
        },
        unlocks: (stats) => stats.totalXp >= target,
      };
    }
    const target = (index - 19) * 30;
    return {
      key: `legendary-days-${target}`,
      difficulty: "legendary",
      icon: "○",
      title: legendaryAchievementNames[index],
      hint: {
        en: `Complete quests on ${target} different days`,
        zh: `在 ${target} 个不同日期完成任务`,
      },
      unlocks: (stats) => stats.activeDays >= target,
    };
  },
);

const achievementCatalog: AchievementDefinition[] = [
  ...starterAchievements,
  ...steadyAchievements,
  ...boldAchievements,
  ...legendaryAchievements,
];

const seedTasks: Task[] = [
  {
    id: "seed-movement",
    title: "Morning movement",
    xp: 30,
    done: true,
    kind: "daily",
    attribute: "vitality",
    isMainQuest: false,
    date: "",
    completedAt: "2026-09-16T07:30:00.000Z",
    createdAt: "2026-09-15T20:00:00.000Z",
  } as Task,
  {
    id: "seed-reading",
    title: "Read for 20 minutes",
    xp: 20,
    done: true,
    kind: "habit",
    attribute: "growth",
    isMainQuest: false,
    date: "",
    completedAt: "2026-09-16T08:00:00.000Z",
    createdAt: "2026-09-15T20:00:00.000Z",
  } as Task,
  {
    id: "seed-deep-work",
    title: "Deep work: Life Dashboard",
    xp: 50,
    done: false,
    kind: "one_off",
    attribute: "focus",
    isMainQuest: true,
    date: "",
    completedAt: null,
    createdAt: "2026-09-16T08:30:00.000Z",
  } as Task,
  {
    id: "seed-call",
    title: "Call someone you love",
    xp: 20,
    done: false,
    kind: "habit",
    attribute: "connection",
    isMainQuest: false,
    date: "",
    completedAt: null,
    createdAt: "2026-09-16T09:00:00.000Z",
  } as Task,
  {
    id: "seed-plan",
    title: "Plan tomorrow",
    xp: 10,
    done: false,
    kind: "daily",
    attribute: "order",
    isMainQuest: false,
    date: "",
    completedAt: null,
    createdAt: "2026-09-16T09:15:00.000Z",
  } as Task,
];

const questTranslations: Record<string, { en: string; zh: string }> = {
  "seed-movement": { en: "Morning movement", zh: "晨间运动" },
  "seed-reading": { en: "Read for 20 minutes", zh: "阅读 20 分钟" },
  "seed-deep-work": {
    en: "Deep work: Life Dashboard",
    zh: "深度工作：Life Dashboard",
  },
  "seed-call": { en: "Call someone you love", zh: "给重要的人打个电话" },
  "seed-plan": { en: "Plan tomorrow", zh: "规划明天" },
};

const copy = {
  en: {
    date: "TUESDAY · SEPTEMBER 16",
    greeting: (name: string) => `Good evening, ${name}`,
    focus: "Focus mode",
    exitFocus: "Exit focus",
    focusSession: "FOCUS SESSION",
    focusHint: "One quest. One clear block of time.",
    focusPause: "Pause",
    focusResume: "Resume",
    focusEnd: "End session",
    focusComplete: "Complete & finish",
    focusToday: "Focused today",
    focusSessions: "sessions",
    focusNoTask: "Add an unfinished quest before starting focus mode.",
    focusSaved: (minutes: number) => `${minutes} focused minute${minutes === 1 ? "" : "s"} recorded.`,
    focusEnded: "Focus session ended. Very short sessions are not added to your stats.",
    mainQuest: "TODAY'S MAIN QUEST",
    mainHint: (xp: number) =>
      `One meaningful step is enough. You'll earn +${xp} XP when you complete it.`,
    complete: "Complete quest",
    completed: "Completed",
    change: "Change",
    currentLevel: "CURRENT LEVEL",
    wayfinder: "Wayfinder",
    xpUntil: (xp: number, level: number) => `${xp} XP until Level ${level}`,
    nextRankAt: (rank: string, level: number) => `${rank} unlocks at Level ${level}`,
    maxRank: "Highest known rank reached",
    currentStreak: "CURRENT STREAK",
    days: "days",
    streakHint: "You're building a rhythm. Keep it alive.",
    personalStats: "PERSONAL STATS",
    attributes: "Attributes",
    history: "View history →",
    historyTitle: "Attribute history",
    historySubtitle: "See where each attribute earned its XP.",
    historyEmpty: "Complete a quest for this attribute to reveal its history.",
    historyClose: "Close history",
    completedOn: "Completed",
    weekRange: "7 days",
    monthRange: "30 days",
    periodXp: "XP in period",
    activeDaysLabel: "Active days",
    xpSources: "XP sources",
    thisWeek: "THIS WEEK",
    balance: "Balance",
    week: "Week ▾",
    insightEyebrow: "A SMALL INSIGHT FOR THIS WEEK",
    insightTitle: "Your focus is strong. Make room for connection.",
    insightText:
      "You've invested most of your recent XP in Focus and Growth. Try a 10-minute Connection quest tomorrow — a message, a call, or a shared walk is enough.",
    questDate: "SEPTEMBER 16",
    quests: "Today's quests",
    completeCount: (done: number, total: number) => `${done}/${total} complete`,
    addQuest: "Add a new quest",
    explorer: (level: number) => `Level ${level} explorer`,
    switchTo: "切换到中文",
    navDashboard: "Dashboard",
    navQuests: "Daily quests",
    navAttributes: "Attributes",
    navAchievements: "Achievements",
    navReview: "Weekly review",
    tabTitles: { dashboard: "Dashboard", quests: "Daily quests", attributes: "Life attributes", achievements: "Achievements", review: "Weekly review" } as Record<TabKey, string>,
    mainQuestTitle: "Today's main quest",
    settings: "Settings",
    settingsTitle: "Your space",
    settingsSubtitle: "Keep your profile and local progress under your control.",
    profileName: "Display name",
    profession: "Choose your class",
    professionHint: "Your class changes your ranks and visual identity, not your XP rules.",
    professionPreview: "Class preview",
    currentRankLabel: "Current rank",
    rankPath: "Rank path",
    rankUnlocked: "Unlocked",
    rankUnlockLevel: (level: number) => `Level ${level}`,
    saveProfile: "Save profile",
    dataControl: "Data control",
    localArchive: "Local archive",
    localArchiveHint:
      "Choose a folder for a readable backup file and one daily recovery copy.",
    chooseFolder: "Choose folder",
    changeFolder: "Change folder",
    saveNow: "Save now",
    restoreFromFolder: "Restore from folder",
    autoSave: "Automatically sync changes to this folder",
    archiveNotConnected: "No folder connected",
    archiveNotConnectedHint: "Your browser storage is still working normally.",
    archiveConnected: "Connected",
    archivePermissionNeeded: "Permission needed",
    archiveUnsupported: "Folder access is unavailable",
    archiveUnsupportedHint: "Use Export JSON and Import JSON in this browser.",
    archiveSaving: "Saving",
    archiveSaved: "Saved",
    archiveError: "Save failed",
    archiveFileHint: "life-dashboard-save.json · daily backups",
    folderConnected: (name: string) => `${name} is now your archive folder.`,
    fileSaved: "Progress saved to your archive folder.",
    fileRestored: "Progress restored from your archive file.",
    archiveFailure: "The local archive could not be accessed. Please reconnect the folder.",
    archiveMissing: "No life-dashboard-save.json file was found in this folder.",
    restoreFolderConfirm: "Replace current progress with the archive file?",
    exportData: "Export JSON",
    importData: "Import JSON",
    restoreDemo: "Restore demo data",
    restorePrevious: "Restore pre-demo backup",
    clearData: "Clear all data",
    exportReady: "A backup file is ready to download.",
    importReady: "Backup imported successfully.",
    profileSaved: "Profile saved.",
    demoRestored: "Demo data restored.",
    demoRestoreConfirm: "Replace current progress with demo data? A local recovery backup will be created first.",
    demoBackupCreated: "Demo data restored. Your previous progress was backed up locally.",
    previousRestoreConfirm: "Restore the progress saved before demo data was loaded?",
    previousRestored: "Your pre-demo progress has been restored.",
    cleared: "All local data cleared.",
    invalidImport: "That file is not a valid Life Dashboard backup.",
    clearDataConfirm: "Clear all quests and progress from this device?",
    achievementsTitle: "Achievements",
    achievementsEyebrow: "SMALL WINS, REMEMBERED",
    unlocked: "Unlocked",
    locked: "Keep going",
    firstStep: "First step",
    firstStepHint: "Complete your first quest",
    weekWarrior: "Week warrior",
    weekWarriorHint: "Show up on 3 different days",
    xpHunter: "XP hunter",
    xpHunterHint: "Earn 100 XP",
    mainQuestHero: "Main quest hero",
    mainQuestHeroHint: "Complete a main quest",
    weeklyReviewTitle: "Weekly review",
    weeklyReviewEyebrow: "A USEFUL LOOK BACK",
    weeklyReviewSummary: (days: number, xp: number) => `${days} active days · ${xp} XP earned`,
    weeklyReviewAction: (attribute: string) => `Your strongest signal is ${attribute}. Give ${attribute} one more intentional action next week.`,
    completionRate: "Completion rate",
    mostActive: "Most active",
    neglected: "Needs attention",
    versusLastWeek: "vs previous period",
    periodUp: (value: number) => `${value}% more XP than before`,
    periodDown: (value: number) => `${value}% less XP than before`,
    periodSame: "XP is steady with the previous period",
    emptyReview: "Complete a quest to start your weekly review.",
    loading: "Loading your saved progress…",
    saveNote: (xp: number) =>
      `Today you earned ${xp} XP. Your progress is saved on this device.`,
    newQuest: "New quest",
    editQuest: "Edit quest",
    titleLabel: "Task title",
    titlePlaceholder: "What would move your life forward?",
    kindLabel: "Type",
    xpLabel: "XP reward",
    attributeLabel: "Attribute",
    mainToggle: "Set as today's main quest",
    cancel: "Cancel",
    save: "Save quest",
    delete: "Delete",
    deleteConfirm: "Delete this quest? This cannot be undone.",
    taskUnchecked: "Quest completion removed.",
    undo: "Undo",
    noTasks: "No quests yet",
    noTasksHint: "Add one small action to start your day.",
    kind: { daily: "Daily", habit: "Habit", one_off: "One-off" } as Record<
      QuestKind,
      string
    >,
    attributeNames: {
      vitality: "Vitality",
      focus: "Focus",
      connection: "Connection",
      growth: "Growth",
      order: "Order",
    } as Record<AttributeKey, string>,
  },
  zh: {
    date: "星期二 · 9月16日",
    greeting: (name: string) => `晚上好，${name}`,
    focus: "专注模式",
    exitFocus: "退出专注",
    focusSession: "专注会话",
    focusHint: "一次只做一个任务，让时间变得清晰。",
    focusPause: "暂停",
    focusResume: "继续",
    focusEnd: "结束专注",
    focusComplete: "完成任务并结束",
    focusToday: "今日专注",
    focusSessions: "次会话",
    focusNoTask: "请先添加一个未完成任务，再开始专注模式。",
    focusSaved: (minutes: number) => `已记录 ${minutes} 分钟专注时间。`,
    focusEnded: "专注已结束，过短的测试会话不会计入统计。",
    mainQuest: "今日主线任务",
    mainHint: (xp: number) => `完成这一步就很好。完成后将获得 +${xp} XP。`,
    complete: "完成任务",
    completed: "已完成",
    change: "更换",
    currentLevel: "当前等级",
    wayfinder: "探索者",
    xpUntil: (xp: number, level: number) => `距离等级 ${level} 还差 ${xp} XP`,
    nextRankAt: (rank: string, level: number) => `等级 ${level} 解锁称号「${rank}」`,
    maxRank: "已达到当前最高职业称号",
    currentStreak: "连续打卡",
    days: "天",
    streakHint: "节奏正在形成，继续保持。",
    personalStats: "个人属性",
    attributes: "属性",
    history: "查看历史 →",
    historyTitle: "属性历史",
    historySubtitle: "查看五项属性的变化趋势和 XP 来源。",
    historyEmpty: "完成一个关联此属性的任务后，历史会出现在这里。",
    historyClose: "关闭历史",
    completedOn: "完成于",
    weekRange: "近 7 天",
    monthRange: "近 30 天",
    periodXp: "周期 XP",
    activeDaysLabel: "活跃天数",
    xpSources: "XP 来源",
    thisWeek: "本周状态",
    balance: "平衡度",
    week: "本周 ▾",
    insightEyebrow: "本周的一点洞察",
    insightTitle: "专注力很强，也给连接留一点空间。",
    insightText:
      "你最近的大部分 XP 都投入在专注和成长上。明天试试一个 10 分钟的连接任务：发条消息、打个电话，或一起散步。",
    questDate: "9月16日",
    quests: "今日任务",
    completeCount: (done: number, total: number) => `${done}/${total} 已完成`,
    addQuest: "添加新任务",
    explorer: (level: number) => `等级 ${level} 探索者`,
    switchTo: "Switch to English",
    navDashboard: "仪表盘",
    navQuests: "今日任务",
    navAttributes: "人生属性",
    navAchievements: "成就",
    navReview: "每周回顾",
    tabTitles: { dashboard: "仪表盘", quests: "今日任务", attributes: "人生属性", achievements: "成就", review: "每周回顾" } as Record<TabKey, string>,
    mainQuestTitle: "今日主线任务",
    settings: "设置",
    settingsTitle: "你的空间",
    settingsSubtitle: "管理昵称和本地进度，数据始终由你掌控。",
    profileName: "显示昵称",
    profession: "选择职业",
    professionHint: "职业会改变称号与视觉身份，但不会改变 XP 规则。",
    professionPreview: "职业预览",
    currentRankLabel: "当前称号",
    rankPath: "晋阶路线",
    rankUnlocked: "已解锁",
    rankUnlockLevel: (level: number) => `等级 ${level}`,
    saveProfile: "保存资料",
    dataControl: "数据管理",
    localArchive: "本地存档",
    localArchiveHint: "选择一个文件夹，保存可读取的主存档，并每天保留一份恢复备份。",
    chooseFolder: "选择存档文件夹",
    changeFolder: "更换文件夹",
    saveNow: "立即保存",
    restoreFromFolder: "从存档恢复",
    autoSave: "数据变化时自动同步到此文件夹",
    archiveNotConnected: "尚未连接文件夹",
    archiveNotConnectedHint: "浏览器本地存储仍在正常工作。",
    archiveConnected: "已连接",
    archivePermissionNeeded: "需要重新授权",
    archiveUnsupported: "当前浏览器不支持文件夹存档",
    archiveUnsupportedHint: "你仍可使用下方的导出与导入 JSON。",
    archiveSaving: "正在保存",
    archiveSaved: "已保存",
    archiveError: "保存失败",
    archiveFileHint: "life-dashboard-save.json · 每日备份",
    folderConnected: (name: string) => `已将“${name}”设为存档文件夹。`,
    fileSaved: "进度已保存到本地存档文件夹。",
    fileRestored: "已从本地存档恢复进度。",
    archiveFailure: "无法访问本地存档，请重新授权或更换文件夹。",
    archiveMissing: "该文件夹中没有找到 life-dashboard-save.json。",
    restoreFolderConfirm: "确定用本地存档覆盖当前进度吗？",
    exportData: "导出 JSON",
    importData: "导入 JSON",
    restoreDemo: "恢复演示数据",
    restorePrevious: "恢复演示前数据",
    clearData: "清空全部数据",
    exportReady: "备份文件已准备下载。",
    importReady: "备份导入成功。",
    profileSaved: "个人资料已保存。",
    demoRestored: "演示数据已恢复。",
    demoRestoreConfirm: "确定用演示数据覆盖当前进度吗？系统会先创建一份本地恢复备份。",
    demoBackupCreated: "演示数据已恢复，原有进度已自动备份到本地。",
    previousRestoreConfirm: "确定恢复加载演示数据之前的进度吗？",
    previousRestored: "已恢复加载演示数据之前的进度。",
    cleared: "本地数据已清空。",
    invalidImport: "这个文件不是有效的 Life Dashboard 备份。",
    clearDataConfirm: "确定要清空此设备上的所有任务和进度吗？",
    achievementsTitle: "成就",
    achievementsEyebrow: "记住每一次小胜利",
    unlocked: "已解锁",
    locked: "继续积累",
    firstStep: "第一步",
    firstStepHint: "完成你的第一个任务",
    weekWarrior: "一周战士",
    weekWarriorHint: "在 3 个不同日期完成任务",
    xpHunter: "XP 收集者",
    xpHunterHint: "累计获得 100 XP",
    mainQuestHero: "主线英雄",
    mainQuestHeroHint: "完成一个主线任务",
    weeklyReviewTitle: "每周回顾",
    weeklyReviewEyebrow: "看看这周留下了什么",
    weeklyReviewSummary: (days: number, xp: number) => `${days} 个活跃日 · 获得 ${xp} XP`,
    weeklyReviewAction: (attribute: string) => `本周最强信号是「${attribute}」。下周再为它安排一个有意识的行动。`,
    completionRate: "任务完成率",
    mostActive: "最常投入",
    neglected: "需要关注",
    versusLastWeek: "对比上一周期",
    periodUp: (value: number) => `XP 比上一周期增加 ${value}%`,
    periodDown: (value: number) => `XP 比上一周期减少 ${value}%`,
    periodSame: "XP 与上一周期基本持平",
    emptyReview: "完成一个任务后，这里会出现你的每周回顾。",
    loading: "正在加载你的进度…",
    saveNote: (xp: number) => `今天获得了 ${xp} XP。进度已保存在此设备。`,
    newQuest: "新任务",
    editQuest: "编辑任务",
    titleLabel: "任务名称",
    titlePlaceholder: "什么行动能让生活向前一点？",
    kindLabel: "类型",
    xpLabel: "XP 奖励",
    attributeLabel: "关联属性",
    mainToggle: "设为今日主线任务",
    cancel: "取消",
    save: "保存任务",
    delete: "删除",
    deleteConfirm: "确认删除这个任务吗？此操作无法撤销。",
    taskUnchecked: "已取消任务完成状态。",
    undo: "撤销",
    noTasks: "还没有任务",
    noTasksHint: "添加一个小行动，开始今天。",
    kind: { daily: "每日", habit: "习惯", one_off: "一次性" } as Record<
      QuestKind,
      string
    >,
    attributeNames: {
      vitality: "活力",
      focus: "专注",
      connection: "连接",
      growth: "成长",
      order: "秩序",
    } as Record<AttributeKey, string>,
  },
};

function getBrowserStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}
function supportsDirectoryArchive() {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}
function openArchiveDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(ARCHIVE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(ARCHIVE_DB_STORE)) {
        database.createObjectStore(ARCHIVE_DB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function storeArchiveHandle(handle: LocalDirectoryHandle) {
  const database = await openArchiveDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(ARCHIVE_DB_STORE, "readwrite");
    transaction.objectStore(ARCHIVE_DB_STORE).put(handle, ARCHIVE_HANDLE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  database.close();
}
async function loadArchiveHandle(): Promise<LocalDirectoryHandle | null> {
  try {
    const database = await openArchiveDatabase();
    const handle = await new Promise<LocalDirectoryHandle | null>((resolve, reject) => {
      const transaction = database.transaction(ARCHIVE_DB_STORE, "readonly");
      const request = transaction.objectStore(ARCHIVE_DB_STORE).get(ARCHIVE_HANDLE_KEY);
      request.onsuccess = () => resolve((request.result as LocalDirectoryHandle | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return handle;
  } catch {
    return null;
  }
}
async function writeTextFile(handle: LocalFileHandle, contents: string) {
  const writable = await handle.createWritable();
  await writable.write(contents);
  await writable.close();
}
async function writeArchiveData(
  directory: LocalDirectoryHandle,
  data: AppData,
  date: string,
) {
  const contents = JSON.stringify(data, null, 2);
  const mainFile = await directory.getFileHandle(ARCHIVE_FILE_NAME, { create: true });
  await writeTextFile(mainFile, contents);
  const backupDirectory = await directory.getDirectoryHandle("backups", { create: true });
  const dailyFile = await backupDirectory.getFileHandle(`${date}.json`, { create: true });
  await writeTextFile(dailyFile, contents);
}
function isNamedError(error: unknown, name: string) {
  return error instanceof DOMException && error.name === name;
}
function dateKeyFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function todayKey() {
  return dateKeyFromDate(new Date());
}
function localDateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}
function daysBetween(laterKey: string, earlierKey: string) {
  return Math.round(
    (localDateFromKey(laterKey).getTime() -
      localDateFromKey(earlierKey).getTime()) /
      86_400_000,
  );
}
function isRecentCompletion(task: Task, today: string, days = 7, offset = 0) {
  if (!task.completedAt) return false;
  const completedKey = dateKeyFromDate(new Date(task.completedAt));
  const distance = daysBetween(today, completedKey);
  return distance >= offset && distance < offset + days;
}
function earnedXp(task: Task) {
  return task.xp + (task.isMainQuest ? 10 : 0);
}
function levelThreshold(level: number) {
  const steps = Math.max(0, level - 1);
  return 200 * steps + 50 * steps * (steps - 1);
}
function getLevelState(totalXp: number) {
  let level = 1;
  while (totalXp >= levelThreshold(level + 1)) level += 1;
  const floor = levelThreshold(level);
  const ceiling = levelThreshold(level + 1);
  const progress = totalXp - floor;
  const span = ceiling - floor;
  return {
    level,
    progress,
    span,
    percent: Math.min(100, Math.round((progress / span) * 100)),
    remaining: Math.max(0, ceiling - totalXp),
  };
}
function getProfessionRank(profession: ProfessionKey, level: number, locale: Locale) {
  const ranks = professionCatalog[profession].ranks;
  const current = [...ranks].reverse().find((rank) => level >= rank.level) ?? ranks[0];
  const next = ranks.find((rank) => rank.level > level);
  return {
    current: current[locale],
    next: next ? { name: next[locale], level: next.level } : null,
  };
}
function formatFocusDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;
  return [hours, minutes, remainder]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}
function normalizeTask(
  task: Partial<Task> & { label?: string; done?: boolean },
  index: number,
  date: string,
): Task {
  const allowedXp = [10, 20, 30, 50] as const;
  const xp = allowedXp.includes(task.xp as 10 | 20 | 30 | 50)
    ? (task.xp as 10 | 20 | 30 | 50)
    : 20;
  const attribute = attributeKeys.includes(task.attribute as AttributeKey)
    ? (task.attribute as AttributeKey)
    : "focus";
  const kind = ["daily", "habit", "one_off"].includes(task.kind as string)
    ? (task.kind as QuestKind)
    : "habit";
  return {
    id: String(task.id ?? `task-${Date.now()}-${index}`),
    title: String(task.title ?? task.label ?? "New quest"),
    kind,
    xp,
    attribute,
    date: task.date || date,
    isMainQuest: Boolean(task.isMainQuest),
    completedAt:
      task.completedAt ?? (task.done ? new Date().toISOString() : null),
    createdAt: task.createdAt ?? new Date().toISOString(),
  };
}
function addRecurringTasksForToday(tasks: Task[], date: string): Task[] {
  // A recurring task has one stable root and one dated instance per day. Only
  // clone roots so reloading across several days cannot create clone chains.
  const recurringRoots = tasks.filter(
    (task) =>
      task.date !== date &&
      (task.kind === "daily" || task.kind === "habit") &&
      !task.id.includes(":"),
  );
  const copies = recurringRoots
    .filter(
      (task) =>
        !tasks.some((candidate) => candidate.id === `${task.id}:${date}`),
    )
    .map((task) => ({
      ...task,
      id: `${task.id}:${date}`,
      date,
      isMainQuest: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
    }));
  return copies.length ? [...tasks, ...copies] : tasks;
}
function starterData(date: string): AppData {
  return {
    version: 1,
    profile: {
      name: "Starlight",
      createdAt: new Date().toISOString(),
      profession: "wayfinder",
    },
    tasks: seedTasks.map((task, index) => normalizeTask(task, index, date)),
    focusLogs: [],
  };
}
function readAppData(date: string): AppData {
  const storage = getBrowserStorage();
  const saved = storage?.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as Partial<AppData>;
      if (parsed.version === 1 && Array.isArray(parsed.tasks)) {
        const tasks = parsed.tasks.map((task, index) =>
          normalizeTask(task, index, date),
        );
        return {
          version: 1,
          profile: parsed.profile ?? {
            name: "Starlight",
            createdAt: new Date().toISOString(),
            profession: "wayfinder",
          },
          tasks: addRecurringTasksForToday(tasks, date),
          focusLogs: Array.isArray(parsed.focusLogs)
            ? parsed.focusLogs.filter(isValidFocusLog)
            : [],
        };
      }
    } catch {
      storage?.setItem(`${STORAGE_KEY}:backup:${Date.now()}`, saved);
    }
  }
  const legacy = storage?.getItem(LEGACY_KEY);
  if (legacy) {
    try {
      const parsed = JSON.parse(legacy) as Partial<Task>[];
      const tasks = parsed.map((task, index) =>
        normalizeTask(task, index, date),
      );
      return {
        version: 1,
        profile: {
          name: "Starlight",
          createdAt: new Date().toISOString(),
          profession: "wayfinder",
        },
        tasks: addRecurringTasksForToday(tasks, date),
        focusLogs: [],
      };
    } catch {
      storage?.setItem(`${LEGACY_KEY}:backup:${Date.now()}`, legacy);
    }
  }
  return starterData(date);
}
function formatToday(locale: Locale, date = new Date()) {
  const weekday = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    weekday: "long",
  }).format(date);
  const monthDay = new Intl.DateTimeFormat(
    locale === "zh" ? "zh-CN" : "en-US",
    { month: "long", day: "numeric" },
  ).format(date);
  return locale === "zh"
    ? `${weekday} · ${monthDay}`
    : `${weekday.toUpperCase()} · ${monthDay.toUpperCase()}`;
}
function formatTodayShort(locale: Locale, date = new Date()) {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    month: "long",
    day: "numeric",
  }).format(date);
}
function isTabKey(value: string): value is TabKey {
  return ["dashboard", "quests", "attributes", "achievements", "review"].includes(value);
}

function isValidTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const task = value as Partial<Task>;
  return (
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    ["daily", "habit", "one_off"].includes(task.kind as string) &&
    [10, 20, 30, 50].includes(task.xp as number) &&
    attributeKeys.includes(task.attribute as AttributeKey) &&
    typeof task.date === "string" &&
    typeof task.isMainQuest === "boolean" &&
    (task.completedAt === null || typeof task.completedAt === "string") &&
    typeof task.createdAt === "string"
  );
}

function isValidFocusLog(value: unknown): value is FocusLog {
  if (!value || typeof value !== "object") return false;
  const log = value as Partial<FocusLog>;
  return (
    typeof log.id === "string" &&
    typeof log.taskId === "string" &&
    typeof log.taskTitle === "string" &&
    typeof log.startedAt === "string" &&
    typeof log.endedAt === "string" &&
    typeof log.durationSeconds === "number" &&
    Number.isFinite(log.durationSeconds) &&
    log.durationSeconds >= 0
  );
}

function isValidFocusSession(value: unknown): value is FocusSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<FocusSession>;
  return (
    typeof session.taskId === "string" &&
    typeof session.taskTitle === "string" &&
    typeof session.startedAt === "string" &&
    typeof session.accumulatedSeconds === "number" &&
    (session.resumedAt === null || typeof session.resumedAt === "number") &&
    (session.status === "running" || session.status === "paused")
  );
}

function parseImportedData(value: unknown, date: string): AppData | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<AppData>;
  if (
    candidate.version !== 1 ||
    !candidate.profile ||
    typeof candidate.profile.name !== "string" ||
    typeof candidate.profile.createdAt !== "string" ||
    !Array.isArray(candidate.tasks) ||
    !candidate.tasks.every(isValidTask)
  ) {
    return null;
  }
  return {
    version: 1,
    profile: {
      name: candidate.profile.name.trim() || "Starlight",
      createdAt: candidate.profile.createdAt || new Date().toISOString(),
      profession: professionKeys.includes(candidate.profile.profession as ProfessionKey)
        ? (candidate.profile.profession as ProfessionKey)
        : "wayfinder",
    },
    tasks: addRecurringTasksForToday(candidate.tasks, date),
    focusLogs: Array.isArray(candidate.focusLogs)
      ? candidate.focusLogs.filter(isValidFocusLog)
      : [],
  };
}

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [locale, setLocale] = useState<Locale>("en");
  const [ready, setReady] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyAttribute, setHistoryAttribute] = useState<AttributeKey>("focus");
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>("week");
  const [focusMode, setFocusMode] = useState(false);
  const [focusSession, setFocusSession] = useState<FocusSession | null>(null);
  const [focusLogs, setFocusLogs] = useState<FocusLog[]>([]);
  const [focusNow, setFocusNow] = useState(() => Date.now());
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [achievementFilter, setAchievementFilter] = useState<
    AchievementDifficulty | "all"
  >("all");
  const [profileName, setProfileName] = useState("Starlight");
  const [profileDraft, setProfileDraft] = useState("Starlight");
  const [profileCreatedAt, setProfileCreatedAt] = useState(() => new Date().toISOString());
  const [profession, setProfession] = useState<ProfessionKey>("wayfinder");
  const [professionDraft, setProfessionDraft] = useState<ProfessionKey>("wayfinder");
  const [notice, setNotice] = useState<{ tone: NoticeTone; message: string } | null>(null);
  const [undoTask, setUndoTask] = useState<{ taskId: string; completedAt: string } | null>(null);
  const [appToast, setAppToast] = useState<string | null>(null);
  const [archiveHandle, setArchiveHandle] = useState<LocalDirectoryHandle | null>(null);
  const [archiveStatus, setArchiveStatus] = useState<ArchiveStatus>("not_connected");
  const [archiveAutoSave, setArchiveAutoSave] = useState(false);
  const [hasDemoBackup, setHasDemoBackup] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const undoTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [draft, setDraft] = useState<Draft>({
    title: "",
    kind: "habit",
    xp: 20,
    attribute: "focus",
    isMainQuest: false,
  });
  const t = {
    ...copy[locale],
    date: formatToday(locale),
    questDate: formatTodayShort(locale),
  };
  const today = todayKey();

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (isTabKey(hash)) setActiveTab(hash);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  useEffect(() => {
    const data = readAppData(today);
    setTasks(data.tasks);
    setProfileName(data.profile.name || "Starlight");
    setProfileDraft(data.profile.name || "Starlight");
    setProfileCreatedAt(data.profile.createdAt || new Date().toISOString());
    const savedProfession = professionKeys.includes(data.profile.profession as ProfessionKey)
      ? (data.profile.profession as ProfessionKey)
      : "wayfinder";
    setProfession(savedProfession);
    setProfessionDraft(savedProfession);
    setFocusLogs(data.focusLogs ?? []);
    const storage = getBrowserStorage();
    const savedSession = storage?.getItem(FOCUS_SESSION_KEY);
    if (savedSession) {
      try {
        const parsedSession = JSON.parse(savedSession) as unknown;
        if (isValidFocusSession(parsedSession)) setFocusSession(parsedSession);
      } catch {
        storage?.removeItem(FOCUS_SESSION_KEY);
      }
    }
    const savedLocale = storage?.getItem("life-dashboard-locale");
    if (savedLocale === "en" || savedLocale === "zh") setLocale(savedLocale);
    setArchiveAutoSave(
      storage?.getItem(ARCHIVE_AUTOSAVE_KEY) === "true",
    );
    setHasDemoBackup(Boolean(storage?.getItem(DEMO_BACKUP_KEY)));
    setReady(true);
  }, [today]);

  useEffect(() => {
    let cancelled = false;
    if (!supportsDirectoryArchive()) {
      setArchiveStatus("unsupported");
      return;
    }
    void loadArchiveHandle().then(async (handle) => {
      if (cancelled || !handle) return;
      setArchiveHandle(handle);
      try {
        const permission = await handle.queryPermission({ mode: "readwrite" });
        if (!cancelled) {
          setArchiveStatus(permission === "granted" ? "connected" : "permission_needed");
        }
      } catch {
        if (!cancelled) setArchiveStatus("error");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const storage = getBrowserStorage();
    if (ready) {
      const data: AppData = {
        version: 1,
        profile: {
          name: profileName || "Starlight",
          createdAt: profileCreatedAt,
          profession,
        },
        tasks,
        focusLogs,
      };
      storage?.setItem(STORAGE_KEY, JSON.stringify(data));
      storage?.setItem("life-dashboard-locale", locale);
      storage?.setItem(ARCHIVE_AUTOSAVE_KEY, String(archiveAutoSave));
    }
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [tasks, locale, profileName, profileCreatedAt, profession, focusLogs, archiveAutoSave, ready]);

  useEffect(() => {
    const storage = getBrowserStorage();
    if (!ready) return;
    if (focusSession) storage?.setItem(FOCUS_SESSION_KEY, JSON.stringify(focusSession));
    else storage?.removeItem(FOCUS_SESSION_KEY);
  }, [focusSession, ready]);

  const currentAppData = useMemo<AppData>(
    () => ({
      version: 1,
      profile: {
        name: profileName.trim() || "Starlight",
        createdAt: profileCreatedAt,
        profession,
      },
      tasks,
      focusLogs,
    }),
    [profileName, profileCreatedAt, profession, tasks, focusLogs],
  );

  useEffect(() => {
    if (!ready || !archiveAutoSave || !archiveHandle) return;
    const timeout = window.setTimeout(() => {
      void archiveHandle
        .queryPermission({ mode: "readwrite" })
        .then(async (permission) => {
          if (permission !== "granted") {
            setArchiveStatus("permission_needed");
            return;
          }
          setArchiveStatus("saving");
          await writeArchiveData(archiveHandle, currentAppData, today);
          setArchiveStatus("saved");
        })
        .catch(() => setArchiveStatus("error"));
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [archiveAutoSave, archiveHandle, currentAppData, ready, today]);

  useEffect(() => {
    if (focusSession?.status !== "running") return;
    setFocusNow(Date.now());
    const interval = window.setInterval(() => setFocusNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [focusSession?.status, focusSession?.resumedAt]);

  useEffect(
    () => () => {
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    },
    [],
  );

  const todayTasks = useMemo(
    () => tasks.filter((task) => task.date === today),
    [tasks, today],
  );
  const completedTaskItems = useMemo(
    () => tasks.filter((task) => task.completedAt),
    [tasks],
  );
  const activeDateKeys = useMemo(
    () =>
      new Set(
        completedTaskItems.map((task) =>
          dateKeyFromDate(new Date(task.completedAt!)),
        ),
      ),
    [completedTaskItems],
  );
  const currentStreak = useMemo(() => {
    let streak = 0;
    const cursor = localDateFromKey(today);
    if (!activeDateKeys.has(today)) cursor.setDate(cursor.getDate() - 1);
    while (activeDateKeys.has(dateKeyFromDate(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }, [activeDateKeys, today]);
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--life-streak",
      String(currentStreak),
    );
  }, [currentStreak]);
  const currentWeekStatus = useMemo(() => {
    const monday = localDateFromKey(today);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + index);
      return activeDateKeys.has(dateKeyFromDate(day));
    });
  }, [activeDateKeys, today]);
  const todayWeekIndex = (localDateFromKey(today).getDay() + 6) % 7;
  useEffect(() => {
    document
      .querySelectorAll<HTMLElement>(".week .day")
      .forEach((day, index) => {
        day.classList.toggle(
          "day--live-done",
          Boolean(currentWeekStatus[index]),
        );
        day.classList.toggle("day--live-today", index === todayWeekIndex);
      });
  }, [currentWeekStatus, todayWeekIndex]);
  const earnedToday = completedTaskItems
    .filter(
      (task) =>
        task.completedAt &&
        dateKeyFromDate(new Date(task.completedAt)) === today,
    )
    .reduce((sum, task) => sum + earnedXp(task), 0);
  const totalXp = completedTaskItems.reduce(
    (sum, task) => sum + earnedXp(task),
    0,
  );
  const levelState = getLevelState(totalXp);
  const { level } = levelState;
  const professionInfo = professionCatalog[profession];
  const professionRank = getProfessionRank(profession, level, locale);
  const rangeDays = analyticsRange === "week" ? 7 : 30;
  const periodCompletedTasks = completedTaskItems.filter((task) =>
    isRecentCompletion(task, today, rangeDays),
  );
  const previousPeriodTasks = completedTaskItems.filter((task) =>
    isRecentCompletion(task, today, rangeDays, rangeDays),
  );
  const periodTasks = tasks.filter((task) => {
    const distance = daysBetween(today, task.date);
    return distance >= 0 && distance < rangeDays;
  });
  const radarData = attributes.map((stat) => ({
    key: stat.key,
    attribute: stat.name[locale],
    value: Math.min(
      100,
      periodCompletedTasks
        .filter((task) => task.attribute === stat.key)
        .reduce((sum, task) => sum + earnedXp(task), 0),
    ),
  }));
  const weeklyCompletedTasks = periodCompletedTasks;
  const weeklyActiveDays = new Set(
    periodCompletedTasks.map((task) =>
      dateKeyFromDate(new Date(task.completedAt!)),
    ),
  ).size;
  const weeklyXp = periodCompletedTasks.reduce(
    (sum, task) => sum + earnedXp(task),
    0,
  );
  const previousPeriodXp = previousPeriodTasks.reduce(
    (sum, task) => sum + earnedXp(task),
    0,
  );
  const periodXpChange = previousPeriodXp === 0
    ? weeklyXp > 0
      ? 100
      : 0
    : Math.round(((weeklyXp - previousPeriodXp) / previousPeriodXp) * 100);
  const completionRate = periodTasks.length
    ? Math.round((periodTasks.filter((task) => task.completedAt).length / periodTasks.length) * 100)
    : 0;
  const strongestAttribute = [...radarData].sort((a, b) => b.value - a.value)[0];
  const neglectedAttribute = [...radarData].sort((a, b) => a.value - b.value)[0];
  const achievementDates = new Set(
    completedTaskItems.map((task) =>
      dateKeyFromDate(new Date(task.completedAt!)),
    ),
  );
  const dailyCompletionCounts = completedTaskItems.reduce<Map<string, number>>(
    (counts, task) => {
      const key = dateKeyFromDate(new Date(task.completedAt!));
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return counts;
    },
    new Map(),
  );
  const attributeCompletionCounts = attributeKeys.reduce(
    (counts, key) => {
      counts[key] = completedTaskItems.filter(
        (task) => task.attribute === key,
      ).length;
      return counts;
    },
    {} as Record<AttributeKey, number>,
  );
  const achievementStats: AchievementStats = {
    completedCount: completedTaskItems.length,
    totalXp,
    activeDays: achievementDates.size,
    mainQuestCount: completedTaskItems.filter((task) => task.isMainQuest).length,
    maxDailyCompleted: Math.max(0, ...dailyCompletionCounts.values()),
    attributeCounts: attributeCompletionCounts,
  };
  const achievements = achievementCatalog.map((achievement) => ({
    ...achievement,
    unlocked: achievement.unlocks(achievementStats),
  }));
  const visibleAchievements = achievements.filter(
    (achievement) =>
      achievementFilter === "all" || achievement.difficulty === achievementFilter,
  );
  const mainQuest =
    todayTasks.find((task) => task.isMainQuest) ??
    todayTasks.find((task) => !task.completedAt) ??
    todayTasks[0];
  const questLabel = (task: Task) =>
    questTranslations[task.id]?.[locale] ??
    questTranslations[task.id.split(":")[0]]?.[locale] ??
    Object.values(questTranslations).find(
      (translation) => translation.en === task.title,
    )?.[locale] ??
    task.title;
  const historyAttributeTasks = [...periodCompletedTasks]
    .filter((task) => task.attribute === historyAttribute)
    .sort(
      (a, b) =>
        new Date(b.completedAt!).getTime() -
        new Date(a.completedAt!).getTime(),
    );
  const historyItems = historyAttributeTasks.slice(0, 12);
  const historyChartData = Array.from({ length: rangeDays }, (_, index) => {
    const date = localDateFromKey(today);
    date.setDate(date.getDate() - (rangeDays - index - 1));
    const key = dateKeyFromDate(date);
    return {
      key,
      label: new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
        month: "numeric",
        day: "numeric",
      }).format(date),
      xp: periodCompletedTasks
        .filter(
          (task) =>
            task.attribute === historyAttribute &&
            task.completedAt &&
            dateKeyFromDate(new Date(task.completedAt)) === key,
        )
        .reduce((sum, task) => sum + earnedXp(task), 0),
    };
  });
  const historyXp = historyAttributeTasks.reduce((sum, task) => sum + earnedXp(task), 0);
  const historyActiveDays = new Set(
    historyAttributeTasks.map((task) => dateKeyFromDate(new Date(task.completedAt!))),
  ).size;
  const focusElapsed = focusSession
    ? focusSession.accumulatedSeconds +
      (focusSession.status === "running" && focusSession.resumedAt
        ? Math.floor((focusNow - focusSession.resumedAt) / 1000)
        : 0)
    : 0;
  const todayFocusLogs = focusLogs.filter(
    (log) => dateKeyFromDate(new Date(log.endedAt)) === today,
  );
  const todayFocusSeconds = todayFocusLogs.reduce(
    (sum, log) => sum + log.durationSeconds,
    0,
  ) + (focusSession ? focusElapsed : 0);
  const toggleTask = (id: string) => {
    const target = tasks.find((task) => task.id === id);
    if (target?.completedAt) {
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
      setUndoTask({ taskId: target.id, completedAt: target.completedAt });
      undoTimerRef.current = window.setTimeout(() => setUndoTask(null), 6000);
    }
    setTasks((items) =>
      items.map((task) =>
        task.id === id
          ? {
              ...task,
              completedAt: task.completedAt ? null : new Date().toISOString(),
            }
          : task,
      ),
    );
  };
  const undoTaskCompletion = () => {
    if (!undoTask) return;
    setTasks((items) =>
      items.map((task) =>
        task.id === undoTask.taskId
          ? { ...task, completedAt: undoTask.completedAt }
          : task,
      ),
    );
    setUndoTask(null);
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
  };
  const setMainQuest = (id: string) =>
    setTasks((items) =>
      items.map((task) => ({
        ...task,
        isMainQuest: task.date === today && task.id === id,
      })),
    );
  const openCreate = () => {
    setDraft({
      title: "",
      kind: "habit",
      xp: 20,
      attribute: "focus",
      isMainQuest: false,
    });
    setEditor({ mode: "create" });
  };
  const openEdit = (task: Task) => {
    setDraft({
      title: task.title,
      kind: task.kind,
      xp: task.xp,
      attribute: task.attribute,
      isMainQuest: task.isMainQuest,
    });
    setEditor({ mode: "edit", taskId: task.id });
  };
  const saveTask = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim()) return;
    if (editor?.mode === "edit" && editor.taskId)
      setTasks((items) =>
        items.map((task) =>
          task.id === editor.taskId
            ? {
                ...task,
                title: draft.title.trim(),
                kind: draft.kind,
                xp: draft.xp,
                attribute: draft.attribute,
                isMainQuest: draft.isMainQuest,
              }
            : draft.isMainQuest && task.date === today
              ? { ...task, isMainQuest: false }
              : task,
        ),
      );
    else {
      const id = `task-${Date.now()}`;
      setTasks((items) => [
        ...items.map((task) =>
          draft.isMainQuest && task.date === today
            ? { ...task, isMainQuest: false }
            : task,
        ),
        {
          id,
          title: draft.title.trim(),
          kind: draft.kind,
          xp: draft.xp,
          attribute: draft.attribute,
          date: today,
          isMainQuest: draft.isMainQuest,
          completedAt: null,
          createdAt: new Date().toISOString(),
        },
      ]);
    }
    setEditor(null);
  };
  const deleteTask = (id: string) => {
    if (window.confirm(t.deleteConfirm)) {
      setTasks((items) => items.filter((task) => task.id !== id));
      setEditor(null);
    }
  };
  const showAppToast = (message: string) => {
    setAppToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setAppToast(null), 5000);
  };
  const openSettings = () => {
    setProfileDraft(profileName);
    setProfessionDraft(profession);
    setNotice(null);
    setSettingsOpen(true);
  };
  const openHistory = (attribute: AttributeKey = strongestAttribute?.key ?? "focus") => {
    setHistoryAttribute(attribute);
    setHistoryOpen(true);
  };
  const startFocusSession = () => {
    if (focusSession) {
      setFocusMode(true);
      navigateTab("quests");
      return;
    }
    const target =
      todayTasks.find((task) => task.isMainQuest && !task.completedAt) ??
      todayTasks.find((task) => !task.completedAt);
    if (!target) {
      navigateTab("quests");
      showAppToast(t.focusNoTask);
      return;
    }
    const startedAt = new Date().toISOString();
    setFocusSession({
      taskId: target.id,
      taskTitle: questLabel(target),
      startedAt,
      accumulatedSeconds: 0,
      resumedAt: Date.now(),
      status: "running",
    });
    setFocusNow(Date.now());
    setFocusMode(true);
    navigateTab("quests");
  };
  const toggleFocusMode = () => {
    if (focusMode) setFocusMode(false);
    else startFocusSession();
  };
  const pauseFocusSession = () => {
    if (!focusSession) return;
    if (focusSession.status === "running") {
      setFocusSession({
        ...focusSession,
        accumulatedSeconds: focusElapsed,
        resumedAt: null,
        status: "paused",
      });
    } else {
      setFocusSession({
        ...focusSession,
        resumedAt: Date.now(),
        status: "running",
      });
      setFocusNow(Date.now());
    }
  };
  const finishFocusSession = (completeTask: boolean) => {
    if (!focusSession) return;
    const endedAt = new Date().toISOString();
    const shouldRecord = focusElapsed >= 60;
    if (shouldRecord) {
      setFocusLogs((logs) => [
        ...logs,
        {
          id: `focus-${Date.now()}`,
          taskId: focusSession.taskId,
          taskTitle: focusSession.taskTitle,
          startedAt: focusSession.startedAt,
          endedAt,
          durationSeconds: focusElapsed,
        },
      ]);
    }
    if (completeTask) {
      setTasks((items) =>
        items.map((task) =>
          task.id === focusSession.taskId && !task.completedAt
            ? { ...task, completedAt: endedAt }
            : task,
        ),
      );
    }
    const minutes = Math.max(1, Math.round(focusElapsed / 60));
    setFocusSession(null);
    setFocusMode(false);
    showAppToast(shouldRecord ? t.focusSaved(minutes) : t.focusEnded);
  };
  const saveProfile = (event: FormEvent) => {
    event.preventDefault();
    setProfileName(profileDraft.trim() || "Starlight");
    setProfession(professionDraft);
    setNotice({ tone: "success", message: t.profileSaved });
  };
  const requestArchivePermission = async (handle: LocalDirectoryHandle) => {
    const currentPermission = await handle.queryPermission({ mode: "readwrite" });
    if (currentPermission === "granted") return true;
    const requestedPermission = await handle.requestPermission({ mode: "readwrite" });
    return requestedPermission === "granted";
  };
  const connectArchiveFolder = async () => {
    if (!window.showDirectoryPicker) {
      setArchiveStatus("unsupported");
      setNotice({ tone: "error", message: t.archiveUnsupportedHint });
      return;
    }
    try {
      const handle = await window.showDirectoryPicker({
        id: "life-dashboard-archive",
        mode: "readwrite",
      });
      setArchiveHandle(handle);
      setArchiveStatus("saving");
      setArchiveAutoSave(true);
      void storeArchiveHandle(handle).catch(() => undefined);
      await writeArchiveData(handle, currentAppData, today);
      setArchiveStatus("saved");
      setNotice({ tone: "success", message: t.folderConnected(handle.name) });
    } catch (error) {
      if (isNamedError(error, "AbortError")) return;
      setArchiveStatus("error");
      setNotice({ tone: "error", message: t.archiveFailure });
    }
  };
  const saveToArchiveFolder = async () => {
    if (!archiveHandle) return;
    try {
      const allowed = await requestArchivePermission(archiveHandle);
      if (!allowed) {
        setArchiveStatus("permission_needed");
        return;
      }
      setArchiveStatus("saving");
      await writeArchiveData(archiveHandle, currentAppData, today);
      setArchiveStatus("saved");
      setNotice({ tone: "success", message: t.fileSaved });
    } catch {
      setArchiveStatus("error");
      setNotice({ tone: "error", message: t.archiveFailure });
    }
  };
  const restoreFromArchiveFolder = async () => {
    if (!archiveHandle) return;
    try {
      const allowed = await requestArchivePermission(archiveHandle);
      if (!allowed) {
        setArchiveStatus("permission_needed");
        return;
      }
      const fileHandle = await archiveHandle.getFileHandle(ARCHIVE_FILE_NAME);
      const file = await fileHandle.getFile();
      const imported = parseImportedData(JSON.parse(await file.text()), today);
      if (!imported) throw new Error("invalid archive");
      if (!window.confirm(t.restoreFolderConfirm)) return;
      setTasks(imported.tasks);
      setProfileName(imported.profile.name);
      setProfileDraft(imported.profile.name);
      setProfileCreatedAt(imported.profile.createdAt);
      setProfession(imported.profile.profession ?? "wayfinder");
      setProfessionDraft(imported.profile.profession ?? "wayfinder");
      setFocusLogs(imported.focusLogs ?? []);
      setFocusSession(null);
      setArchiveStatus("connected");
      setNotice({ tone: "success", message: t.fileRestored });
    } catch (error) {
      setArchiveStatus("error");
      setNotice({
        tone: "error",
        message: isNamedError(error, "NotFoundError") ? t.archiveMissing : t.archiveFailure,
      });
    }
  };
  const exportData = () => {
    const blob = new Blob([JSON.stringify(currentAppData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `life-dashboard-${today}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice({ tone: "success", message: t.exportReady });
  };
  const importData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const imported = parseImportedData(JSON.parse(await file.text()), today);
      if (!imported) throw new Error("invalid backup");
      setTasks(imported.tasks);
      setProfileName(imported.profile.name);
      setProfileDraft(imported.profile.name);
      setProfileCreatedAt(imported.profile.createdAt);
      setProfession(imported.profile.profession ?? "wayfinder");
      setProfessionDraft(imported.profile.profession ?? "wayfinder");
      setFocusLogs(imported.focusLogs ?? []);
      setFocusSession(null);
      setNotice({ tone: "success", message: t.importReady });
    } catch {
      setNotice({ tone: "error", message: t.invalidImport });
    }
  };
  const restoreDemo = () => {
    if (!window.confirm(t.demoRestoreConfirm)) return;
    getBrowserStorage()?.setItem(DEMO_BACKUP_KEY, JSON.stringify(currentAppData));
    setHasDemoBackup(true);
    const data = starterData(today);
    setTasks(data.tasks);
    setProfileName(data.profile.name);
    setProfileDraft(data.profile.name);
    setProfileCreatedAt(data.profile.createdAt);
    setProfession(data.profile.profession ?? "wayfinder");
    setProfessionDraft(data.profile.profession ?? "wayfinder");
    setFocusLogs([]);
    setFocusSession(null);
    setNotice({ tone: "success", message: t.demoBackupCreated });
  };
  const restorePreviousData = () => {
    const saved = getBrowserStorage()?.getItem(DEMO_BACKUP_KEY);
    if (!saved || !window.confirm(t.previousRestoreConfirm)) return;
    try {
      const imported = parseImportedData(JSON.parse(saved), today);
      if (!imported) throw new Error("invalid recovery backup");
      setTasks(imported.tasks);
      setProfileName(imported.profile.name);
      setProfileDraft(imported.profile.name);
      setProfileCreatedAt(imported.profile.createdAt);
      setProfession(imported.profile.profession ?? "wayfinder");
      setProfessionDraft(imported.profile.profession ?? "wayfinder");
      setFocusLogs(imported.focusLogs ?? []);
      setFocusSession(null);
      setNotice({ tone: "success", message: t.previousRestored });
    } catch {
      setNotice({ tone: "error", message: t.invalidImport });
    }
  };
  const clearData = () => {
    if (!window.confirm(t.clearDataConfirm)) return;
    setTasks([]);
    setProfileName("Starlight");
    setProfileDraft("Starlight");
    setProfileCreatedAt(new Date().toISOString());
    setProfession("wayfinder");
    setProfessionDraft("wayfinder");
    setFocusLogs([]);
    setFocusSession(null);
    setNotice({ tone: "success", message: t.cleared });
  };
  const navigateTab = (tab: TabKey) => {
    setActiveTab(tab);
    window.history.replaceState(null, "", `#${tab}`);
  };
  const pageHeading = activeTab === "dashboard" ? t.greeting(profileName) : t.tabTitles[activeTab];
  const archiveStatusText = {
    unsupported: t.archiveUnsupported,
    not_connected: t.archiveNotConnected,
    permission_needed: t.archivePermissionNeeded,
    connected: t.archiveConnected,
    saving: t.archiveSaving,
    saved: t.archiveSaved,
    error: t.archiveError,
  }[archiveStatus];
  const historyAttributeInfo = attributes.find(
    (attribute) => attribute.key === historyAttribute,
  ) ?? attributes[1];
  const professionPreviewInfo = professionCatalog[professionDraft];
  const professionPreviewRank = getProfessionRank(professionDraft, level, locale);

  return (
    <main className={`life-app profession-${profession} ${focusMode ? "life-app--focus" : ""} min-h-screen overflow-hidden`}>
      <div className="life-layout">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand__mark">L</span>
            <span>
              Life<span className="brand__muted">Dashboard</span>
            </span>
          </div>
          <nav className="side-nav" aria-label="Main navigation">
            <a
              className={`side-nav__item ${activeTab === "dashboard" ? "side-nav__item--active" : ""}`}
              href="#dashboard"
              aria-current={activeTab === "dashboard" ? "page" : undefined}
              onClick={(event) => { event.preventDefault(); navigateTab("dashboard"); }}
            >
              <span>◈</span>
              {t.navDashboard}
            </a>
            <a
              className={`side-nav__item ${activeTab === "quests" ? "side-nav__item--active" : ""}`}
              href="#quests"
              aria-current={activeTab === "quests" ? "page" : undefined}
              onClick={(event) => { event.preventDefault(); navigateTab("quests"); }}
            >
              <span>✓</span>
              {t.navQuests}
            </a>
            <a
              className={`side-nav__item ${activeTab === "attributes" ? "side-nav__item--active" : ""}`}
              href="#attributes"
              aria-current={activeTab === "attributes" ? "page" : undefined}
              onClick={(event) => { event.preventDefault(); navigateTab("attributes"); }}
            >
              <span>⌁</span>
              {t.navAttributes}
            </a>
            <a
              className={`side-nav__item ${activeTab === "achievements" ? "side-nav__item--active" : ""}`}
              href="#achievements"
              aria-current={activeTab === "achievements" ? "page" : undefined}
              onClick={(event) => { event.preventDefault(); navigateTab("achievements"); }}
            >
              <span>✦</span>
              {t.navAchievements}
            </a>
            <a
              className={`side-nav__item ${activeTab === "review" ? "side-nav__item--active" : ""}`}
              href="#review"
              aria-current={activeTab === "review" ? "page" : undefined}
              onClick={(event) => { event.preventDefault(); navigateTab("review"); }}
            >
              <span>↗</span>
              {t.navReview}
            </a>
          </nav>
          <div className="profile">
            <span className="profile__avatar" aria-label={`${profileName} avatar`}>
              {profileName.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <b>{profileName}</b>
              <span>{professionInfo.icon} {professionRank.current} · Lv.{level}</span>
            </div>
          </div>
        </aside>
        <section id="dashboard" className="dashboard">
          <header className="topbar">
            <div>
              <p className="overline">{activeTab === "dashboard" ? t.date : t.tabTitles[activeTab]}</p>
              <h1>
                {pageHeading} <span className="accent">✦</span>
              </h1>
            </div>
            <div className="topbar__actions">
              <button
                aria-label={t.settings}
                className="icon-button"
                onClick={openSettings}
                title={t.settings}
              >
                ⚙
              </button>
              <button
                className={`secondary-button ${focusMode ? "secondary-button--active" : ""}`}
                onClick={toggleFocusMode}
                aria-pressed={focusMode}
              >
                <span>◎</span> {focusMode ? t.exitFocus : t.focus}
              </button>
              <button
                className="language-toggle"
                onClick={() => setLocale(locale === "en" ? "zh" : "en")}
                aria-label={t.switchTo}
                title={t.switchTo}
              >
                <span
                  className={locale === "en" ? "language-toggle__active" : ""}
                >
                  EN
                </span>
                <i>/</i>
                <span
                  className={locale === "zh" ? "language-toggle__active" : ""}
                >
                  中
                </span>
              </button>
            </div>
          </header>
          {focusMode && focusSession ? (
            <article className="focus-workspace card">
              <div className="focus-workspace__halo" aria-hidden="true" />
              <div className="focus-workspace__class">
                <span>{professionInfo.icon}</span>
                {professionInfo.name[locale]} · {professionRank.current}
              </div>
              <p className="overline">{t.focusSession}</p>
              <h2>{focusSession.taskTitle}</h2>
              <p className="focus-workspace__hint">{t.focusHint}</p>
              <div className="focus-clock" role="timer" aria-live="off">
                {formatFocusDuration(focusElapsed)}
              </div>
              <div className="focus-controls">
                <button className="primary-button" onClick={pauseFocusSession} type="button">
                  {focusSession.status === "running" ? `Ⅱ ${t.focusPause}` : `▶ ${t.focusResume}`}
                </button>
                <button className="secondary-button focus-complete" onClick={() => finishFocusSession(true)} type="button">
                  ✓ {t.focusComplete}
                </button>
                <button className="text-button" onClick={() => finishFocusSession(false)} type="button">
                  {t.focusEnd}
                </button>
              </div>
              <div className="focus-today-card">
                <div><strong>{Math.floor(todayFocusSeconds / 60)}</strong><span>{locale === "zh" ? "分钟" : "minutes"}</span></div>
                <div><strong>{todayFocusLogs.length + 1}</strong><span>{t.focusSessions}</span></div>
                <p>{t.focusToday}</p>
              </div>
            </article>
          ) : (
          <>
          {(activeTab === "dashboard" || activeTab === "quests") && mainQuest && (
            <article className="main-quest card">
              <div className="main-quest__copy">
                <div className="main-quest__label">
                  <span className="quest-star">✦</span>
                  <p className="overline">{t.mainQuest}</p>
                </div>
                <h2>{questLabel(mainQuest)}</h2>
                <p>{t.mainHint(mainQuest.xp + (mainQuest.isMainQuest ? 10 : 0))}</p>
              </div>
              <div className="main-quest__actions">
                <button
                  onClick={() => toggleTask(mainQuest.id)}
                  className={`primary-button ${mainQuest.completedAt ? "primary-button--done" : ""}`}
                >
                  {mainQuest.completedAt ? `✓ ${t.completed}` : t.complete}
                </button>
                <button
                  onClick={() => openEdit(mainQuest)}
                  className="text-button"
                >
                  {t.change}
                </button>
              </div>
            </article>
          )}
          {activeTab === "dashboard" && (
          <div className="dashboard-grid dashboard-grid--top">
            <article className="card level-card">
              <div>
                <p className="overline">{t.currentLevel}</p>
                <div className="level-number">{level}</div>
                <p className="level-title">
                  <span className="level-class-icon">{professionInfo.icon}</span>
                  {professionRank.current}
                </p>
                <div className="progress-meta">
                  <span>{levelState.progress} / {levelState.span} XP</span>
                  <b>{levelState.percent}%</b>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${levelState.percent}%` }} />
                </div>
                <p className="helper-text">
                  {t.xpUntil(levelState.remaining, level + 1)}
                </p>
                <p className="rank-unlock">
                  {professionRank.next
                    ? t.nextRankAt(professionRank.next.name, professionRank.next.level)
                    : t.maxRank}
                </p>
              </div>
              <div
                className="level-ring"
                style={
                  {
                    "--progress": `${levelState.percent}%`,
                  } as React.CSSProperties
                }
              >
                <div>
                  <b>{level}</b>
                  <span>{locale === "zh" ? "等级" : "LEVEL"}</span>
                </div>
              </div>
            </article>
            <article className="card streak-card">
              <p className="overline">{t.currentStreak}</p>
              <div className="streak-number">
                {currentStreak ? 1 : 0} <span>{t.days}</span>
              </div>
              <p className="helper-text">{t.streakHint}</p>
              <div className="streak-icon">♨</div>
              <div className="week" aria-label={t.currentStreak}>
                <Day label={locale === "zh" ? "一" : "M"} done />
                <Day label={locale === "zh" ? "二" : "T"} done />
                <Day label={locale === "zh" ? "三" : "W"} done />
                <Day label={locale === "zh" ? "四" : "T"} done />
                <Day label={locale === "zh" ? "五" : "F"} today />
                <Day label={locale === "zh" ? "六" : "S"} />
                <Day label={locale === "zh" ? "日" : "S"} />
              </div>
            </article>
          </div>
          )}
          {activeTab === "attributes" && <div className="dashboard-grid dashboard-grid--mid">
            <article id="attributes" className="card attributes-card">
              <CardHeader
                eyebrow={t.personalStats}
                title={t.attributes}
                action={t.history}
                onAction={() => openHistory()}
              />
              <div className="attribute-list">
                {attributes.map((stat) => (
                  <button
                    key={stat.key}
                    className="attribute-row attribute-row--button"
                    onClick={() => openHistory(stat.key)}
                    aria-label={`${t.history} ${stat.name[locale]}`}
                    type="button"
                  >
                    <div className="attribute-name">
                      <span className={`stat-icon ${stat.tone}`}>
                        {stat.icon}
                      </span>
                      <div>
                        <b>{stat.name[locale]}</b>
                        <small>{stat.hint[locale]}</small>
                      </div>
                    </div>
                    <div className="attribute-bar">
                      <span
                        style={{
                          width: `${radarData.find((item) => item.attribute === stat.name[locale])?.value ?? 0}%`,
                        }}
                      />
                    </div>
                    <strong>
                      {radarData.find(
                        (item) => item.attribute === stat.name[locale],
                      )?.value ?? 0}
                    </strong>
                  </button>
                ))}
              </div>
            </article>
            <article className="card balance-card">
              <div className="card-header">
                <div>
                  <p className="overline">{analyticsRange === "week" ? t.thisWeek : t.monthRange}</p>
                  <h2>{t.balance}</h2>
                </div>
                <RangeToggle
                  value={analyticsRange}
                  onChange={setAnalyticsRange}
                  weekLabel={t.weekRange}
                  monthLabel={t.monthRange}
                />
              </div>
              <div className="radar-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="68%">
                    <PolarGrid stroke="#9f8ec5" strokeOpacity={0.38} />
                    <PolarAngleAxis
                      dataKey="attribute"
                      tick={{
                        fill: "#51476d",
                        fontSize: 11,
                        fontFamily:
                          "-apple-system, BlinkMacSystemFont, sans-serif",
                      }}
                    />
                    <Radar
                      dataKey="value"
                      stroke="#554087"
                      strokeWidth={2.5}
                      fill="#7861ad"
                      fillOpacity={0.28}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </div>}
          {activeTab === "dashboard" && <article className="insight card">
            <span className="insight__icon">↗</span>
            <div>
              <p className="overline">{t.insightEyebrow}</p>
              <h2>{t.insightTitle}</h2>
              <p>{t.insightText}</p>
            </div>
          </article>}
          {activeTab === "quests" && <article id="quests" className="card quests-card">
            <div className="section-heading">
              <div>
                <p className="overline">{t.questDate}</p>
                <h2>
                  {t.quests}{" "}
                  <span>
                    {t.completeCount(
                      todayTasks.filter((task) => task.completedAt).length,
                      todayTasks.length,
                    )}
                  </span>
                </h2>
              </div>
              <button
                onClick={openCreate}
                aria-label={t.addQuest}
                className="add-button"
              >
                +
              </button>
            </div>
            {todayTasks.length === 0 ? (
              <div className="empty-quests">
                <b>{t.noTasks}</b>
                <span>{t.noTasksHint}</span>
                <button className="primary-button" onClick={openCreate}>
                  {t.addQuest}
                </button>
              </div>
            ) : (
              <div className="quest-grid">
                {todayTasks.map((task) => (
                  <article
                    key={task.id}
                    className={`quest-card quest-card--${task.kind} ${task.completedAt ? "quest-card--done" : ""} ${task.isMainQuest ? "quest-card--main" : ""}`}
                  >
                    <div className="quest-card__top">
                      <span className={`kind-chip kind-chip--${task.kind}`}>
                        {t.kind[task.kind]}
                      </span>
                      <div className="quest-card__actions">
                        {task.isMainQuest && (
                          <span
                            className="quest-card__star"
                            title={t.mainQuestTitle}
                          >
                            ✦
                          </span>
                        )}
                        <button
                          onClick={() => openEdit(task)}
                          aria-label={`${t.editQuest}: ${questLabel(task)}`}
                          className="mini-action"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          aria-label={`${t.delete}: ${questLabel(task)}`}
                          className="mini-action mini-action--delete"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <button
                      className="quest-card__toggle"
                      onClick={() => toggleTask(task.id)}
                      aria-label={`${task.completedAt ? t.completed : t.complete}: ${questLabel(task)}`}
                    >
                      <span className="check">
                        {task.completedAt ? "✓" : ""}
                      </span>
                      <span className="quest-card__title-text">
                        {questLabel(task)}
                      </span>
                    </button>
                    <div className="quest-card__footer">
                      <small>
                        +{task.xp}
                        {task.isMainQuest
                          ? locale === "zh"
                            ? " + 10 主线"
                            : " + 10 main"
                          : ""}{" "}
                        XP
                      </small>
                      <button
                        onClick={() => setMainQuest(task.id)}
                        className={`main-chip ${task.isMainQuest ? "main-chip--active" : ""}`}
                      >
                        {task.isMainQuest ? "✦" : "☆"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <p className="save-note">
              {ready
                ? t.saveNote(earnedToday)
                : t.loading}
            </p>
          </article>}
          {activeTab === "achievements" && <article id="achievements" className="card achievements-card achievements-page-card">
              <div className="card-header">
                <div>
                  <p className="overline">{t.achievementsEyebrow}</p>
                  <h2>{t.achievementsTitle}</h2>
                </div>
                <span className="achievement-count">
                  {achievements.filter((achievement) => achievement.unlocked).length}/{achievements.length}
                </span>
              </div>
              <div
                className="achievement-filters"
                role="group"
                aria-label={locale === "zh" ? "按难度筛选" : "Filter by difficulty"}
              >
                {(["all", "starter", "steady", "bold", "legendary"] as const).map((filter) => (
                  <button
                    className={`achievement-filter ${achievementFilter === filter ? "achievement-filter--active" : ""}`}
                    key={filter}
                    onClick={() => setAchievementFilter(filter)}
                    aria-pressed={achievementFilter === filter}
                  >
                    {achievementDifficultyLabels[locale][filter]}
                  </button>
                ))}
              </div>
              <div className="achievement-list">
                {visibleAchievements.map((achievement) => (
                  <div
                    className={`achievement-item ${achievement.unlocked ? "achievement-item--unlocked" : ""}`}
                    key={achievement.key}
                  >
                    <span className="achievement-icon" aria-hidden="true">{achievement.icon}</span>
                    <div>
                      <strong>{achievement.title[locale]}</strong>
                      <small>{achievement.hint[locale]}</small>
                    </div>
                    <div className="achievement-meta">
                      <span className={`achievement-tier achievement-tier--${achievement.difficulty}`}>
                        {achievementDifficultyLabels[locale][achievement.difficulty]}
                      </span>
                      <span className="achievement-status">
                        {achievement.unlocked ? t.unlocked : t.locked}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
          </article>}
          {activeTab === "review" && <article id="review" className="card review-card review-page-card">
              <div className="card-header">
                <div>
                  <p className="overline">{t.weeklyReviewEyebrow}</p>
                  <h2>{t.weeklyReviewTitle}</h2>
                </div>
                <RangeToggle
                  value={analyticsRange}
                  onChange={setAnalyticsRange}
                  weekLabel={t.weekRange}
                  monthLabel={t.monthRange}
                />
              </div>
              {weeklyCompletedTasks.length > 0 && strongestAttribute ? (
                <>
                  <div className="review-metrics review-metrics--expanded">
                    <div><strong>{weeklyActiveDays}</strong><span>{locale === "zh" ? "活跃日" : "active days"}</span></div>
                    <div><strong>{weeklyXp}</strong><span>XP</span></div>
                    <div><strong>{completionRate}%</strong><span>{t.completionRate}</span></div>
                    <div><strong>{strongestAttribute.attribute}</strong><span>{t.mostActive}</span></div>
                    <div><strong>{neglectedAttribute.attribute}</strong><span>{t.neglected}</span></div>
                    <div>
                      <strong>{periodXpChange > 0 ? "+" : ""}{periodXpChange}%</strong>
                      <span>{t.versusLastWeek}</span>
                    </div>
                  </div>
                  <p className="review-summary">{t.weeklyReviewSummary(weeklyActiveDays, weeklyXp)}</p>
                  <p className={`review-trend ${periodXpChange > 0 ? "review-trend--up" : periodXpChange < 0 ? "review-trend--down" : ""}`}>
                    {periodXpChange > 0
                      ? t.periodUp(periodXpChange)
                      : periodXpChange < 0
                        ? t.periodDown(Math.abs(periodXpChange))
                        : t.periodSame}
                  </p>
                  <p className="review-action">{t.weeklyReviewAction(strongestAttribute.attribute)}</p>
                </>
              ) : (
                <div className="review-empty">
                  <span>○</span>
                  <p>{t.emptyReview}</p>
                </div>
              )}
          </article>}
          </>
          )}
        </section>
      </div>
      {settingsOpen && (
        <div className="modal-backdrop" onMouseDown={() => setSettingsOpen(false)}>
          <div
            className="task-modal settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="task-modal__header">
              <div>
                <p className="overline">{t.settings}</p>
                <h2 id="settings-modal-title">{t.settingsTitle}</h2>
                <p className="settings-subtitle">{t.settingsSubtitle}</p>
              </div>
              <button
                className="modal-close"
                onClick={() => setSettingsOpen(false)}
                aria-label={t.cancel}
              >
                ×
              </button>
            </div>
            <form className="settings-form" onSubmit={saveProfile}>
              <label>
                {t.profileName}
                <input
                  value={profileDraft}
                  onChange={(event) => setProfileDraft(event.target.value)}
                  maxLength={32}
                  autoFocus
                />
              </label>
              <fieldset className="profession-picker">
                <legend>{t.profession}</legend>
                <p>{t.professionHint}</p>
                <div className="profession-grid" role="radiogroup" aria-label={t.profession}>
                  {professionKeys.map((key) => {
                    const item = professionCatalog[key];
                    return (
                      <button
                        className={`profession-option ${professionDraft === key ? "profession-option--active" : ""}`}
                        key={key}
                        onClick={() => setProfessionDraft(key)}
                        role="radio"
                        aria-checked={professionDraft === key}
                        type="button"
                      >
                        <span>{item.icon}</span>
                        <b>{item.name[locale]}</b>
                        <small>{item.description[locale]}</small>
                      </button>
                    );
                  })}
                </div>
                <section
                  className={`profession-preview profession-preview--${professionDraft}`}
                  aria-live="polite"
                  aria-label={t.professionPreview}
                >
                  <div className="profession-preview__hero">
                    <span className="profession-preview__emblem" aria-hidden="true">
                      {professionPreviewInfo.icon}
                    </span>
                    <div className="profession-preview__identity">
                      <p>{t.professionPreview}</p>
                      <h3>{professionPreviewInfo.name[locale]}</h3>
                      <span>{professionPreviewInfo.description[locale]}</span>
                    </div>
                    <div className="profession-preview__level">
                      <strong>{level}</strong>
                      <span>{locale === "zh" ? "等级" : "LEVEL"}</span>
                    </div>
                  </div>
                  <div className="profession-preview__progress">
                    <div>
                      <span>{t.currentRankLabel}</span>
                      <strong>{professionPreviewRank.current}</strong>
                    </div>
                    <p>
                      {professionPreviewRank.next
                        ? t.nextRankAt(
                            professionPreviewRank.next.name,
                            professionPreviewRank.next.level,
                          )
                        : t.maxRank}
                    </p>
                    <div className="profession-preview__bar" aria-label={`${levelState.percent}%`}>
                      <span style={{ width: `${levelState.percent}%` }} />
                    </div>
                    <small>{levelState.progress} / {levelState.span} XP</small>
                  </div>
                  <div className="profession-preview__path">
                    <p>{t.rankPath}</p>
                    <ol>
                      {professionPreviewInfo.ranks.map((rank) => {
                        const unlocked = level >= rank.level;
                        const current = rank[locale] === professionPreviewRank.current;
                        return (
                          <li
                            className={`${unlocked ? "profession-rank--unlocked" : ""} ${current ? "profession-rank--current" : ""}`}
                            key={rank.level}
                          >
                            <span>{unlocked ? "✓" : rank.level}</span>
                            <b>{rank[locale]}</b>
                            <small>{unlocked ? t.rankUnlocked : t.rankUnlockLevel(rank.level)}</small>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                </section>
              </fieldset>
              <button type="submit" className="primary-button">{t.saveProfile}</button>
            </form>
            <div className="settings-section">
              <div className="settings-section-heading">
                <div>
                  <p className="overline">{t.localArchive}</p>
                  <p className="settings-section-copy">{t.localArchiveHint}</p>
                </div>
                <span
                  className={`archive-status archive-status--${archiveStatus}`}
                  role="status"
                >
                  <i aria-hidden="true" />
                  {archiveStatusText}
                </span>
              </div>
              <div className="archive-folder-card">
                <span className="archive-folder-icon" aria-hidden="true">▰</span>
                <span className="archive-folder-copy">
                  <strong>{archiveHandle?.name ?? t.archiveNotConnected}</strong>
                  <small>
                    {archiveStatus === "unsupported"
                      ? t.archiveUnsupportedHint
                      : archiveHandle
                        ? t.archiveFileHint
                        : t.archiveNotConnectedHint}
                  </small>
                </span>
                <button
                  className="secondary-button archive-folder-button"
                  onClick={connectArchiveFolder}
                  type="button"
                  disabled={archiveStatus === "unsupported"}
                >
                  {archiveHandle ? t.changeFolder : t.chooseFolder}
                </button>
              </div>
              <label className={`archive-toggle ${!archiveHandle ? "archive-toggle--disabled" : ""}`}>
                <span>
                  <strong>{t.autoSave}</strong>
                  <small>{t.archiveFileHint}</small>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={archiveAutoSave}
                  disabled={!archiveHandle || archiveStatus === "unsupported"}
                  onChange={(event) => setArchiveAutoSave(event.target.checked)}
                />
              </label>
              <div className="archive-actions">
                <button
                  className="primary-button"
                  onClick={saveToArchiveFolder}
                  type="button"
                  disabled={!archiveHandle || archiveStatus === "saving"}
                >
                  {t.saveNow}
                </button>
                <button
                  className="text-button"
                  onClick={restoreFromArchiveFolder}
                  type="button"
                  disabled={!archiveHandle || archiveStatus === "saving"}
                >
                  {t.restoreFromFolder}
                </button>
              </div>
            </div>
            <div className="settings-section">
              <p className="overline">{t.dataControl}</p>
              <div className="settings-actions">
                <button className="secondary-button" onClick={exportData} type="button">{t.exportData}</button>
                <button className="secondary-button" onClick={() => importInputRef.current?.click()} type="button">{t.importData}</button>
                <button className="secondary-button" onClick={restoreDemo} type="button">{t.restoreDemo}</button>
                {hasDemoBackup && (
                  <button className="secondary-button" onClick={restorePreviousData} type="button">{t.restorePrevious}</button>
                )}
                <button className="danger-button settings-danger" onClick={clearData} type="button">{t.clearData}</button>
              </div>
              <input ref={importInputRef} className="sr-only" type="file" accept="application/json,.json" onChange={importData} />
            </div>
            {notice && <p className={`settings-notice settings-notice--${notice.tone}`} role="status">{notice.message}</p>}
          </div>
        </div>
      )}
      {historyOpen && (
        <div className="modal-backdrop" onMouseDown={() => setHistoryOpen(false)}>
          <div
            className="task-modal history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="task-modal__header">
              <div>
                <p className="overline">{t.attributes}</p>
                <h2 id="history-modal-title">{t.historyTitle}</h2>
                <p className="settings-subtitle">{t.historySubtitle}</p>
              </div>
              <button
                className="modal-close"
                onClick={() => setHistoryOpen(false)}
                aria-label={t.historyClose}
              >
                ×
              </button>
            </div>
            <div className="history-toolbar">
              <div className="attribute-tabs" role="tablist" aria-label={t.attributes}>
                {attributes.map((attribute) => (
                  <button
                    key={attribute.key}
                    className={`attribute-tab ${historyAttribute === attribute.key ? "attribute-tab--active" : ""}`}
                    onClick={() => setHistoryAttribute(attribute.key)}
                    role="tab"
                    aria-selected={historyAttribute === attribute.key}
                    type="button"
                  >
                    <span className={`stat-icon ${attribute.tone}`}>{attribute.icon}</span>
                    {attribute.name[locale]}
                  </button>
                ))}
              </div>
              <RangeToggle
                value={analyticsRange}
                onChange={setAnalyticsRange}
                weekLabel={t.weekRange}
                monthLabel={t.monthRange}
              />
            </div>
            <div className="history-summary">
              <div>
                <span className={`stat-icon ${historyAttributeInfo.tone}`}>{historyAttributeInfo.icon}</span>
                <strong>{historyAttributeInfo.name[locale]}</strong>
              </div>
              <div><strong>{historyXp}</strong><span>{t.periodXp}</span></div>
              <div><strong>{historyActiveDays}</strong><span>{t.activeDaysLabel}</span></div>
            </div>
            {historyItems.length > 0 ? (
              <>
                <div className="history-chart" aria-label={`${historyAttributeInfo.name[locale]} XP`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyChartData} margin={{ top: 12, right: 8, left: -26, bottom: 0 }}>
                      <defs>
                        <linearGradient id="historyArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6c56a0" stopOpacity={0.42} />
                          <stop offset="100%" stopColor="#6c56a0" stopOpacity={0.04} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#d8d1e6" strokeDasharray="3 5" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6a6278" }} axisLine={false} tickLine={false} interval={analyticsRange === "month" ? 5 : 0} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#6a6278" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#d6d0df", fontSize: 12 }} />
                      <Area type="monotone" dataKey="xp" stroke="#594287" strokeWidth={2.5} fill="url(#historyArea)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="overline history-source-title">{t.xpSources}</p>
                <div className="history-list">
                  {historyItems.map((task) => (
                    <div className="history-item" key={`${task.id}-${task.completedAt}`}>
                      <div className="history-item__mark">✓</div>
                      <div className="history-item__copy">
                        <strong>{questLabel(task)}</strong>
                        <small>
                          {t.completedOn} · {new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(task.completedAt!))}
                        </small>
                      </div>
                      <span className="history-item__xp">+{earnedXp(task)} XP</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="review-empty history-empty">
                <span>○</span>
                <p>{t.historyEmpty}</p>
              </div>
            )}
          </div>
        </div>
      )}
      {editor && (
        <div className="modal-backdrop" onMouseDown={() => setEditor(null)}>
          <div
            className="task-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="task-modal__header">
              <div>
                <p className="overline">
                  {editor.mode === "create" ? t.newQuest : t.editQuest}
                </p>
                <h2 id="task-modal-title">
                  {editor.mode === "create" ? t.newQuest : t.editQuest}
                </h2>
              </div>
              <button
                className="modal-close"
                onClick={() => setEditor(null)}
                aria-label={t.cancel}
              >
                ×
              </button>
            </div>
            <form onSubmit={saveTask}>
              <label>
                {t.titleLabel}
                <input
                  autoFocus
                  value={draft.title}
                  onChange={(event) =>
                    setDraft({ ...draft, title: event.target.value })
                  }
                  placeholder={t.titlePlaceholder}
                />
              </label>
              <div className="form-grid">
                <label>
                  {t.kindLabel}
                  <select
                    value={draft.kind}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        kind: event.target.value as QuestKind,
                      })
                    }
                  >
                    <option value="daily">{t.kind.daily}</option>
                    <option value="habit">{t.kind.habit}</option>
                    <option value="one_off">{t.kind.one_off}</option>
                  </select>
                </label>
                <label>
                  {t.xpLabel}
                  <select
                    value={draft.xp}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        xp: Number(event.target.value) as Draft["xp"],
                      })
                    }
                  >
                    <option value="10">10 XP</option>
                    <option value="20">20 XP</option>
                    <option value="30">30 XP</option>
                    <option value="50">50 XP</option>
                  </select>
                </label>
              </div>
              <label>
                {t.attributeLabel}
                <select
                  value={draft.attribute}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      attribute: event.target.value as AttributeKey,
                    })
                  }
                >
                  {attributeKeys.map((key) => (
                    <option key={key} value={key}>
                      {t.attributeNames[key]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={draft.isMainQuest}
                  onChange={(event) =>
                    setDraft({ ...draft, isMainQuest: event.target.checked })
                  }
                />
                {t.mainToggle}
              </label>
              <div className="task-modal__footer">
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setEditor(null)}
                >
                  {t.cancel}
                </button>
                {editor.mode === "edit" && editor.taskId && (
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => deleteTask(editor.taskId!)}
                  >
                    {t.delete}
                  </button>
                )}
                <button type="submit" className="primary-button">
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {(undoTask || appToast) && (
        <div className="app-toast" role="status" aria-live="polite">
          <span>{undoTask ? t.taskUnchecked : appToast}</span>
          {undoTask && (
            <button onClick={undoTaskCompletion} type="button">
              {t.undo}
            </button>
          )}
        </div>
      )}
    </main>
  );
}

function CardHeader({
  eyebrow,
  title,
  action,
  onAction,
}: {
  eyebrow: string;
  title: string;
  action: string;
  onAction?: () => void;
}) {
  return (
    <div className="card-header">
      <div>
        <p className="overline">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {onAction ? (
        <button className="text-button" onClick={onAction}>
          {action}
        </button>
      ) : (
        <span className="card-header__action">{action}</span>
      )}
    </div>
  );
}
function RangeToggle({
  value,
  onChange,
  weekLabel,
  monthLabel,
}: {
  value: AnalyticsRange;
  onChange: (value: AnalyticsRange) => void;
  weekLabel: string;
  monthLabel: string;
}) {
  return (
    <div className="range-toggle" role="group" aria-label={`${weekLabel} / ${monthLabel}`}>
      <button
        className={value === "week" ? "range-toggle__active" : ""}
        onClick={() => onChange("week")}
        aria-pressed={value === "week"}
        type="button"
      >
        {weekLabel}
      </button>
      <button
        className={value === "month" ? "range-toggle__active" : ""}
        onClick={() => onChange("month")}
        aria-pressed={value === "month"}
        type="button"
      >
        {monthLabel}
      </button>
    </div>
  );
}
function Day({
  label,
  done,
  today,
}: {
  label: string;
  done?: boolean;
  today?: boolean;
}) {
  return (
    <span
      className={`day ${done ? "day--done" : ""} ${today ? "day--today" : ""}`}
    >
      {label}
    </span>
  );
}
