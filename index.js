const Discord = require('discord.js')
const { Client, Intents } = require('discord.js')
const { Zilliqa } = require('@zilliqa-js/zilliqa')
const { MessageType } = require('@zilliqa-js/subscriptions')
const NodeCache = require('node-cache')
const bcrypt = require('bcryptjs')
const { Zilswap } = require('zilswap-sdk')
const axios = require('axios')
const BigNumber = require('bignumber.js')

const zilliqa = new Zilliqa('https://api.zilliqa.com/')
const zilswap = new Zilswap('MainNet')

const usercache = new NodeCache()
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
})
require('dotenv').config()

const nftContract = '0x06f70655d4AA5819E711563EB2383655449f24E9'
const zilswapContract = '0xba11eb7bcc0a02e947acf03cc651bfaf19c9ec00'

// POSTING
client.on('message', msg => {
  client.user.setPresence({
    game: {
      name: 'Zilliqa Events',
      type: 'LISTENING'
    },
    status: 'online'
  })
  // get userID
  if (msg.content.startsWith('$verify')) {
    // if this blows up with a null value, then nines said reee

    client.users.fetch(msg.author.id, false).then(user => {
      user.send(
        `https://app.duck.community/discord-authenticate/${msg.author.id}`
      )
    })

    usercache.set(msg.author.id, '', 10000)
    console.log('User : ' + msg.author.id + ' verifying...')
  }
  // if (msg.content.startsWith("duck bot")){
  //   client.users.fetch(msg.author.id, false).then((user) => {
  //     user.send("Quack?");
  //    });
  // }
  if (msg.content.startsWith('quack')) {
    msg.reply('quack')
  }
})

// RECIEVING

const subscriber = zilliqa.subscriptionBuilder.buildEventLogSubscriptions(
  'wss://api-ws.zilliqa.com',
  {
    // smart contract address you want to listen on
    addresses: [zilswapContract, nftContract]
  }
)
subscriber.emitter.on(MessageType.EVENT_LOG, async event => {
  // do what you want with new event log
  console.log(JSON.stringify(event))
  if (event.value) {
    for (const value of event.value) {
      for (const eventLog of value.event_logs) {
        // Hatzz this doesn't run for two people tryna iterate over it doesnt work event.value.event_logs is not iterable
        if (eventLog._eventname === 'UserHasDucksHashMessage') {
          const hash = eventLog.params[0].value
          console.log(hash)
          isMatch(hash)
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
          const usdPoolValue = zilPoolValue.dividedBy(zilPerUsd)

          const rate = zilswap.getRatesForInput(
            '0x0000000000000000000000000000000000000000',
            address,
            Math.floor(zilPerUsd * 10 ** 12).toString()
          )

          const amountTokensPerDollar = rate.expectedAmount
          const amountDollarsPerToken = new BigNumber(1).dividedBy(
            amountTokensPerDollar
          )

          const correctReserve = pool.tokenReserve.dividedBy(
            10 ** Number(decimals)
          )

          const embed = new Discord.MessageEmbed()
            .setColor('#F25B21')
            .setTitle(`${name} pool found! - Please Beware of Scam Contracts!!!!!`)
            .setDescription(`Contract: ${address}`)
            .addField(
              'Zilliqa liquidity',
              `${zilPoolValue.toFixed(0)} zil / $${usdPoolValue.toFixed(
                0
              )} liquidity`
            )
            .addField(
              `${symbol} liquidity`,
              `${correctReserve.toFixed()} ${symbol}`
            )
            .addField('Total supply', `${correctSupply} ${symbol}`)
            .addField(
              '1 usd equals',
              `${amountTokensPerDollar.toFixed()} ${symbol}`
            )
            .addField(
              `1 ${symbol} equals`,
              `$${amountDollarsPerToken.toFixed()}`
            )

          const channel = client.channels.cache.get('854803343595536386')
          channel.send('<@&854802219743576065>')
          channel.send(embed)
        }
      }
    }
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

client.login(process.env.TOKEN)

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
