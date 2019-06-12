'use strict'

let customCounter = 0

const { severities } = require('./issues')

const getCustomIssueBuilderNoVariable = ({
  variableName,
  severity = severities.minor,
  opinionated = true,
  references = [],
  commentary = ''
}) => {
  const code = `custom${String(++customCounter).padStart(3, '0')}`
  const builder = (file) => ({
    severity,
    code,
    shortDescription: `Variable '${variableName}' should not be used.`,
    longDescription: `Variable '${variableName}' should not be used.${commentary ? ` ${commentary}` : ''}`,
    references,
    foundAt: file,
    opinionated
  })
  return builder
}

const getCustomIssueBuilderNoVariableForDeployment = ({
  variableName,
  deploymentName,
  severity = severities.minor,
  opinionated = true,
  references = [],
  commentary = ''
}) => {
  const code = `custom${String(++customCounter).padStart(3, '0')}`
  const builder = (file) => ({
    severity,
    code,
    shortDescription: `Variable '${variableName}' should not be used at '${deploymentName}'.`,
    longDescription: `Variable '${variableName}' should not be used at '${deploymentName}'.${commentary ? ` ${commentary}` : ''}`,
    references,
    foundAt: file,
    opinionated
  })
  return builder
}

const getCustomIssueBuilderNoVariableWithValue = ({
  variableName,
  value,
  severity = severities.minor,
  opinionated = true,
  references = [],
  commentary = ''
}) => {
  const code = `custom${String(++customCounter).padStart(3, '0')}`
  const builder = (file) => ({
    severity,
    code,
    shortDescription: `Variable '${variableName}' should not have value '${value}'.`,
    longDescription: `Variable '${variableName}' should not have value '${value}'.${commentary ? ` ${commentary}` : ''}`,
    references,
    foundAt: file,
    opinionated
  })
  return builder
}

const getCustomIssueBuilderNoVariableForDeploymentWithValue = ({
  variableName,
  value,
  deploymentName,
  severity = severities.minor,
  opinionated = true,
  references = [],
  commentary = ''
}) => {
  const code = `custom${String(++customCounter).padStart(3, '0')}`
  const builder = (file) => ({
    severity,
    code,
    shortDescription: `Variable '${variableName}' should not have value '${value}' at '${deploymentName}'.`,
    longDescription: `Variable '${variableName}' should not have value '${value}' at '${deploymentName}'.${commentary ? ` ${commentary}` : ''}`,
    references,
    foundAt: file,
    opinionated
  })
  return builder
}

/**
 * Builder for custom rules.
 */

/**
 * Singleton, initially
 */
