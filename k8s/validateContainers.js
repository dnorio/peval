'use strict'
const { issues: defaultIssues } = require('../issues')
const { kubernetes: k8sIssues } = defaultIssues

const enforceArray = obj => Array.isArray(obj) ? obj : [obj]

/**
 * Validate deployment's containers against variables in configmaps, itself and commands.
 */

const validateContainers = ({ logInfo, logError, debugInfo, k8sResources }) => {
  let issues = []

  if (debugInfo) {
    logInfo('#####################')
    logInfo('k8sResources:')
    logInfo(JSON.stringify(k8sResources, undefined, 2))
    logInfo('#####################')
  }

  const configMaps = k8sResources.filter(r => r.content.kind === 'ConfigMap')
  const deployments = k8sResources.filter(r => r.content.kind === 'Deployment')
  const cronJobs = k8sResources.filter(r => r.content.kind === 'CronJob')

  // No resource with same name and same kind
  const uniqueResourcesMap = new Map()
  k8sResources.forEach(resource => {
    const key = JSON.stringify({
      kind: resource.content.kind,
      name: resource.content.metadata.name
    })
    if (!uniqueResourcesMap.has(key)) {
      uniqueResourcesMap.set(key, resource)
    } else {
      issues.push(k8sIssues.duplicatedResource(
        uniqueResourcesMap.get(key).path,
        resource.path,
        resource.content.metadata.name,
        resource.content.kind
      ))
    }
  })

  // Deployments without containers
  deployments
    .filter(deployment =>
      !deployment.content.spec.template.spec.containers ||
      !deployment.content.spec.template.spec.containers.length ||
      deployment.content.spec.template.spec.containers.length === 0)
    .forEach(deployment => issues.push(k8sIssues
      .noDeploymentWithoutContainers(
        deployment.path,
        deployment.content.name || deployment.content.metadata.name))
    )

  // CronJobs without containers
  cronJobs
    .filter(cronJob =>
      !cronJob.content.spec.jobTemplate.spec.template.spec.containers ||
      !cronJob.content.spec.jobTemplate.spec.template.spec.containers.length ||
      cronJob.content.spec.jobTemplate.spec.template.spec.containers.length === 0)
    .forEach(cronJob => issues.push(k8sIssues
      .noCronJobWithoutContainers(
        cronJob.path,
        cronJob.content.name || cronJob.content.metadata.name))
    )

  const deploymentContainers = deployments
    .map(deployment => (deployment.content.spec.template.spec.containers || [])
      .map(container => ({
        ...container,
        file: deployment.path,
        kind: 'Deployment',
        workName: deployment.content.name || deployment.content.metadata.name
      }))
    )
    .reduce((pv, cv) => pv.concat(cv), [])
  const cronJobsContainers = cronJobs
    .map(cronJob => (cronJob.content.spec.jobTemplate.spec.template.spec.containers || [])
      .map(container => ({
        ...container,
        file: cronJob.path,
        kind: 'CronJob',
        workName: cronJob.content.name || cronJob.content.metadata.name
      }))
    )
    .reduce((pv, cv) => pv.concat(cv), [])
  let containers = [ ...deploymentContainers, ...cronJobsContainers ]

  // No broken identation for containers
  containers
    .filter(c => !c.image)
    .forEach(noContainer => issues.push(k8sIssues.containerWithWrongSpecification(
      noContainer.file,
      noContainer.workName,
      (delete noContainer.file, delete noContainer.workName, noContainer)
    )))

  containers = containers.filter(c => c.image)

  // No command override
  containers
    .filter(container => container.kind === 'Deployment' && container.command)
    .forEach(container => issues.push(k8sIssues
      .noDeploymentContainerWithArgsOverride(
        container.file,
        container.workName,
        container.name,
        enforceArray(container.command).join(' ') +
        (container.args ? ` ${enforceArray(container.args).join(' ')}` : '')
      ))
    )

  // No latest tag on images
  containers
    .filter(container => container.image.endsWith(':latest'))
    .forEach(container => issues.push(k8sIssues
      .noLatestTag(
        container.file,
        container.workName,
        container.name,
        container.image
      )
    ))

  // No renamed variable
  containers
    .forEach(container => {
      container.env.forEach(env => {
        if (env.valueFrom &&
          env.valueFrom.configMapKeyRef &&
          env.valueFrom.configMapKeyRef.key !== env.name) {
          issues.push(k8sIssues
            .noRenamedEnvVariable(
              container.file,
              container.workName,
              container.name,
              env.name,
              env.valueFrom.configMapKeyRef.key,
              env.valueFrom.configMapKeyRef.name
            ))
        }
      })
    })

  // No duplicated variable
  containers
    .forEach(container => {
      const uniqueVariableMap = new Map()
      container.env.forEach(env => {
        if (!uniqueVariableMap.has(env.name)) {
          uniqueVariableMap.set(env.name, env)
        } else {
          issues.push(k8sIssues.duplicatedEnvVariable(
            container.file,
            container.workName,
            container.name,
            env.name
          ))
        }
        if (env.valueFrom &&
          env.valueFrom.configMapKeyRef &&
          env.valueFrom.configMapKeyRef.key !== env.name) {
          issues.push(k8sIssues
            .noRenamedEnvVariable(
              container.file,
              container.workName,
              container.name,
              env.name,
              env.valueFrom.configMapKeyRef.key,
              env.valueFrom.configMapKeyRef.name
            ))
        }
      })
    })

  // Extract variables usage
  const configMapsVariables = new Map(configMaps.map(c => [
    c.content.metadata.name,
    new Set(Object.keys(c.content.data))
  ]))
  const configMapsUsedVariables = new Map(configMaps.map(c => [
    c.content.metadata.name,
    new Set()
  ]))
  const configMapsVariablesWithValue = new Map(configMaps.map(c => [
    c.content.metadata.name,
    new Map(Object.entries(c.content.data))
  ]))

  containers
    .forEach(container => {
      container.env.forEach(env => {
        if (env.valueFrom && env.valueFrom.configMapKeyRef &&
          configMapsUsedVariables.has(env.valueFrom.configMapKeyRef.name) &&
          configMapsVariables.get(env.valueFrom.configMapKeyRef.name).has(env.valueFrom.configMapKeyRef.key)) {
          configMapsUsedVariables.get(env.valueFrom.configMapKeyRef.name).add(env.valueFrom.configMapKeyRef.key)
        }
      })
    })

  // No configmap available
  containers
    .forEach(container => {
      container.env.forEach(env => {
        if (env.valueFrom &&
          env.valueFrom.configMapKeyRef &&
          !configMapsVariables.has(env.valueFrom.configMapKeyRef.name)) {
          issues.push(k8sIssues
            .noLocaleConfigMapForVariable(
              container.file,
              container.workName,
              container.name,
              env.name,
              env.valueFrom.configMapKeyRef.name
            ))
        }
      })
    })

  // Variable not found at configmap
  containers
    .forEach(container => {
      container.env.forEach(env => {
        if (env.valueFrom &&
        env.valueFrom.configMapKeyRef &&
        configMapsVariables.has(env.valueFrom.configMapKeyRef.name) &&
        !configMapsVariables.get(env.valueFrom.configMapKeyRef.name).has(env.valueFrom.configMapKeyRef.key)) {
          issues.push(k8sIssues
            .variableNotFoundAtConfigMap(
              container.file,
              container.workName,
              container.name,
              env.name,
              env.valueFrom.configMapKeyRef.key,
              env.valueFrom.configMapKeyRef.name
            ))
        }
      })
    })

  // Unused configmap variable
  configMaps.forEach(c => {
    const unusedVariables = [...new Set([...configMapsVariables.get(c.content.metadata.name)]
      .filter(v => !configMapsUsedVariables.get(c.content.metadata.name).has(v)))]
    unusedVariables.forEach(variable => {
      issues.push(k8sIssues.unusedVariableInConfigmap(
        c.path,
        variable,
        c.content.metadata.name
      ))
    })
  })

  // Extract solved variables for containers
  const solvedVariablesByContainer = new Map()
  containers
    .forEach(container => {
      if (!solvedVariablesByContainer.has(container.name)) {
        solvedVariablesByContainer.set(container.name, new Map())
      }
      if (debugInfo) {
        logInfo('####')
        logInfo(solvedVariablesByContainer)
        logInfo(container)
      }
      container.env.forEach(env => {
        if (env.valueFrom && env.valueFrom.configMapKeyRef) {
          if (configMapsVariablesWithValue.has(env.valueFrom.configMapKeyRef.name) &&
          configMapsVariablesWithValue.get(env.valueFrom.configMapKeyRef.name).has(env.valueFrom.configMapKeyRef.key)) {
            solvedVariablesByContainer.get(container.name).set(env.name, {
              value: configMapsVariablesWithValue.get(env.valueFrom.configMapKeyRef.name).get(env.valueFrom.configMapKeyRef.key),
              solved: true
            })
          } else {
            solvedVariablesByContainer.get(container.name).set(env.name, {
              value: undefined,
              solved: false
            })
          }
        }
      })
    })
  if (debugInfo) {
    logInfo(configMapsUsedVariables)
    logInfo(configMapsVariables)
    logInfo(solvedVariablesByContainer)
  }
  let data = [{ configMapsUsedVariables, configMapsVariables }]
  return {
    issues,
    data
  }
}

module.exports = {
  validateContainers
}
