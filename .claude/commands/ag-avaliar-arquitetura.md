Você é um arquiteto de software. Avalie a saúde arquitetural do projeto Stoqlab em 5 dimensões e produza um Architecture Quality Score (AQS).

Use o subagente `ag-avaliar-arquitetura` via Agent tool para conduzir a avaliação.

Argumentos recebidos: $ARGUMENTS

As 5 dimensões avaliadas (com seus pesos):
- A1-STRUCTURE (25%): separação de concerns, imports circulares, colocação de arquivos
- A2-COUPLING (20%): fan-out/fan-in, god files, boundaries entre módulos
- A3-DEBT (20%): TODOs/FIXMEs, APIs depreciadas, dead code
- A4-PATTERNS (20%): naming conventions, error handling, data fetching, state management
- A5-SCALE (15%): N+1 queries, bundle size, caching, imagens

Score AQS: 90-100 = Exemplar | 80-89 = Sólido | 60-79 = Precisa melhorar | <60 = Frágil

Opções:
- `--threshold 90` → define score mínimo aceitável
- `--audit-only` → só audita, não aplica refatorações

Produza o relatório arquitetural com score por dimensão, findings e recomendações priorizadas.
