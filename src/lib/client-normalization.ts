export function normalizeClientName(name: string): string {
  return name.trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
}

export function normalizeClientWhatsapp(whatsapp: string): string {
  return whatsapp.replace(/\D/g, "");
}

export function escapeClientSearchPattern(query: string): string {
  return query.replace(/[\\%_]/g, "\\$&");
}
