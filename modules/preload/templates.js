export const preloadTemplates = async function() {
  const templatePaths = [
    'modules/pokemon-manager-data/templates/move.html',
  ]

  // Load the template parts
  return loadTemplates(templatePaths);
};
