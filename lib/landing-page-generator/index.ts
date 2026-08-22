import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import type { ProjectConfig, GeneratedContent, GenerationResult } from './types'
import {
  generatePackageJson,
  generateTsConfig,
  generateNextConfig,
  generatePostcssConfig,
  generateGitignore,
  generateEnvLocal,
  generateGlobalsCss,
  generateRootLayout,
  generateLeadFormComponent,
  generateFooterComponent,
  generatePrivacyPage,
  generateSupabaseClient,
  generateReadme,
} from './base-files'
import { generateTemplatePage } from './templates'
import { generateSitemapXml, generateRobotsTxt, generateCreateTableSql, generateFaviconSvg } from './seo'
import { generateLandingPageSetupSql, isValidLandingPageTableName } from '@/lib/landingPageSources'
import { createZip } from './zip'

const LOCAL_LANDING_PAGES_ROOT = '/Users/fahadsold/Documents/Jaydeep Data/Landing Pages'
const SUGGESTED_PATH_PREFIX = 'Documents/Jaydeep Data/Landing Pages'

export type GeneratedFile = { path: string; content: string | Buffer }

export function buildProjectFiles(
  config: ProjectConfig,
  content: GeneratedContent,
  sql: string
): GeneratedFile[] {
  return [
    { path: 'package.json', content: generatePackageJson(config) },
    { path: 'tsconfig.json', content: generateTsConfig() },
    { path: 'next.config.ts', content: generateNextConfig() },
    { path: 'postcss.config.mjs', content: generatePostcssConfig() },
    { path: '.gitignore', content: generateGitignore() },
    { path: '.env.local', content: generateEnvLocal(config) },
    { path: 'README.md', content: generateReadme(config) },
    { path: 'setup.sql', content: sql },
    { path: 'app/globals.css', content: generateGlobalsCss() },
    { path: 'app/layout.tsx', content: generateRootLayout(config, content) },
    { path: 'app/page.tsx', content: generateTemplatePage(config, content) },
    { path: 'app/privacy/page.tsx', content: generatePrivacyPage(config) },
    { path: 'components/LeadForm.tsx', content: generateLeadFormComponent(config) },
    { path: 'components/Footer.tsx', content: generateFooterComponent(config) },
    { path: 'lib/supabase.ts', content: generateSupabaseClient() },
    { path: 'public/sitemap.xml', content: generateSitemapXml(config) },
    { path: 'public/robots.txt', content: generateRobotsTxt(config) },
    { path: 'public/favicon.svg', content: generateFaviconSvg(config.projectName) },
  ]
}

function canWriteLocally(): boolean {
  return existsSync(LOCAL_LANDING_PAGES_ROOT) || existsSync('/Users/fahadsold/Documents/Jaydeep Data')
}

export async function generateLandingPage(
  config: ProjectConfig,
  content: GeneratedContent,
  extraFiles: GeneratedFile[] = []
): Promise<GenerationResult> {
  const errors: string[] = []
  const suggestedPath = `${SUGGESTED_PATH_PREFIX}/${config.folderName}`

  if (!isValidLandingPageTableName(config.tableName)) {
    return {
      success: false,
      projectPath: suggestedPath,
      sql: '',
      tableName: config.tableName,
      domain: config.domain,
      folderName: config.folderName,
      errors: ['Invalid table name. Use lowercase letters, numbers, and underscores only. Must start with a letter.'],
    }
  }

  try {
    const createTableSql = generateCreateTableSql(config)
    const triggerSql = generateLandingPageSetupSql({
      table_name: config.tableName,
      display_name: config.projectName,
    })
    const fullSql = createTableSql + '\n' + triggerSql

    const files = [...buildProjectFiles(config, content, fullSql), ...extraFiles]
    let wroteToDisk = false
    let projectPath = suggestedPath

    if (canWriteLocally()) {
      const projectDir = join(LOCAL_LANDING_PAGES_ROOT, config.folderName)
      const dirs = new Set<string>([projectDir])
      for (const file of files) {
        const dir = join(projectDir, file.path.split('/').slice(0, -1).join('/'))
        dirs.add(dir)
      }
      for (const dir of dirs) {
        await mkdir(dir, { recursive: true })
      }
      await Promise.all(
        files.map((file) =>
          writeFile(
            join(projectDir, file.path),
            file.content,
            Buffer.isBuffer(file.content) ? undefined : 'utf-8'
          )
        )
      )
      wroteToDisk = true
      projectPath = projectDir
    }

    const zip = createZip(
      files.map((file) => ({
        path: `${config.folderName}/${file.path}`,
        data: file.content,
      }))
    )

    return {
      success: true,
      projectPath,
      sql: fullSql,
      tableName: config.tableName,
      domain: config.domain,
      folderName: config.folderName,
      errors,
      zipBase64: zip.toString('base64'),
      wroteToDisk,
    }
  } catch (err) {
    return {
      success: false,
      projectPath: suggestedPath,
      sql: '',
      tableName: config.tableName,
      domain: config.domain,
      folderName: config.folderName,
      errors: [err instanceof Error ? err.message : 'Unknown error during generation'],
    }
  }
}

export const LANDING_PAGES_ROOT = LOCAL_LANDING_PAGES_ROOT
