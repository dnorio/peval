'use strict'

/**
 * Builder for custom rules.
 */

class ConfigBuilder {
  constructor () {
    this.set = new SetSelectorsBuilder()
  }
}

class SetK8SIssueBuilder {
  constructor () {
    this.noRecommendedApiVersion = new RuleSetBuilderOptions('k8s001')
    this.emptyApiVersion = new RuleSetBuilderOptions('k8s002')
  }
}

class SetSelectorsBuilder {
  constructor () {
    this.kubernetesIssue = new SetK8SIssueBuilder()
  }
  /**
   * References rule by code
   * @param {String} ruleCode
   */
  rule (ruleCode) {
    return new RuleSetBuilderOptions(ruleCode)
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
    this.opinionatedValue = value
    return new RuleSetBuilderOptionsLoop()
  }
  /**
   * Enables/disables some issue
   * @param {Boolean} value
   */
  enabled (value = true) {
    this.enabledValue = value
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
    this.opinionatedValue = value
    return this
  }
  /**
   * Enables/disables some issue
   * @param {Boolean} value
   */
  enabled (value = true) {
    this.enabledValue = value
    return this
  }
}

const initiateConfigBuilder = () => {
  return new ConfigBuilder()
}
module.exports = {
  initiateConfigBuilder
}
