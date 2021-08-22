const Discord = require('discord.js')
const { Client, Intents } = require('discord.js')
const { Zilliqa } = require('@zilliqa-js/zilliqa')
const {toBech32Address} = require('@zilliqa-js/crypto');
const { MessageType } = require('@zilliqa-js/subscriptions')
const NodeCache = require('node-cache')
const bcrypt = require('bcryptjs')
const { Zilswap } = require('zilswap-sdk')
const axios = require('axios')
const BigNumber = require('bignumber.js')
const zilliqa = new Zilliqa('https://api.zilliqa.com/')
const zilswap = new Zilswap('MainNet')
const usercache = new NodeCache()
require('dotenv').config()

const nfdTools = require('./nfdTools.js')

///////////////////////////////////////////////////////////


const client = new Client
({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
})
client.login(process.env.TOKEN)

//Zil Contracts
const contractNftContract = process.env.NFT_CONTRACT
const contractZilswapContract = process.env.ZILSWAP_CONTRACT
const contractProxyContract = process.env.PROXY_CONTRACT
//Discord Rooms
const roomThePond = process.env.ROOM_THE_POND
const roomPremiumPond = process.env.ROOM_PREMIUM_POND
const roomPremiumPondBot = process.env.ROOM_PREMIUM_POND_BOT


////////////////////////////////////////////////////////////
//
// Verify NFT on Discord
// todo : Remove holders that dont hold
//
client.on('message', msg => {
  client.user.setPresence({
    game: {
      name: 'Zilliqa Events',
      type: 'LISTENING'
    },
    status: 'online'
  })
  if (msg.content.toLowerCase().startsWith('$verify')) 
  {
    msg.reply(`I've sent you a DM containing a link to verify the NFD, if you have DM's turned off then just try \`$verify\` again after enabling DM's :duck:`)

    client.users.fetch(msg.author.id, false).then(user => {
      user.send(
        `https://app.duck.community/discord-authenticate/${msg.author.id}`
      )
    })
    usercache.set(msg.author.id, '', 10000)
    console.log('User : ' + msg.author.id + ' verifying...')
  }

  if (msg.content.toLowerCase().startsWith('quack')) 
  {
    msg.reply('quack')
  }
})

//
// Listens for TX's on contracts we monitor
// todo : Remove holders that dont hold
//
const subscriber = zilliqa.subscriptionBuilder.buildEventLogSubscriptions(
  'wss://api-ws.zilliqa.com',
  {
    // smart contract address you want to listen on
    addresses: [contractZilswapContract, contractNftContract, contractProxyContract]
  }
)

