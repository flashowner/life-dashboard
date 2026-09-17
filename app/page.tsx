"use client";

import { useEffect, useMemo, useState } from "react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";

type QuestKind = "daily" | "habit" | "one_off";
type Quest = { id: number; label: string; xp: number; done: boolean; kind: QuestKind; isMainQuest: boolean };
type Locale = "en" | "zh";

const initialQuests: Quest[] = [
  { id: 1, label: "Morning movement", xp: 30, done: true, kind: "daily", isMainQuest: false },
  { id: 2, label: "Read for 20 minutes", xp: 20, done: true, kind: "habit", isMainQuest: false },
  { id: 3, label: "Deep work: Life Dashboard", xp: 50, done: false, kind: "one_off", isMainQuest: true },
  { id: 4, label: "Call someone you love", xp: 25, done: false, kind: "habit", isMainQuest: false },
  { id: 5, label: "Plan tomorrow", xp: 15, done: false, kind: "daily", isMainQuest: false },
];

const attributes = [
  { key: "vitality", name: { en: "Vitality", zh: "活力" }, hint: { en: "Body & energy", zh: "身体与能量" }, value: 82, icon: "♥", tone: "rose" },
  { key: "focus", name: { en: "Focus", zh: "专注" }, hint: { en: "Mind & craft", zh: "思考与创造" }, value: 68, icon: "⌁", tone: "blue" },
  { key: "connection", name: { en: "Connection", zh: "连接" }, hint: { en: "People & presence", zh: "关系与陪伴" }, value: 74, icon: "◌", tone: "violet" },
  { key: "growth", name: { en: "Growth", zh: "成长" }, hint: { en: "Learning & courage", zh: "学习与勇气" }, value: 91, icon: "↗", tone: "green" },
  { key: "order", name: { en: "Order", zh: "秩序" }, hint: { en: "Home & finances", zh: "生活与财务" }, value: 59, icon: "◇", tone: "gold" },
];

const questTranslations: Record<number, { en: string; zh: string }> = {
  1: { en: "Morning movement", zh: "晨间运动" },
  2: { en: "Read for 20 minutes", zh: "阅读 20 分钟" },
  3: { en: "Deep work: Life Dashboard", zh: "深度工作：Life Dashboard" },
  4: { en: "Call someone you love", zh: "给重要的人打个电话" },
  5: { en: "Plan tomorrow", zh: "规划明天" },
};

const copy = {
  en: {
    date: "TUESDAY · SEPTEMBER 16", greeting: "Good evening, Starlight", focus: "Focus mode",
    mainQuest: "TODAY'S MAIN QUEST", mainHint: (xp: number) => `One meaningful step is enough. You'll earn +${xp} XP when you complete it.`, complete: "Complete quest", completed: "Completed", change: "Change",
    currentLevel: "CURRENT LEVEL", wayfinder: "Wayfinder", xpUntil: (xp: number, level: number) => `${xp} XP until Level ${level}`,
    currentStreak: "CURRENT STREAK", days: "days", streakHint: "You're building a rhythm. Keep it alive.", personalStats: "PERSONAL STATS", attributes: "Attributes", history: "View history →", thisWeek: "THIS WEEK", balance: "Balance", week: "Week ▾",
    insightEyebrow: "A SMALL INSIGHT FOR THIS WEEK", insightTitle: "Your focus is strong. Make room for connection.", insightText: "You've invested most of your recent XP in Focus and Growth. Try a 10-minute Connection quest tomorrow — a message, a call, or a shared walk is enough.",
    questDate: "SEPTEMBER 16", quests: "Today's quests", completeCount: (done: number, total: number) => `${done}/${total} complete`, addQuest: "Add a new quest", addPrompt: "Name your new quest", loading: "Loading your saved progress…", saveNote: (xp: number) => `Today you earned ${xp} XP. Your progress is saved on this device.`, explorer: (level: number) => `Level ${level} explorer`, switchTo: "切换到中文", navDashboard: "Dashboard", navQuests: "Daily quests", navAttributes: "Attributes", navAchievements: "Achievements", mainQuestTitle: "Today's main quest",
    kind: { daily: "Daily", habit: "Habit", one_off: "One-off" } as Record<QuestKind, string>,
  },
  zh: {
    date: "星期二 · 9月16日", greeting: "晚上好，Starlight", focus: "专注模式",
    mainQuest: "今日主线任务", mainHint: (xp: number) => `完成这一步就很好。完成后将获得 +${xp} XP。`, complete: "完成任务", completed: "已完成", change: "更换",
    currentLevel: "当前等级", wayfinder: "探索者", xpUntil: (xp: number, level: number) => `距离等级 ${level} 还差 ${xp} XP`,
    currentStreak: "连续打卡", days: "天", streakHint: "节奏正在形成，继续保持。", personalStats: "个人属性", attributes: "属性", history: "查看历史 →", thisWeek: "本周状态", balance: "平衡度", week: "本周 ▾",
    insightEyebrow: "本周的一点洞察", insightTitle: "专注力很强，也给连接留一点空间。", insightText: "你最近的大部分 XP 都投入在专注和成长上。明天试试一个 10 分钟的连接任务：发条消息、打个电话，或一起散步。",
    questDate: "9月16日", quests: "今日任务", completeCount: (done: number, total: number) => `${done}/${total} 已完成`, addQuest: "添加新任务", addPrompt: "输入新任务名称", loading: "正在加载你的进度…", saveNote: (xp: number) => `今天获得了 ${xp} XP。进度已保存在此设备。`, explorer: (level: number) => `等级 ${level} 探索者`, switchTo: "Switch to English", navDashboard: "仪表盘", navQuests: "今日任务", navAttributes: "人生属性", navAchievements: "成就", mainQuestTitle: "今日主线任务",
    kind: { daily: "每日", habit: "习惯", one_off: "一次性" } as Record<QuestKind, string>,
  },
};

