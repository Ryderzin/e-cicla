/** "33,3%": one decimal, Brazilian style; whole numbers without the decimal. */
export function formatPercent(part: number, total: number): string {
  if (total <= 0) {
    return '0%'
  }
  const value = Math.round((part / total) * 1000) / 10
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}