subscriber.emitter.on(MessageType.EVENT_LOG, async event => {
  // do what you want with new event log
  try {
  if (event.value) {
    console.log('event')
    for (const value of event.value) {
      for (const eventLog of value.event_logs) {
        // Hatzz this doesn't run for two people tryna iterate over it doesnt work event.value.event_logs is not iterable
        if (eventLog._eventname === 'UserHasDucksHashMessage') {
          const hash = eventLog.params[0].value
          console.log(hash)
          isMatch(hash)
          
        }

        if (eventLog._eventname === 'MintSuccess') 
        {
          console.log('duck minted')
          const token_id = eventLog.params[2].value
          nfdTools.sendDuckMintMessage(token_id)
        }


        if (eventLog._eventname === 'PoolCreated') {
          const address = eventLog.params[0].value
          const contract = zilliqa.contracts.at(address)

          const init = await contract.getInit()
          const name = getVnameValue(init, 'name')
          const symbol = getVnameValue(init, 'symbol')
          const supply = getVnameValue(init, 'init_supply')
          const decimals = getVnameValue(init, 'decimals')
          const correctSupply = new BigNumber(supply).dividedBy(
            10 ** Number(decimals)
          )

          console.log(init)

          const zilPrice = (
            await axios.get(
              'https://api.coingecko.com/api/v3/simple/price?ids=zilliqa&vs_currencies=usd'
            )
          ).data.zilliqa.usd

          const zilPerUsd = 1 / zilPrice

          console.log(address)

          const pool = await fetchPool(zilswap, address)

          console.log(pool)

          const zilPoolValue = pool.zilReserve.dividedBy(10 ** 12)
          const usdPoolValue = (zilPoolValue.dividedBy(zilPerUsd) * 2)
          
          //getting rates at pool
          const oneZIl = await zilswap.toUnitless('ZIL', '1')

          //tokens per 1 zil
          const rate = zilswap.getRatesForInput(
            '0x0000000000000000000000000000000000000000',
            address,
            oneZIl
          )

          const amountTokensPerZil = (rate.expectedAmount).dividedBy(10 ** Number(decimals))                          //1 zil = 5 feathers
          const tokenPriceInZil = new BigNumber(1).dividedBy(amountTokensPerZil)     //1 feather = 0.2 zil
          
          const tokenPriceInUSD = tokenPriceInZil * zilPrice                         //1 feather = 0.02$
          const tokensPerDollar = new BigNumber(1).dividedBy(tokenPriceInUSD)        //1 dollar = 50 feathers

          const tokenReserve = pool.tokenReserve.dividedBy(
            10 ** Number(decimals)
          )
          

          const embed = new Discord.MessageEmbed()
            .setColor('#E91E63')
            .setTitle(`${name} pool found! - Please Beware of Scam Contracts!!!!!`)
            .setDescription(`Contract: ${toBech32Address(address)}`)
            .addFields(
              { name: 'Liquidity', value: `${zilPoolValue.toFixed(0)} ZIL + ${tokenReserve.toFixed()} ${symbol} (${usdPoolValue.toFixed(0)}$)` },
              { name: 'Total supply', value: `${correctSupply} ${symbol}` },
              { name: '\u200B', value: '\u200B' },
              //zil values
              { name: '1 ZIL =', value: `${amountTokensPerZil.toFixed(2)} ${symbol}`, inline: true },
              { name: `1 ${symbol} =`, value: `${tokenPriceInZil.toFixed(2)} ZIL`, inline: true },
              //usd values
              { name: '1 $ =', value: `${tokensPerDollar.toFixed(2)} ${symbol}`, inline: true },
              { name: `1 ${symbol} =`, value: `${tokenPriceInUSD.toFixed(2)}$`, inline: true },
            )
            .setTimestamp(new Date().toTimeString())

          const channel = client.channels.cache.get(roomPremiumPondBot)
          channel.send('<@&854802219743576065>')
          channel.send(embed)
          
          const warningEmbed = new Discord.MessageEmbed()
            .setColor('#E91E63')
            .setTitle(`${name} has low liquidity, be extra cautious`)

          if (zilPoolValue < 2000) {
            channel.send(warningEmbed)
          }
        }
      }
    }
  }
} catch (e) {
  console.log(e)
}

})

subscriber.start()

client.on('ready', async () => {
  await zilswap.initialize()
  client.user.setPresence({
    game: {
      name: 'Zilliqa Events',
      type: 'LISTENING'
    },
    status: 'online'
  })
})

////////////////////////////////////////////////////////////
//
// matches a users emitted hash against the wallet confirming them
// todo:monitor the duck address?
//


function isMatch (hash) {
  const mykeys = usercache.keys()
  mykeys.forEach(async user => {
    if (bcrypt.compareSync(user, hash)) {
      console.log('User : ' + user + ' is authed')

      const guild = await client.guilds.fetch('826263928090132514')
      const userObj = await client.users.fetch(user)
      const guildMember = await guild.members.fetch(userObj)
      const role = await guild.roles.fetch('854802219743576065')
      guildMember.roles.add(role)

      client.users.fetch(user, false).then(user => {
        user.send('Welcome to the Premium Pond :duck:')
      })

      usercache.del(user)
    } else {
      console.log('Not a match hash : ' + user + ' ' + hash)
    }
  })
}

const getVnameValue = (init, vname) => {
  return init.find(obj => obj.vname === vname).value
}

const fetchPool = (zswap, address) => {
  return new Promise((resolve, reject) => {
    const intervalId = setInterval(() => {
      const pool = zswap.getPool(address)
      console.log(pool)
      if (pool) {
        clearInterval(intervalId)
        resolve(pool)
      }
    }, 250)
  })
}