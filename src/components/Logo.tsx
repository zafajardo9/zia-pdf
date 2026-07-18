import { BRAND } from '../config/brand'

export const BrandLogo = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <img
    src={BRAND.logo.publicPath}
    width={size}
    height={size}
    className={className}
    alt={`${BRAND.name} logo`}
  />
)
