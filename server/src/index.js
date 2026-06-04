import cors from "cors";
import express from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db, migrate, seed } from "./db.js";

const app = express();
const port = process.env.PORT || 4000;

migrate();
seed();

app.use(cors());
app.use(express.json());

const initiativeSchema = z.object({
  title: z.string().min(2),
  owner: z.string().min(2),
  status: z.enum(["planned", "in-progress", "blocked", "done"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  dueDate: z.string().min(8),
  progress: z.number().int().min(0).max(100)
});

const riskSchema = z.object({
  initiativeId: z.string().optional(),
  title: z.string().min(2),
  severity: z.enum(["low", "medium", "high"]),
  mitigation: z.string().min(2),
  open: z.boolean().default(true)
});

function mapInitiative(row) {
  return {
    id: row.id,
    title: row.title,
    owner: row.owner,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    progress: row.progress,
    createdAt: row.created_at
  };
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "team-ops-dashboard" });
});

app.get("/api/initiatives", (req, res) => {
  const { status = "all", q = "" } = req.query;
  const search = `%${String(q).toLowerCase()}%`;
  const rows = db.prepare(`
    SELECT * FROM initiatives
    WHERE (@status = 'all' OR status = @status)
      AND (LOWER(title) LIKE @search OR LOWER(owner) LIKE @search)
    ORDER BY
      CASE priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        ELSE 4
      END,
      due_date ASC
  `).all({ status, search });

  res.json(rows.map(mapInitiative));
});

app.post("/api/initiatives", (req, res) => {
  const parsed = initiativeSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const id = nanoid();
  const createdAt = new Date().toISOString();
  const initiative = { id, ...parsed.data, createdAt };

  db.prepare(`
    INSERT INTO initiatives (id, title, owner, status, priority, due_date, progress, created_at)
    VALUES (@id, @title, @owner, @status, @priority, @dueDate, @progress, @createdAt)
  `).run(initiative);

  return res.status(201).json(initiative);
});

app.patch("/api/initiatives/:id", (req, res) => {
  const current = db.prepare("SELECT * FROM initiatives WHERE id = ?").get(req.params.id);

  if (!current) {
    return res.status(404).json({ error: "Initiative not found." });
  }

  const candidate = {
    title: req.body.title ?? current.title,
    owner: req.body.owner ?? current.owner,
    status: req.body.status ?? current.status,
    priority: req.body.priority ?? current.priority,
    dueDate: req.body.dueDate ?? current.due_date,
    progress: req.body.progress ?? current.progress
  };
  const parsed = initiativeSchema.safeParse(candidate);

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  db.prepare(`
    UPDATE initiatives
    SET title = @title, owner = @owner, status = @status, priority = @priority, due_date = @dueDate, progress = @progress
    WHERE id = @id
  `).run({ id: req.params.id, ...parsed.data });

  const updated = db.prepare("SELECT * FROM initiatives WHERE id = ?").get(req.params.id);
  return res.json(mapInitiative(updated));
});

app.get("/api/risks", (req, res) => {
  const rows = db.prepare(`
    SELECT risks.*, initiatives.title AS initiative_title
    FROM risks
    LEFT JOIN initiatives ON initiatives.id = risks.initiative_id
    ORDER BY
      CASE risks.severity
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        ELSE 3
      END,
      risks.created_at DESC
  `).all();

  res.json(rows.map((row) => ({
    id: row.id,
    initiativeId: row.initiative_id,
    initiativeTitle: row.initiative_title,
    title: row.title,
    severity: row.severity,
    mitigation: row.mitigation,
    open: Boolean(row.open),
    createdAt: row.created_at
  })));
});

app.post("/api/risks", (req, res) => {
  const parsed = riskSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const risk = {
    id: nanoid(),
    initiativeId: parsed.data.initiativeId || null,
    ...parsed.data,
    open: parsed.data.open ? 1 : 0,
    createdAt: new Date().toISOString()
  };

  db.prepare(`
    INSERT INTO risks (id, initiative_id, title, severity, mitigation, open, created_at)
    VALUES (@id, @initiativeId, @title, @severity, @mitigation, @open, @createdAt)
  `).run(risk);

  res.status(201).json({ ...risk, open: Boolean(risk.open) });
});

app.get("/api/metrics", (req, res) => {
  const initiatives = db.prepare("SELECT status, progress FROM initiatives").all();
  const risks = db.prepare("SELECT severity, open FROM risks").all();
  const total = initiatives.length || 1;
  const done = initiatives.filter((item) => item.status === "done").length;
  const blocked = initiatives.filter((item) => item.status === "blocked").length;
  const avgProgress = Math.round(initiatives.reduce((sum, item) => sum + item.progress, 0) / total);
  const highRisks = risks.filter((risk) => risk.open && risk.severity === "high").length;

  res.json({
    completionRate: Math.round((done / total) * 100),
    blockedWork: blocked,
    averageProgress: avgProgress,
    openHighRisks: highRisks
  });
});

app.listen(port, () => {
  console.log(`Team Ops Dashboard API running on http://localhost:${port}`);
});

