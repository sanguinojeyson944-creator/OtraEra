const rows = [];
const slug = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

function addSeries(category, kind, names, specs, slot = null) {
  names.forEach((name, index) => {
    const spec = specs[index] || {};
    const level = index + 1;
    rows.push({
      id: slug(name), name, category, kind, slot: slot ? (typeof slot === 'function' ? slot(index) : slot) : null,
      level, rarity: level >= 5 ? 'Épico' : level >= 3 ? 'Mágico' : 'Común', reinforce: 0,
      setName: spec.setName || '', setKey: spec.setKey || '',
      appearance: spec.appearance || defaultAppearance(category, kind, index),
      requirement: spec.requirement || { level, str: category === 'weapons' ? level * 5 : 0 },
      damageMin: spec.damageMin || 0, damageMax: spec.damageMax || 0, defense: spec.defense || 0,
      block: spec.block || 0, attackSpeed: spec.attackSpeed || '', critical: spec.critical || 0,
      bonus: spec.bonus || '', weight: spec.weight ?? (category === 'weapons' ? 3 + level : category === 'armor' ? 1 + level * .7 : .3),
      gp: spec.gp || level * 85, compose: spec.compose || 3, crystals: spec.crystals || [], enchants: spec.enchants || []
    });
  });
}
const itemPalettes = {
  weapons: [['#c6d0c7','#d9b66d'],['#82969c','#c7ded7'],['#9c5a4e','#d7a66c'],['#d0ac5f','#f1dfad'],['#4b5b62','#a7c4c1']],
  armor: [['#59714d','#bd9559'],['#4c7980','#d4e0d6'],['#8b4742','#d9aa70'],['#b99b5d','#f1dfb6'],['#45515e','#a4bcc3']],
  jewelry: [['#ae8148','#e0c376'],['#527c78','#c3ded2'],['#8f4b4d','#e6b883'],['#b9a45c','#f5e6bc'],['#485b70','#c4d3d5']],
  consumables: [['#9d514a','#df9c76'],['#63965e','#c7d884'],['#55818e','#b8e2e5'],['#b78a4c','#efd091'],['#77714b','#c6d28b']],
  materials: [['#78624f','#c19a6a'],['#526d77','#bad6dc'],['#9a5539','#e39b58'],['#729ba7','#d8f0f4'],['#6a6b83','#c7d8f1']]
};
function defaultAppearance(category, kind, index = 0) {
  const palette = itemPalettes[category] || itemPalettes.armor;
  const colors = palette[index % palette.length];
  return { color: colors[0], accent: colors[1], model: slug(kind) };
}

