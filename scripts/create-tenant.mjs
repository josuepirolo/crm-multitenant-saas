#!/usr/bin/env node
/**
 * Script para criar um tenant (empresa + owner) diretamente no banco.
 * Uso: node scripts/create-tenant.mjs
 *
 * Requer: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { createInterface } from 'readline'
import { readFileSync } from 'fs'
import { randomBytes } from 'crypto'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ── Carrega .env.local ────────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dir, '../.env.local')

let env = {}
try {
  const raw = readFileSync(envPath, 'utf-8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx < 0) continue
    const key = trimmed.slice(0, idx).trim()
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    env[key] = val
  }
} catch {
  console.error('❌  Não encontrei .env.local. Rode na raiz do projeto.')
  process.exit(1)
}

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_KEY  = env['SUPABASE_SERVICE_ROLE_KEY']

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes no .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Helpers ───────────────────────────────────────────────────────────────────
const rl = createInterface({ input: process.stdin, output: process.stdout })

function ask(question, defaultValue = '') {
  return new Promise(resolve => {
    const hint = defaultValue ? ` [${defaultValue}]` : ''
    rl.question(`${question}${hint}: `, answer => {
      resolve(answer.trim() || defaultValue)
    })
  })
}

function askRequired(question) {
  return new Promise(async resolve => {
    let value = ''
    while (!value) {
      value = (await ask(`${question} *`)).trim()
      if (!value) console.log('  ⚠️  Campo obrigatório.')
    }
    resolve(value)
  })
}

function section(title) {
  console.log(`\n${'─'.repeat(50)}`)
  console.log(`  ${title}`)
  console.log('─'.repeat(50))
}

function toSlug(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function generatePassword() {
  return randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)
}

function onlyDigits(str) {
  return str.replace(/\D/g, '')
}

async function checkUniqueness(document, email) {
  const errors = []

  if (document) {
    const { data } = await supabase
      .from('workspaces')
      .select('id, name')
      .eq('document', document)
      .limit(1)
    if (data?.length) errors.push(`CNPJ/CPF já cadastrado na empresa "${data[0].name}"`)
  }

  if (email) {
    const { data } = await supabase
      .from('workspaces')
      .select('id, name')
      .eq('email', email)
      .limit(1)
    if (data?.length) errors.push(`E-mail corporativo já cadastrado na empresa "${data[0].name}"`)
  }

  return errors
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔════════════════════════════════════════════════════╗')
  console.log('║      CRM WhatsApp — Criar Novo Tenant (Empresa)    ║')
  console.log('╚════════════════════════════════════════════════════╝')
  console.log('  Campos com * são obrigatórios.\n')

  // ── 1. Dados da Empresa ───────────────────────────────────────────────────
  section('1 / 4  —  Dados da Empresa')

  const displayName  = await askRequired('Nome fantasia (exibido no sistema)')
  const legalName    = await ask('Razão social')
  const documentRaw  = await ask('CNPJ ou CPF (com ou sem máscara)')
  const document     = onlyDigits(documentRaw)
  const companyPhone = onlyDigits(await ask('Telefone da empresa (com ou sem máscara)'))
  const companyEmail = await ask('E-mail da empresa')

  const slugBase     = toSlug(displayName)
  const slugSuffix   = randomBytes(3).toString('hex')
  const slug         = `${slugBase}-${slugSuffix}`

  // ── 2. Endereço ───────────────────────────────────────────────────────────
  section('2 / 4  —  Endereço')

  const zipcode      = onlyDigits(await ask('CEP (com ou sem máscara)'))
  const street       = await ask('Logradouro')
  const number       = await ask('Número')
  const complement   = await ask('Complemento')
  const district     = await ask('Bairro')
  const city         = await ask('Cidade')
  const state        = await ask('Estado (UF, ex: SP)')

  // ── 3. Nicho de negócio ───────────────────────────────────────────────────
  section('3 / 4  —  Nicho de Negócio')

  const { data: niches, error: nicheErr } = await supabase
    .from('business_niches')
    .select('id, name, slug, parent_id')
    .eq('is_active', true)
    .order('sort_order')

  let nicheId = null

  if (nicheErr || !niches?.length) {
    console.log('  ⚠️  Nenhum nicho encontrado — continuando sem nicho.')
  } else {
    // Exibe hierarquia: pais primeiro, filhos identados
    const parents = niches.filter(n => !n.parent_id)
    const children = niches.filter(n => n.parent_id)

    console.log('\n  Nichos disponíveis:\n')
    const indexed = []
    let i = 1
    for (const parent of parents) {
      console.log(`  ${i}) ${parent.name}`)
      indexed.push(parent)
      i++
      for (const child of children.filter(c => c.parent_id === parent.id)) {
        console.log(`     ${i}) ↳ ${child.name}`)
        indexed.push(child)
        i++
      }
    }

    console.log(`\n  0) Nenhum / pular`)

    let pick = ''
    while (true) {
      pick = await ask(`\n  Escolha o número do nicho`)
      const num = parseInt(pick, 10)
      if (pick === '0' || pick === '') break
      if (!isNaN(num) && num >= 1 && num < i) {
        nicheId = indexed[num - 1].id
        console.log(`  ✓ Selecionado: ${indexed[num - 1].name}`)
        break
      }
      console.log('  ⚠️  Número inválido.')
    }
  }

  // ── 4. Owner (usuário responsável) ───────────────────────────────────────
  section('4 / 4  —  Usuário Owner (responsável pela empresa)')

  const ownerName  = await askRequired('Nome completo do responsável')
  const ownerEmail = await askRequired('E-mail do responsável (será usado para login)')

  const autoPassword = generatePassword()
  const ownerPasswordInput = await ask(
    `Senha (deixe em branco para gerar automaticamente: ${autoPassword})`
  )
  const ownerPassword = ownerPasswordInput || autoPassword

  // ── Validação de unicidade ────────────────────────────────────────────────
  process.stdout.write('\n  Verificando duplicatas...')
  const uniqueErrors = await checkUniqueness(document || null, companyEmail || null)
  if (uniqueErrors.length) {
    console.log(' ❌\n')
    for (const e of uniqueErrors) console.error(`  ⛔  ${e}`)
    console.log('\n  Corrija os dados e rode o script novamente.\n')
    rl.close()
    process.exit(1)
  }
  console.log(' ✓')

  // ── Confirmação ───────────────────────────────────────────────────────────
  section('Confirmação — revise os dados antes de continuar')

  console.log(`
  Empresa
    Nome fantasia : ${displayName}
    Razão social  : ${legalName  || '—'}
    CNPJ          : ${document   || '—'}
    Telefone      : ${companyPhone || '—'}
    E-mail        : ${companyEmail || '—'}
    Endereço      : ${[street, number, complement].filter(Boolean).join(', ') || '—'}
                    ${[district, city, state, zipcode].filter(Boolean).join(' - ') || ''}

  Nicho           : ${nicheId ? (niches.find(n => n.id === nicheId)?.name ?? nicheId) : '—'}

  Owner
    Nome          : ${ownerName}
    E-mail        : ${ownerEmail}
    Senha         : ${ownerPassword}
  `)

  const confirm = await ask('Criar agora? (s/N)', 'N')
  if (confirm.toLowerCase() !== 's') {
    console.log('\n  Operação cancelada.\n')
    rl.close()
    process.exit(0)
  }

  rl.close()

  // ── Criação ───────────────────────────────────────────────────────────────
  console.log('\n  Criando...\n')

  // 1. Cria o usuário no Supabase Auth
  process.stdout.write('  [1/4] Criando usuário no Auth...')
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: ownerEmail,
    password: ownerPassword,
    email_confirm: true,
    user_metadata: { name: ownerName },
  })

  if (authErr) {
    console.log(' ❌')
    console.error(`\n  Erro ao criar usuário: ${authErr.message}`)
    process.exit(1)
  }
  const userId = authData.user.id
  console.log(` ✓  (id: ${userId})`)

  // 2. Cria o workspace
  process.stdout.write('  [2/4] Criando workspace...')
  const workspacePayload = {
    name:                displayName,
    slug,
    display_name:        displayName,
    legal_name:          legalName        || null,
    document:            document         || null,
    phone:               companyPhone     || null,
    email:               companyEmail     || null,
    address_street:      street           || null,
    address_number:      number           || null,
    address_complement:  complement       || null,
    address_district:    district         || null,
    address_city:        city             || null,
    address_state:       state?.toUpperCase().slice(0, 2) || null,
    address_zipcode:     zipcode          || null,
    address_country:     'BR',
    business_niche_id:   nicheId,
    is_active:           true,
  }

  const { data: workspace, error: wsErr } = await supabase
    .from('workspaces')
    .insert(workspacePayload)
    .select('id, name, slug')
    .single()

  if (wsErr) {
    console.log(' ❌')
    console.error(`\n  Erro ao criar workspace: ${wsErr.message}`)
    // Tenta limpar o usuário criado
    await supabase.auth.admin.deleteUser(userId)
    process.exit(1)
  }
  const workspaceId = workspace.id
  console.log(` ✓  (id: ${workspaceId})`)

  // 3. Linka owner ao workspace
  process.stdout.write('  [3/4] Vinculando owner ao workspace...')
  const { error: memberErr } = await supabase
    .from('workspace_members')
    .insert({ workspace_id: workspaceId, user_id: userId, role: 'owner' })

  if (memberErr) {
    console.log(' ❌')
    console.error(`\n  Erro ao criar membership: ${memberErr.message}`)
    process.exit(1)
  }
  console.log(' ✓')

  // 4. Atualiza profile (nome + workspace ativo)
  process.stdout.write('  [4/4] Atualizando perfil do usuário...')
  const { error: profileErr } = await supabase
    .from('profiles')
    .upsert({
      id:                   userId,
      name:                 ownerName,
      current_workspace_id: workspaceId,
    }, { onConflict: 'id' })

  if (profileErr) {
    console.log(' ❌')
    console.error(`\n  Erro ao atualizar profile: ${profileErr.message}`)
    process.exit(1)
  }
  console.log(' ✓')

  // ── Resultado ─────────────────────────────────────────────────────────────
  console.log('\n╔════════════════════════════════════════════════════╗')
  console.log('║                ✅  Tenant criado!                  ║')
  console.log('╚════════════════════════════════════════════════════╝')
  console.log(`
  workspace_id  : ${workspaceId}
  slug          : ${slug}
  owner_id      : ${userId}
  login (email) : ${ownerEmail}
  senha         : ${ownerPassword}

  ⚠️  Guarde a senha — ela não é recuperável por este script.
  `)
}

main().catch(err => {
  console.error('\n❌  Erro inesperado:', err.message)
  rl.close()
  process.exit(1)
})
