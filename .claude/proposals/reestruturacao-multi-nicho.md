# Reestruturação Multi-Nicho — Decisões Aprovadas

> Status: **APROVADO** — referência para implementação
> Data: 2026-05-02

---

## 1. Fundação — Nichos e Segmentos

### Modelo de dados (já implementado)

Tabela `business_niches` com `parent_id` (adjacency list — hierarquia ilimitada).
Workspace aponta para o nó mais específico via `business_niche_id`.

**Superior à proposta original** de `Niche` + `NicheSegment` separados:
- N níveis sem alterar schema
- Workspace aponta para o nó folha (mais específico)
- Sem constraint complexa entre niche_id e segment_id

### Seed a corrigir

Substituir `auto-parts` (raiz) por hierarquia correta:

```
automotive                    ← pai (novo)
  ├── auto-parts              ← distribuidora/loja de peças
  └── auto-sales              ← concessionária/loja de veículos

moda                          ← já existe
  ├── moda-feminina
  ├── moda-masculina
  ├── moda-infantil
  └── ...
```

**Migration pendente:** `20260502_fix_automotive_niche_hierarchy.sql`

---

## 2. UI Dinâmica por Nicho (já implementado)

### Arquitetura

- `src/lib/themes/niche-themes.ts` — mapeamento `slug → CSS class`
- `src/app/globals.css` — overrides de tokens CSS por classe de nicho
- `src/app/(dashboard)/layout.tsx` — injeta classe no root baseado em `workspace.nicheSlug`
- `src/lib/workspace-context.ts` — `ActiveWorkspace.nicheSlug` via JOIN `business_niches(slug)`

### Como funciona

```
workspace.business_niche_id → business_niches.slug → getNicheThemeClass() → <div class="theme-auto-parts">
```

CSS variables (`--primary`, `--sidebar-primary`) são sobrescritas pela classe do nicho.
Dark mode continua funcionando — sem conflito com `next-themes`.

### Adicionar novo nicho/tema

1. Entrada em `niche-themes.ts`
2. 3–4 linhas em `globals.css`

---

## 3. Catálogo Global de Veículos

### Tabelas (globais — gerenciadas pelo superadmin)

```sql
vehicle_categories (id, name, slug)
-- carro, caminhao-leve, caminhao-pesado, moto, moto-eletrica,
-- bicicleta, bicicleta-eletrica, lancha, trator, onibus

vehicle_brands (id, name, slug)
-- Toyota, Mercedes-Benz, Yamaha, Cannondale, Honda...

vehicle_models (
  id, brand_id FK, category_id FK,
  name,           -- "Corolla Cross", "1113", "MT-07"
  slug,
  year_from,
  year_to,
  engine_cc,      -- cilindradas (motos e peças)
  notes
)
```

### Princípio fundamental

`vehicle_models` = o TIPO do veículo (universal, sem placa, sem cor)

Placa, cor, km → pertencem à **instância** do veículo no workspace (auto_sales_inventory).

Um Corolla Cross vermelho e um Corolla Cross cinza → mesma linha em `vehicle_models`, duas linhas em `auto_sales_inventory`.

### RLS — acesso restrito por nicho

```sql
CREATE POLICY "somente nichos automotivos"
ON vehicle_models FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspaces w
    JOIN business_niches n ON n.id = w.business_niche_id
    WHERE w.id = my_current_workspace_id()
      AND n.slug LIKE 'auto%'
  )
);
-- mesma policy para vehicle_brands e vehicle_categories
```

Lekazis (niche: `moda`) → zero acesso ao catálogo de veículos.

---

## 4. Módulo Auto Parts (distribuidora de peças)

### Tabelas

