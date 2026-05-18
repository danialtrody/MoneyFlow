export function fmtCurrency(amount, currency) {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseFloat(amount))
  return currency ? `${formatted} ${currency}` : formatted
}
