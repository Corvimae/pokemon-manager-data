export async function getOrCreateFolder(name, type) {
  return game.folders.find(p => p.data.name === name && p.data.type === type) || (await Folder.create({
    name,
    type,
    parent: null,
  }));
}
export async function getOrCreateCompendium(name, label, entity) {
  return game.packs.find(p => p.collection.endsWith(name)) || (await Compendium.create({
    name,
    label,
    entity,
    package: 'pokemon-manager-data'
  }));
}


export async function updateOrCreateAllInFolder(folder, entityDataList, entityClass, debugDescription = 'compendium item', createOptions = {}, transformData) {
  for(let entityData of entityDataList) {
    const existingItem  = folder.content.find(item => item.data.flags.pokemonDBId === entityData.flags.pokemonDBId);

    let newEntity;

    if (existingItem) {
      console.info(`Updating ${debugDescription} ${entityData.name} (ID: ${existingItem._id})`)
      newEntity = existingItem;

      await newEntity.update(entityData);
    } else {
      console.info(`Creating new ${debugDescription} for ${entityData.name}`);

      newEntity = await entityClass.create(
        {
          ...entityData,
          folder: folder.data._id,
        },
        createOptions
      );
    }

    if(transformData) {
      await newEntity.update(transformData(newEntity.data));
    }
  }
}

export async function updateOrCreateAllInCompendium(compendium, entityDataList, entityClass, debugDescription = 'compendium item', createOptions = {}, transformData) {
  const existingCompendiumData = await compendium.getData();
    
  for(let entityData of entityDataList) {
    const existingItem = existingCompendiumData.index.find(item => item.name === entityData.name);
  
    let newEntity;

    if (existingItem) {
      console.info(`Updating ${debugDescription} ${entityData.name} (ID: ${existingItem._id})`)
      newEntity = await compendium.getEntity(existingItem._id);

      await newEntity.update(entityData);
    } else {
      console.info(`Creating new ${debugDescription} for ${entityData.name}`);

      newEntity = await entityClass.create(entityData, createOptions);
    
      compendium.importEntity(newEntity);
    }

    if(transformData) {
      await newEntity.update(transformData(newEntity.data));
    }
  }
}