const WebSocket = require('ws');
const PORT = process.env.PORT || 8080
const wss = new WebSocket.Server({ port: PORT });

function generatePlayerId() {
    const randomNum = Math.floor(1000 + Math.random() * 9000)
    return `player${randomNum}`
}

const realms = {}
const users = {}

let monsterAttackTimers = {}

wss.on("connection", (ws) => {

    const playerId = generatePlayerId()
    ws.playerId = playerId

    const pingInterval = setInterval(() => {
        ws.ping();
        console.log("Pinged Server")
      }, 30000);
   
    ws.on("message", (message) => {
        console.log("Received:", message)
        const data = JSON.parse(message)

        switch (data.type) {
         
            case 'initRoom': {
                const {userId, realm} = data;
            
                // Ensure the realm exists
                if (!realms[realm]) {
                    realms[realm] = {};
                }
            
                let roomName = 'bossRoom'; // Initial room name
                let room = realms[realm][roomName];
            
                // Find an available room or create a new one
                let roomFound = false;
                while (!roomFound) {
                    if (!room || room.length >= 4) { 
                        if (room) {
                            // If the room is full, create a new room name
                            const roomIndex = Object.keys(realms[realm]).length + 1;
                            roomName = 'bossRoom' + roomIndex;
                        }
                        // Create the new room
                        realms[realm][roomName] = [];
                        room = realms[realm][roomName];
                    }
                    roomFound = true;
                }
            
                // Add the user to the found/created room
                room.push(ws);
                users[userId] = { ws, realm, roomId: roomName };
                console.log(`User ${userId} added to room '${roomName}' in realm ${realm}`);
                broadcastToRoom(realm, roomName, { type: "playerJoinedToClient", userId });
            } break;
         
            case 'playerLeave': {
                const user = users[data.userId];
                if (user) {
                    const { ws, realm, roomId } = user;
                    const room = realms[realm][roomId];
                    if (room) {
                        const wsIndex = room.indexOf(ws);
                        if (wsIndex > -1) {
                            room.splice(wsIndex, 1);
                            console.log(`User ${data.userId} left room '${roomId}' in realm ${realm}`);
                            
                            room.forEach(client => {
                                console.log("forEach works")
                                if (client.readyState === WebSocket.OPEN) {
                                    console.log("open websocket")
                                    client.send(JSON.stringify({
                                        type: "playerLeftToClient",
                                        roomId: roomId 
                                    }));
                                    
                                }else{
                                    console.log("WebSocket is not open. Message not sent.");
                                }
                            });
                        }
                    }
                    delete users[data.userId];
                }
                break;
            }
            
            case "sendPlayerHitMonster":
               // playerHitMonster()
               {
                const {userId} = data;
                const user = users[userId];
                if(!user){
                    console.log(`User ${userId} not found.`);
                    return;
                }
                const { realm, roomId } = user;
 
                const playerHitMonsterMessage ={
                    type: "receivePlayerHitMonster",
                }
                broadcastToRoom(realm, roomId, playerHitMonsterMessage)
               }    
                break
            case "sendGlobalSkillPlayerAttack":
                         // monsterAttackGlobalSkill(random)
                    // playerAttackUpdate()
                    {         
                        const {userId} = data;
                        const random = Math.random() * 1000
                        const user = users[userId];
                        if(!user){
                            console.log(`User ${userId} not found.`);
                            return;
                        }
                        const { realm, roomId } = user;
        
                        const playerAttackSkillMessage ={
                            type: "receivePlayerAttackGlobalSkill",
                            random: random,
                        }
                        broadcastToRoom(realm, roomId, playerAttackSkillMessage)
                    }  
                    break
            case "sendGlobalSkillMonsterAttack":            
                   // monsterAttackGlobalSkill(random)
                    // playerAttackUpdate()
                {         
                    const {userId} = data;
                    const random = Math.random() * 1000
                    const user = users[userId];
                    if(!user){
                        console.log(`User ${userId} not found.`);
                        return;
                    }
                    const { realm, roomId } = user;
    
                    const monsterAttackMessage ={
                        type: "receiveMonsterAttackGlobalSkill",
                        random: random,
                    }
                    broadcastToRoom(realm, roomId, monsterAttackMessage)
                }  
                break
               
            case "engageEnemySend":
               // playerEngage()
               {
                const {userId} = data;
                const user = users[userId];
                if(!user){
                    console.log(`User ${userId} not found.`);
                    return;
                }
                const { realm, roomId } = user;

                const playerEngageEnemyMessage ={
                    type: "engageEnemyRecieve",
                }
                broadcastToRoom(realm, roomId, playerEngageEnemyMessage)
               }    
                break
            case "leaveEnemySend":
               // playerLeave()
               {
                const {userId} = data;
                const user = users[userId];
                if(!user){
                    console.log(`User ${userId} not found.`);
                    return;
                }
                const { realm, roomId } = user;

                const playerLeaveEnemyMessage ={
                    type: "leaveEnemyRecieve",
                }
                broadcastToRoom(realm, roomId, playerLeaveEnemyMessage)
               }    
                break
            case "sendPlayerAttack":
                {
                    // playerAttackUpdate()
                    const {userId, playerAttack} = data;
                    const user = users[userId];
                    if(!user){
                        console.log(`User ${userId} not found.`);
                        return;
                    }
                    const { realm, roomId } = user;
    
                    const playerAttackMessage ={
                        type: "recievePlayerAttack",
                        playerAttack: playerAttack,
                        userId: userId,
                    }
                    broadcastToRoom(realm, roomId, playerAttackMessage)
                }  
                break
            case "sendAfterPlayerAttack":
                {
                  //  const playerAttack = data.serverPlayerAttack
                //   playerAfterAttackUpdate(playerAttack)

                    const {userId, serverPlayerAttack} = data;
                    const user = users[userId];
                    if(!user){
                        console.log(`User ${userId} not found.`);
                        return;
                    }
                    const { realm, roomId } = user;
    
                    const playerAfterAttackMessage ={
                        type: "recieveAfterPlayerAttack",
                        playerAttack: serverPlayerAttack,
                    }
                    broadcastToRoom(realm, roomId, playerAfterAttackMessage)
                }
                break
          
            // case "sendAttackTimer":
            //     monsterAttackTimer()
            //     break
            case "refillHealth": {
                const {userId, amount, isCritical} = data;
                const user = users[userId];
                if(!user){
                    console.log(`User ${userId} not found.`);
                    return;
                }
                const { realm, roomId } = user;

                const refillHealthMessage ={
                    type: "refillHealth",
                    amount: amount,
                    isCritical: isCritical,
                }
                broadcastToRoom(realm, roomId, refillHealthMessage)
              //  const amount = data.amount
              //  const isCritical = data.isCritical
              //  refillHealthForAllPlayers(amount, isCritical)
                break
            }
            case "increaseAttack": {

                const {userId, amount, isCritical} = data;
                const user = users[userId];
                if(!user){
                    console.log(`User ${userId} not found.`);
                    return;
                }
                const { realm, roomId } = user;

                const attackMessage ={
                    type: "increaseAttack",
                    amount: amount,
                    isCritical: isCritical,
                }
                broadcastToRoom(realm, roomId, attackMessage)
                
                //const amount = data.amount
                //const isCritical = data.isCritical
                //increaseAttackForAllPlayers(amount, isCritical)
                break
            }
            // Handle increaseMagic case
            case "increaseMagic": {
                
                const {userId, amount, isCritical} = data;
                const user = users[userId];
                if(!user){
                    console.log(`User ${userId} not found.`);
                    return;
                }
                const { realm, roomId } = user;

                const magicMessage ={
                    type: "increaseMagic",
                    amount: amount,
                    isCritical: isCritical,
                }
                broadcastToRoom(realm, roomId, magicMessage)
              //  const amount = data.amount
              //  const isCritical = data.isCritical
              //  increaseMagicForAllPlayers(amount, isCritical)
                break
            }

            // Handle increaseCritDamage case
            case "increaseCritDamage": {
                const {userId, amount, isCritical} = data;
                const user = users[userId];
                if(!user){
                    console.log(`User ${userId} not found.`);
                    return;
                }
                const { realm, roomId } = user;
                const critDamageMessage ={
                    type: "increaseCritDamage",
                    amount: amount,
                    isCritical: isCritical,
                }
                broadcastToRoom(realm, roomId, critDamageMessage)

               // const amount = data.amount
               // const isCritical = data.isCritical
               // increaseCritDamageForAllPlayers(amount, isCritical)
                break
            }

            // Handle increaseCritRate case
            case "increaseCritRate": {

                const {userId, amount, isCritical} = data;
                const user = users[userId];
                if(!user){
                    console.log(`User ${userId} not found.`);
                    return;
                }
                const { realm, roomId } = user;
                const increaseCritMessage ={
                    type: "increaseCritRate",
                    amount: amount,
                    isCritical: isCritical,
                }
                broadcastToRoom(realm, roomId, increaseCritMessage)
              //  const amount = data.amount
              //  const isCritical = data.isCritical
              //  increaseCritRateForAllPlayers(amount, isCritical)
                break
            }

            // Handle increaseLuck case
            case "increaseLuck": {
                const {userId, amount, isCritical} = data;
                const user = users[userId];
                if(!user){
                    console.log(`User ${userId} not found.`);
                    return;
                }
                const { realm, roomId } = user;
                const luckMessage ={
                    type: "increaseLuck",
                    amount: amount,
                    isCritical: isCritical,
                }
                broadcastToRoom(realm, roomId, luckMessage)
                //const amount = data.amount
                //const isCritical = data.isCritical
               // increaseLuckForAllPlayers(amount, isCritical)
                break
            }

            // Handle increaseDef case
            case "increaseDef": {
                const {userId, amount, isCritical} = data;
                const user = users[userId];
                if(!user){
                    console.log(`User ${userId} not found.`);
                    return;
                }
                const { realm, roomId } = user;
                const defMessage ={
                    type: "increaseDef",
                    amount: amount,
                    isCritical: isCritical,
                }
                broadcastToRoom(realm, roomId, defMessage)
              //  const amount = data.amount
               // const isCritical = data.isCritical
               // increaseDefForAllPlayers(amount, isCritical)
                break
            }

            // Handle increaseDef case
            case "shadowchainPlayerSkill": {
                const {userId, amount, isCritical} = data;
                const user = users[userId];
                if(!user){
                    console.log(`User ${userId} not found.`);
                    return;
                }
                const { realm, roomId } = user;
                const shadowSkillMessage ={
                    type: "shadowchainPlayerSkill",
                    amount: amount,
                    isCritical: isCritical,
                }
                broadcastToRoom(realm, roomId, shadowSkillMessage)
                
              //  const amount = data.amount
              //  const isCritical = data.isCritical
              //  shadowchainsForAllPlayers(amount, isCritical)
                break
            }
            // case "monsterPosSend":{
            //     wss.clients.forEach(function each(client) {
            //         if (client.readyState === WebSocket.OPEN) {
            //             client.send(JSON.stringify({ type: "monsterPosRecieve" }))
            //         }
            //     });
            // } break
         
        }
    })


    ws.on("close", (code, reason) => {
        clearInterval(pingInterval);
        console.log(
            `Connection closed by ${ws.playerId}. Code: ${code}, Reason: ${reason}`
        )
    })

    ws.onerror = (error) => {
        console.error("WebSocket error:", error)
    }
})

  
function broadcastToRoom(realmName, roomId, roomMsg){
    const roomClients = realms[realmName][roomId];
    if (!roomClients) {
        console.error(`Room ${roomId} in realm ${realmName} does not exist.`);
        return;
    }

    room.forEach(client =>{
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(roomMsg));
        }
    })
}


// function monsterAttackTimer() {
//     wss.clients.forEach(function each(client) {
//         const playerId = client.playerId
//         if (
//             !monsterAttackTimers[playerId] ||
//             Date.now() - monsterAttackTimers[playerId] >= 2000
//         ) {
//             monsterAttackTimers[playerId] = Date.now()
//             client.send(
//                 JSON.stringify({
//                     type: "recieveAttackTimer",
//                 })
//             )
//         }
//     })
// }



console.log("Connected to Dice Master WebSocket Server Heroku App")
