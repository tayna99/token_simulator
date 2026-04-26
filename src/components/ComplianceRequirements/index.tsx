import { useMemo, useState } from 'react'
import type { SimState } from '../../App'

type DataResidency = 'US' | 'EU' | 'APAC' | 'Global'
type SecurityCert = 'SOC2' | 'ISO27001' | 'FedRAMP' | 'PCI-DSS'
type ComplianceStandard = 'GDPR' | 'HIPAA' | 'CCPA' | 'PIPEDA'

interface Requirement {
  dataResidency?: DataResidency
  securityCertifications: SecurityCert[]
  complianceStandards: ComplianceStandard[]
  requiresAuditLogging: boolean
  requiresDataEncryption: boolean
  maxDataRetentionDays?: number
}

interface Props {
  state: SimState
}

export function ComplianceRequirements({ state }: Props) {
  const [requirements, setRequirements] = useState<Requirement>({
    dataResidency: undefined,
    securityCertifications: [],
    complianceStandards: [],
    requiresAuditLogging: false,
    requiresDataEncryption: false,
    maxDataRetentionDays: undefined,
  })

  // Model compliance mapping (simplified)
  const modelCompliance = useMemo(() => {
    const complianceMap: Record<string, {
      dataResidency: DataResidency
      certifications: SecurityCert[]
      standards: ComplianceStandard[]
      auditLogging: boolean
      encryption: boolean
      maxRetentionDays: number
    }> = {
      'claude-opus-4-7': {
        dataResidency: 'US',
        certifications: ['SOC2', 'ISO27001'],
        standards: ['GDPR', 'CCPA'],
        auditLogging: true,
        encryption: true,
        maxRetentionDays: 30,
      },
      'claude-sonnet-4.6': {
        dataResidency: 'US',
        certifications: ['SOC2'],
        standards: ['GDPR'],
        auditLogging: true,
        encryption: true,
        maxRetentionDays: 30,
      },
      'claude-3.5-haiku': {
        dataResidency: 'US',
        certifications: ['SOC2'],
        standards: ['GDPR'],
        auditLogging: false,
        encryption: true,
        maxRetentionDays: 30,
      },
      'gpt-4o': {
        dataResidency: 'Global',
        certifications: ['SOC2', 'ISO27001'],
        standards: ['GDPR', 'CCPA'],
        auditLogging: true,
        encryption: true,
        maxRetentionDays: 30,
      },
      'gpt-4-turbo': {
        dataResidency: 'Global',
        certifications: ['SOC2', 'ISO27001'],
        standards: ['GDPR', 'CCPA'],
        auditLogging: true,
        encryption: true,
        maxRetentionDays: 30,
      },
      'gpt-4o-mini': {
        dataResidency: 'Global',
        certifications: ['SOC2'],
        standards: ['GDPR'],
        auditLogging: false,
        encryption: true,
        maxRetentionDays: 30,
      },
      'gemini-3.1-flash': {
        dataResidency: 'Global',
        certifications: ['SOC2'],
        standards: ['GDPR'],
        auditLogging: true,
        encryption: true,
        maxRetentionDays: 7,
      },
      'gemini-2-flash': {
        dataResidency: 'Global',
        certifications: ['SOC2'],
        standards: ['GDPR'],
        auditLogging: false,
        encryption: true,
        maxRetentionDays: 7,
      },
    }
    return complianceMap
  }, [])

  const analysis = useMemo(() => {
    const currentCompliance = modelCompliance[state.currentModel.id] || {
      dataResidency: 'Global',
      certifications: [],
      standards: [],
      auditLogging: false,
      encryption: false,
      maxRetentionDays: 30,
    }

    const candidateCompliance = modelCompliance[state.candidateModel.id] || {
      dataResidency: 'Global',
      certifications: [],
      standards: [],
      auditLogging: false,
      encryption: false,
      maxRetentionDays: 30,
    }

    // Check current model against requirements
    const currentMeetsResidency = !requirements.dataResidency || currentCompliance.dataResidency === requirements.dataResidency || requirements.dataResidency === 'Global'
    const currentMeetsCerts = requirements.securityCertifications.every(cert => currentCompliance.certifications.includes(cert))
    const currentMeetsStandards = requirements.complianceStandards.every(std => currentCompliance.standards.includes(std))
    const currentMeetsAudit = !requirements.requiresAuditLogging || currentCompliance.auditLogging
    const currentMeetsEncryption = !requirements.requiresDataEncryption || currentCompliance.encryption
    const currentMeetsRetention = !requirements.maxDataRetentionDays || currentCompliance.maxRetentionDays <= requirements.maxDataRetentionDays

    const currentCompliant = currentMeetsResidency && currentMeetsCerts && currentMeetsStandards && currentMeetsAudit && currentMeetsEncryption && currentMeetsRetention

    // Check candidate model against requirements
    const candidateMeetsResidency = !requirements.dataResidency || candidateCompliance.dataResidency === requirements.dataResidency || requirements.dataResidency === 'Global'
    const candidateMeetsCerts = requirements.securityCertifications.every(cert => candidateCompliance.certifications.includes(cert))
    const candidateMeetsStandards = requirements.complianceStandards.every(std => candidateCompliance.standards.includes(std))
    const candidateMeetsAudit = !requirements.requiresAuditLogging || candidateCompliance.auditLogging
    const candidateMeetsEncryption = !requirements.requiresDataEncryption || candidateCompliance.encryption
    const candidateMeetsRetention = !requirements.maxDataRetentionDays || candidateCompliance.maxRetentionDays <= requirements.maxDataRetentionDays

    const candidateCompliant = candidateMeetsResidency && candidateMeetsCerts && candidateMeetsStandards && candidateMeetsAudit && candidateMeetsEncryption && candidateMeetsRetention

    return {
      currentCompliance,
      candidateCompliance,
      currentCompliant,
      candidateCompliant,
      currentGaps: [
        !currentMeetsResidency ? 'Data Residency' : null,
        !currentMeetsCerts ? 'Security Certifications' : null,
        !currentMeetsStandards ? 'Compliance Standards' : null,
        !currentMeetsAudit ? 'Audit Logging' : null,
        !currentMeetsEncryption ? 'Data Encryption' : null,
        !currentMeetsRetention ? 'Data Retention' : null,
      ].filter((gap): gap is string => gap !== null),
      candidateGaps: [
        !candidateMeetsResidency ? 'Data Residency' : null,
        !candidateMeetsCerts ? 'Security Certifications' : null,
        !candidateMeetsStandards ? 'Compliance Standards' : null,
        !candidateMeetsAudit ? 'Audit Logging' : null,
        !candidateMeetsEncryption ? 'Data Encryption' : null,
        !candidateMeetsRetention ? 'Data Retention' : null,
      ].filter((gap): gap is string => gap !== null),
    }
  }, [state, requirements, modelCompliance])

  const toggleCertification = (cert: SecurityCert) => {
    setRequirements({
      ...requirements,
      securityCertifications: requirements.securityCertifications.includes(cert)
        ? requirements.securityCertifications.filter(c => c !== cert)
        : [...requirements.securityCertifications, cert],
    })
  }

  const toggleStandard = (standard: ComplianceStandard) => {
    setRequirements({
      ...requirements,
      complianceStandards: requirements.complianceStandards.includes(standard)
        ? requirements.complianceStandards.filter(s => s !== standard)
        : [...requirements.complianceStandards, standard],
    })
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
      <h2 className="text-sm md:text-base font-semibold text-gray-800 mb-4">
        Compliance & Security Requirements
      </h2>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Data Residency</label>
          <div className="flex flex-wrap gap-2">
            {['US', 'EU', 'APAC', 'Global'].map(region => (
              <button
                key={region}
                onClick={() => setRequirements({
                  ...requirements,
                  dataResidency: requirements.dataResidency === region ? undefined : region as DataResidency
                })}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  requirements.dataResidency === region
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
                }`}
              >
                {region}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Security Certifications</label>
          <div className="flex flex-wrap gap-2">
            {['SOC2', 'ISO27001', 'FedRAMP', 'PCI-DSS'].map(cert => (
              <button
                key={cert}
                onClick={() => toggleCertification(cert as SecurityCert)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  requirements.securityCertifications.includes(cert as SecurityCert)
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-green-400'
                }`}
              >
                {cert}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Compliance Standards</label>
          <div className="flex flex-wrap gap-2">
            {['GDPR', 'HIPAA', 'CCPA', 'PIPEDA'].map(standard => (
              <button
                key={standard}
                onClick={() => toggleStandard(standard as ComplianceStandard)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  requirements.complianceStandards.includes(standard as ComplianceStandard)
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-purple-400'
                }`}
              >
                {standard}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={requirements.requiresAuditLogging}
              onChange={e => setRequirements({ ...requirements, requiresAuditLogging: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Requires Audit Logging</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={requirements.requiresDataEncryption}
              onChange={e => setRequirements({ ...requirements, requiresDataEncryption: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Requires Data Encryption in Transit & at Rest</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Max Data Retention (days)</label>
          <input
            type="number"
            min="0"
            step="1"
            placeholder="No limit"
            value={requirements.maxDataRetentionDays ?? ''}
            onChange={e => setRequirements({
              ...requirements,
              maxDataRetentionDays: e.target.value === '' ? undefined : parseInt(e.target.value),
            })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm max-w-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Current Model */}
        <div className={`rounded-lg border-2 p-4 ${analysis.currentCompliant ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">{state.currentModel.name}</h3>
            <span className={`text-xs font-semibold px-2 py-1 rounded ${
              analysis.currentCompliant ? 'bg-green-200 text-green-900' : 'bg-orange-200 text-orange-900'
            }`}>
              {analysis.currentCompliant ? '✓ Compliant' : '⚠️ Non-Compliant'}
            </span>
          </div>

          {analysis.currentGaps.length > 0 && (
            <div className="space-y-1 mb-3">
              <div className="text-xs font-medium text-gray-700">Compliance Gaps:</div>
              {analysis.currentGaps.map(gap => (
                <div key={gap} className="text-xs text-gray-700 flex items-center gap-1">
                  <span className="text-orange-600">✗</span> {gap}
                </div>
              ))}
            </div>
          )}

          {analysis.currentCompliant && (
            <div className="text-xs text-green-700 flex items-center gap-1">
              <span>✓</span> Meets all requirements
            </div>
          )}
        </div>

        {/* Candidate Model */}
        <div className={`rounded-lg border-2 p-4 ${analysis.candidateCompliant ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">{state.candidateModel.name}</h3>
            <span className={`text-xs font-semibold px-2 py-1 rounded ${
              analysis.candidateCompliant ? 'bg-green-200 text-green-900' : 'bg-orange-200 text-orange-900'
            }`}>
              {analysis.candidateCompliant ? '✓ Compliant' : '⚠️ Non-Compliant'}
            </span>
          </div>

          {analysis.candidateGaps.length > 0 && (
            <div className="space-y-1 mb-3">
              <div className="text-xs font-medium text-gray-700">Compliance Gaps:</div>
              {analysis.candidateGaps.map(gap => (
                <div key={gap} className="text-xs text-gray-700 flex items-center gap-1">
                  <span className="text-orange-600">✗</span> {gap}
                </div>
              ))}
            </div>
          )}

          {analysis.candidateCompliant && (
            <div className="text-xs text-green-700 flex items-center gap-1">
              <span>✓</span> Meets all requirements
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3 space-y-1">
        <p>
          <strong>Note:</strong> Compliance information is simplified for illustration. Consult provider documentation and your security/legal teams for complete details.
        </p>
        <p>
          <strong>Key considerations:</strong> Data residency affects latency and regulatory compliance. Audit logging is essential for regulated industries (finance, healthcare). Data retention windows matter for privacy regulations.
        </p>
      </div>
    </section>
  )
}
