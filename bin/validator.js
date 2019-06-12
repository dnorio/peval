#!/usr/bin/env node

const commander = require('commander')
const { validate } = require('../index')

commander
  .description('CLI that validates kubernetes and docker configurations')
  .option('-p, --path <path>', 'Path where the validations should occur', process.cwd())
  .option('-l, --level <level>', 'Level of tolerance for severity of issues:\n' +
    '\t\'0\' for no issues;\n\t\'1\' for only minor issues;\n\t\'2\' for up to moderate issues;\n' +
    '\t\'3\' for up to high issues;\n' +
    '\t\'4\' for enabling toleration of any issue, including breaking configurations.',
  /^0|1|2|3|4$/g, 3)
  .option('-o, --disable-opiniated', 'Disables opinionated validations', false)
  .option('-d, --debug', 'Enables debug logging.', false)
  .option('-v, --verbose', 'Enables verbose issues description.', true)
  .parse(process.argv)

validate({
  workingDir: commander.path,
  debugInfo: commander.debug,
  verbose: commander.verbose,
  maxLevelAllowed: commander.level,
  disableOpinionated: commander.disableOpinionated
})
