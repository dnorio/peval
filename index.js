'use strict'
const chalk = require('chalk')
const { severities, severitiesLevel } = require('./issues')
const { version } = require('./package')
const k8sValidator = require('./k8s')
const dockerValidator = require('./docker')
const packageValidator = require('./npm')

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
  maxLevelAllowed = 3
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
        data: [ ...pv.issues, ...cv.issues ]
      }), { issues: [], data: [] })
    issues = result.issues
    data = result.data

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

module.exports = {
  validate
}
