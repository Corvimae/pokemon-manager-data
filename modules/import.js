import { getOrCreateFolder, updateOrCreateAllInFolder } from '../../../../modules/pokemon-manager-data/modules/utils.js';

Hooks.on('renderSidebarTab', async (app, html) => {
  if (app.options.id === 'compendium') {
    let button = $("<button class='import-pmd'><i class='fas fa-file-import'></i> Sync Pokemon Manager data</button>");

    button.click(async () => {
      ui.notifications.info('Starting Pokemon data sync... Foundry may freeze for a bit!');

      await Promise.all([
        PokemonManagerImporter.bundleMoves(),
        PokemonManagerImporter.bundleSpecies()
      ])
    });

    html.find(".directory-footer").append(button);
  }
});

const BASE_PATH = 'https://pokemon.maybreak.com/api/v1';

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
    const speciesData = await PokemonManagerImporter.fetch('reference/species');

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
          ptu: {
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
    const moveData = await PokemonManagerImporter.fetch('reference/moves');
    
    const folder = await getOrCreateFolder('Pokemon Moves', 'Item');

    await updateOrCreateAllInFolder(folder, moveData.map(move => ({
      name: move.name,
      type: "move",
      img: `modules/pokemon-manager-data/assets/types/${move.type}.png`,
      data: {
        ...move,
        type: move.type,
      },
      flags: {
        pta: {
          dbId: move.id,
        },
        ptu: {
          dbId: move.id,
        },
      },
    })), Item, 'move');
   
    ui.notifications.info('Pokemon move sync complete!')
  }
}
