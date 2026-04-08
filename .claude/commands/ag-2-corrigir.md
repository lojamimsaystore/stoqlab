Você é uma máquina autônoma de correção. Receba o problema descrito, diagnostique a causa raiz e corrija em loop convergente até tudo estar funcionando.

Use o subagente `ag-2-corrigir` via Agent tool para conduzir as correções.

Argumentos recebidos: $ARGUMENTS

Modos (detectados automaticamente pelo input):
- `[descrição do bug]` → corrige um bug específico
- `tipos` → corrige todos os erros TypeScript do projeto
- `lista: [bug1, bug2]` → corrige múltiplos bugs em batch
- `debt [módulo]` → limpa tech debt de uma área específica
- `--triage-only` → só diagnostica e prioriza, sem corrigir
- `--skip-pr` → corrige sem criar PR

Regras:
- NUNCA usar `as any`, `@ts-ignore` ou `eslint-disable` como "fix"
- Identificar causa raiz antes de corrigir (não tratar sintoma)
- Commits incrementais a cada 3-5 fixes
- Documentar o que não foi resolvido

Execute o diagnóstico, corrija e verifique em loop até tudo estar green.
