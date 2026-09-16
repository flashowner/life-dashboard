"use client";

import { useEffect, useMemo, useState } from "react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";

type QuestKind = "daily" | "habit" | "one_off";
type Quest = { id: number; label: string; xp: number; done: boolean; kind: QuestKind; isMainQuest: boolean };

const initialQuests: Quest[] = [
  { id: 1, label: "Morning movement", xp: 30, done: true, kind: "daily", isMainQuest: false },
  { id: 2, label: "Read for 20 minutes", xp: 20, done: true, kind: "habit", isMainQuest: false },
  { id: 3, label: "Deep work: Life Dashboard", xp: 50, done: false, kind: "one_off", isMainQuest: true },
  { id: 4, label: "Call someone you love", xp: 25, done: false, kind: "habit", isMainQuest: false },
  { id: 5, label: "Plan tomorrow", xp: 15, done: false, kind: "daily", isMainQuest: false },
];

const attributes = [
  { name: "Vitality", hint: "Body & energy", value: 82, icon: "♥", tone: "rose" },
  { name: "Focus", hint: "Mind & craft", value: 68, icon: "⌁", tone: "blue" },
  { name: "Connection", hint: "People & presence", value: 74, icon: "◌", tone: "violet" },
  { name: "Growth", hint: "Learning & courage", value: 91, icon: "↗", tone: "green" },
  { name: "Order", hint: "Home & finances", value: 59, icon: "◇", tone: "gold" },
];

