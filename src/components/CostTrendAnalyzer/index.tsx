import { useMemo, useState } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import type { SimState } from '../../App'

interface Props {
  state: SimState
}

export function CostTrendAnalyzer({ state }: Props) {
  const [historyMonths, setHistoryMonths] = useState(12)
  const [growthRate, setGrowthRate] = useState(5)
  const [forecastMonths, setForecastMonths] = useState(6)

  const analysis = useMemo(() => {
    const currentCost = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    }).monthlyCost

    // Generate historical data (simulating past 12 months with varying growth)
    const historicalData = []
    const baseCost = currentCost / Math.pow(1 + growthRate / 100, historyMonths / 12)

    for (let m = -historyMonths; m <= 0; m++) {
      const monthCost = baseCost * Math.pow(1 + growthRate / 100, (historyMonths + m) / 12)
      historicalData.push({
        month: m,
        monthLabel: `M${Math.abs(m)}`,
        cost: monthCost,
        isHistorical: true,
      })
    }

    // Generate forecast data
    const forecastData = []
    for (let m = 1; m <= forecastMonths; m++) {
      const monthCost = currentCost * Math.pow(1 + growthRate / 100, m / 12)
      forecastData.push({
        month: m,
        monthLabel: `F${m}`,
        cost: monthCost,
        isHistorical: false,
      })
    }

    const allData = [...historicalData, ...forecastData]

    // Calculate statistics
    const historicalCosts = historicalData.map(d => d.cost)
    const avgHistoricalCost = historicalCosts.reduce((a, b) => a + b) / historicalCosts.length
    const minHistoricalCost = Math.min(...historicalCosts)
    const maxHistoricalCost = Math.max(...historicalCosts)
    const historicalGrowth = historicalData.length > 1
      ? ((historicalData[historicalData.length - 1].cost - historicalData[0].cost) / historicalData[0].cost) * 100
      : 0

    // Forecast statistics
    const forecastCosts = forecastData.map(d => d.cost)
    const totalForecastCost = forecastCosts.reduce((a, b) => a + b, 0)
    const avgForecastCost = forecastCosts.length > 0 ? totalForecastCost / forecastCosts.length : 0
    const maxForecastCost = forecastCosts.length > 0 ? Math.max(...forecastCosts) : 0

    // Trend analysis
    const recentCosts = historicalData.slice(-3).map(d => d.cost)
    const recentTrend = recentCosts.length > 1
      ? ((recentCosts[recentCosts.length - 1] - recentCosts[0]) / recentCosts[0]) * 100
      : 0

    // Acceleration
    const oldTrend = historicalData.length > 6
      ? ((historicalData[Math.floor(historicalData.length / 2)].cost - historicalData[0].cost) / historicalData[0].cost) * 100
      : 0
    const acceleration = recentTrend - (oldTrend / 2)

    // Cost breakdown trends
    const monthlyBreakdown = historicalData.map(d => ({
      month: d.monthLabel,
      percentage: (d.cost / maxHistoricalCost) * 100,
    }))

    return {
      currentCost,
      historicalData,
      forecastData,
      allData,
      avgHistoricalCost,
      minHistoricalCost,
      maxHistoricalCost,
      historicalGrowth,
      totalForecastCost,
      avgForecastCost,
      maxForecastCost,
      recentTrend,
      acceleration,
      monthlyBreakdown,
    }
  }, [state, historyMonths, growthRate, forecastMonths])

  const getTrendIcon = (trend: number) => {
    if (trend > 10) return '📈'
    if (trend > 0) return '↗️'
    if (trend < -10) return '📉'
    return '➡️'
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Cost Trend Analyzer
      </h2>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Historical Data (months)</label>
          <select
            value={historyMonths}
            onChange={e => setHistoryMonths(parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
            <option value={24}>Last 24 months</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Growth Rate (% per month)</label>
          <div className="flex gap-2">
            <input
              type="range"
              min="-5"
              max="20"
              step="0.5"
              value={growthRate}
              onChange={e => setGrowthRate(parseFloat(e.target.value))}
              className="flex-1"
            />
            <span className="text-xs font-semibold text-gray-900 min-w-fit">{growthRate.toFixed(1)}%</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">Forecast Period (months)</label>
          <select
            value={forecastMonths}
            onChange={e => setForecastMonths(parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value={3}>3 months</option>
            <option value={6}>6 months</option>
            <option value={12}>12 months</option>
          </select>
        </div>
      </div>

      {/* Trend summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-600 font-medium mb-1">Current Monthly Cost</div>
          <div className="text-2xl font-bold text-blue-900">{fmtCurrency(analysis.currentCost)}</div>
          <div className="text-xs text-blue-700 mt-1">Latest month</div>
        </div>

        <div className={`rounded-lg p-3 border-2 ${
          Math.abs(analysis.recentTrend) > 10
            ? 'bg-red-50 border-red-200'
            : analysis.recentTrend > 0
              ? 'bg-amber-50 border-amber-200'
              : 'bg-green-50 border-green-200'
        }`}>
          <div className={`text-xs font-medium mb-1 ${
            Math.abs(analysis.recentTrend) > 10
              ? 'text-red-600'
              : analysis.recentTrend > 0
                ? 'text-amber-600'
                : 'text-green-600'
          }`}>
            Recent Trend (3mo)
          </div>
          <div className={`text-2xl font-bold ${
            Math.abs(analysis.recentTrend) > 10
              ? 'text-red-900'
              : analysis.recentTrend > 0
                ? 'text-amber-900'
                : 'text-green-900'
          }`}>
            {getTrendIcon(analysis.recentTrend)} {analysis.recentTrend > 0 ? '+' : '−'}{Math.abs(analysis.recentTrend).toFixed(1)}%
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="text-xs text-purple-600 font-medium mb-1">Acceleration</div>
          <div className={`text-2xl font-bold ${analysis.acceleration > 2 ? 'text-purple-900' : 'text-gray-700'}`}>
            {analysis.acceleration > 0 ? '+' : '−'}{Math.abs(analysis.acceleration).toFixed(1)}%
          </div>
          <div className="text-xs text-purple-700 mt-1">{analysis.acceleration > 0 ? 'Accelerating' : 'Stable'}</div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="text-xs text-amber-600 font-medium mb-1">Forecast ({forecastMonths}mo Total)</div>
          <div className="text-2xl font-bold text-amber-900">{fmtCurrency(analysis.totalForecastCost)}</div>
          <div className="text-xs text-amber-700 mt-1">{fmtCurrency(analysis.avgForecastCost)}/month avg</div>
        </div>
      </div>

      {/* Cost trend chart */}
      <div className="mb-6">
        <div className="text-sm font-semibold text-gray-800 mb-3">Cost Trend & Forecast</div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-end justify-between h-40 gap-0.5">
            {analysis.allData.map((point, idx) => {
              const maxCost = Math.max(...analysis.allData.map(d => d.cost))
              const barHeight = (point.cost / maxCost) * 100
              const isCurrentMonth = idx === analysis.historicalData.length - 1

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center justify-end relative group"
                  title={`${point.monthLabel}: ${fmtCurrency(point.cost)}`}
                >
                  <div
                    className={`w-full transition-colors ${
                      isCurrentMonth
                        ? 'bg-blue-600'
                        : point.isHistorical
                          ? 'bg-gray-400'
                          : 'bg-gray-300 opacity-60'
                    }`}
                    style={{ height: `${barHeight}%`, minHeight: '2px' }}
                  ></div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-gray-600">
            <div>{analysis.historicalData[0]?.monthLabel || 'Start'}</div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <span>History</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                <span>Current</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                <span>Forecast</span>
              </div>
            </div>
            <div>{analysis.forecastData[analysis.forecastData.length - 1]?.monthLabel || 'End'}</div>
          </div>
        </div>
      </div>

      {/* Historical stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-semibold text-gray-800 mb-3">Historical Analysis ({historyMonths}mo)</div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between bg-white rounded p-2">
              <span className="text-gray-700">Average:</span>
              <span className="font-semibold">{fmtCurrency(analysis.avgHistoricalCost)}</span>
            </div>
            <div className="flex justify-between bg-white rounded p-2">
              <span className="text-gray-700">Minimum:</span>
              <span className="font-semibold text-green-700">{fmtCurrency(analysis.minHistoricalCost)}</span>
            </div>
            <div className="flex justify-between bg-white rounded p-2">
              <span className="text-gray-700">Maximum:</span>
              <span className="font-semibold text-red-700">{fmtCurrency(analysis.maxHistoricalCost)}</span>
            </div>
            <div className="flex justify-between bg-white rounded p-2">
              <span className="text-gray-700">Total Growth:</span>
              <span className={`font-semibold ${
                analysis.historicalGrowth > 0 ? 'text-red-700' : 'text-green-700'
              }`}>
                {analysis.historicalGrowth > 0 ? '+' : '−'}{Math.abs(analysis.historicalGrowth).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-semibold text-gray-800 mb-3">Forecast Analysis ({forecastMonths}mo @ {growthRate}%)</div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between bg-white rounded p-2">
              <span className="text-gray-700">Total Cost:</span>
              <span className="font-semibold">{fmtCurrency(analysis.totalForecastCost)}</span>
            </div>
            <div className="flex justify-between bg-white rounded p-2">
              <span className="text-gray-700">Average/Month:</span>
              <span className="font-semibold">{fmtCurrency(analysis.avgForecastCost)}</span>
            </div>
            <div className="flex justify-between bg-white rounded p-2">
              <span className="text-gray-700">Peak Month:</span>
              <span className="font-semibold text-red-700">{fmtCurrency(analysis.maxForecastCost)}</span>
            </div>
            <div className="flex justify-between bg-white rounded p-2">
              <span className="text-gray-700">vs Current:</span>
              <span className={`font-semibold ${
                analysis.maxForecastCost > analysis.currentCost ? 'text-red-700' : 'text-green-700'
              }`}>
                {analysis.maxForecastCost > analysis.currentCost ? '+' : '−'}{fmtCurrency(Math.abs(analysis.maxForecastCost - analysis.currentCost))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-sm font-semibold text-blue-900 mb-2">Trend Insights</div>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>{analysis.recentTrend > 0 ? '📈' : '📉'} Recent 3-month trend: {analysis.recentTrend > 0 ? '+' : '−'}{Math.abs(analysis.recentTrend).toFixed(1)}%</li>
            <li>{analysis.acceleration > 0 ? '⚠️' : '✓'} Costs are {analysis.acceleration > 0 ? 'accelerating' : 'stable'}</li>
            <li>Growth rate: {growthRate}% per month</li>
            <li>Volatility: {((analysis.maxHistoricalCost - analysis.minHistoricalCost) / analysis.avgHistoricalCost * 100).toFixed(0)}%</li>
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-sm font-semibold text-green-900 mb-2">Recommendations</div>
          <ul className="text-xs text-green-800 space-y-1">
            <li>{analysis.recentTrend > 5 ? '🔴' : '🟢'} Monitor cost growth closely</li>
            <li>{analysis.acceleration > 2 ? '⚠️' : '✓'} {analysis.acceleration > 2 ? 'Implement cost controls' : 'Cost growth stable'}</li>
            <li>Review forecast every month for deviations</li>
            <li>{analysis.totalForecastCost > analysis.avgHistoricalCost * forecastMonths * 1.2 ? '⚡' : '✓'} Budget prep required</li>
          </ul>
        </div>
      </div>

      <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3 space-y-1">
        <p>
          <strong>How to use:</strong> Adjust the growth rate to match your expected usage growth. The forecast shows
          what your costs will be if the trend continues. Compare historical volatility to plan your budget buffer.
        </p>
        <p>
          <strong>Acceleration analysis:</strong> Positive acceleration means your costs are growing faster than expected.
          This suggests changes in usage patterns or pricing that need attention.
        </p>
      </div>
    </section>
  )
}
