import Database from "better-sqlite3";
import { nanoid } from "nanoid";

const databasePath = process.env.DATABASE_PATH || "ops.db";
export const db = new Database(databasePath);

db.pragma("journal_mode = WAL");

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS initiatives (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      owner TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      due_date TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS risks (
      id TEXT PRIMARY KEY,
      initiative_id TEXT,
      title TEXT NOT NULL,
      severity TEXT NOT NULL,
      mitigation TEXT NOT NULL,
      open INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (initiative_id) REFERENCES initiatives(id)
    );
  `);
}

export function seed() {
  const initiativeCount = db.prepare("SELECT COUNT(*) AS count FROM initiatives").get().count;

  if (initiativeCount > 0) {
    return;
  }

  const now = new Date().toISOString();
  const initiatives = [
    ["Customer onboarding refresh", "Maya", "in-progress", "high", "2026-07-18", 64],
    ["Usage analytics rollout", "Liam", "planned", "medium", "2026-08-02", 18],
    ["Billing migration", "Nora", "blocked", "critical", "2026-07-05", 41],
    ["Support automation", "Evan", "done", "low", "2026-06-12", 100]
  ];

  const insertInitiative = db.prepare(`
    INSERT INTO initiatives (id, title, owner, status, priority, due_date, progress, created_at)
    VALUES (@id, @title, @owner, @status, @priority, @dueDate, @progress, @createdAt)
  `);

  const ids = initiatives.map(([title, owner, status, priority, dueDate, progress]) => {
    const id = nanoid();
    insertInitiative.run({ id, title, owner, status, priority, dueDate, progress, createdAt: now });
    return id;
  });

  const insertRisk = db.prepare(`
    INSERT INTO risks (id, initiative_id, title, severity, mitigation, open, created_at)
    VALUES (@id, @initiativeId, @title, @severity, @mitigation, @open, @createdAt)
  `);

  [
    [ids[0], "Training content may lag release", "medium", "Pair docs review with final QA.", 1],
    [ids[2], "Legacy invoices need reconciliation", "high", "Run parallel exports for two billing cycles.", 1],
    [ids[1], "Event schema may change", "low", "Version tracking events before rollout.", 1]
  ].forEach(([initiativeId, title, severity, mitigation, open]) => {
    insertRisk.run({ id: nanoid(), initiativeId, title, severity, mitigation, open, createdAt: now });
  });
}

