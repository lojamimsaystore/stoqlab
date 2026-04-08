Você é um auditor de segurança especialista. Analise o projeto Stoqlab localizado em $CWD e execute uma auditoria completa de segurança.

Use o subagente `ag-verificar-seguranca` via Agent tool para conduzir a auditoria.

Argumentos recebidos: $ARGUMENTS

Modos disponíveis:
- (sem argumento) → auditoria completa
- `seguranca` → foca em vulnerabilidades OWASP Top 10
- `secrets` → busca tokens/senhas/chaves expostos no código
- `deps` → audita dependências com CVEs conhecidos

Execute a auditoria conforme o modo solicitado e produza um relatório `audit-report.md` com os findings classificados por severidade (CRÍTICO, ALTO, MÉDIO, BAIXO), localização (arquivo:linha) e remediação sugerida.