export default function Dashboard() {
  const [quests, setQuests] = useState<Quest[]>(initialQuests);
  const [locale, setLocale] = useState<Locale>("en");
  const [ready, setReady] = useState(false);
  const t = copy[locale];

  useEffect(() => {
    const saved = window.localStorage.getItem("life-dashboard-quests");
    if (saved) {
      try {
        setQuests((JSON.parse(saved) as Partial<Quest>[]).map((q, index) => ({ id: q.id ?? Date.now() + index, label: q.label ?? "New quest", xp: q.xp ?? 20, done: q.done ?? false, kind: q.kind ?? "habit", isMainQuest: q.isMainQuest ?? false })));
      } catch { /* keep starter state */ }
    }
    const savedLocale = window.localStorage.getItem("life-dashboard-locale");
    if (savedLocale === "en" || savedLocale === "zh") setLocale(savedLocale);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) {
      window.localStorage.setItem("life-dashboard-quests", JSON.stringify(quests));
      window.localStorage.setItem("life-dashboard-locale", locale);
    }
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [quests, ready, locale]);

  const earnedToday = useMemo(() => quests.filter((q) => q.done).reduce((sum, q) => sum + q.xp, 0), [quests]);
  const totalXp = 2740 + earnedToday;
  const level = Math.floor(totalXp / 500) + 7;
  const levelProgress = totalXp % 500;
  const radarData = attributes.map(({ name, value }) => ({ attribute: name[locale], value }));
  const toggleQuest = (id: number) => setQuests((items) => items.map((q) => q.id === id ? { ...q, done: !q.done } : q));
  const setMainQuest = (id: number) => setQuests((items) => items.map((q) => ({ ...q, isMainQuest: q.id === id })));
  const addQuest = () => {
    const label = window.prompt(t.addPrompt);
    if (!label?.trim()) return;
    setQuests((items) => [...items, { id: Date.now(), label: label.trim(), xp: 20, done: false, kind: "habit", isMainQuest: false }]);
  };
  const mainQuest = quests.find((q) => q.isMainQuest) ?? quests.find((q) => !q.done) ?? quests[0];
  const questLabel = (quest: Quest) => questTranslations[quest.id]?.[locale] ?? quest.label;

  return (
    <main className="life-app min-h-screen overflow-hidden">
      <div className="life-layout">
        <aside className="sidebar">
          <div className="brand"><span className="brand__mark">L</span><span>Life<span className="brand__muted">Dashboard</span></span></div>
          <nav className="side-nav" aria-label="Main navigation">
            <a className="side-nav__item side-nav__item--active" href="#dashboard"><span>◈</span>{t.navDashboard}</a>
            <a className="side-nav__item" href="#quests"><span>✓</span>{t.navQuests}</a>
            <a className="side-nav__item" href="#attributes"><span>⌁</span>{t.navAttributes}</a>
            <a className="side-nav__item" href="#achievements"><span>✦</span>{t.navAchievements}</a>
          </nav>
          <div className="profile"><span className="profile__avatar" aria-label="Starlight avatar">S</span><div><b>Starlight</b><span>{t.explorer(level)}</span></div></div>
        </aside>

        <section id="dashboard" className="dashboard">
          <header className="topbar">
            <div><p className="overline">{t.date}</p><h1>{t.greeting} <span className="accent">✦</span></h1></div>
            <div className="topbar__actions"><button aria-label="Notifications" className="icon-button">♧</button><button className="secondary-button"><span>◎</span> {t.focus}</button><button className="language-toggle" onClick={() => setLocale(locale === "en" ? "zh" : "en")} aria-label={t.switchTo} title={t.switchTo}><span className={locale === "en" ? "language-toggle__active" : ""}>EN</span><i>/</i><span className={locale === "zh" ? "language-toggle__active" : ""}>中</span></button></div>
          </header>

          {mainQuest && <article className="main-quest card">
            <div className="main-quest__copy"><div className="main-quest__label"><span className="quest-star">✦</span><p className="overline">{t.mainQuest}</p></div><h2>{questLabel(mainQuest)}</h2><p>{t.mainHint(mainQuest.xp + 10)}</p></div>
            <div className="main-quest__actions"><button onClick={() => toggleQuest(mainQuest.id)} className={`primary-button ${mainQuest.done ? "primary-button--done" : ""}`}>{mainQuest.done ? `✓ ${t.completed}` : t.complete}</button><button onClick={() => setMainQuest(mainQuest.id)} className="text-button">{t.change}</button></div>
          </article>}

          <div className="dashboard-grid dashboard-grid--top">
            <article className="card level-card"><div><p className="overline">{t.currentLevel}</p><div className="level-number">{level}</div><p className="level-title">{t.wayfinder} <span>◆</span></p><div className="progress-meta"><span>{levelProgress} / 500 XP</span><b>{Math.round(levelProgress / 5)}%</b></div><div className="progress-track"><span style={{ width: `${levelProgress / 5}%` }} /></div><p className="helper-text">{t.xpUntil(500 - levelProgress, level + 1)}</p></div><div className="level-ring" style={{ "--progress": `${levelProgress / 5}%` } as React.CSSProperties}><div><b>{level}</b><span>{locale === "zh" ? "等级" : "LEVEL"}</span></div></div></article>
            <article className="card streak-card"><p className="overline">{t.currentStreak}</p><div className="streak-number">14 <span>{t.days}</span></div><p className="helper-text">{t.streakHint}</p><div className="streak-icon">♨</div><div className="week" aria-label={t.currentStreak}><Day label={locale === "zh" ? "一" : "M"} done /><Day label={locale === "zh" ? "二" : "T"} done /><Day label={locale === "zh" ? "三" : "W"} done /><Day label={locale === "zh" ? "四" : "T"} done /><Day label={locale === "zh" ? "五" : "F"} today /><Day label={locale === "zh" ? "六" : "S"} /><Day label={locale === "zh" ? "日" : "S"} /></div></article>
          </div>

          <div className="dashboard-grid dashboard-grid--mid">
            <article id="attributes" className="card attributes-card"><CardHeader eyebrow={t.personalStats} title={t.attributes} action={t.history} /><div className="attribute-list">{attributes.map((stat) => <div key={stat.key} className="attribute-row"><div className="attribute-name"><span className={`stat-icon ${stat.tone}`}>{stat.icon}</span><div><b>{stat.name[locale]}</b><small>{stat.hint[locale]}</small></div></div><div className="attribute-bar"><span style={{ width: `${stat.value}%` }} /></div><strong>{stat.value}</strong></div>)}</div></article>
            <article className="card balance-card"><CardHeader eyebrow={t.thisWeek} title={t.balance} action={t.week} /><div className="radar-wrap"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radarData} outerRadius="68%"><PolarGrid stroke="#9f8ec5" strokeOpacity={0.38} /><PolarAngleAxis dataKey="attribute" tick={{ fill: "#51476d", fontSize: 11, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }} /><Radar dataKey="value" stroke="#554087" strokeWidth={2.5} fill="#7861ad" fillOpacity={0.28} /></RadarChart></ResponsiveContainer></div></article>
          </div>

          <article className="insight card"><span className="insight__icon">↗</span><div><p className="overline">{t.insightEyebrow}</p><h2>{t.insightTitle}</h2><p>{t.insightText}</p></div></article>

          <article id="quests" className="card quests-card"><div className="section-heading"><div><p className="overline">{t.questDate}</p><h2>{t.quests} <span>{t.completeCount(quests.filter((q) => q.done).length, quests.length)}</span></h2></div><button onClick={addQuest} aria-label={t.addQuest} className="add-button">+</button></div><div className="quest-grid">{quests.map((quest) => <button key={quest.id} onClick={() => toggleQuest(quest.id)} className={`quest-card quest-card--${quest.kind} ${quest.done ? "quest-card--done" : ""} ${quest.isMainQuest ? "quest-card--main" : ""}`}><div className="quest-card__top"><span className={`kind-chip kind-chip--${quest.kind}`}>{copy[locale].kind[quest.kind]}</span>{quest.isMainQuest && <span className="quest-card__star" title={t.mainQuestTitle}>✦</span>}</div><div className="quest-card__title"><span className="check">{quest.done ? "✓" : ""}</span><span>{questLabel(quest)}</span></div><small>+{quest.xp}{quest.isMainQuest ? (locale === "zh" ? " + 10 主线" : " + 10 main") : ""} XP</small></button>)}</div><p className="save-note">{ready ? t.saveNote(earnedToday + (mainQuest?.done ? 10 : 0)) : t.loading}</p></article>
        </section>
      </div>
    </main>
  );
}

function CardHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action: string }) { return <div className="card-header"><div><p className="overline">{eyebrow}</p><h2>{title}</h2></div><button className="text-button">{action}</button></div>; }
function Day({ label, done, today }: { label: string; done?: boolean; today?: boolean }) { return <span className={`day ${done ? "day--done" : ""} ${today ? "day--today" : ""}`}>{label}</span>; }
