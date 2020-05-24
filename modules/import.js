import { getOrCreateFolder, updateOrCreateAllInFolder } from '../../../../modules/pokemon-manager-data/modules/utils.js';

Hooks.on('renderSidebarTab', async (app, html) => {
  if (app.options.id === 'compendium') {
    let button = $("<button class='import-pmd'><i class='fas fa-file-import'></i> Sync Pokemon Manager data</button>");

    button.click(async () => {
      ui.notifications.info('Starting Pokemon data sync...');

      await Promise.all([
        PokemonManagerImporter.bundleMoves(),
        PokemonManagerImporter.bundleSpecies()
      ])
    });

    html.find(".directory-footer").append(button);
  }
});

const BASE_PATH = 'https://pokemon.maybreak.com/api/v2';

class PokemonManagerImporter {
  static async fetch(path) {
    const response = await fetch(`${BASE_PATH}/${path}`);

    return response.json();
  }

  static normalizePokemonName(name, id) {
    switch (id) {
      case 29: // Nidoran F
        return 'nidoranf';
      case 32: // Nidoran M
        return 'nidoranm';
      default:
        return name.toLowerCase().replace(/[.':\- ]/g, '');
    }
  }

  static async bundleSpecies() {
    const speciesData = await PokemonManagerImporter.fetch('species/all');

    const folder = await getOrCreateFolder('Pokemon Species', 'Actor');

    await updateOrCreateAllInFolder(
      folder,
      speciesData.map(species => ({
        name: species.name,
        type: 'pokemon',
        img: `modules/pokemon-manager-data/assets/sprites/${PokemonManagerImporter.normalizePokemonName(species.name, species.id)}.png`,
        flags: {
          pta: {
            dbId: species.id,
          },
        },
      })),
      Actor,
      'species actor',
      { displaySheet: false },
      data => ({
        token: { 
          ...duplicate(data.token),
          img: `modules/pokemon-manager-data/assets/sprites/webm/${PokemonManagerImporter.normalizePokemonName(data.name, data.flags.pta?.dbId)}.webm`
        }
      }),
    );

    ui.notifications.info('Pokemon species sync complete!')
  }

  static async bundleMoves() {
    const typeMap = await PokemonManagerImporter.fetchTypesById();
    const moveData = await PokemonManagerImporter.fetch('moves/all');
    
    const folder = await getOrCreateFolder('Pokemon Moves', 'Item');

    await updateOrCreateAllInFolder(folder, moveData.map(move => ({
      name: move.name,
      type: "move",
      img: `modules/pokemon-manager-data/assets/types/${move.name.toLowerCase()}`,
      data: {
        ...move,
        type: typeMap[move.type],
      },
      flags: {
        pta: {
          dbId: move.id,
        },
      },
    })), Item, 'move');
   
    ui.notifications.info('Pokemon move sync complete!')
  }

  static async fetchTypesById() {
    const typesData = await PokemonManagerImporter.fetch('types');

    return typesData.reduce((acc, value) => ({ ...acc, [value.id]: value.name }), {});
  }
}
