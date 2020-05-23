import { preloadTemplates } from './preload/templates.js';
import { getOrCreateCompendium, updateOrCreateAllInCompendium, getOrCreateFolder, updateOrCreateAllInFolder } from './utils.js';

Hooks.once('init', () => {
  console.log('Initializing Pokemon Manager interop layer...');

  game.pokemon = {
    async rollMove(name, type, frequency, range, damage, accuracy, attackType, effects) {
      const accuracyCheck = new Die(20);
      
      accuracyCheck.roll(1);

      const [_, dice, dieSize, flat] = /([0-9]+)d([0-9]+)\s*\+\s*([0-9]+)/.exec(damage) ?? [0, 0, 0, 0];

      const content = await renderTemplate('modules/pokemon-manager-data/templates/move.html', {
        name,
        type,
        frequency,
        range,
        damage,
        critDamage:`${dice * 2}d${dieSize} + ${flat * 2}`,
        accuracy,
        effects,
        attackTypeName: attackType === 0 ? 'Physical' : 'Special',
        isStatus: attackType === 2,
        accuracyCheck: accuracyCheck.results[0],
        isCrit: accuracyCheck.results[0] === 20,
        speaker: ChatMessage.getSpeaker(),
      });
      
      await ChatMessage.create({
        content,
        speaker: ChatMessage.getSpeaker(),
        type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      });
    }
  };

  preloadTemplates();
});

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
        return 'nidoranf';``
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
        type: 'character',
        img: `modules/pokemon-manager-data/sprites/${PokemonManagerImporter.normalizePokemonName(species.name, species.id)}.png`,
        flags: {
          pokemonDBId: species.id,
        },
      })),
      Actor,
      'species actor',
      { displaySheet: false },
      data => ({
        token: { 
          ...duplicate(data.token),
          img: `modules/pokemon-manager-data/sprites/webm/${PokemonManagerImporter.normalizePokemonName(data.name, data.flags.pokemonDBId)}.webm`
        }
      }),
    );

    ui.notifications.info('Pokemon species sync complete!')
  }

  static async bundleMoves() {
    const types = await PokemonManagerImporter.fetchTypesById();
    const moveData = await PokemonManagerImporter.fetch('moves/all');
    
    const compendium = await getOrCreateCompendium('pokemon-moves', 'Pokemon Move Macros', 'Macro');

    await updateOrCreateAllInCompendium(compendium, moveData.map(move => ({
      name: move.name,
      type: "script",
      command: `game.pokemon.rollMove('${move.name}', '${types[move.type]}', '${move.frequency}', '${move.range}', '${move.damage}', ${move.accuracy}, ${move.attackType}, '${move.effects}')`,
    })), Macro, 'move macro');
   
    ui.notifications.info('Pokemon move sync complete!')
  }

  static async fetchTypesById() {
    const typesData = await PokemonManagerImporter.fetch('types');

    return typesData.reduce((acc, value) => ({ ...acc, [value.id]: value.name }), {});
  }
}
