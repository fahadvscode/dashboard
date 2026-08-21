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
} from './base-files'
import { generateTemplatePage } from './templates'
import { generateSitemapXml, generateRobotsTxt, generateCreateTableSql, generateFaviconSvg } from './seo'
import { generateLandingPageSetupSql, isValidLandingPageTableName } from '@/lib/landingPageSources'

const LANDING_PAGES_ROOT = join(
  process.env.HOME || '/Users/fahadsold',
  'Documents',
  'Jaydeep Data',
  'Landing Pages'
)

export async function generateLandingPage(
  config: ProjectConfig,
  content: GeneratedContent
): Promise<GenerationResult> {
  const errors: string[] = []
  const projectDir = join(LANDING_PAGES_ROOT, config.folderName)

  if (existsSync(projectDir)) {
    errors.push(`Folder "${config.folderName}" already exists. Files will be overwritten.`)
  }

  if (!isValidLandingPageTableName(config.tableName)) {
    return {
      success: false,
      projectPath: projectDir,
      sql: '',
      tableName: config.tableName,
      domain: config.domain,
      folderName: config.folderName,
      errors: ['Invalid table name. Use lowercase letters, numbers, and underscores only. Must start with a letter.'],
    }
  }

  try {
    // Create directory structure
    const dirs = [
      projectDir,
      join(projectDir, 'app'),
      join(projectDir, 'app', 'privacy'),
      join(projectDir, 'components'),
      join(projectDir, 'lib'),
      join(projectDir, 'public'),
      join(projectDir, 'public', 'images'),
    ]

    for (const dir of dirs) {
      await mkdir(dir, { recursive: true })
    }

    // Generate all files
    const files: Array<{ path: string; content: string }> = [
      { path: 'package.json', content: generatePackageJson(config) },
      { path: 'tsconfig.json', content: generateTsConfig() },
      { path: 'next.config.ts', content: generateNextConfig() },
      { path: 'postcss.config.mjs', content: generatePostcssConfig() },
      { path: '.gitignore', content: generateGitignore() },
      { path: '.env.local', content: generateEnvLocal(config) },
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

    // Write all files
    await Promise.all(
      files.map(({ path, content: fileContent }) =>
        writeFile(join(projectDir, path), fileContent, 'utf-8')
      )
    )

    // Generate SQL
    const createTableSql = generateCreateTableSql(config)
    const triggerSql = generateLandingPageSetupSql({
      table_name: config.tableName,
      display_name: config.projectName,
    })
    const fullSql = createTableSql + '\n' + triggerSql

    // Save SQL to project directory for reference
    await writeFile(join(projectDir, 'setup.sql'), fullSql, 'utf-8')

    return {
      success: true,
      projectPath: projectDir,
      sql: fullSql,
      tableName: config.tableName,
      domain: config.domain,
      folderName: config.folderName,
      errors,
    }
  } catch (err) {
    return {
      success: false,
      projectPath: projectDir,
      sql: '',
      tableName: config.tableName,
      domain: config.domain,
      folderName: config.folderName,
      errors: [err instanceof Error ? err.message : 'Unknown error during generation'],
    }
  }
}

export { LANDING_PAGES_ROOT }