addSeries('weapons','Espada', ['Hoja de la Milicia','Espada del Velo','Bracamante del Bastión','Ropera Ancentral','Katzbalger Imperial'], [8,14,22,32,45].map((damage,i)=>({damageMin:damage,damageMax:[12,20,30,42,58][i],attackSpeed:'Normal',gp:(i+1)*110})), 'weapon');
addSeries('weapons','Hacha', ['Hacha de Leñador','Hacha de Guerra de la Villa','Decapitadora de la Ceniza','Gran Hacha Inquisitorial','Hendedora de la Cicatriz'], [12,20,35,52,75].map((damage,i)=>({damageMin:damage,damageMax:[20,32,50,70,98][i],attackSpeed:'Lenta',weight:4+i,gp:(i+1)*125})), 'weapon');
addSeries('weapons','Cimitarra', ['Cimitarra de la Penumbra','Hoja Curva del Lago','Filo Sombrío','Daga Flamante','Cimitarra de la Sombra'], [7,12,18,28,40].map((damage,i)=>({damageMin:damage,damageMax:[11,18,26,38,52][i],critical:[5,8,10,12,15][i],attackSpeed:'Rápida',weight:2.4+i*.4,gp:(i+1)*135})), 'weapon');
addSeries('weapons','Escudo', ['Pavés de Bronce','Escudo de Roble','Escudo de la Guardia','Broquel Inquisitorial','Baluarte de Walpira'], [6,12,20,32,48].map((defense,i)=>({defense,block:[10,14,18,22,28][i],attackSpeed:'Bloqueo',weight:3+i,gp:(i+1)*100})), 'offhand');
addSeries('armor','Casco', ['Capucha de Tela','Yelmo de Cuero Demacrado','Celada de Hierro','Yelmo de la Guardia','Yelmo Inquisitorial de Placas'], [2,5,9,14,20].map((defense,i)=>({defense,weight:1+i*.4,gp:(i+1)*65})), 'head');
addSeries('armor','Capa', ['Capa de Viaje','Capa de la Guardia','Capa del Bastión','Capa de la Noche','Capa del Coloso'], [{bonus:'Defensa +1 · Movimiento +2%',weight:1.3,gp:80},{bonus:'Defensa +2 · Movimiento +4%',weight:1.5,gp:120},{bonus:'Defensa +4 · Movimiento +6%',weight:1.9,gp:200},{bonus:'Defensa +5 · Movimiento +8%',weight:2.2,gp:260},{bonus:'Defensa +7 · Resistencia +8%',weight:2.5,gp:360}], 'cape');
addSeries('armor','Pechera', ['Túnica de Lienzo','Pechera de Malla Oxidada','Coraza de Bronce','Placa de Acero de la Villa','Armadura del Bastión'], [4,9,16,25,36].map((defense,i)=>({defense,weight:2+i,gp:(i+1)*95})), 'chest');
addSeries('armor','Guantes', ['Brazales de Tela','Guantes de Miliciano','Manoplas de Hierro','Guantes de la Guardia','Guanteletes de Acero Negro'], [1,3,6,10,15].map((defense,i)=>({defense,weight:.7+i*.3,gp:(i+1)*55})), 'gloves');
addSeries('armor','Pantalones', ['Pantalón de Lino','Grebas de Cuero','Pantalón de Cota de Malla','Grebas de Acero de la Guardia','Quijote Inquisitorial'], [2,5,9,14,21].map((defense,i)=>({defense,weight:1+i*.6,gp:(i+1)*70})), 'legs');
addSeries('armor','Botas', ['Sandalias de Cuero','Botas de Cuero Curtido','Grebas de Bronce','Botas de la Guardia','Escarpes de Acero Impenetrable'], [1,3,6,10,15].map((defense,i)=>({defense,weight:1+i*.4,gp:(i+1)*60})), 'boots');
const armorSets = [
  { key:'oak_guard', name:'Guardián del Roble', level:1, color:'#59714d', accent:'#bd9559', bonus:'Defensa +3 · Resistencia natural' },
  { key:'lake_mist', name:'Bruma del Lago', level:4, color:'#4c7980', accent:'#d4e0d6', bonus:'Defensa +5 · Evasión +2%' },
  { key:'crimson_ash', name:'Ceniza Carmesí', level:7, color:'#8b4742', accent:'#d9aa70', bonus:'Defensa +8 · Crítico +2%' },
  { key:'walpira_sun', name:'Sol de Walpira', level:10, color:'#b99b5d', accent:'#f1dfb6', bonus:'Defensa +11 · Vida +35' },
  { key:'night_veil', name:'Velo Nocturno', level:13, color:'#45515e', accent:'#a4bcc3', bonus:'Defensa +14 · Resistencia +8%' }
];
const armorSetParts = [
  { kind:'Casco', slot:'head', defense:3, weight:1.2 },
  { kind:'Pechera', slot:'chest', defense:7, weight:2.8 },
  { kind:'Hombreras', slot:'shoulders', defense:3, weight:1.1 },
  { kind:'Guantes', slot:'gloves', defense:2, weight:.7 },
  { kind:'Pantalones', slot:'legs', defense:4, weight:1.6 },
  { kind:'Botas', slot:'boots', defense:2, weight:1.1 },
  { kind:'Capa', slot:'cape', defense:1, weight:1.3 }
];
armorSets.forEach((set, setIndex) => {
  armorSetParts.forEach((part, partIndex) => {
    const name = part.kind + ' del ' + set.name;
    rows.push({
      id:slug(name), name, category:'armor', kind:part.kind, slot:part.slot,
      level:set.level, rarity:setIndex >= 4 ? 'Épico' : setIndex >= 2 ? 'Mágico' : 'Común', reinforce:0,
      requirement:{level:set.level,str:0}, damageMin:0, damageMax:0,
      defense:part.defense + setIndex * (partIndex > 1 ? 1 : 2), block:0, attackSpeed:'', critical:0,
      bonus:set.bonus, weight:Number((part.weight + setIndex * .24).toFixed(1)), gp:(setIndex + 1) * (partIndex + 4) * 36,
      compose:3, crystals:[], enchants:[], setName:set.name, setKey:set.key,
      appearance:{color:set.color,accent:set.accent,model:slug(part.kind),setKey:set.key}
    });
  });
});
const setWeapons = [
  { name:'Hacha de Raíz Antigua', kind:'Hacha', set:armorSets[0], damage:[18,30], speed:'Lenta', model:'axe' },
  { name:'Daga de Bruma Helada', kind:'Daga', set:armorSets[1], damage:[15,24], speed:'Muy rápida', model:'dagger' },
  { name:'Cetro de Ceniza Roja', kind:'Cetro', set:armorSets[2], damage:[20,32], speed:'Normal', model:'staff' },
  { name:'Espada Solar de Walpira', kind:'Espada', set:armorSets[3], damage:[29,43], speed:'Normal', model:'sword' },
  { name:'Cimitarra del Velo Nocturno', kind:'Cimitarra', set:armorSets[4], damage:[34,50], speed:'Rápida', model:'curved_sword' }
];
setWeapons.forEach((weapon, index) => rows.push({
  id:slug(weapon.name), name:weapon.name, category:'weapons', kind:weapon.kind, slot:'weapon',
  level:weapon.set.level, rarity:index >= 4 ? 'Épico' : index >= 2 ? 'Mágico' : 'Común', reinforce:0,
  requirement:{level:weapon.set.level,str:weapon.set.level * 4}, damageMin:weapon.damage[0], damageMax:weapon.damage[1],
  defense:0, block:0, attackSpeed:weapon.speed, critical:weapon.kind === 'Daga' || weapon.kind === 'Cimitarra' ? 8 + index * 2 : 0,
  bonus:'Arma insignia del set ' + weapon.set.name, weight:weapon.kind === 'Hacha' || weapon.kind === 'Cetro' ? 5.2 : 3.1,
  gp:(index + 1) * 220, compose:3, crystals:[], enchants:[], setName:weapon.set.name, setKey:weapon.set.key,
  appearance:{color:weapon.set.color,accent:weapon.set.accent,model:weapon.model,setKey:weapon.set.key}
}));
rows.push({
  id:'cetro_de_raiz_negra', name:'Cetro de raíz negra', category:'weapons', kind:'Cetro', slot:'weapon',
  level:1, rarity:'Mágico', reinforce:0, requirement:{level:1,str:0}, damageMin:5, damageMax:9,
  defense:0, block:0, attackSpeed:'Arcana', critical:0, bonus:'Foco para artes oscuras', weight:1.1,
  gp:45, compose:3, crystals:[], enchants:[],
  appearance:{color:'#433b32',accent:'#a58a54',model:'short-scepter'}
});
armorSets.forEach((set, index) => rows.push({
  id:slug('Escudo del ' + set.name), name:'Escudo del ' + set.name, category:'weapons', kind:'Escudo', slot:'offhand',
  level:set.level, rarity:index >= 4 ? 'Épico' : index >= 2 ? 'Mágico' : 'Común', reinforce:0,
  requirement:{level:set.level,str:set.level * 3}, damageMin:0, damageMax:0, defense:4 + index * 4,
  block:12 + index * 3, attackSpeed:'Bloqueo', critical:0, bonus:'Pieza del set ' + set.name,
  weight:3.2 + index * .5, gp:(index + 1) * 180, compose:3, crystals:[], enchants:[], setName:set.name, setKey:set.key,
  appearance:{color:set.color,accent:set.accent,model:'shield',setKey:set.key}
}));
rows.push(
  {id:'espada_de_hierro',name:'Espada de hierro',category:'weapons',kind:'Espada',slot:'weapon',level:1,rarity:'Común',reinforce:0,requirement:{level:1,str:0},damageMin:7,damageMax:12,defense:0,block:0,attackSpeed:'Normal',critical:0,bonus:'Hoja sencilla de hierro local',weight:2.8,gp:80,compose:3,crystals:[],enchants:[],appearance:{color:'#727d7d',accent:'#c9ae75',model:'sword'}},
  {id:'lanza_de_fresno',name:'Lanza de fresno',category:'weapons',kind:'Lanza',slot:'weapon',level:1,rarity:'Común',reinforce:0,requirement:{level:1,str:0},damageMin:6,damageMax:14,defense:0,block:0,attackSpeed:'Lenta',critical:0,bonus:'Alcance largo · madera endurecida',weight:3.1,gp:70,compose:3,crystals:[],enchants:[],appearance:{color:'#71523a',accent:'#b9a070',model:'spear'}},
  {id:'arco_de_costa',name:'Arco de costa',category:'weapons',kind:'Arco',slot:'weapon',level:1,rarity:'Común',reinforce:0,requirement:{level:1,str:0},damageMin:5,damageMax:10,defense:0,block:0,attackSpeed:'Rápida',critical:0,bonus:'Requiere flechas de rafia',weight:1.7,gp:95,compose:3,crystals:[],enchants:[],appearance:{color:'#72513a',accent:'#d3b776',model:'bow'}},
  {id:'flecha_de_rafia',name:'Flecha de rafia',category:'materials',kind:'Munición',level:1,rarity:'Común',reinforce:0,requirement:{level:1,str:0},damageMin:0,damageMax:0,defense:0,block:0,attackSpeed:'',critical:0,bonus:'Munición para el arco de costa',weight:.1,gp:3,compose:1,crystals:[],enchants:[],appearance:{color:'#94774f',accent:'#d4c18d',model:'arrow'}},
  {id:'unguento_de_savia',name:'Ungüento de savia',category:'consumables',kind:'Poción',level:1,rarity:'Común',reinforce:0,requirement:{level:1,str:0},damageMin:0,damageMax:0,defense:0,block:0,attackSpeed:'',critical:0,bonus:'Restaura 45 HP',effects:{health:45},weight:.25,gp:16,compose:1,crystals:[],enchants:[],appearance:{color:'#738b4a',accent:'#d6d08b',model:'herbal-potion'}},
  {id:'infusion_de_raiz',name:'Infusión de raíz',category:'consumables',kind:'Poción',level:1,rarity:'Común',reinforce:0,requirement:{level:1,str:0},damageMin:0,damageMax:0,defense:0,block:0,attackSpeed:'',critical:0,bonus:'Restaura 35 SP',effects:{mana:35},weight:.25,gp:18,compose:1,crystals:[],enchants:[],appearance:{color:'#876a3c',accent:'#d0bc74',model:'root-tonic'}},
  {id:'caldo_de_marea',name:'Caldo de marea',category:'consumables',kind:'Poción',level:1,rarity:'Común',reinforce:0,requirement:{level:1,str:0},damageMin:0,damageMax:0,defense:0,block:0,attackSpeed:'',critical:0,bonus:'Restaura 25 HP y 20 SP',effects:{health:25,mana:20},weight:.35,gp:22,compose:1,crystals:[],enchants:[],appearance:{color:'#536f75',accent:'#b7d9c4',model:'broth-flask'}}
);
addSeries('jewelry','Anillo', ['Anillo de Cobre','Anillo de la Fortuna','Anillo de Fuerza','Anillo de Vida','Anillo de la Cicatriz'], [{bonus:'',weight:.1,gp:35},{bonus:'Drop +10%',weight:.1,gp:240},{bonus:'+5 STR',weight:.1,gp:280},{bonus:'+50 HP',weight:.1,gp:280},{bonus:'Crítico +5%',weight:.1,gp:390}], index => index < 2 ? 'ring1' : 'ring2');
addSeries('jewelry','Amuleto', ['Amuleto del Velo','Collar de Vitalidad','Medalla del Bastión','Amuleto de Mana','Reliquia de Walpira'], [{bonus:'Evasión +2%',weight:.2},{bonus:'+35 HP',weight:.3},{bonus:'Defensa +5',weight:.4},{bonus:'+30 SP',weight:.2},{bonus:'STR +3 · CON +3',weight:.3}], 'amulet');
addSeries('jewelry','Cinturón', ['Cinturón de Lino','Cinturón de Leñador','Cinturón de Plomo','Cinturón de Malla','Cinturón Inquisitorial'], [{bonus:'',weight:.5},{bonus:'Carga +15',weight:.8},{bonus:'Defensa +4',weight:1.8},{bonus:'Defensa +8',weight:1.1},{bonus:'Defensa +14',weight:1.2}], 'belt');
addSeries('consumables','Poción', ['Elixir de Vitalidad Menor','Elixir Mayor','Tónico de Esencia','Poción de Rejuvenecimiento','Antídoto del Pantano'], [{bonus:'+50 HP',weight:.4,gp:25},{bonus:'+200 HP',weight:.6,gp:100},{bonus:'+40 SP',weight:.4,gp:45},{bonus:'+100 HP / +80 SP',weight:.6,gp:110},{bonus:'Cura veneno',weight:.3,gp:30}]);
addSeries('materials','Material de Forja', ['Piedra de Condena','Piedra del Velo Sagrado','Cristal de Fuego Oscuro','Cristal de Escarcha','Cristal de Rayo'], [{bonus:'Refuerzo +1 a +3',weight:.3,gp:180},{bonus:'Refuerzo +4 a +5',weight:.3,gp:480},{bonus:'Cristal elemental · Fuego',weight:.2,gp:120},{bonus:'Cristal elemental · Escarcha',weight:.2,gp:120},{bonus:'Cristal elemental · Rayo',weight:.2,gp:120}]);
addSeries('materials','Gema', ['Gema de Viento','Gema de Roca','Gema de Fuego','Gema de Agua','Gema de Escarcha','Piedra del Alma'], [
  {bonus:'Afinidad · Viento',weight:.25,gp:220,appearance:{color:'#72a99b',accent:'#d7f4c4',model:'wind-gem'}},
  {bonus:'Afinidad · Tierra',weight:.4,gp:220,appearance:{color:'#8b6945',accent:'#d6be76',model:'earth-gem'}},
  {bonus:'Afinidad · Fuego',weight:.25,gp:260,appearance:{color:'#a34b36',accent:'#ffd078',model:'fire-gem'}},
  {bonus:'Afinidad · Agua',weight:.25,gp:240,appearance:{color:'#477e9b',accent:'#aee4e7',model:'water-gem'}},
  {bonus:'Afinidad · Escarcha',weight:.25,gp:260,appearance:{color:'#6994aa',accent:'#d9f6fa',model:'frost-gem'}},
  {bonus:'Núcleo de esencia · Solo cae de guardianes mayores',weight:.6,gp:650,appearance:{color:'#735d9a',accent:'#d9baff',model:'soul-stone'}}
]);

export const ITEM_CATALOG = rows;
export const NPC_CATALOGS = {
  elena: rows.filter(item => item.category === 'consumables' || item.category === 'materials').map(item => item.id),
  dohan: rows.filter(item => item.category === 'weapons' && ['Espada', 'Hacha', 'Daga', 'Cetro', 'Escudo', 'Arco'].includes(item.kind)).map(item => item.id).concat('flecha_de_rafia'),
  mikel: rows.filter(item => item.category === 'consumables' || (item.category === 'materials' && item.kind.includes('Cristal'))).map(item => item.id),
  barric: rows.filter(item => item.category === 'materials' && item.id !== 'piedra_del_alma').map(item => item.id),
  camp_apothecary: ['unguento_de_savia','infusion_de_raiz','caldo_de_marea'],
  camp_armorer: ['espada_de_hierro','lanza_de_fresno','arco_de_costa','flecha_de_rafia']
};
