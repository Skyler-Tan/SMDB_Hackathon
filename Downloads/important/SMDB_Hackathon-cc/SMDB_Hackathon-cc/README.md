# 3R Scan

Scan an item, see if it is recyclable and which bin it belongs in, then either **recycle** it (points + water / materials / greenhouse-gas savings) or **reuse** it (DIY ideas by difficulty, with tools, materials, steps, and a YouTube walkthrough).

- Frontend: **React**
- API: **Java Spring Boot**
- Database: **MongoDB**

## What you need

Install these if they are not already on this PC:

1. [Git](https://git-scm.com/download/win)
2. [Microsoft OpenJDK 21](https://learn.microsoft.com/java/openjdk/download)
3. [Maven](https://maven.apache.org/download.cgi)
4. [Node.js 22](https://nodejs.org/)
5. [MongoDB Community Server](https://www.mongodb.com/try/download/community) (leave it running on port `27017`)

## Run

Terminal 1 — database should already be running, then start the API:

```powershell
cd C:\Users\choon\three-r\backend
mvn spring-boot:run
```

Terminal 2 — React app:

```powershell
cd C:\Users\choon\three-r\frontend
npm install
npm run dev
```

Open [http://localhost:4200](http://localhost:4200). Allow the camera. Use **Scan**, or **Upload photo** / **Pick from list** if the camera is blocked.

On a phone, use the same Wi‑Fi and open `http://YOUR-PC-IP:4200`. HTTPS may be required for camera on some phones; upload still works.

## How it maps to your idea

| You asked for | Where it lives |
| --- | --- |
| Scan any item | Camera + on-device detector, then Java matches a catalog |
| Recyclable yes/no + bin | Popup after scan (`plastic` / `paper` / `glass` / `metal` / `e-waste` / `general`) |
| Recycle button | Logs the item in MongoDB, adds points, shows water / CO₂ / material savings. Use +/− if you recycled 3 bottles at once |
| Rewards | Points + badges on the Rewards tab |
| Reuse button | DIY cards for that material |
| Difficulty dropdown, top left | Easy / medium / hard on the reuse screen |
| Video or steps, tools, materials | DIY detail page |

Savings are **estimates** of what it takes to manufacture those items, so you can see why recycling 3 PET bottles matters. They are not lab measurements.

If the detector is unsure, pick the item from the list (for example **Plastic bottle (1.5 L)** vs **500 ml**).
