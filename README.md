# Removedor de Duplicados

CLI em Node.js + TypeScript para encontrar e remover arquivos duplicados dentro de uma pasta.

O script percorre pastas recursivamente, agrupa arquivos por extensão e tamanho em bytes, e calcula MD5 apenas nos grupos candidatos. Duplicata confirmada = mesma extensão, mesmo tamanho e mesmo MD5. O primeiro caminho em ordem lexicográfica é mantido; os demais podem ser removidos.

## Pré-requisitos

- Node.js `24.14.0`
- npm para instalar dependências de desenvolvimento

Em runtime, o bundle final usa apenas APIs nativas do Node.js. Não precisa de `node_modules`.

## Instalar Para Desenvolvimento

```bash
npm install
```

## Scripts

```bash
npm run dev -- --path /caminho/da/pasta --dry-run
npm run build
npm run build:bundle
npm run start -- --path /caminho/da/pasta --dry-run
npm run smoke
npm run smoke:bundle
npm run lint
npm run check
npm run format
```

## Como Usar Em Desenvolvimento

Dry-run é o modo padrão. Ele não remove arquivos e gera um relatório `.txt` com estatísticas, duplicatas encontradas, arquivos que seriam removidos e snapshot final esperado.

```bash
npm run dev -- --path /caminho/da/pasta
```

Para remover duplicatas de fato, use `--execute`:

```bash
npm run dev -- --path /caminho/da/pasta --execute
```

Opções disponíveis:

```bash
--path <dir>       Pasta alvo. Também aceita caminho posicional.
--dry-run          Simula remoção. Padrão.
--execute          Remove arquivos duplicados.
--verbose          Mostra logs detalhados.
--report <file>    Caminho do relatório txt.
--error-log <file> Caminho do log de erros txt.
--help             Mostra ajuda.
```

Exemplo com relatório customizado:

```bash
npm run dev -- --path ~/Fotos --dry-run --report reports/fotos-dry-run.txt --error-log reports/fotos-errors.txt
```

## Gerar Bundle Único

O `tsc` compila TypeScript, mas não gera um arquivo único com bundle. Para isso, o projeto usa `esbuild` como dependência de desenvolvimento.

Gere o bundle:

```bash
npm run build:bundle
```

Saída:

```text
release/
|_remover-duplicados.mjs
```

Esse arquivo `.mjs` já contém todo o código da aplicação. Ele não contém dependências npm de runtime porque o projeto usa APIs nativas do Node.js para filesystem, streams e MD5.

Teste o bundle antes de copiar:

```bash
npm run smoke:bundle
```

## Usar Isoladamente Sem node_modules

Esta é a forma recomendada para rodar em uma pasta sincronizada na nuvem.

No computador de desenvolvimento:

```bash
npm install
npm run build:bundle
npm run smoke:bundle
```

Depois copie apenas este arquivo para a pasta sincronizada:

```text
pasta-na-nuvem/
|_remover-duplicados.mjs
```

Rodar na pasta sincronizada:

```bash
node remover-duplicados.mjs --path /caminho/da/pasta --dry-run
node remover-duplicados.mjs --path /caminho/da/pasta --execute --verbose
```

Não copie `node_modules`. Também não precisa copiar `dist/` nem `package.json` quando usar o bundle `.mjs`.

## Usar Build TypeScript Sem Bundle

Também é possível usar a saída normal do TypeScript:

```bash
npm run build
node dist/index.js --path /caminho/da/pasta --dry-run
```

Nesse formato, é necessário manter `dist/` e um `package.json` com `"type": "module"` junto/acima da pasta `dist/`. Para uso isolado, prefira o bundle único.

## Relatórios e Logs

Por padrão, arquivos são gerados em `reports/`:

- `report-<timestamp>.txt`: estatísticas, duplicatas, ações planejadas/executadas e snapshot final.
- `errors-<timestamp>.txt`: erros streamados durante validação, leitura, hash, remoção ou report.

Erros em arquivos individuais não interrompem toda execução. O erro é registrado e o script segue para os próximos arquivos.

## Smoke Test

Para simular um fluxo completo quando quiser:

```bash
npm run smoke
```

Para testar o bundle único:

```bash
npm run smoke:bundle
```

Esses comandos criam uma fixture em `reports/smoke-input`, rodam dry-run, rodam execute, e validam que:

- duplicata real foi removida no execute;
- arquivo mantido continuou existindo;
- arquivos com mesmo tamanho mas conteúdo diferente não foram removidos.

## Créditos

Projeto desenvolvido com auxílio do Cursor, utilizando o modelo GPT-5.5.

## Licença

Este projeto está licenciado sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
