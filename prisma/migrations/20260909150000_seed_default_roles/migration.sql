INSERT INTO "t_role" ("id", "role_id", "role_label", "role_type")
VALUES
  ('c9c8b6c7-4f7e-4a5d-9d7d-4c7d0a1b0001', 'admin', '管理员', 'system'),
  ('c9c8b6c7-4f7e-4a5d-9d7d-4c7d0a1b0002', 'user', '普通用户', 'system')
ON CONFLICT ("role_id") DO UPDATE
SET
  "role_label" = EXCLUDED."role_label",
  "role_type" = EXCLUDED."role_type";
