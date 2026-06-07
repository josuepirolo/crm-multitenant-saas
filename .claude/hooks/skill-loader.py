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

FRONTEND_KEYWORDS = [
    "frontend", "front-end", "front end",
    "ui", "ux", "interface", "layout", "design", "visual",
    "tela", "página", "pagina", "componente", "component",
    "formulário", "formulario", "form", "modal", "dialog",
    "botão", "botao", "button", "card", "tabela", "table",
    "kanban", "dashboard", "sidebar", "menu", "navbar",
    "estilo", "css", "tailwind", "tema", "dark mode", "responsiv",
    "animação", "animacao", "motion", "skeleton", "toast",
]

is_impl = any(kw in prompt for kw in IMPL_KEYWORDS)
is_frontend = any(kw in prompt for kw in FRONTEND_KEYWORDS)

if is_impl:
    lines = [
        "SKILLS OBRIGATÓRIAS ATIVAS:",
        "Esta tarefa envolve implementação. Antes de escrever qualquer código:",
        "1. Carregue e siga a skill ARQUITETURA: .claude/skills/arquitetura/SKILL.md",
        "   → Define Clean Architecture + MVVM, camadas, nomenclatura, segurança e checklist de UI.",
        "2. Carregue e siga a skill PERFORMANCE: .claude/skills/performance/SKILL.md",
        "   → Define operações síncronas/otimistas/background, toast.promise(), skeleton, debounce.",
    ]
    if is_frontend:
        lines += [
            "3. Carregue e siga a meta-skill FRONTEND-CRM: .claude/skills/frontend-crm/SKILL.md",
            "   → Detecta o modo (CRIAR/AUDITAR/REDESIGN) e orquestra frontend-design,",
            "     web-design-guidelines e vercel-react-best-practices na sequência certa.",
            "   → Use-a como ponto de entrada sempre que a tarefa envolver UI/tela/componente —",
            "     não carregue as 3 skills de frontend manualmente, deixe a frontend-crm orquestrar.",
        ]
    lines.append("Não pule este passo — estas skills são obrigatórias em toda implementação ou alteração.")
    context = "\n".join(lines)
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "UserPromptSubmit",
            "additionalContext": context
        }
    }))
