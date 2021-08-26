
const { Zilliqa } = require('@zilliqa-js/zilliqa')
const { toBech32Address } = require('@zilliqa-js/crypto');
const zilliqa = new Zilliqa('https://api.zilliqa.com/')
const axios = require('axios')
const Discord = require('discord.js')
const { Client, Intents } = require('discord.js')
require('dotenv').config()

/////////////////////////////////////////////////
const client = new Client
  ({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
  })
client.login(process.env.TOKEN)
/////////////////////////////////////////////////

/////////////////////////////////////////////////
//zil contracts
const contractNftContract = process.env.NFT_CONTRACT
const roomThePond = process.env.ROOM_THE_POND
const contractProxyContract = process.env.PROXY_CONTRACT
/////////////////////////////////////////////////

module.exports.sendDuckLookupMessage = async (duck_id) => {
  const metadata = await fetchMetadataFromID(String(duck_id))

  const base = getDisplayString('bases', metadata.duck_base_name)
  const beak = getDisplayString('beaks', metadata.duck_beak_name)
  const eyes = getDisplayString('eyes', metadata.duck_eyes_name)
  const hats = getDisplayString('hats', metadata.duck_hats_name)
  const outfit = getDisplayString('outfits', metadata.duck_outfit_name)

  const baseRarity = metadata.duck_base_occurrence_chance
  const beakRarity = metadata.duck_beak_occurrence_chance
  const eyesRarity = metadata.duck_eyes_occurrence_chance
  const hatsRarity = metadata.duck_hats_occurrence_chance
  const outfitRarity = metadata.duck_outfit_occurrence_chance

  const oneInChance = (1 / (baseRarity.split("%")[0] / 100 *
    beakRarity.split("%")[0] / 100 *
    eyesRarity.split("%")[0] / 100 *
    hatsRarity.split("%")[0] / 100 *
    outfitRarity.split("%")[0] / 100)
  ).toFixed()
  const duckName = (await getNFTSubstate('duck_name_map'))[duck_id]
  const duckURI = (await getNFTSubstate('token_uris'))[duck_id]
  const duckOwner = toBech32Address((await getNFTSubstate('token_owners'))[duck_id])
  const duckOwnerLink = `https://viewblock.io/zilliqa/address/${duckOwner}`


  const duckPriceResponse = (await zilliqa.blockchain
    .getSmartContractSubState(contractProxyContract, 'duck_price_zils'))
  const mintPrice = (duckPriceResponse['result']['duck_price_zils'] / 10 ** 12).toFixed(2)
  
  
  const embed = new Discord.MessageEmbed()
    .setColor('#ff7700')
    .setTitle(`#${duck_id} ${duckName}`)
    .setDescription(`Lookup for duck ${duck_id}`)
    .addFields(
      { name: 'Owner', value: `[${duckOwner}](${duckOwnerLink})` },
      { name: 'Rarity', value: `1 in ${Number(oneInChance).toLocaleString()}` },
      { name: 'Base', value: `${base} (${baseRarity})`, inline: true },
      { name: 'Beak', value: `${beak} (${beakRarity})`, inline: true },
      { name: 'Eyes', value: `${eyes} (${eyesRarity})`, inline: true },
      { name: 'Hat', value: `${hats} (${hatsRarity})`, inline: true },
      { name: 'Outfit', value: `${outfit} (${outfitRarity})`, inline: true },
    )
    //Number(oneinchance).toLocaleString()
    .setImage(duckURI)

  return embed
}

