CREATE INDEX IF NOT EXISTS "Client_professional_whatsapp_digits_idx"
ON "Client" (
  "professionalId",
  (regexp_replace("whatsapp", '[^0-9]', '', 'g')) text_pattern_ops
);

CREATE INDEX IF NOT EXISTS "Client_professional_name_normalized_idx"
ON "Client" (
  "professionalId",
  (lower(regexp_replace(btrim("name"), '[[:space:]]+', ' ', 'g'))) text_pattern_ops,
  "id"
);
