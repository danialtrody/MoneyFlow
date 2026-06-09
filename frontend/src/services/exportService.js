import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { fmtCurrency } from './formatUtils'

const PERIOD_LABELS = {
  '7d':  'Last 7 Days',
  '30d': 'Last 30 Days',
  '3m':  'Last 3 Months',
  '6m':  'Last 6 Months',
  '1y':  'Last Year',
  '3y':  'Last 3 Years',
  'all': 'All Time',
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function tileHtml(label, value, color, bg) {
  return `
    <div style="background:${bg};border-radius:8px;padding:14px 14px 16px;border-top:3px solid ${color};flex:1;min-width:0;">
      <div style="font-size:9px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:7px;line-height:1.3;">${label}</div>
      <div style="font-size:13px;font-weight:700;color:${color};line-height:1.5;word-break:break-word;">${value}</div>
    </div>`
}

function tableHtml(title, categories, headerColor, amtColor, currency) {
  const rows = categories.length > 0
    ? categories.map((c, i) => `
        <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:11.5px;color:#0f172a;">${esc(c.name)}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:11.5px;font-weight:700;color:${amtColor};white-space:nowrap;">${fmtCurrency(c.value, currency)}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:11px;color:#64748b;white-space:nowrap;">${c.pct.toFixed(1)}%</td>
        </tr>`).join('')
    : `<tr><td colspan="3" style="padding:12px 8px;text-align:center;font-size:11px;color:#94a3b8;font-style:italic;">No data for this period</td></tr>`

  return `
    <div style="flex:1;min-width:0;">
      <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:6px;padding-bottom:4px;border-bottom:2.5px solid ${headerColor};">${title}</div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
        <thead>
          <tr style="background:${headerColor};">
            <th style="padding:7px 8px;text-align:left;font-size:11px;font-weight:700;color:white;letter-spacing:0.03em;">Category</th>
            <th style="padding:7px 8px;text-align:right;font-size:11px;font-weight:700;color:white;white-space:nowrap;">Amount</th>
            <th style="padding:7px 8px;text-align:right;font-size:11px;font-weight:700;color:white;">%</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`
}

function buildReportHTML({ period, summaryStats, expenseCategories, incomeCategories, dominantCurrency, accountLabel }) {
  const periodLabel = PERIOD_LABELS[period] ?? period
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const { totalIncome, totalExpenses, net, savingsRate } = summaryStats
  const netAbs = fmtCurrency(Math.abs(net), dominantCurrency)
  const netLabel = net < 0 ? `−${netAbs}` : netAbs

  return `
    <div style="font-family:Arial,'Segoe UI',Tahoma,sans-serif;width:794px;background:#ffffff;padding:40px;box-sizing:border-box;color:#0f172a;">

      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
        <div>
          <div style="font-size:26px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;line-height:1.1;">MoneyFlow</div>
          <div style="font-size:13px;color:#64748b;margin-top:3px;">Financial Report</div>
          ${accountLabel && accountLabel !== 'All Accounts' ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px;">Account: ${esc(accountLabel)}</div>` : ''}
        </div>
        <div style="text-align:right;">
          <div style="font-size:13px;font-weight:700;color:#475569;">${esc(periodLabel)}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:3px;">${dateStr}</div>
        </div>
      </div>

      <hr style="border:none;border-top:1px solid #e2e8f0;margin:14px 0;" />

      <!-- Summary tiles -->
      <div style="display:flex;gap:10px;margin-bottom:24px;">
        ${tileHtml('Total Income',   fmtCurrency(totalIncome,   dominantCurrency), '#16a34a', '#f0fdf4')}
        ${tileHtml('Total Expenses', fmtCurrency(totalExpenses, dominantCurrency), '#dc2626', '#fef2f2')}
        ${tileHtml('Net Savings',    netLabel,                                      net < 0 ? '#dc2626' : '#2563eb', net < 0 ? '#fef2f2' : '#eff6ff')}
        ${tileHtml('Savings Rate',   `${savingsRate.toFixed(1)}%`,                  '#7c3aed', '#f5f3ff')}
      </div>

      <!-- Category tables side by side -->
      <div style="display:flex;gap:20px;align-items:flex-start;">
        ${tableHtml('Spending by Category', expenseCategories, '#dc2626', '#dc2626', dominantCurrency)}
        ${tableHtml('Income by Category',   incomeCategories,  '#16a34a', '#16a34a', dominantCurrency)}
      </div>

      <!-- Footer -->
      <div style="margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;text-align:center;">
        <div style="font-size:10px;color:#94a3b8;">Generated by MoneyFlow &nbsp;•&nbsp; ${dateStr}</div>
      </div>

    </div>`
}

export async function exportAnalyticsPDF({
  period,
  summaryStats,
  expenseCategories,
  incomeCategories,
  dominantCurrency,
  accountLabel,
}) {
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;'
  container.innerHTML = buildReportHTML({ period, summaryStats, expenseCategories, incomeCategories, dominantCurrency, accountLabel })
  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container.firstElementChild, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    })

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = 210
    const pageH = 297

    const imgData = canvas.toDataURL('image/jpeg', 0.92)
    const imgW = pageW
    const imgH = canvas.height * (pageW / canvas.width)

    const numPages = Math.ceil(imgH / pageH)

    for (let page = 0; page < numPages; page++) {
      if (page > 0) pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, -(page * pageH), imgW, imgH)
    }

    const fileName = `moneyflow-report-${period}-${new Date().toISOString().split('T')[0]}.pdf`
    pdf.save(fileName)
  } finally {
    document.body.removeChild(container)
  }
}