module.exports.sendDuckMintMessage = async (duck_id) => {
  const metadata = await fetchMetadataFromID(String(duck_id))

  const base = getDisplayString('bases', metadata.duck_base_name)
  const beak = getDisplayString('beaks', metadata.duck_beak_name)
  const eyes = getDisplayString('eyes', metadata.duck_eyes_name)
  const hats = getDisplayString('hats', metadata.duck_hats_name)
  const outfit = getDisplayString('outfits', metadata.duck_outfit_name)

  const baseRarity = metadata.duck_base_occurrence_chance
  const beakRarity = metadata.duck_beak_occurrence_chance
  const eyesRarity = metadata.duck_eyes_occurrence_chance
  const hatsRarity = metadata.duck_hats_occurrence_chance
  const outfitRarity = metadata.duck_outfit_occurrence_chance

  const oneInChance = (1 / (baseRarity.split("%")[0] / 100 *
    beakRarity.split("%")[0] / 100 *
    eyesRarity.split("%")[0] / 100 *
    hatsRarity.split("%")[0] / 100 *
    outfitRarity.split("%")[0] / 100)
  ).toFixed()
  const duckName = (await getNFTSubstate('duck_name_map'))[duck_id]
  const duckURI = (await getNFTSubstate('token_uris'))[duck_id]
  const duckOwner = toBech32Address((await getNFTSubstate('token_owners'))[duck_id])
  const duckOwnerLink = `https://viewblock.io/zilliqa/address/${duckOwner}`


  const duckPriceResponse = (await zilliqa.blockchain
    .getSmartContractSubState(contractProxyContract, 'duck_price_zils'))
  const mintPrice = (duckPriceResponse['result']['duck_price_zils'] / 10 ** 12).toFixed(2)

  const embed = new Discord.MessageEmbed()
    .setColor('#0099ff')
    .setTitle(`#${duck_id} ${duckName}`)
    .setDescription(`Minted for ${mintPrice} ZIL`)
    .addFields(
      { name: 'Owner', value: `[${duckOwner}](${duckOwnerLink})` },
      { name: 'Rarity', value: `1 in ${Number(oneInChance).toLocaleString()}` },
      { name: 'Base', value: `${base} (${baseRarity})`, inline: true },
      { name: 'Beak', value: `${beak} (${beakRarity})`, inline: true },
      { name: 'Eyes', value: `${eyes} (${eyesRarity})`, inline: true },
      { name: 'Hat', value: `${hats} (${hatsRarity})`, inline: true },
      { name: 'Outfit', value: `${outfit} (${outfitRarity})`, inline: true },
    )
    //Number(oneinchance).toLocaleString()
    .setImage(duckURI)

  const thePond = client.channels.cache.get(roomThePond)
  thePond.send(embed)
}

fetchMetadataFromID = async (id) => {
  const metadataURI = (await getNFTSubstate('metadata_map'))[id]
  return (await axios.get(metadataURI))['data']
}

getNFTSubstate = async (field) => {
  const { result } = await zilliqa.blockchain
    .getSmartContractSubState(contractNftContract, field)
  return result[field]
}

