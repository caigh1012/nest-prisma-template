INSERT INTO "t_user_role" ("id", "user_id", "role_id")
VALUES
  ('eb0e6b67-fa46-4453-b900-78ee7b605099', '879d3e4b-d95a-4b39-8434-316a4830d962', 'c9c8b6c7-4f7e-4a5d-9d7d-4c7d0a1b0001'),
  ('b8e833f0-954e-41bf-956c-8743e8ee27d5', '879d3e4b-d95a-4b39-8434-316a4830d962', 'c9c8b6c7-4f7e-4a5d-9d7d-4c7d0a1b0002')
ON CONFLICT ("user_id", "role_id") DO NOTHING;
