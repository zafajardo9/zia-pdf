import config from '../../brand.config.json'

export const BRAND = {
  ...config,
  repositoryIssuesUrl: `${config.repositoryUrl}/issues`,
  repositoryReleasesUrl: `${config.repositoryUrl}/releases/latest`,
  licenseUrl: `${config.repositoryUrl}/blob/main/LICENSE`,
  documentTitle: `${config.name} — ${config.tagline}`,
} as const

export type BrandConfig = typeof BRAND
