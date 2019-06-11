'use strict'

/**
 * This file includes all default issues constructors.
 */

const severities = Object.freeze({
  minor: 'MINOR',
  moderate: 'MODERATE',
  high: 'HIGH',
  breakable: 'BREAKABLE'
})

const severitiesLevel = Object.freeze({
  MINOR: 1,
  MODERATE: 2,
  HIGH: 3,
  BREAKABLE: 4
})

// Based on:
const refRecommendedVersions = 'https://matthewpalmer.net/kubernetes-app-developer/articles/kubernetes-apiversion-definition-guide.html'
const refAlphaLevel = 'https://kubernetes.io/docs/concepts/overview/kubernetes-api/#api-versioning'
const refCronJobRecommended = 'https://kubernetes.io/docs/tasks/job/automated-tasks-with-cron-jobs/'
const refContainerImage = 'https://kubernetes.io/docs/concepts/configuration/overview/#container-images'

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

const issues = {
  kubernetes: {
    noRecommendedApiVersion: (file, apiVersion, kind, recommendedApiVersion) => ({
      severity: severities.moderate,
      code: 'k8s001',
      shortDescription: 'Recommended apiVersion for resource kind isn\'t used',
      longDescription: `Recommended apiVersion for resource kind '${kind}' is '${recommendedApiVersion}'. Got '${apiVersion}'.`,
      foundAt: file,
      references: [refRecommendedVersions, ...(kind === 'CronJob' ? [refCronJobRecommended] : [])],
      opinionated: false
    }),
    emptyApiVersion: (file) => ({
      severity: severities.breakable,
      code: 'k8s002',
      shortDescription: 'ApiVersion is empty',
      longDescription: 'ApiVersion is empty. That will break the k8s operation.',
      foundAt: file,
      references: [],
      opinionated: false
    }),
    alphaApiVersionNotAllowed: (file) => ({
      severity: severities.high,
      code: 'k8s003',
      shortDescription: 'ApiVersion\'s level should not be alpha.',
      longDescription: 'ApiVersion\'s level should not be alpha, since it\'s disabled by default, may be buggy and support for feature may be dropped at any time without notice.',
      foundAt: file,
      references: [refAlphaLevel],
      opinionated: false
    }),
    noDeploymentWithoutContainers: (file, deploymentName) => ({
      severity: severities.breakable,
      code: 'k8s004',
      shortDescription: 'Any resource of kind deployment must spec at least one container.',
      longDescription: `Resource of kind deployment named '${deploymentName}' must spec at least one container.`,
      foundAt: file,
      references: [],
      opinionated: false
    }),
    noCronJobWithoutContainers: (file, cronjobName) => ({
      severity: severities.breakable,
      code: 'k8s005',
      shortDescription: 'Any resource of kind cronjob must spec at least one container.',
      longDescription: `Resource of kind cronjob named '${cronjobName}' must spec at least one container.`,
      foundAt: file,
      references: [],
      opinionated: false
    }),
    noDeploymentContainerWithArgsOverride: (file, deploymentName, containerName, cmdArgs) => ({
      severity: severities.minor,
      code: 'k8s006',
      shortDescription: 'Any resource of kind deployment shouldn\'t override image command',
      longDescription: `Any resource of kind deployment shouldn't override image command, since it can be misleading. Found container '${containerName}' at '${deploymentName}' with '${cmdArgs}'.`,
      foundAt: file,
      references: [],
      opinionated: true
    }),
    noLatestTag: (file, workName, containerName, tag) => ({
      severity: severities.high,
      code: 'k8s007',
      shortDescription: 'Containers should not use latest tag.',
      longDescription: `Containers should not use latest tag, since will be make rollbacks hard or impossible to do. Found container '${containerName}' at '${workName}' with '${tag}'.`,
      foundAt: file,
      references: [refContainerImage],
      opinionated: false
    }),
    noRenamedEnvVariable: (file, workName, containerName, variableName, keyName, configmap) => ({
      severity: severities.moderate,
      code: 'k8s008',
      shortDescription: 'Containers should not change configmap env name.',
      longDescription: `Container '${containerName}' at '${workName}' has variable '${variableName}' extracted from configmap '${configmap}' key '${keyName}'. Renaming variables may be misleading and is not recommended.`,
      foundAt: file,
      references: [],
      opinionated: true
    }),
    duplicatedResource: (file1, file2, name, kind) => ({
      severity: severities.breakable,
      code: 'k8s009',
      shortDescription: 'Duplicated resources of same name and kind',
      longDescription: `Found duplicated resource of kind '${kind}' and name '${name}'.`,
      foundAt: file1 !== file2 ? `${file1}, ${file2}` : file1,
      references: [],
      opinionated: false
    }),
    duplicatedEnvVariable: (file, workName, containerName, variableName) => ({
      severity: severities.minor,
      code: 'k8s010',
      shortDescription: `Duplicated env variable '${variableName}' for container ${containerName}.`,
      longDescription: `Found duplicated variable '${variableName}' in container '${containerName}' at '${workName}'.`,
      foundAt: file,
      references: [],
      opinionated: false
    }),
    noLocaleConfigMapForVariable: (file, workName, containerName, variableName, configmap) => ({
      severity: severities.moderate,
      code: 'k8s011',
      shortDescription: `ConfigMap '${configmap}' not found locally.`,
      longDescription: `ConfigMap '${configmap}' refered by variable '${variableName}' in container '${containerName}' at ${workName} was not found locally.`,
      foundAt: file,
      references: [],
      opinionated: true
    }),
    variableNotFoundAtConfigMap: (file, workName, containerName, variableName, keyName, configmap) => ({
      severity: severities.breakable,
      code: 'k8s012',
      shortDescription: `Refered variable '${keyName}' not found at '${configmap}'.`,
      longDescription: `Container '${containerName}' at '${workName}' has variable '${variableName}' that refers inexistent configmap '${configmap}' key '${keyName}'.`,
      foundAt: file,
      references: [],
      opinionated: false
    }),
    unusedVariableInConfigmap: (file, keyName, configmap) => ({
      severity: severities.minor,
      code: 'k8s013',
      shortDescription: `Variable '${keyName}' of configmap '${configmap}' isn't used.`,
      longDescription: `Variable '${keyName}' of configmap '${configmap}' isn't used.`,
      foundAt: file,
      references: [],
      opinionated: false
    }),
    containerWithWrongSpecification: (file, deploymentName, parsedContent) => ({
      severity: severities.breakable,
      code: 'k8s014',
      shortDescription: `Container found in '${deploymentName}' appears to be invalid. Check for lines with content ${JSON.stringify(parsedContent)}.`,
      longDescription: `Container found in '${deploymentName}' appears to be invalid (Maybe is an identation problem?). Check for lines with content ${JSON.stringify(parsedContent)}.`,
      foundAt: file,
      references: [],
      opinionated: false
    })
  }
}

module.exports = {
  severities,
  severitiesLevel,
  issues
}
