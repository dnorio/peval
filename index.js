'use strict'
const chalk = require('chalk')
const { severities, severitiesLevel } = require('./issues')
const { version } = require('./package')
const k8sValidator = require('./k8s')
const dockerValidator = require('./docker')
const packageValidator = require('./npm')

const { getInstanceMemory } = require('./config')

const memory = getInstanceMemory()

const mapSeverity = severity => {
  switch (severity) {
    case severities.breakable:
      return chalk.red.bold(severity)
    case severities.high:
      return chalk.red(severity)
    case severities.moderate:
      return chalk.cyan(severity)
    case severities.minor:
      return chalk.blue(severity)
    default:
      return chalk.red.bold(severity)
  }
}
/**
 * @typedef {Object} ProjectValidationIssue
 * @property {Number} severity
 * @property {String} code
 * @property {String} shortDescription
 * @property {String} longDescription
 * @property {String} foundAt
 * @property {String[]} references
 * @property {Boolean} opinionated
 */

/**
 * @typedef {Object} ValidationResult
 * @property {ProjectValidationIssue[]} issues
 * @property {Object[]} data
 * @property {Number} exitingCode
 * @property {Error} [error]
 */

/**
 * Sync validation of kubernetes, docker and npm configurations.
 * @param {Object} param
 * @returns {ValidationResult} validationResult
 */
const validate = ({
  logInfo = console.log,
  logError = console.error,
  workingDir = process.cwd(),
  debugInfo = false,
  verbose = true,
  maxLevelAllowed = 3,
  opinionated = false
} = {
  logInfo: console.log,
  logError: console.error,
  workingDir: process.cwd(),
  debugInfo: false,
  verbose: true,
  maxLevelAllowed: 3
}) => {
  let exitingCode = 0
  const isCLI = require.main.filename.endsWith('bin/validator.js')
  let issues = []
  let data = []
  let error
  let maxLevel

  try {
    logInfo(`###### Project Validator (v${version}) ######`)
    logInfo('Working dir:', workingDir, '\n')
    const result = [
      k8sValidator,
      dockerValidator,
      packageValidator
    ]
      .map(validator => ({
        ...validator.validate({ logInfo, logError, debugInfo, workingDir })
      }))
      .reduce((pv, cv) => ({
        issues: [ ...pv.issues, ...cv.issues ],
        data: [ ...pv.data, ...cv.data ]
      }), { issues: [], data: [] })
    issues = result.issues
    data = result.data

    for (let z = 0; z < data.length; z++) {
      if (debugInfo) {
        logInfo('----- DATA')
        logInfo(data[z].configMapsUsedVariables)
        logInfo(data[z].configMapsVariables)
        logInfo(data[z].solvedVariablesByContainer)
        logInfo('-----')
      }
      const solvedVariablesByContainerList = [...data[z].solvedVariablesByContainer]
      /** Custom rule type #1 no variable */
      for (let i = 0; i < memory.customRulesNoVariableAllContainers.length; i++) {
        const rule = memory.customRulesNoVariableAllContainers[i]
        for (let j = 0; j < solvedVariablesByContainerList.length; j++) {
          const solvedVariable = solvedVariablesByContainerList[j]
          if (solvedVariable[1].has(rule.variableName)) {
            issues.push(rule.builder(`file for '${solvedVariable[0]}'`)) // TODO: Enhance location description
          }
        }
      }

      /** Custom rule type #2 no variable at specific deployment */
      for (let i = 0; i < memory.customRulesNoVariableSpecific.length; i++) {
        const rule = memory.customRulesNoVariableSpecific[i]
        if (data[z].solvedVariablesByContainer.has(rule.deploymentName) &&
          data[z].solvedVariablesByContainer.get(rule.deploymentName).has(rule.variableName)) {
          issues.push(rule.builder(`file for '${rule.deploymentName}'`)) // TODO: Enhance location description
        }
      }

      /** Custom rule type #3 no variable with value */
      for (let i = 0; i < memory.customRulesNoVariableAllContainersWithValue.length; i++) {
        const rule = memory.customRulesNoVariableAllContainersWithValue[i]
        for (let j = 0; j < solvedVariablesByContainerList.length; j++) {
          const solvedVariable = solvedVariablesByContainerList[j]
          if (solvedVariable[1].has(rule.variableName) &&
            solvedVariable[1].get(rule.variableName).solved &&
            solvedVariable[1].get(rule.variableName).value === rule.value) {
            issues.push(rule.builder(`file for '${solvedVariable[0]}'`)) // TODO: Enhance location description
          }
        }
      }

      /** Custom rule type #4 no variable with value at specific deployment */
      for (let i = 0; i < memory.customRulesNoVariableSpecificWithValue.length; i++) {
        const rule = memory.customRulesNoVariableSpecificWithValue[i]
        if (data[z].solvedVariablesByContainer.has(rule.deploymentName) &&
          data[z].solvedVariablesByContainer.get(rule.deploymentName).has(rule.variableName) &&
          data[z].solvedVariablesByContainer.get(rule.deploymentName).get(rule.variableName).solved &&
          data[z].solvedVariablesByContainer.get(rule.deploymentName).get(rule.variableName).value === rule.value) {
          issues.push(rule.builder(`file for '${rule.deploymentName}'`)) // TODO: Enhance location description
        }
      }
    }

    if (issues.length > 0) {
      maxLevel = Math.max(...issues.map(i => severitiesLevel[i.severity]))
      logInfo(`Found ${issues.length} issue(s):\n`)
      issues.map(i => logInfo(`\tIssue #${i.code} (${mapSeverity(i.severity)}): ${verbose ? i.longDescription : i.shortDescription} ${verbose ? `\n\t\tFound at ${i.foundAt}${i.references.length > 0 ? `\n\t\tReferences:\t${i.references.join(';\n\t\t\t\t')}` : ''}\n` : ''}`))
      exitingCode = maxLevel > maxLevelAllowed ? 1 : 0
    } else {
      logInfo('Everything is fine!')
    }
  } catch (err) {
    logError('Unable to validate project..')
    logError(err)
    error = err
    exitingCode = 1
  }
  if (isCLI) {
    logInfo(`Validator exited with code ${exitingCode}`)
    process.exit(exitingCode)
  } else {
    if (exitingCode > 0) {
      error = Error(`Issue with level ${maxLevel} ocurred while max level allowed was ${maxLevelAllowed}`)
    }
    return {
      issues,
      data,
      exitingCode,
      error
    }
  }
}

// /** Testes */
// memory.builder
//   .set.rule('k8s002').enabled(false)
//   .set.kubernetesIssue.emptyApiVersion.opinionated()
//   .set.kubernetesIssue.emptyApiVersion.opinionated(false)
//   .set.kubernetesIssue.noCronJobWithoutContainers.enabled(true)
//   .add.forbiddenVariable({ variableName: 'MAIL_FROM', severity: severities.minor, commentary: 'esta variavel eh inutil' })
//   .add.forbiddenVariable({ variableName: 'VAR_2', severity: severities.high, deploymentName: 'test-container-name', commentary: 'nao pode!!' })
//   .add.forbiddenVariableWithValue({ variableName: 'VAR_2', value: 'var2 value', severity: severities.high, commentary: 'nao pode22!!' })
//   .add.forbiddenVariableWithValue({ variableName: 'VAR_2', value: 'var2 value', severity: severities.high, deploymentName: 'test-container-name', commentary: 'nao pode22fdaafs!!' })
// validate({ debugInfo: true })
module.exports = {
  validate,
  extend: memory.builder
}