export default function Dashboard() {
  const [quests, setQuests] = useState<Quest[]>(initialQuests);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("life-dashboard-quests");
    if (saved) {
      try {
        setQuests((JSON.parse(saved) as Partial<Quest>[]).map((q, index) => ({
          id: q.id ?? Date.now() + index,
          label: q.label ?? "New quest",
          xp: q.xp ?? 20,
          done: q.done ?? false,
          kind: q.kind ?? "habit",
          isMainQuest: q.isMainQuest ?? false,
        })));
      } catch { /* keep starter state */ }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem("life-dashboard-quests", JSON.stringify(quests));
  }, [quests, ready]);

  const earnedToday = useMemo(() => quests.filter((q) => q.done).reduce((sum, q) => sum + q.xp, 0), [quests]);
  const totalXp = 2740 + earnedToday;
  const level = Math.floor(totalXp / 500) + 7;
  const levelProgress = totalXp % 500;
  const radarData = attributes.map(({ name, value }) => ({ attribute: name, value }));
  const toggleQuest = (id: number) => setQuests((items) => items.map((q) => q.id === id ? { ...q, done: !q.done } : q));
  const setMainQuest = (id: number) => setQuests((items) => items.map((q) => ({ ...q, isMainQuest: q.id === id })));
  const addQuest = () => {
    const label = window.prompt("Name your new quest");
    if (!label?.trim()) return;
    setQuests((items) => [...items, { id: Date.now(), label: label.trim(), xp: 20, done: false, kind: "habit", isMainQuest: false }]);
  };
  const mainQuest = quests.find((q) => q.isMainQuest) ?? quests.find((q) => !q.done) ?? quests[0];
  const kindLabel: Record<QuestKind, string> = { daily: "Daily", habit: "Habit", one_off: "One-off" };

  return (
    <main className="life-app min-h-screen overflow-hidden">
      <div className="life-app__wash life-app__wash--one" />
      <div className="life-app__wash life-app__wash--two" />
      <div className="life-layout">
        <aside className="sidebar">
          <div className="brand"><span className="brand__mark">L</span><span>Life<span className="brand__muted">OS</span></span></div>
          <nav className="side-nav" aria-label="Main navigation">
            <a className="side-nav__item side-nav__item--active" href="#dashboard"><span>◈</span>Dashboard</a>
            <a className="side-nav__item" href="#quests"><span>✓</span>Daily quests</a>
            <a className="side-nav__item" href="#attributes"><span>⌁</span>Attributes</a>
            <a className="side-nav__item" href="#achievements"><span>✦</span>Achievements</a>
          </nav>
          <div className="profile"><span className="profile__avatar" aria-label="Starlight avatar">S</span><div><b>Starlight</b><span>Level {level} explorer</span></div></div>
        </aside>

        <section id="dashboard" className="dashboard">
          <header className="topbar">
            <div><p className="overline">TUESDAY · SEPTEMBER 16</p><h1>Good evening, Starlight <span className="accent">✦</span></h1></div>
            <div className="topbar__actions"><button aria-label="Notifications" className="icon-button">♧</button><button className="secondary-button"><span>◎</span> Focus mode</button></div>
          </header>

          {mainQuest && <article className="main-quest card">
            <div className="main-quest__copy"><div className="main-quest__label"><span className="quest-star">✦</span><p className="overline">TODAY&apos;S MAIN QUEST</p></div><h2>{mainQuest.label}</h2><p>One meaningful step is enough. You&apos;ll earn <b>+{mainQuest.xp + 10} XP</b> when you complete it.</p></div>
            <div className="main-quest__actions"><button onClick={() => toggleQuest(mainQuest.id)} className={`primary-button ${mainQuest.done ? "primary-button--done" : ""}`}>{mainQuest.done ? "✓ Completed" : "Complete quest"}</button><button onClick={() => setMainQuest(mainQuest.id)} className="text-button">Change</button></div>
          </article>}

          <div className="dashboard-grid dashboard-grid--top">
            <article className="card level-card"><div><p className="overline">CURRENT LEVEL</p><div className="level-number">{level}</div><p className="level-title">Wayfinder <span>◆</span></p><div className="progress-meta"><span>{levelProgress} / 500 XP</span><b>{Math.round(levelProgress / 5)}%</b></div><div className="progress-track"><span style={{ width: `${levelProgress / 5}%` }} /></div><p className="helper-text">{500 - levelProgress} XP until <b>Level {level + 1}</b></p></div><div className="level-ring" style={{ "--progress": `${levelProgress / 5}%` } as React.CSSProperties}><div><b>{level}</b><span>LEVEL</span></div></div></article>
            <article className="card streak-card"><p className="overline">CURRENT STREAK</p><div className="streak-number">14 <span>days</span></div><p className="helper-text">You&apos;re building a rhythm. Keep it alive.</p><div className="streak-icon">♨</div><div className="week" aria-label="Weekly streak"><Day label="M" done /><Day label="T" done /><Day label="W" done /><Day label="T" done /><Day label="F" today /><Day label="S" /><Day label="S" /></div></article>
          </div>

          <div className="dashboard-grid dashboard-grid--mid">
            <article id="attributes" className="card attributes-card"><CardHeader eyebrow="PERSONAL STATS" title="Attributes" action="View history →" /><div className="attribute-list">{attributes.map((stat) => <div key={stat.name} className="attribute-row"><div className="attribute-name"><span className={`stat-icon ${stat.tone}`}>{stat.icon}</span><div><b>{stat.name}</b><small>{stat.hint}</small></div></div><div className="attribute-bar"><span style={{ width: `${stat.value}%` }} /></div><strong>{stat.value}</strong></div>)}</div></article>
            <article className="card balance-card"><CardHeader eyebrow="THIS WEEK" title="Balance" action="Week ▾" /><div className="radar-wrap"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radarData} outerRadius="68%"><PolarGrid stroke="#d9d9df" /><PolarAngleAxis dataKey="attribute" tick={{ fill: "#6e6e73", fontSize: 10, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }} /><Radar dataKey="value" stroke="#1d5fd1" strokeWidth={2} fill="#6a9bea" fillOpacity={0.2} /></RadarChart></ResponsiveContainer></div></article>
          </div>

          <article className="insight card"><span className="insight__icon">↗</span><div><p className="overline">A SMALL INSIGHT FOR THIS WEEK</p><h2>Your focus is strong. Make room for connection.</h2><p>You&apos;ve invested most of your recent XP in Focus and Growth. Try a 10-minute Connection quest tomorrow — a message, a call, or a shared walk is enough.</p></div></article>

          <article id="quests" className="card quests-card"><div className="section-heading"><div><p className="overline">SEPTEMBER 16</p><h2>Today&apos;s quests <span>{quests.filter((q) => q.done).length}/{quests.length} complete</span></h2></div><button onClick={addQuest} aria-label="Add a new quest" className="add-button">+</button></div><div className="quest-grid">{quests.map((quest) => <button key={quest.id} onClick={() => toggleQuest(quest.id)} className={`quest-card ${quest.done ? "quest-card--done" : ""} ${quest.isMainQuest ? "quest-card--main" : ""}`}><div className="quest-card__top"><span className={`kind-chip kind-chip--${quest.kind}`}>{kindLabel[quest.kind]}</span>{quest.isMainQuest && <span className="quest-card__star" title="Today's main quest">✦</span>}</div><div className="quest-card__title"><span className="check">{quest.done ? "✓" : ""}</span><span>{quest.label}</span></div><small>+{quest.xp}{quest.isMainQuest ? " + 10 main" : ""} XP</small></button>)}</div><p className="save-note">{ready ? `Today you earned ${earnedToday + (mainQuest?.done ? 10 : 0)} XP. Your progress is saved on this device.` : "Loading your saved progress…"}</p></article>
        </section>
      </div>
    </main>
  );
}

function CardHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action: string }) { return <div className="card-header"><div><p className="overline">{eyebrow}</p><h2>{title}</h2></div><button className="text-button">{action}</button></div>; }
function Day({ label, done, today }: { label: string; done?: boolean; today?: boolean }) { return <span className={`day ${done ? "day--done" : ""} ${today ? "day--today" : ""}`}>{label}</span>; }
