'use strict'

const { issues: defaultIssues } = require('../issues')
const { kubernetes: k8sIssues } = defaultIssues
/**
 * @typedef {import('../definitions').ProjectValidationIssue} ProjectValidationIssue
 */

// Based on: 'https://matthewpalmer.net/kubernetes-app-developer/articles/kubernetes-apiversion-definition-guide.html'
// TODO: Find a method to update this easily
const recommendedApiVersions = {
  CertificateSigningRequest: 'certificates.k8s.io/v1beta1',
  ClusterRoleBinding: 'rbac.authorization.k8s.io/v1',
  ClusterRole: 'rbac.authorization.k8s.io/v1',
  ComponentStatus: 'v1',
  ConfigMap: 'v1',
  ControllerRevision: 'apps/v1',
  CronJob: 'batch/v1beta1',
  DaemonSet: 'extensions/v1beta1',
  Deployment: 'extensions/v1beta1',
  Endpoints: 'v1',
  Event: 'v1',
  HorizontalPodAutoscaler: 'autoscaling/v1',
  Ingress: 'extensions/v1beta1',
  Job: 'batch/v1',
  LimitRange: 'v1',
  Namespace: 'v1',
  NetworkPolicy: 'extensions/v1beta1',
  Node: 'v1',
  PersistentVolumeClaim: 'v1',
  PersistentVolume: 'v1',
  PodDisruptionBudget: 'policy/v1beta1',
  Pod: 'v1',
  PodSecurityPolicy: 'extensions/v1beta1',
  PodTemplate: 'v1',
  ReplicaSet: 'extensions/v1beta1',
  ReplicationController: 'v1',
  ResourceQuota: 'v1',
  RoleBinding: 'rbac.authorization.k8s.io/v1',
  Role: 'rbac.authorization.k8s.io/v1',
  Secret: 'v1',
  ServiceAccount: 'v1',
  Service: 'v1',
  StatefulSet: 'apps/v1'
}

/**
 * Validates apiVersion for resource kind
 * @param {String} file
 * @param {String} kind
 * @param {String} apiVersion
 * @returns {ProjectValidationIssue[]} issues
 */
const validateApiVersion = (file, kind, apiVersion) => {
  const issues = []
  if (recommendedApiVersions[kind] && apiVersion !== recommendedApiVersions[kind]) {
    issues.push(k8sIssues.noRecommendedApiVersion(file, apiVersion, kind, recommendedApiVersions[kind]))
  }
  if (!apiVersion) {
    issues.push(k8sIssues.emptyApiVersion(file))
  }
  if (String(apiVersion).includes('alpha')) {
    issues.push(k8sIssues.alphaApiVersionNotAllowed(file))
  }
  return issues
}

module.exports = {
  recommendedApiVersions,
  validateApiVersion
}
