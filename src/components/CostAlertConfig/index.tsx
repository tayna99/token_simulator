import { useMemo, useState } from 'react'
import { calculateCost } from '../../lib/calculator'
import { fmtCurrency } from '../../lib/format'
import type { SimState } from '../../App'

interface AlertRule {
  id: string
  name: string
  type: 'monthly_budget' | 'daily_rate' | 'cost_per_unit' | 'growth_rate'
  threshold: number
  isActive: boolean
  severity: 'warning' | 'critical'
}

interface Props {
  state: SimState
}

export function CostAlertConfig({ state }: Props) {
  const [alerts, setAlerts] = useState<AlertRule[]>([
    { id: '1', name: 'Monthly Budget Limit', type: 'monthly_budget', threshold: 50000, isActive: true, severity: 'critical' },
    { id: '2', name: 'Daily Cost Threshold', type: 'daily_rate', threshold: 2000, isActive: true, severity: 'warning' },
    { id: '3', name: 'Cost Per Request', type: 'cost_per_unit', threshold: 0.10, isActive: false, severity: 'warning' },
  ])

  const [newAlertType, setNewAlertType] = useState<AlertRule['type']>('monthly_budget')
  const [newAlertName, setNewAlertName] = useState('')
  const [newAlertThreshold, setNewAlertThreshold] = useState(50000)

  const analysis = useMemo(() => {
    const currentCost = calculateCost({
      model: state.currentModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    }).monthlyCost

    const candidateCost = calculateCost({
      model: state.candidateModel,
      monthlyInputTokens: state.periodInputTokens,
      monthlyOutputTokens: state.periodOutputTokens,
      cacheHitRate: state.cacheHitRate,
      batchEnabled: state.batchEnabled,
    }).monthlyCost

    const dailyCost = currentCost / 30
    const costPerRequest = state.monthlyRequests > 0 ? currentCost / state.monthlyRequests : 0

    // Check each alert
    const alertStatuses = alerts.map(alert => {
      let triggered = false
      let currentValue = 0
      let message = ''

      switch (alert.type) {
        case 'monthly_budget':
          currentValue = currentCost
          triggered = currentCost > alert.threshold
          message = `Current: ${fmtCurrency(currentCost)}, Limit: ${fmtCurrency(alert.threshold)}`
          break
        case 'daily_rate':
          currentValue = dailyCost
          triggered = dailyCost > alert.threshold
          message = `Current: ${fmtCurrency(dailyCost)}/day, Limit: ${fmtCurrency(alert.threshold)}/day`
          break
        case 'cost_per_unit':
          currentValue = costPerRequest
          triggered = costPerRequest > alert.threshold
          message = `Current: ${fmtCurrency(costPerRequest)}/request, Limit: ${fmtCurrency(alert.threshold)}/request`
          break
        case 'growth_rate':
          // Simulate 10% month-over-month growth
          const projectedNextMonth = currentCost * 1.1
          triggered = (((projectedNextMonth - currentCost) / currentCost) * 100) > alert.threshold
          message = `Projected growth: 10%, Limit: ${alert.threshold}%`
          break
      }

      return {
        alert,
        triggered: triggered && alert.isActive,
        currentValue,
        message,
      }
    })

    const triggeredAlerts = alertStatuses.filter(s => s.triggered)
    const criticalAlerts = triggeredAlerts.filter(s => s.alert.severity === 'critical')
    const warningAlerts = triggeredAlerts.filter(s => s.alert.severity === 'warning')

    // Project 3-month costs with different growth rates
    const projections = [0.05, 0.1, 0.15, 0.2].map(growthRate => {
      const month1 = currentCost
      const month2 = month1 * (1 + growthRate)
      const month3 = month2 * (1 + growthRate)
      const total = month1 + month2 + month3
      return { growthRate, total, month1, month2, month3 }
    })

    return {
      currentMonthCost: currentCost,
      candidateMonthCost: candidateCost,
      dailyCost,
      costPerRequest,
      alertStatuses,
      triggeredAlerts,
      criticalAlerts,
      warningAlerts,
      projections,
    }
  }, [state, alerts])

  const addAlert = () => {
    if (!newAlertName.trim() || newAlertThreshold <= 0) return

    const newAlert: AlertRule = {
      id: Date.now().toString(),
      name: newAlertName,
      type: newAlertType,
      threshold: newAlertThreshold,
      isActive: true,
      severity: 'warning',
    }

    setAlerts([...alerts, newAlert])
    setNewAlertName('')
    setNewAlertThreshold(50000)
  }

  const toggleAlert = (id: string) => {
    setAlerts(alerts.map(a => (a.id === id ? { ...a, isActive: !a.isActive } : a)))
  }

  const removeAlert = (id: string) => {
    setAlerts(alerts.filter(a => a.id !== id))
  }

  const getAlertIcon = (type: AlertRule['type']) => {
    switch (type) {
      case 'monthly_budget':
        return '💰'
      case 'daily_rate':
        return '📅'
      case 'cost_per_unit':
        return '📊'
      case 'growth_rate':
        return '📈'
    }
  }

  const getAlertLabel = (type: AlertRule['type']) => {
    switch (type) {
      case 'monthly_budget':
        return 'Monthly Budget'
      case 'daily_rate':
        return 'Daily Rate'
      case 'cost_per_unit':
        return 'Cost Per Unit'
      case 'growth_rate':
        return 'Growth Rate'
    }
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Cost Alert Configuration
      </h2>

      {/* Alert status summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-600 font-medium mb-1">Active Alerts</div>
          <div className="text-2xl font-bold text-blue-900">{alerts.filter(a => a.isActive).length}</div>
          <div className="text-xs text-blue-700 mt-1">of {alerts.length} configured</div>
        </div>

        <div className={`rounded-lg p-3 border-2 ${
          analysis.criticalAlerts.length > 0
            ? 'bg-red-50 border-red-200'
            : 'bg-green-50 border-green-200'
        }`}>
          <div className={`text-xs font-medium mb-1 ${
            analysis.criticalAlerts.length > 0 ? 'text-red-600' : 'text-green-600'
          }`}>
            Critical Alerts
          </div>
          <div className={`text-2xl font-bold ${
            analysis.criticalAlerts.length > 0 ? 'text-red-900' : 'text-green-900'
          }`}>
            {analysis.criticalAlerts.length}
          </div>
          <div className={`text-xs mt-1 ${
            analysis.criticalAlerts.length > 0 ? 'text-red-700' : 'text-green-700'
          }`}>
            {analysis.criticalAlerts.length > 0 ? '⚠️ Action needed' : '✓ All good'}
          </div>
        </div>

        <div className={`rounded-lg p-3 border-2 ${
          analysis.warningAlerts.length > 0
            ? 'bg-amber-50 border-amber-200'
            : 'bg-green-50 border-green-200'
        }`}>
          <div className={`text-xs font-medium mb-1 ${
            analysis.warningAlerts.length > 0 ? 'text-amber-600' : 'text-green-600'
          }`}>
            Warnings
          </div>
          <div className={`text-2xl font-bold ${
            analysis.warningAlerts.length > 0 ? 'text-amber-900' : 'text-green-900'
          }`}>
            {analysis.warningAlerts.length}
          </div>
          <div className={`text-xs mt-1 ${
            analysis.warningAlerts.length > 0 ? 'text-amber-700' : 'text-green-700'
          }`}>
            {analysis.warningAlerts.length > 0 ? '⚡ Monitor' : '✓ Clear'}
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="text-xs text-purple-600 font-medium mb-1">Monthly Cost</div>
          <div className="text-2xl font-bold text-purple-900">{fmtCurrency(analysis.currentMonthCost)}</div>
          <div className="text-xs text-purple-700 mt-1">{fmtCurrency(analysis.dailyCost)}/day avg</div>
        </div>
      </div>

      {/* Alert triggers */}
      {analysis.triggeredAlerts.length > 0 && (
        <div className="mb-6 p-4 border-2 border-red-200 bg-red-50 rounded-lg">
          <div className="text-sm font-semibold text-red-900 mb-3">⚠️ Triggered Alerts</div>
          <div className="space-y-2">
            {analysis.triggeredAlerts.map(status => (
              <div key={status.alert.id} className="bg-white rounded p-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-red-800">{status.alert.name}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    status.alert.severity === 'critical'
                      ? 'bg-red-200 text-red-900'
                      : 'bg-amber-200 text-amber-900'
                  }`}>
                    {status.alert.severity === 'critical' ? 'Critical' : 'Warning'}
                  </span>
                </div>
                <div className="text-gray-600 mt-1">{status.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <div className="text-sm font-semibold text-gray-800 mb-3">Configure Alerts</div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Alert Type</label>
              <select
                value={newAlertType}
                onChange={e => setNewAlertType(e.target.value as any)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs"
              >
                <option value="monthly_budget">Monthly Budget</option>
                <option value="daily_rate">Daily Rate Limit</option>
                <option value="cost_per_unit">Cost Per Unit</option>
                <option value="growth_rate">Growth Rate</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Alert Name</label>
              <input
                type="text"
                placeholder="e.g., Production Budget Cap"
                value={newAlertName}
                onChange={e => setNewAlertName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Threshold Value</label>
              <input
                type="number"
                min="0"
                step="1000"
                value={newAlertThreshold}
                onChange={e => setNewAlertThreshold(parseInt(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs"
                placeholder="Enter threshold"
              />
            </div>

            <button
              onClick={addAlert}
              className="w-full px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + Add Alert
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-blue-900 mb-3">Current Values</div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between bg-white rounded p-2">
              <span className="text-blue-700">Monthly Cost:</span>
              <span className="font-semibold text-blue-900">{fmtCurrency(analysis.currentMonthCost)}</span>
            </div>
            <div className="flex justify-between bg-white rounded p-2">
              <span className="text-blue-700">Daily Average:</span>
              <span className="font-semibold text-blue-900">{fmtCurrency(analysis.dailyCost)}</span>
            </div>
            <div className="flex justify-between bg-white rounded p-2">
              <span className="text-blue-700">Cost per Request:</span>
              <span className="font-semibold text-blue-900">{fmtCurrency(analysis.costPerRequest)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active alerts list */}
      <div className="mb-6">
        <div className="text-sm font-semibold text-gray-800 mb-3">Configured Alerts ({alerts.length})</div>
        <div className="space-y-2">
          {alerts.map(alert => {
            const status = analysis.alertStatuses.find(s => s.alert.id === alert.id)
            const isTriggered = status?.triggered || false

            return (
              <div
                key={alert.id}
                className={`rounded-lg p-3 border-2 ${
                  isTriggered
                    ? alert.severity === 'critical'
                      ? 'border-red-300 bg-red-50'
                      : 'border-amber-300 bg-amber-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getAlertIcon(alert.type)}</span>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{alert.name}</div>
                      <div className="text-xs text-gray-600">{getAlertLabel(alert.type)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={alert.isActive}
                        onChange={() => toggleAlert(alert.id)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </label>
                    <button
                      onClick={() => removeAlert(alert.id)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-700">Threshold: {alert.type === 'growth_rate' ? `${alert.threshold}%` : fmtCurrency(alert.threshold)}</span>
                  <span className={`px-2 py-1 rounded font-medium ${
                    isTriggered
                      ? alert.severity === 'critical'
                        ? 'bg-red-200 text-red-900'
                        : 'bg-amber-200 text-amber-900'
                      : 'bg-green-200 text-green-900'
                  }`}>
                    {isTriggered ? '⚠️ TRIGGERED' : '✓ OK'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 3-month projection */}
      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-800 mb-3">3-Month Cost Projection by Growth Rate</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {analysis.projections.map(proj => (
            <div key={proj.growthRate} className="bg-gray-50 rounded-lg p-3 text-xs">
              <div className="font-medium text-gray-800 mb-2">{(proj.growthRate * 100).toFixed(0)}% Monthly Growth</div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Month 1:</span>
                  <span className="font-semibold">{fmtCurrency(proj.month1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Month 2:</span>
                  <span className="font-semibold">{fmtCurrency(proj.month2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Month 3:</span>
                  <span className="font-semibold">{fmtCurrency(proj.month3)}</span>
                </div>
                <div className="border-t border-gray-300 pt-1 mt-1 flex justify-between font-bold">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-gray-900">{fmtCurrency(proj.total)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3 space-y-1">
        <p>
          <strong>How to use:</strong> Set up alerts for different cost thresholds to catch unexpected spending growth
          early. Configure multiple alert types to monitor different aspects of your costs.
        </p>
        <p>
          <strong>Alert types:</strong> Monthly budget limits are critical for financial planning. Daily rate limits help
          catch abnormal usage patterns. Growth rate alerts warn about accelerating costs.
        </p>
      </div>
    </section>
  )
}
