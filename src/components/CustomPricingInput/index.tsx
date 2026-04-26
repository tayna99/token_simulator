import { useMemo, useState } from 'react'
import type { SimState } from '../../App'

interface CustomPrice {
  modelId: string
  inputPrice?: number
  outputPrice?: number
}

interface Props {
  state: SimState
}

export function CustomPricingInput({ state }: Props) {
  const [customPrices, setCustomPrices] = useState<CustomPrice[]>([])
  const [showHelp, setShowHelp] = useState(false)

  const pricingComparison = useMemo(() => {
    // Get current and candidate models
    const models = [state.currentModel, state.candidateModel]

    return models.map(model => {
      const customPrice = customPrices.find(cp => cp.modelId === model.id)
      const listPrice = { input: model.inputPrice, output: model.outputPrice }
      const actualPrice = customPrice
        ? {
            input: customPrice.inputPrice ?? model.inputPrice,
            output: customPrice.outputPrice ?? model.outputPrice
          }
        : listPrice

      const hasDiscount = customPrice && (customPrice.inputPrice !== undefined || customPrice.outputPrice !== undefined)
      const inputDiscount = customPrice?.inputPrice
        ? ((model.inputPrice - customPrice.inputPrice) / model.inputPrice) * 100
        : 0
      const outputDiscount = customPrice?.outputPrice
        ? ((model.outputPrice - customPrice.outputPrice) / model.outputPrice) * 100
        : 0

      return {
        model,
        listPrice,
        actualPrice,
        hasDiscount,
        inputDiscount,
        outputDiscount,
      }
    })
  }, [state, customPrices])

  const updatePrice = (modelId: string, field: 'inputPrice' | 'outputPrice', value: string) => {
    const numValue = parseFloat(value) || undefined
    const existing = customPrices.find(cp => cp.modelId === modelId)

    if (existing) {
      setCustomPrices(
        customPrices.map(cp =>
          cp.modelId === modelId
            ? { ...cp, [field]: numValue }
            : cp
        )
      )
    } else {
      const newPrice: CustomPrice = { modelId }
      newPrice[field] = numValue
      setCustomPrices([...customPrices, newPrice])
    }
  }

  const clearPrices = () => {
    setCustomPrices([])
  }

  const suggestDiscounts = (discountPercent: number) => {
    const newPrices = [state.currentModel, state.candidateModel].map(model => ({
      modelId: model.id,
      inputPrice: model.inputPrice * (1 - discountPercent / 100),
      outputPrice: model.outputPrice * (1 - discountPercent / 100),
    }))
    setCustomPrices(newPrices)
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm md:text-base font-semibold text-gray-800">
          Custom Pricing & Volume Discounts
        </h2>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          {showHelp ? 'Hide' : 'Show'} Help
        </button>
      </div>

      {showHelp && (
        <div className="mb-4 text-xs text-gray-700 bg-blue-50 border border-blue-200 rounded p-3 space-y-2">
          <p>
            <strong>Use case:</strong> Many enterprises negotiate custom pricing with providers. Enter your negotiated rates here to see impact on total cost.
          </p>
          <p>
            <strong>How it works:</strong> Leave fields blank to use list prices. Enter custom prices in $/1M tokens format. We'll calculate total cost and savings.
          </p>
          <p>
            <strong>Quick apply:</strong> Use the discount buttons below to apply percentage discounts across both models.
          </p>
        </div>
      )}

      <div className="mb-6 space-y-4">
        {/* Quick discount buttons */}
        <div>
          <div className="text-xs font-medium text-gray-700 mb-2">Quick Apply Volume Discount:</div>
          <div className="flex flex-wrap gap-2">
            {[0, 5, 10, 15, 20, 25].map(discount => (
              <button
                key={discount}
                onClick={() => suggestDiscounts(discount)}
                className="px-3 py-1.5 text-xs rounded border border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                {discount === 0 ? 'List Price' : `−${discount}%`}
              </button>
            ))}
            <button
              onClick={clearPrices}
              className="px-3 py-1.5 text-xs rounded border border-red-300 hover:border-red-500 hover:bg-red-50 text-red-600 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Custom price inputs */}
        {pricingComparison.map(({ model, listPrice, actualPrice, hasDiscount }) => (
          <div key={model.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold text-gray-900">{model.name}</div>
                <div className="text-xs text-gray-600">{model.provider}</div>
              </div>
              {hasDiscount && (
                <div className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded">
                  Custom Pricing
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Input Price ($/1M tokens)
                </label>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 relative">
                    <span className="absolute left-2 top-1.5 text-xs text-gray-500">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      placeholder={listPrice.input.toFixed(4)}
                      value={customPrices.find(cp => cp.modelId === model.id)?.inputPrice ?? ''}
                      onChange={e => updatePrice(model.id, 'inputPrice', e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 pl-5 text-xs"
                    />
                  </div>
                  <div className="text-xs text-gray-600 min-w-fit">
                    List: ${listPrice.input.toFixed(4)}
                  </div>
                </div>
                {actualPrice.input !== listPrice.input && (
                  <div className="text-xs text-green-600 mt-1">
                    ✓ Saving {((1 - actualPrice.input / listPrice.input) * 100).toFixed(1)}% vs list
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Output Price ($/1M tokens)
                </label>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 relative">
                    <span className="absolute left-2 top-1.5 text-xs text-gray-500">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      placeholder={listPrice.output.toFixed(4)}
                      value={customPrices.find(cp => cp.modelId === model.id)?.outputPrice ?? ''}
                      onChange={e => updatePrice(model.id, 'outputPrice', e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 pl-5 text-xs"
                    />
                  </div>
                  <div className="text-xs text-gray-600 min-w-fit">
                    List: ${listPrice.output.toFixed(4)}
                  </div>
                </div>
                {actualPrice.output !== listPrice.output && (
                  <div className="text-xs text-green-600 mt-1">
                    ✓ Saving {((1 - actualPrice.output / listPrice.output) * 100).toFixed(1)}% vs list
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {customPrices.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-green-900 mb-3">Custom Pricing Summary</div>
          <div className="space-y-2">
            {pricingComparison
              .filter(pc => pc.hasDiscount)
              .map(({ model, inputDiscount, outputDiscount }) => (
                <div key={model.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-700">{model.name}</span>
                  <span className="text-green-700 font-semibold">
                    Input: −{inputDiscount.toFixed(1)}% | Output: −{outputDiscount.toFixed(1)}%
                  </span>
                </div>
              ))}
          </div>
          <div className="mt-3 text-xs text-gray-600 bg-white rounded p-2 border border-green-200">
            <strong>Note:</strong> Custom pricing is applied only for your calculation. Use these prices in cost projections, team analysis, and ROI calculations above.
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3 space-y-1">
        <p>
          <strong>Typical enterprise discounts:</strong> Volume discounts range from 5-25% depending on commitment level, contract length, and usage volume.
        </p>
        <p>
          <strong>Negotiation tips:</strong> Annual commitments typically get 10-15% discounts. Multi-year deals can reach 20-25%. Usage-based tiers may apply.
        </p>
      </div>
    </section>
  )
}
