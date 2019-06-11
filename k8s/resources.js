'use strict'
const { statSync, readdirSync, readFileSync } = require('fs')
const { join } = require('path')
const { safeLoad } = require('js-yaml')
const directoriesToNotWalk = ['node_modules', 'bin', 'tmp']

/**
 * Retorna os paths absolutos de todos arquivos de um diretorio, recursivamente, excluindo node_modules
 * @param {String} directoryOrFile diretorio
 * @returns {String[]} paths
 */
const walkSync = directoryOrFile =>
  statSync(directoryOrFile).isDirectory() && !directoriesToNotWalk.includes(directoryOrFile.split('/').pop())
    ? Array.prototype.concat(...readdirSync(directoryOrFile).map(file => walkSync(join(directoryOrFile, file))))
    : directoryOrFile

/**
 * Retorna paths com alguma das extensoes fornecidas
 * @param  {String[]} extensions
 */
const getFilesWithExtensions = (extensions, workingDir) => walkSync(workingDir)
  .filter(file => extensions
    .map(extension => file.endsWith(extension))
    .reduce((pv, cv) => pv || cv, false)
  )

/**
* Busca yamls, separando os por diretorios
*/
const findYamlsSplittedByDirectory = (workingDir) =>
  [
    ...getFilesWithExtensions(['.yaml', '.yml'], workingDir).reduce((pv, cv) => {
      const parts = cv.split('/')
      parts.pop()
      const folder = parts.join('/')
      if (!pv.get(folder)) pv.set(folder, [])
      pv.get(folder).push(cv)
      return pv
    }, new Map())
  ]

/**
* Obtem resources do k8s
* @param {String[]} paths
*/
const getK8sResources = (paths = []) => {
  const k8sResources = paths
    .map(path =>
      readFileSync(path, 'utf8')
        .split(/--- *\r?\n/)
        .filter(Boolean)
        .map(contentStr => ({ content: safeLoad(contentStr), path }))
    )
    .reduce((pv, cv) => pv.concat(cv), [])

  const k8sResourcesNormalizedForLists = k8sResources
    .reduce((pv, cv) => {
      if (Array.isArray(cv.content)) {
        return [...pv, ...cv.content.map(i => ({ content: i, path: cv.path }))]
      }
      if (cv.content.kind === 'List') {
        return [...pv, ...cv.content.items.map(i => ({ content: i, path: cv.path }))]
      }
      return [...pv, cv]
    }, [])
  return k8sResourcesNormalizedForLists
}

module.exports = {
  findYamlsSplittedByDirectory,
  getK8sResources
}