```sql
-- Catálogo global de peças (gerenciado pelo superadmin)
auto_parts_catalog (
  id, part_number, name, description,
  category,   -- "Carroceria", "Motor", "Suspensão"...
  color,      -- atributo fixo da peça (ex: "Azul")
  unit        -- "UN", "KG", "M"
)

-- Compatibilidade many-to-many: peça ↔ modelo de veículo
auto_parts_compatibility (
  part_id    FK → auto_parts_catalog,
  model_id   FK → vehicle_models,
  notes,     -- "requer adaptador ref. X", "somente câmbio manual"
  PRIMARY KEY (part_id, model_id)
)
INDEX ON auto_parts_compatibility (model_id)   -- busca por veículo
INDEX ON auto_parts_compatibility (part_id)    -- busca por peça

-- Precificação por workspace
auto_parts_workspace_pricing (
  part_id      FK → auto_parts_catalog,
  workspace_id FK → workspaces,
  cost_price   NUMERIC(12,2),
  sale_price   NUMERIC(12,2),
  markup_pct   GENERATED AS (sale-cost)/cost*100,
  margin_pct   GENERATED AS (sale-cost)/sale*100,
  PRIMARY KEY (part_id, workspace_id)
)
```

### Extensão de contato (auto_parts)

```sql
contact_profiles_auto_parts (
  contact_id   PK FK → contacts,
  workspace_id FK → workspaces,
  company_type,  -- "transportadora", "oficina", "revendedor"
  fleet_size,    -- INT: tamanho da frota
  segment        -- "heavy", "light", "agro", "moto"
)
```

### Exemplo de dado

```
Peça: Lateral Completa Dianteira (MB-LAT-COMP-AZ) — cor: Azul
Compatível com: Mercedes 1113 (heavy) | Mercedes 1313 (heavy, notas: requer reforço)
Precificação ws-distribuidora-xyz: custo R$850 / venda R$1.190 / markup 40% / margin 28.6%
```

### Queries principais

```sql
-- Peças compatíveis com um modelo específico
SELECT p.*, pr.sale_price, pr.margin_pct
FROM auto_parts_catalog p
JOIN auto_parts_compatibility c ON c.part_id = p.id
JOIN vehicle_models m ON m.id = c.model_id
JOIN auto_parts_workspace_pricing pr ON pr.part_id = p.id
WHERE m.name = '1113' AND pr.workspace_id = :ws;

-- Veículos compatíveis com uma peça (cross-manufacturer)
SELECT b.name AS brand, m.name AS model, c.notes
FROM auto_parts_compatibility c
JOIN vehicle_models m ON m.id = c.model_id
JOIN vehicle_brands b ON b.id = m.brand_id
WHERE c.part_id = :part_id;
```

---

## 5. Módulo Auto Sales (concessionária / loja de veículos)

### Tabelas

```sql
-- Estoque físico de veículos (por workspace)
auto_sales_inventory (
  id, workspace_id,
  model_id       FK → vehicle_models,
  -- instância física:
  plate,               -- nullable (0km ou sem placa convencional)
  color,
  year_manufacture,
  year_model,
  trim,                -- "XRE", "LTZ", "Sport"
  mileage_km,
  fuel,                -- "Gasolina", "Flex", "Híbrido", "Elétrico"
  transmission,        -- "Manual", "Automático", "CVT"
  chassis,
  renavam,
  condition,           -- "new", "used", "certified"
  -- flags comerciais:
  has_sinistro         BOOLEAN,
  has_cautelar_issue   BOOLEAN,
  accepts_trade_in     BOOLEAN,
  requires_down_pay    BOOLEAN,
  accepts_financing    BOOLEAN,
  status               -- "available", "reserved", "sold"
)

-- Precificação do veículo
auto_sales_inventory_pricing (
  inventory_id  PK FK → auto_sales_inventory,
  cost_price    NUMERIC(12,2),   -- NF da montadora/leilão
  offer_price   NUMERIC(12,2),   -- preço anunciado
  max_discount_price NUMERIC(12,2), -- mínimo aceitável na negociação
  markup_pct    GENERATED AS (offer-cost)/cost*100,
  margin_pct    GENERATED AS (offer-cost)/offer*100
)

-- Itens opcionais/acessórios do veículo
auto_sales_optional_items (
  id, inventory_id FK,
  name,   -- "Teto Solar", "Central Multimídia 12\"", "Insulfilm"
  price   NUMERIC(10,2)
)

-- Proposta de venda (gerada no deal)
auto_sales_proposals (
  id, workspace_id, contact_id, deal_id FK,
  inventory_id       FK → auto_sales_inventory,
  -- trade-in (veículo dado como entrada):
  trade_in_plate,
  trade_in_model_id  FK → vehicle_models,
  trade_in_year,
  trade_in_mileage_km,
  trade_in_estimated_value NUMERIC(12,2),
  -- negociação:
  final_price        NUMERIC(12,2),
  down_payment       NUMERIC(12,2),
  financing_months   SMALLINT,
  status             -- "draft", "sent", "accepted", "rejected"
)
```