getDisplayString = (type, string) => {
  displayStrings = {
    bases: [
      { value: "_", label: "Select Base" },
      { value: "?????", label: "?????" },
      { value: "1-DOMESTIC BASE", label: "Domestic Duck" },
      { value: "1-EIDER BASE", label: "Eider" },
      { value: "1-GOLDENEYE BASE", label: "Goldeneye" },
      { value: "1-MALLARD female BASE", label: "Female Mallard" },
      { value: "1-MALLARD male BASE", label: "Male Mallard" },
      { value: "1-MANDARIN BASE", label: "Mandarin" },
      { value: "1-MERGANSER BAS", label: "Merganser" },
      { value: "1-POCHARD BASE", label: "Pochard" },
      { value: "3-RED BASE", label: "Red" },
      { value: "3-RUBBERDUCK BASE", label: "Rubber Ducky" },
      { value: "2-MALLARD female SHINY", label: "Shiny Female Mallard" },
      { value: "2-MALLARD male SHINY", label: "Shiny Male Mallard" },
      { value: "2-EIDER SHINY", label: "Shiny Eider" },
      { value: "2-DOMESTIC SHINY", label: "Shiny Domestic" },
      { value: "2-GOLDENEYE SHINY", label: "Shiny Goldeneye" },
      { value: "3-HULK BASE alt", label: "Hulk" },
      { value: "2-MANDARIN SHINY", label: "Shiny Mandarin" },
      { value: "2-MERGANSER SHINY", label: "Shiny Merganser" },
      { value: "2-POCHARD SHINY", label: "Shiny Pochard" },
      { value: "4-RUBBERDUCK SHINY", label: "Shiny Rubber Ducky" },
      { value: "1-SEADUCK BASE", label: "Seaduck" },
      { value: "2-HULK SHINY", label: "Shiny Hulk" },
      { value: "2-RED SHINY", label: "Shiny Red" },
      { value: "2-SEADUCK SHINY", label: "Shiny Seaduck" },

    ],
    beaks: [
      { value: "_", label: "Select Beak" },
      { value: "?????", label: "?????" },
      { value: "2-BEAK TONGUE", label: "Tongue Beak" },
      { value: "3-CIGARETTE BEAK", label: "Cigarette Beak" },
      { value: "2-CRACKED BEAK 1", label: "Cracked Beak" },
      { value: "2-CRACKED BEAK 2", label: "Green Cracked Beak" },
      { value: "2-CRACKED BEAK 3", label: "Orange Cracked Beak" },
      { value: "2-CRACKED BEAK 4", label: "Blue Cracked Beak" },
      { value: "2-BRACES BEAK", label: "Braces Beak" },
      { value: "2-BROKENSMILE BEAK_vectorized", label: "Broken Smile" },
      { value: "4-DAFFY BEAK", label: "Daffy Beak" },
      { value: "3-GOLDSMILE BEAK", label: "Golden Smile Beak" },
      { value: "3-LGBTQ BEAK", label: "Rainbow Beak" },
      { value: "2-LIPSTICK BEAK", label: "Lipstick Beak" },
      { value: "3-MOUSTACHE BEAK", label: "Moustache Beak" },
      { value: "3-BEAK DROOL", label: "Drooling Beak" },
      { value: "1-NORMAL BASE 1", label: "Normal Beak" },
      { value: "1-NORMAL BASE 2", label: "Green Beak" },
      { value: "1-NORMAL BASE 3", label: "Orange Beak" },
      { value: "1-NORMAL BASE 4", label: "Blue Beak" },
      { value: "1-OPEN BEAK 1", label: "Open Beak" },
      { value: "1-OPEN BEAK 2", label: "Green Open Beak" },
      { value: "1-OPEN BEAK 3", label: "Orange Open Beak" },
      { value: "1-OPEN BEAK 4", label: "Blue Open Beak" },
      { value: "4-PIPE BEAK", label: "Pipe Beak" },
      { value: "2-SMILE BEAK", label: "Smile Beak" },
      { value: "4-TOUCAN BEAK nolines", label: "Toucan Beak" },
      { value: "4-VAMPIRE BEAK", label: "Vampire Beak" },
      { value: "3-SAX BEAK", label: "Sax Beak" },
    ],
    eyes: [
      { value: "_", label: "Select Eyes" },
      { value: "?????", label: "?????" },
      { value: "1-ANGRY EYES", label: "Angry Eyes" },
      { value: "1-BOOBA", label: "Surprised Eyes" },
      { value: "1-BULGING EYES", label: "Bulging Eyes" },
      { value: "4-CENSORBAR TEXT", label: "Censorbar" },
      { value: "1-CRYING EYE", label: "Crying Eyes" },
      { value: "2-DEAD X", label: "X Eyes" },
      { value: "1-DUMB EYE", label: "Dumb Eyes" },
      { value: "1-EYE NORMAL", label: "Eyes" },
      { value: "2-EYEPATCH", label: "Eyepatch" },
      { value: "4-GROUCHO", label: "Groucho" },
      { value: "2-HYPNOTIZED", label: "Hypnotized Eyes" },
      { value: "4-LASER EYES", label: "Laser Eyes" },
      { value: "3-MONOCLE", label: "Monocle" },
      { value: "1-NERDYGLASSES", label: "Nerdy Glasses" },
      { value: "2-PINK GLASSES", label: "Pink Glasses" },
      { value: "2-RED EYES", label: "Red Eyes" },
      { value: "3-SCUBA MASK", label: "Scuba Mask" },
      { value: "3-SHADES", label: "Shades" },
      { value: "4-CYCLOPS EYES", label: "Cyclops" },
      { value: "1-SMUG EYE", label: "Smug Eyes" },
      { value: "2-SQUINTY EYES", label: "Squinty Eyes" },
      { value: "2-SUNGLASSES", label: "Sunglasses" },
      { value: "3-TERMINATOR EYE", label: "Terminator Eyes" },
      { value: "2-TIRED EYES", label: "Tired Eyes" }
    ],
    hats: [
      { value: "_", label: "Select Hat" },
      { value: "?????", label: "?????" },
      { value: "1-BANDANA", label: "Bandana" },
      { value: "1-BASEBALL CAP", label: "Baseball Cap" },
      { value: "1-DURAG", label: "Durag" },
      { value: "1-HEADPHONES", label: "Headphones" },
      { value: "1-CHOPSTICK BUN", label: "Bun" },
      { value: "1-YELLOW HARDHAT", label: "Yellow Hardhat" },
      { value: "1-TOP HAT", label: "Top Hat" },
      { value: "1-POLICE HAT", label: "Police Hat" },
      { value: "2-BRAIN", label: "Brain" },
      { value: "2-EGG", label: "Egg" },
      { value: "2-FEZ", label: "Fez" },
      { value: "2-HALO", label: "Halo" },
      { value: "2-BUCKETHAT", label: "Bucket Hat" },
      { value: "2-COWBOY HAT", label: "Cowboy Hat" },
      { value: "2-ASIAN HAT", label: "Rice Hat" },
      { value: "2-RASTA HAT", label: "Rasta Hat" },
      { value: "2-PROPELLER HAT", label: "Propeller Hat" },
      { value: "3-SOMBRERO", label: "Sombrero" },
      { value: "4-BUNNY EARS", label: "Bunny Ears" },
      { value: "4-HORNS", label: "Horns" },
      { value: "4-HOT DOG", label: "Hot Dog" },
      { value: "4-SPACE HELMET", label: "Space Helmet" }
    ],
    outfits: [
      { value: "_", label: "Select Outfit" },
      { value: "?????", label: "?????" },
      { value: "1-ACDC SHIRT", label: "DCDC Shirt" },
      { value: "1-CAMO SHIRT", label: "Camo Shirt" },
      { value: "1-HAWAIIAN SHIRT", label: "Hawaiian Shirt" },
      { value: "1-FLOWER LEI", label: "Flower Lei" },
      { value: "1-TIE", label: "Tie" },
      { value: "1-YELLOW HOODIE", label: "Yellow Hoodie" },
      { value: "2-FLOATIE", label: "Floatie" },
      { value: "2-FOOTIE JERSEY", label: "Footie Jersey" },
      { value: "2-ADIDAS HOODIE RED", label: "Striped Hoodie Red" },
      { value: "2-ADIDAS HOODIE", label: "Striped Hoodie" },
      { value: "2-FRANKENSTEIN BOLTS", label: "Frankenstein Bolts" },
      { value: "2-GRADIENT SHIRT", label: "Gradient Shirt" },
      { value: "2-PURPLE CAMO", label: "Purple Camo" },
      { value: "2-PEPE SHIRT", label: "Pepe Shirt" },
      { value: "2-AF1 WHITE", label: "DF1 White" },
      { value: "1-SPIKED CHOKER", label: "Spiked Choker" },
      { value: "3-CAPE", label: "Cape" },
      { value: "3-AF1 PURPLE", label: "DF1 Purple" },
      { value: "3-AF1 RED", label: "DF1 Red" },
      { value: "3-YEEZY BEIGE", label: "Beige Deezys" },
      { value: "3-YEEZY BLACK", label: "Black Deezys" },
      { value: "3-YEEZY ZEBRA", label: "Zebra Deezys" },
      { value: "4-SUPREME SHIRT", label: "DUPREME Shirt" },
      { value: "4-BURBERRY SCARF", label: "Pondberry Scarf" },
      { value: "4-BURBERRY SCARF RED", label: "Red Pondberry Scarf" },
      { value: "4-GOLD CHAIN", label: "Gold Chain" }
    ]
  }

  for (const [key, value] of Object.entries(displayStrings[type])) {
    if (value.value === string) {
      return value.label;
    }
  }
  return string;
}
