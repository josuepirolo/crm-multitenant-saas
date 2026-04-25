"""
Hook: skill-loader
Evento: UserPromptSubmit
Injeta lembrete das skills arquitetura e performance quando o prompt indica implementação.
"""
import sys
import json

data = json.load(sys.stdin)
prompt = data.get("prompt", "").lower()

IMPL_KEYWORDS = [
    "criar", "crie", "cria", "novo", "nova", "novas", "novos",
    "implementar", "implemente", "implementa",
    "adicionar", "adicione", "adiciona",
    "construir", "construa", "build",
    "desenvolver", "desenvolva",
    "fazer", "faça", "faz",
    "refatorar", "refatore", "refatora",
    "alterar", "altere", "altera",
    "modificar", "modifique", "modifica",
    "atualizar", "atualize", "atualiza",
    "modulo", "módulo", "feature",
    "componente", "página", "pagina",
    "action", "server action", "query", "migration",
    "fix", "corrigir", "corrija", "corrige",
    "ajustar", "ajuste", "ajusta",
    "trocar", "troque", "troca",
    "skill", "quero que", "preciso que",
    "escrever", "escreva", "coda", "code",
    "make", "create", "update", "change",
    "module", "page", "component",
]

is_impl = any(kw in prompt for kw in IMPL_KEYWORDS)

if is_impl:
    context = (
        "SKILLS OBRIGATÓRIAS ATIVAS:\n"
        "Esta tarefa envolve implementação. Antes de escrever qualquer código:\n"
        "1. Carregue e siga a skill ARQUITETURA: .claude/skills/arquitetura/SKILL.md\n"
        "   → Define Clean Architecture + MVVM, camadas, nomenclatura, segurança e checklist de UI.\n"
        "2. Carregue e siga a skill PERFORMANCE: .claude/skills/performance/SKILL.md\n"
        "   → Define operações síncronas/otimistas/background, toast.promise(), skeleton, debounce.\n"
        "Não pule este passo — estas skills são obrigatórias em toda implementação ou alteração."
    )
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "UserPromptSubmit",
            "additionalContext": context
        }
    }))