### Sem `contact_profiles_auto_sales`

Placa, intenção e budget são dados da **proposta/deal**, não do perfil permanente do contato.
Contato em auto_sales = contato comum sem extensão.

### Exemplo de dado

```
Veículo: Toyota Corolla Cross 2026 XRE / Cinza Granito / 12km / 0km
Flags: sem sinistro | sem cautelar | aceita troca | não exige entrada | aceita financiamento
Precificação: custo R$142.000 / oferta R$158.900 / desconto máx R$151.000 / markup 11.9% / margin 10.6%
Opcionais: Teto Solar R$4.500 | Multimídia 12" R$2.800 | Insulfilm R$890
```

---

## 6. Módulo Fashion (loja de roupas)

### Tabelas

```sql
-- Produto base (por workspace — catálogo próprio da loja)
fashion_products (
  id, workspace_id,
  name,         -- "Vestido Gabriela"
  description,
  category,     -- "Vestidos", "Blusas", "Calças"
  gender,       -- "feminino", "masculino", "infantil", "unissex"
  brand
)

-- Variantes: cada combinação cor + tamanho é uma SKU única
fashion_product_variants (
  id, product_id FK,
  color,   -- "Azul Marinho", "Rosê", "Vermelho Marsala"
  size,    -- "PP", "P", "M", "G", "GG"
  sku      -- "GAB-AZM-M"
)
INDEX ON fashion_product_variants (product_id, color)
INDEX ON fashion_product_variants (product_id, size)

-- Precificação por variante e workspace
fashion_variant_pricing (
  variant_id   FK → fashion_product_variants,
  workspace_id FK → workspaces,
  cost_price   NUMERIC(10,2),
  sale_price   NUMERIC(10,2),
  markup_pct   GENERATED AS (sale-cost)/cost*100,
  margin_pct   GENERATED AS (sale-cost)/sale*100,
  PRIMARY KEY (variant_id, workspace_id)
)

-- Estoque por variante
fashion_variant_stock (
  variant_id   FK → fashion_product_variants,
  workspace_id FK → workspaces,
  quantity     INT,
  min_stock    INT,
  PRIMARY KEY (variant_id, workspace_id)
)

-- Extensão de contato (fashion)
contact_profiles_fashion (
  contact_id   PK FK → contacts,
  workspace_id FK → workspaces,
  shirt_size,
  pants_size,
  shoe_size,
  preferences  TEXT[]  -- ["casual", "evangelica", "fitness"]
)
```

### Diferença crítica vs auto_parts

Fashion catalog = **por workspace** (cada loja tem seus próprios produtos).
Auto parts catalog = **global** (peças são universais, preço é por workspace).

### Exemplo de dado

```
Produto: Vestido Gabriela (ws-loja-moda-bh)
Variantes: 5 tamanhos × 3 cores = 15 SKUs
Precificação variante Azul Marinho M: custo R$89 / venda R$219 / markup 146% / margin 59.4%
Estoque Azul Marinho M: 14 unidades (mín: 3)
```

---

## 7. Estrutura de Pastas — Módulos