const getInstanceMemory = () => {
  /**
   * @typedef {Object} rulesNoVariableAll
   * @property {String} variableName
   * @property {Function} builder
   */
  /**
   * @type {rulesNoVariableAll[]}
   */
  const customRulesNoVariableAllContainers = []

  /**
   * @typedef {Object} rulesNoVariableSpecific
   * @property {String} variableName
   * @property {String} deploymentName
   * @property {Function} builder
   */
  /**
   * @type {rulesNoVariableSpecific[]}
   */
  const customRulesNoVariableSpecific = []

  /**
   * @typedef {Object} rulesNoVariableAllWithValue
   * @property {String} variableName
   * @property {String} value
   * @property {Function} builder
   */
  /**
   * @type {rulesNoVariableAllWithValue[]}
   */
  const customRulesNoVariableAllContainersWithValue = []

  /**
   * @typedef {Object} rulesNoVariableSpecificWithValue
   * @property {String} variableName
   * @property {String} value
   * @property {String} deploymentName
   * @property {Function} builder
   */
  /**
   * @type {rulesNoVariableSpecificWithValue[]}
   */
  const customRulesNoVariableSpecificWithValue = []

  const overridenDefaultRules = new Map()

  const updateOpinionatedProperty = (ruleCode, value) => {
    if (overridenDefaultRules.has(ruleCode)) {
      overridenDefaultRules.set(ruleCode, { ...overridenDefaultRules.get(ruleCode), opinionated: value })
    } else {
      overridenDefaultRules.set(ruleCode, { opinionated: value })
    }
  }

  const updateEnabledProperty = (ruleCode, value) => {
    if (overridenDefaultRules.has(ruleCode)) {
      overridenDefaultRules.set(ruleCode, { ...overridenDefaultRules.get(ruleCode), enabled: value })
    } else {
      overridenDefaultRules.set(ruleCode, { enabled: value })
    }
  }

  class ConfigBuilder {
    constructor () {
      this.set = new SetSelectorsBuilder()
      this.add = new AddSelectorsBuilder()
    }
  }

  class SetK8SIssueBuilder {
    constructor () {
      this.noRecommendedApiVersion = new RuleSetBuilderOptions('k8s001')
      this.emptyApiVersion = new RuleSetBuilderOptions('k8s002')
      this.alphaApiVersionNotAllowed = new RuleSetBuilderOptions('k8s003')
      this.noDeploymentWithoutContainers = new RuleSetBuilderOptions('k8s004')
      this.noCronJobWithoutContainers = new RuleSetBuilderOptions('k8s005')
      this.noDeploymentContainerWithArgsOverride = new RuleSetBuilderOptions('k8s006')
      this.noLatestTag = new RuleSetBuilderOptions('k8s007')
      this.noRenamedEnvVariable = new RuleSetBuilderOptions('k8s008')
      this.duplicatedResource = new RuleSetBuilderOptions('k8s009')
      this.duplicatedEnvVariable = new RuleSetBuilderOptions('k8s010')
      this.noLocaleConfigMapForVariable = new RuleSetBuilderOptions('k8s011')
      this.variableNotFoundAtConfigMap = new RuleSetBuilderOptions('k8s012')
      this.unusedVariableInConfigmap = new RuleSetBuilderOptions('k8s013')
      this.containerWithWrongSpecification = new RuleSetBuilderOptions('k8s014')
    }
  }

  class SetSelectorsBuilder {
    constructor () {
      this.kubernetesIssue = new SetK8SIssueBuilder()
    }
    /**
   * References rule by code
   * @param {'k8s001'|'k8s002'|'k8s003'|'k8s004'|'k8s005'|'k8s006'|'k8s007'|'k8s008'|'k8s009'|'k8s010'|'k8s011'|'k8s012'|'k8s013'|'k8s014'} ruleCode
   */
    rule (ruleCode) {
      return new RuleSetBuilderOptions(ruleCode)
    }
  }

  class AddSelectorsBuilder {
    /**
     * Sets a validation for specific forbidden variable for containers
     * @param {Object} param
     * @param {String} param.variableName Name of the variable
     * @param {String} param.deploymentName Name of the cronjob or deployment
     * @param {String} param.severity Severity of the issue (populate it with this.severities.*)
     * @param {Boolean} param.opinionated Sets the opiniated property
     * @param {String[]} param.references List of references
     * @param {String} param.commentary Custom commentary to be added
     */
    forbiddenVariable ({
      variableName,
      deploymentName,
      severity = this.severities.minor,
      opinionated = true,
      references = [],
      commentary = ''
    }) {
      if (!deploymentName) {
        customRulesNoVariableAllContainers.push({
          variableName,
          builder: getCustomIssueBuilderNoVariable({
            variableName,
            severity,
            opinionated,
            references,
            commentary
          })
        })
      } else {
        customRulesNoVariableSpecific.push({
          variableName,
          deploymentName,
          builder: getCustomIssueBuilderNoVariableForDeployment({
            variableName,
            deploymentName,
            severity,
            opinionated,
            references,
            commentary
          })
        })
      }
      return new ConfigBuilder()
    }

    forbiddenVariableWithValue ({
      variableName,
      value,
      deploymentName,
      severity = this.severities.minor,
      opinionated = true,
      references = [],
      commentary = ''
    }) {
      if (!deploymentName) {
        customRulesNoVariableAllContainersWithValue.push({
          variableName,
          value,
          builder: getCustomIssueBuilderNoVariableWithValue({
            variableName,
            value,
            severity,
            opinionated,
            references,
            commentary
          })
        })
      } else {
        customRulesNoVariableSpecificWithValue.push({
          variableName,
          value,
          deploymentName,
          builder: getCustomIssueBuilderNoVariableForDeploymentWithValue({
            variableName,
            value,
            deploymentName,
            severity,
            opinionated,
            references,
            commentary
          })
        })
      }
      return new ConfigBuilder()
    }
  }

  class RuleSetBuilderOptions {
    constructor (ruleCode) {
      this.ruleCode = ruleCode
    }
    /**
   * Sets some rule 'opiniated' property
   * @param {Boolean} value
   */
    opinionated (value = true) {
      updateOpinionatedProperty(this.ruleCode, value)
      return new RuleSetBuilderOptionsLoop()
    }
    /**
   * Enables/disables some issue
   * @param {Boolean} value
   */
    enabled (value = true) {
      updateEnabledProperty(this.ruleCode, value)
      return new RuleSetBuilderOptionsLoop()
    }
  }

  class RuleSetBuilderOptionsLoop extends ConfigBuilder {
    constructor (ruleCode) {
      super()
      this.ruleCode = ruleCode
    }
    /**
   * Sets some rule 'opiniated' property
   * @param {Boolean} value
   */
    opinionated (value = true) {
      updateOpinionatedProperty(this.ruleCode, value)
      return this
    }
    /**
   * Enables/disables some issue
   * @param {Boolean} value
   */
    enabled (value = true) {
      updateEnabledProperty(this.ruleCode, value)
      return this
    }
  }
  return {
    customRulesNoVariableAllContainers,
    customRulesNoVariableSpecific,
    customRulesNoVariableAllContainersWithValue,
    customRulesNoVariableSpecificWithValue,
    overridenDefaultRules,
    builder: new ConfigBuilder()
  }
}

module.exports = {
  getInstanceMemory,
  severities
}
