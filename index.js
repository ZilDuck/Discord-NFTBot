const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
const { Units } = require('@zilliqa-js/util/dist/unit');
const { Zilliqa, units } = require('@zilliqa-js/zilliqa');
const { MessageType } = require("@zilliqa-js/subscriptions");
const BN = require('bn.js');
const zilliqa = new Zilliqa('https://dev-api.zilliqa.com');
const NodeCache = require('node-cache');
const bcrypt = require('bcryptjs');
const usercache = new NodeCache();

require('dotenv').config();

const NFT_contract = '0xaf29454f58514498133233f3f2bce6dea26d8349';
const contract = zilliqa.contracts.at(NFT_contract);

// POSTING 
client.on("message", msg => {
  client.user.setPresence({
    game: {
      name: 'Zilliqa Events',
      type: 'LISTENING'
    },
    status: 'online'
  })
  //get userID
  if (msg.content.startsWith("$verify"))
  {
    //if this blows up with a null value, then nines said reee 
    {
    client.users.fetch(msg.author.id, false).then((user) => {
      user.send(`https://testingtheducks.com/discord-authenticate/${msg.author.id}`);
     });
    }

    usercache.set(msg.author.id, "", 10000);
    console.log("User : " + msg.author.id + " verifying..."); 
  }
  // if (msg.content.startsWith("duck bot")){
  //   client.users.fetch(msg.author.id, false).then((user) => {
  //     user.send("Quack?");
  //    });
  // }
  if (msg.content.startsWith("quack")){
    msg.reply('quack')
  }
})




//RECIEVING
const subscriber = zilliqa.subscriptionBuilder.buildEventLogSubscriptions(
  "wss://dev-ws.zilliqa.com",
  {
    // smart contract address you want to listen on
    addresses: [NFT_contract]
  }
);
subscriber.emitter.on(MessageType.EVENT_LOG, async event => {
  // do what you want with new event log
  console.log(JSON.stringify(event)); 
  if (event.value) {
    for (const eventLog of event.value[0].event_logs) { //Hatzz this doesn't run for two people tryna iterate over it doesnt work event.value.event_logs is not iterable 
      if (eventLog._eventname === "UserHasDucksHashMessage") 
      {
        //console.log(value); 
        const hash = eventLog.params[0].value;
        console.log(hash); 
        isMatch(hash);
      }
    }
  }
});
subscriber.start();


client.on("ready", () => {
  client.user.setPresence({
    game: {
      name: 'Zilliqa Events',
      type: 'LISTENING'
    },
    status: 'online'
  })
})

async function isMatch(hash)
{
  mykeys = usercache.keys();
  console.log(mykeys);
  mykeys.forEach( async user => {
    if(bcrypt.compareSync(user, hash))
    {
      console.log("User : " + user + " is authed"); 

      const guild = await client.guilds.fetch('826263928090132514')
      const userObj = await client.users.fetch(user)
      const guildMember = await guild.members.fetch(userObj)
      const role = await guild.roles.fetch('854802219743576065');
      guildMember.roles.add(role)

      client.users.fetch(user, false).then((user) => {
        user.send("Welcome to the Premium Pond :duck::shy_duck:");
       });

       usercache.del(user);
    }
    else{
      console.log("Not a match hash : " + user + " " + hash); 
    }
  });
}



client.login(process.env.TOKEN)