import os
import pathspec

# Configurações
OUTPUT_FILE = "estrutura_projeto.txt"
IGNORED_DIRS_DEFAULT = {
    ".git",
    ".next",
    "node_modules",
    "dist",
    "build",
    ".venv",
    "venv",
    "__pycache__",
}
IGNORED_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".pdf",
    ".zip",
    ".exe",
    ".lock",
    ".ico",
    ".webp",
}


def load_gitignore():
  """Carrega as regras do arquivo .gitignore se ele existir na raiz."""
  if os.path.exists(".gitignore"):
    with open(".gitignore", "r", encoding="utf-8") as f:
      lines = f.readlines()
    return pathspec.PathSpec.from_lines("gitwildmatch", lines)
  return None


def is_binary(file_path):
  """Verifica se um arquivo é binário analisando seus primeiros bytes."""
  try:
    with open(file_path, "r", encoding="utf-8") as f:
      f.read(1024)
    return False
  except UnicodeDecodeError:
    return True


def should_ignore(rel_path, spec):
  """Verifica se o caminho deve ser ignorado com base nas regras e extensões."""
  parts = rel_path.split(os.sep)

  # Ignorar pastas padrão
  if any(part in IGNORED_DIRS_DEFAULT for part in parts):
    return True

  # Ignorar extensões binárias comuns
  if any(rel_path.endswith(ext) for ext in IGNORED_EXTENSIONS):
    return True

  # Validar regras do .gitignore
  if spec and spec.match_file(rel_path):
    return True

  return False


def generate_project_structure():
  root_dir = "."
  gitignore_spec = load_gitignore()

  with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
    out.write("=== ESTRUTURA DE DIRETÓRIOS DO PROJETO ===\n\n")

    # 1. Escrever a árvore de pastas/arquivos de forma limpa
    for dirpath, dirnames, filenames in os.walk(root_dir):
      # Modificar dirnames in-place para evitar que o os.walk entre em pastas ignoradas
      dirnames[:] = [
          d
          for d in dirnames
          if not should_ignore(
              os.path.relpath(os.path.join(dirpath, d), root_dir),
              gitignore_spec,
          )
      ]

      rel_dir = os.path.relpath(dirpath, root_dir)
      if rel_dir == ".":
        level = 0
        indent = ""
      else:
        level = rel_dir.count(os.sep) + 1
        indent = "|   " * (level - 1) + "|-- "

      if rel_dir != ".":
        out.write(f"{indent}{os.path.basename(dirpath)}/\n")

      sub_indent = "|   " * level + "|-- "
      for filename in filenames:
        rel_file = os.path.relpath(os.path.join(dirpath, filename), root_dir)
        if not should_ignore(rel_file, gitignore_spec):
          out.write(f"{sub_indent}{filename}\n")

    out.write("\n\n=== CÓDIGO FONTE DOS ARQUIVOS ===\n\n")

    # 2. Percorrer novamente para ler o conteúdo dos arquivos de código
    for dirpath, dirnames, filenames in os.walk(root_dir):
      dirnames[:] = [
          d
          for d in dirnames
          if not should_ignore(
              os.path.relpath(os.path.join(dirpath, d), root_dir),
              gitignore_spec,
          )
      ]

      for filename in filenames:
        file_path = os.path.join(dirpath, filename)
        rel_file = os.path.relpath(file_path, root_dir)

        # Ignorar o próprio arquivo de saída e regras gerais
        if rel_file == OUTPUT_FILE or should_ignore(rel_file, gitignore_spec):
          continue

        # Ignorar arquivos binários
        if is_binary(file_path):
          continue

        out.write(f"--- ARQUIVO: {rel_file} ---\n")
        try:
          with open(file_path, "r", encoding="utf-8") as file_content:
            out.write(file_content.read())
        except Exception as e:
          out.write(f"[Erro ao ler o arquivo: {e}]")
        out.write("\n\n" + "=" * 50 + "\n\n")

  print(
      f"Sucesso! A estrutura e o código foram salvos no arquivo:"
      f" {OUTPUT_FILE}"
  )


if __name__ == "__main__":
  generate_project_structure()