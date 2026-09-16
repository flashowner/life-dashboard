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
  { name: "Focus", hint: "Mind & craft", value: 68, icon: "⌁", tone: "cyan" },
  { name: "Connection", hint: "People & presence", value: 74, icon: "☄", tone: "violet" },
  { name: "Growth", hint: "Learning & courage", value: 91, icon: "↗", tone: "lime" },
  { name: "Order", hint: "Home & finances", value: 59, icon: "◇", tone: "gold" },
];

export default function Dashboard() {
  const [quests, setQuests] = useState<Quest[]>(initialQuests);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("life-dashboard-quests");
    if (saved) { try { setQuests((JSON.parse(saved) as Partial<Quest>[]).map((q, index) => ({ id: q.id ?? Date.now() + index, label: q.label ?? "New quest", xp: q.xp ?? 20, done: q.done ?? false, kind: q.kind ?? "habit", isMainQuest: q.isMainQuest ?? false }))); } catch { /* use starter state */ } }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) window.localStorage.setItem("life-dashboard-quests", JSON.stringify(quests)); }, [quests, ready]);

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

  return <main className="min-h-screen overflow-hidden bg-[#070b18] text-[#f4f6ff]">
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <div className="relative mx-auto grid min-h-screen max-w-[1540px] lg:grid-cols-[244px_minmax(0,1fr)]">
      <aside className="hidden border-r border-white/10 bg-[#060a17]/40 px-[18px] py-8 backdrop-blur-xl lg:flex lg:flex-col">
        <div className="flex items-center gap-2.5 px-2.5 pb-13 text-xl font-extrabold tracking-tight"><span className="grid size-8 place-items-center rounded-[9px] bg-linear-to-br from-[#a997ff] to-[#5d47d3] font-mono text-sm shadow-[0_0_24px_#8069ff88]">L</span>Life<span className="font-medium text-[#aaa2cb]">OS</span></div>
        <nav className="grid gap-2 text-sm font-semibold text-[#8e96af]"><a className="rounded-lg bg-linear-to-r from-[#806cf43b] to-transparent px-3 py-3 text-white shadow-[inset_2px_0_#9f8dff]" href="#dashboard">◈ <span className="ml-3">Dashboard</span></a><a className="rounded-lg px-3 py-3 hover:bg-white/5" href="#quests">✓ <span className="ml-3">Daily quests</span></a><a className="rounded-lg px-3 py-3 hover:bg-white/5" href="#attributes">⌁ <span className="ml-3">Attributes</span></a><a className="rounded-lg px-3 py-3 hover:bg-white/5" href="#achievements">✦ <span className="ml-3">Achievements</span></a></nav>
        <div className="mt-auto flex items-center gap-2.5 border-t border-white/10 px-1.5 pt-5"><span className="grid size-8 place-items-center rounded-full bg-linear-to-br from-[#f6b086] to-[#9262ff] text-xs font-bold">S</span><div><b className="block text-xs">Starlight</b><span className="text-[10px] text-[#8c94ad]">Level {level} explorer</span></div></div>
      </aside>
      <section id="dashboard" className="w-full max-w-[1400px] px-5 py-8 sm:px-9 lg:px-15 lg:py-12">
        <header className="mb-7 flex items-start justify-between gap-5"><div><p className="mb-2 font-mono text-[10px] tracking-[.12em] text-[#8e98b9]">TUESDAY · SEPTEMBER 16</p><h1 className="text-3xl font-extrabold tracking-[-.06em] sm:text-[34px]">Good evening, Starlight <span className="text-[#d2c7ff]">✦</span></h1></div><div className="flex gap-2.5"><button aria-label="Notifications" className="grid size-10 place-items-center rounded-xl border border-white/10 bg-[#171d37a3] text-lg">♧</button><button className="hidden rounded-xl border border-white/10 bg-[#171d37a3] px-3 text-xs font-bold text-[#cbd2ec] sm:block"><span className="mr-1 text-[#9c88ff]">◎</span>Focus mode</button></div></header>
        {mainQuest && <article className="main-quest panel mb-[18px] flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7"><div><div className="mb-2 flex items-center gap-2"><span className="quest-star">✦</span><p className="eyebrow !mb-0 !text-[#b8aaff]">TODAY&apos;S MAIN QUEST</p></div><h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">{mainQuest.label}</h2><p className="mt-2 text-xs text-[#9ba4c0]">One meaningful step is enough. You&apos;ll earn <b className="text-[#d4c9ff]">+{mainQuest.xp + 10} XP</b> when you complete it.</p></div><div className="flex items-center gap-3"><button onClick={() => toggleQuest(mainQuest.id)} className={`main-quest-action ${mainQuest.done ? "completed" : ""}`}>{mainQuest.done ? "✓ Completed" : "Complete quest"}</button><button onClick={() => setMainQuest(mainQuest.id)} className="main-quest-link">Change</button></div></article>}
        <div className="mb-[18px] grid gap-[18px] xl:grid-cols-[1.45fr_1fr]">
          <article className="panel relative flex min-h-[242px] justify-between overflow-hidden p-7 sm:p-[30px]"><div><p className="eyebrow">CURRENT LEVEL</p><div className="level-number">{level}</div><p className="mb-6 mt-2.5 text-sm font-bold text-[#d5d9f5]">Wayfinder <span className="text-[#a892ff]">◆</span></p><div className="mb-2 flex justify-between font-mono text-[11px] text-[#aeb5d1]"><span>{levelProgress} / 500 XP</span><b className="text-[#beb6ff]">{Math.round(levelProgress / 5)}%</b></div><div className="h-1.5 overflow-hidden rounded-full bg-[#242b4c]"><div className="h-full rounded-full bg-linear-to-r from-[#a58dff] to-[#5bdaec] shadow-[0_0_16px_#816bff]" style={{ width: `${levelProgress / 5}%` }} /></div><p className="mt-2 text-[10px] text-[#8e97b3]">{500 - levelProgress} XP until <b className="text-[#c6ceea]">Level {level + 1}</b></p></div><div className="level-orbit"><div className="relative z-10 text-center"><b className="block text-4xl tracking-[-.1em]">{level}</b><span className="font-mono text-[9px] tracking-[.15em] text-[#a4acce]">LEVEL</span></div></div></article>
          <article className="panel relative min-h-[242px] overflow-hidden p-7"><p className="eyebrow">CURRENT STREAK</p><div className="text-[38px] font-extrabold tracking-[-.08em]">14 <span className="text-[15px] tracking-normal text-[#bcc4df]">days</span></div><p className="mt-1.5 text-[11px] text-[#939bb5]">You&apos;re building a rhythm. Keep it alive.</p><div className="absolute right-7 top-8 grid size-13 place-items-center rounded-[17px] border border-[#ffb16e36] bg-[#ffb06612] text-3xl text-[#ffb264]">♨</div><div className="absolute inset-x-7 bottom-6 flex justify-between gap-1"><Day label="M" done/><Day label="T" done/><Day label="W" done/><Day label="T" done/><Day label="F" today/><Day label="S"/><Day label="S"/></div></article>
        </div>
        <div className="mb-[18px] grid gap-[18px] xl:grid-cols-[1.25fr_.95fr]">
          <article id="attributes" className="panel p-6 sm:p-7"><Header eyebrow="PERSONAL STATS" title="Attributes" action="View history →"/>
            <div className="mt-6 grid gap-4">{attributes.map((stat) => <div key={stat.name} className="grid grid-cols-[135px_1fr_25px] items-center gap-2 sm:grid-cols-[158px_1fr_25px] sm:gap-4"><div className="grid grid-cols-[25px_auto] gap-x-2"><span className={`stat-icon ${stat.tone}`}>{stat.icon}</span><b className="text-xs">{stat.name}</b><small className="col-start-2 mt-0.5 text-[9px] text-[#8790ac]">{stat.hint}</small></div><div className="h-[5px] overflow-hidden rounded-full bg-[#242b4c]"><div className="h-full rounded-full bg-linear-to-r from-[#8171e9] to-[#8bdde7] shadow-[0_0_10px_#8270fa88]" style={{ width: `${stat.value}%` }}/></div><strong className="font-mono text-[11px] text-[#cfd4ed]">{stat.value}</strong></div>)}</div>
          </article>
          <article className="panel hidden p-6 sm:p-7 xl:block"><Header eyebrow="THIS WEEK" title="Balance" action="Week ▾"/><div className="h-[214px] pt-3"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radarData} outerRadius="68%"><PolarGrid stroke="#7d86aa" strokeOpacity={.28}/><PolarAngleAxis dataKey="attribute" tick={{ fill: "#9ca6c4", fontSize: 10, fontFamily: "monospace" }}/><Radar dataKey="value" stroke="#a89cff" strokeWidth={2} fill="#8671f5" fillOpacity={.48}/></RadarChart></ResponsiveContainer></div></article>
        </div>
        <article className="insight panel mb-[18px] p-5 sm:p-6"><div className="flex items-start gap-3"><span className="insight-icon">↗</span><div><p className="eyebrow">A SMALL INSIGHT FOR THIS WEEK</p><h2 className="text-base font-bold tracking-tight">Your focus is strong. Make room for connection.</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-[#9ba4c0]">You&apos;ve invested most of your recent XP in Focus and Growth. Try a 10-minute Connection quest tomorrow — a message, a call, or a shared walk is enough.</p></div></div></article>
        <article id="quests" className="panel p-5 sm:p-7"><div className="flex justify-between"><div><p className="eyebrow">SEPTEMBER 16</p><h2 className="text-lg font-bold tracking-tight">Today&apos;s quests <span className="ml-2 font-mono text-[10px] font-normal tracking-normal text-[#9790c9]">{quests.filter((q) => q.done).length}/{quests.length} complete</span></h2></div><button onClick={addQuest} aria-label="Add a new quest" className="grid size-8 place-items-center rounded-lg border border-white/10 bg-[#171d37a3] text-xl text-[#b6a9ff]">+</button></div><div className="mt-5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">{quests.map((quest) => <button key={quest.id} onClick={() => toggleQuest(quest.id)} className={`quest-card text-left ${quest.done ? "done" : ""} ${quest.isMainQuest ? "main-marked" : ""}`}><div className="mb-2 flex items-center justify-between"><span className="kind-chip">{kindLabel[quest.kind]}</span>{quest.isMainQuest && <span className="text-[#b5a6ff]" title="Today's main quest">✦</span>}</div><span className="check">{quest.done ? "✓" : ""}</span><span className="align-middle text-[11px] font-bold leading-5">{quest.label}</span><small className="ml-6 mt-2 block font-mono text-[10px] text-[#7e88a6]">+{quest.xp}{quest.isMainQuest ? " + 10 main" : ""} XP</small></button>)}</div><p className="mt-4 text-[11px] text-[#8e97b3]">{ready ? `Today you earned ${earnedToday + (mainQuest?.done ? 10 : 0)} XP. Your progress is saved on this device.` : "Loading your saved progress…"}</p></article>
      </section>
    </div>
  </main>;
}

function Header({ eyebrow, title, action }: { eyebrow: string; title: string; action: string }) { return <div className="flex items-start justify-between"><div><p className="eyebrow">{eyebrow}</p><h2 className="text-lg font-bold tracking-tight">{title}</h2></div><button className="text-[11px] text-[#a99bff]">{action}</button></div>; }
function Day({ label, done, today }: { label: string; done?: boolean; today?: boolean }) { return <span className={`grid size-[27px] place-items-center rounded-lg bg-[#242a48] font-mono text-[10px] text-[#77809b] ${done ? "bg-[#57499c] text-[#e2ddff]" : ""} ${today ? "outline outline-1 outline-offset-2 outline-[#b6aaff] bg-[#7968d4] text-white" : ""}`}>{label}</span>; }
