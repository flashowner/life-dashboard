# Life Dashboard

一个把真实生活变成可视化 RPG 的个人成长仪表盘。

Life Dashboard 用等级、经验值、人生属性和每日任务，帮助你持续记录那些真正重要的小进步。

## Features

- Level & XP progression
- Five life attributes: Vitality, Focus, Connection, Growth, and Order
- Radar chart for weekly balance
- Daily quests, habits, and main quests
- Separate tab views for Dashboard, Quests, Attributes, Achievements, and Weekly review
- Streak tracking
- Achievements and an actionable weekly review
- Profile settings with JSON import/export
- Restore demo data or clear local progress
- Bilingual interface: English / 中文
- Local-first data storage with `localStorage`
- Responsive layout for desktop and mobile

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Recharts
- GitHub Pages + GitHub Actions

## Live Demo

https://flashowner.github.io/life-dashboard/

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:4174](http://localhost:4174) to view the dashboard.

## Production Build

```bash
npm run build
```

The static export is generated in the `out` directory.

## Deployment

The project includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml`.

Every push to the `main` branch builds the static export and deploys it to GitHub Pages. In the repository settings, set:

`Settings → Pages → Build and deployment → Source → GitHub Actions`

## Data & Privacy

Quest progress, profile name, and language preference are stored locally in the browser. Use Settings → Export JSON for a portable backup before clearing browser data or switching devices. Imported files are schema-validated and do not replace current progress when invalid.

The first version does not require an account, backend, or database.

## First-use flow

1. Add or edit a small quest and choose its type, XP reward, and attribute.
2. Complete a quest to update XP, level progress, attributes, achievements, and streaks.
3. Open Settings from the gear button to change your display name or manage a JSON backup.
4. Review Achievements and the dedicated Weekly review tab after a few days of activity.
