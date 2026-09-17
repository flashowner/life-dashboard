# Life Dashboard

一个把真实生活变成可视化 RPG 的个人成长仪表盘。

Life Dashboard 用等级、经验值、人生属性和每日任务，帮助你持续记录那些真正重要的小进步。

## Features

- Level & XP progression
- Five life attributes: Vitality, Focus, Connection, Growth, and Order
- Radar chart for weekly balance
- Daily quests, habits, and main quests
- Streak tracking
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

Quest progress and language preference are stored locally in the browser. The first version does not require an account, backend, or database.

