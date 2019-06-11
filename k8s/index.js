'use strict'

const {
  findYamlsSplittedByDirectory,
  getK8sResources
} = require('./resources')

const { validateApiVersion } = require('./validateApiVersions')
const { validateContainers } = require('./validateContainers')

/**
 * @param {Object} param
 * @param {Function} param.logInfo
 * @param {Function} param.logError
 * @param {Boolean} param.debugInfo
 * @param {Object[]} param.k8sResources
 */
const analyseResources = ({ logInfo, logError, debugInfo, k8sResources }) => {
  let issues = []
  let data = []

  // Adds issues for apiVersion
  issues = [ ...issues, ...k8sResources
    .map(d => validateApiVersion(d.path, d.content.kind, d.content.apiVersion))
    .reduce((pv, cv) => pv.concat(cv), [])
  ]

  // Adds issues for containers, looking at cronjobs, jobs, deployments and configmaps
  const containersValidation = validateContainers({ logInfo, logError, debugInfo, k8sResources })
  issues = [ ...issues, ...containersValidation.issues ]
  data = [ ...data, ...containersValidation.data ]

  return {
    issues,
    data
  }
}

const validate = ({ logInfo = console.log, logError = console.error, debugInfo, workingDir } = {
  logInfo: console.log,
  logError: console.error,
  debugInfo: false,
  workingDir: process.cwd()
}) => {
  let issues = []
  let data = []
  const yamlsGroups = findYamlsSplittedByDirectory(workingDir)
  yamlsGroups.map(y => {
    logInfo(`Running K8S configuration analysis for path: ${y[0]}...`)
    const k8sResources = getK8sResources(y[1])
    const analysis = analyseResources({ logInfo, logError, debugInfo, k8sResources })
    issues = [ ...issues, ...analysis.issues ]
    data = [ ...data, ...analysis.data ]
  })

  return {
    issues,
    data
  }
}

module.exports = {
  validate
}
