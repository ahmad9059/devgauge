import type { Db } from "../client.js";

export interface AuditInput {
  userId?: string | null;
  actor?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export const insertAudit = async (db: Db, input: AuditInput): Promise<void> => {
  await db`
    insert into audit_events (user_id, actor, action, resource_type, resource_id, metadata)
    values (
      ${input.userId ?? null}, ${input.actor ?? null}, ${input.action},
      ${input.resourceType ?? null}, ${input.resourceId ?? null},
      ${input.metadata ? db.json(input.metadata as unknown as Parameters<typeof db.json>[0]) : null}
    )
  `;
};