```
src/
├── usecases/
│   ├── auto-parts/
│   │   ├── ListCompatiblePartsUseCase.ts
│   │   ├── CreateQuoteUseCase.ts
│   │   └── UpsertPartPricingUseCase.ts
│   ├── auto-sales/
│   │   ├── ListInventoryUseCase.ts
│   │   ├── CreateProposalUseCase.ts
│   │   └── UpsertInventoryUseCase.ts
│   └── fashion/
│       ├── ListProductsUseCase.ts
│       ├── UpsertVariantUseCase.ts
│       └── UpdateStockUseCase.ts
│
├── repositories/
│   ├── auto-parts/
│   │   ├── IAutoPartsCatalogRepository.ts
│   │   ├── IAutoPartsCompatibilityRepository.ts
│   │   └── SupabaseAutoPartsRepository.ts
│   ├── auto-sales/
│   │   └── ...
│   └── fashion/
│       └── ...
│
├── components/
│   ├── auto-parts/
│   │   ├── PartsCatalogSearch.tsx
│   │   ├── CompatibilityBadges.tsx
│   │   └── QuoteForm.tsx
│   ├── auto-sales/
│   │   ├── InventoryCard.tsx
│   │   ├── ProposalForm.tsx
│   │   └── VehicleFilters.tsx
│   └── fashion/
│       ├── ProductVariantSelector.tsx
│       └── StockBadge.tsx
│
└── app/(dashboard)/
    ├── auto-parts/
    │   ├── page.tsx        -- lista de peças
    │   └── quotes/page.tsx -- orçamentos
    ├── auto-sales/
    │   ├── page.tsx        -- estoque de veículos
    │   └── proposals/page.tsx
    └── fashion/
        ├── page.tsx        -- produtos
        └── stock/page.tsx
```

---

## 8. Controle de Acesso por Nicho

### RLS (banco)

- `vehicle_models`, `vehicle_brands`, `vehicle_categories` → só nichos `auto%`
- `auto_parts_catalog`, `auto_parts_compatibility` → só nicho `auto-parts`
- `auto_sales_inventory` → só nicho `auto-sales`
- `fashion_products`, `fashion_product_variants` → só nicho `moda%`

### UI (sidebar + rotas)

```ts
const NICHE_MODULES: Record<string, string[]> = {
  'auto-parts':  ['/auto-parts', '/auto-parts/quotes'],
  'auto-sales':  ['/auto-sales', '/auto-sales/proposals'],
  'moda':        ['/fashion', '/fashion/stock'],
  'automotive':  ['/auto-parts', '/auto-sales'],  // pai acessa ambos
};
```

Sidebar lê `workspace.nicheSlug` → renderiza apenas as rotas do mapa acima.

---

## 9. Regra de Precificação (todas as verticais)

```sql
-- Padrão para todas as tabelas de pricing:
markup_pct NUMERIC(8,2) GENERATED ALWAYS AS
  (ROUND((sale_price - cost_price) / NULLIF(cost_price, 0) * 100, 2)) STORED,

margin_pct NUMERIC(8,2) GENERATED ALWAYS AS
  (ROUND((sale_price - cost_price) / NULLIF(sale_price, 0) * 100, 2)) STORED
```

- Markup = lucro sobre o custo (quanto coloquei em cima)
- Margin = lucro sobre a venda (% de cada R$1 que é lucro)
- Não são calculados na aplicação — vivem no banco, indexáveis

---

## 10. Migrations Pendentes

| Migration | Status |
|---|---|
| `20260502_seed_auto_parts_niche.sql` | ✅ criado |
| `20260502_fix_automotive_niche_hierarchy.sql` | ⏳ pendente |
| `20260502_vehicle_global_catalog.sql` | ⏳ pendente |
| `20260502_auto_parts_module.sql` | ⏳ pendente |
| `20260502_auto_sales_module.sql` | ⏳ pendente |
| `20260502_fashion_module.sql` | ⏳ pendente |
| `20260502_contact_niche_profiles.sql` | ⏳ pendente |
| `20260502_niche_rls_catalog_access.sql` | ⏳ pendente |

---

## 11. Já Implementado

- `business_niches` adjacency list + RLS + seeds
- `workspace.business_niche_id` FK
- `INicheRepository` + `NicheUseCases`
- `src/lib/themes/niche-themes.ts` + CSS tokens por nicho
- `ActiveWorkspace.nicheSlug` via JOIN no workspace-context
- Injeção de tema no dashboard layout
