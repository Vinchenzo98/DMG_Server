const WebSocket = require("ws")
const PORT = process.env.PORT || 8080
const wss = new WebSocket.Server({ port: PORT })

function generatePlayerId() {
    const randomNum = Math.floor(1000 + Math.random() * 9000)
    return `player${randomNum}`
}

const realms = {}
const users = {}

//let monsterAttackTimers = {}

wss.on("connection", (ws) => {
    const playerId = generatePlayerId()
    ws.playerId = playerId
    
    const pingInterval = setInterval(() => {
        ws.ping()
        console.log("Pinged Server")
    }, 30000)

    ws.on("message", (message) => {
        console.log("Received:", message)
        const data = JSON.parse(message)

        switch (data.type) {
         
            case 'initRoom': {
                const {userId, realm, playerName} = data;
            
                // Ensure the realm exists
                if (!realms[realm]) {
                    realms[realm] = {};
                }

                //Check for duplicate user
                if(users[userId]){
                    console.log(`Refreshing connection for existing user ${userId}`);
                    users[userId].ws = ws;
                } else{
                    let roomName = 'bossRoom'; 
                    let lastRoomIndex = Object.keys(realms[realm]).length; // Get the last room index
                    let lastRoomName = lastRoomIndex > 0 ? 'bossRoom' + lastRoomIndex : 'bossRoom'; // Determine the last room's name
                    let lastRoom = realms[realm][lastRoomName]; // Get the last room
                
                    if (!lastRoom || lastRoom.length >= 1) { 
                        const newRoomIndex = lastRoomIndex + 1;
                        roomName = 'bossRoom' + newRoomIndex;
                        realms[realm][roomName] = [];
                    } else {
                        roomName = lastRoomName;
                    }
                
                    realms[realm][roomName].push(ws);
                    users[userId] = { ws, realm, roomId: roomName}; 
                    console.log(`User ${userId} added to room '${roomName}' in realm ${realm}`);
                    broadcastToRoom(realm, roomName, { type: "playerJoinedToClient", userId: userId, roomId: roomName, playerName: playerName });
                }

            } break;
            
         
            case 'playerLeave': {
                const user = users[data.userId];
                const playerName = data.playerName;
                console.log("playerLeave server recieve msg")
                if (user) {
                    const { ws, realm, roomId } = user;
                    console.log("Entered user if statement")
                    const room = realms[realm][roomId];
                    if (room) {
                        console.log("Entered room if statement")
                        const wsIndex = room.indexOf(ws);
                        if (wsIndex > -1) {
                            room.splice(wsIndex, 1);
                            console.log(`User ${data.userId} left room '${roomId}' in realm ${realm}.`);
                            if(room.length === 0){
                                delete realms[realm][roomId];
                                console.log(`Room ${roomId} was deleted from ${realm}`)
                            }
                            room.forEach((remainingWs, index) => {
                                console.log(`Remaining connections in room '${roomId}':`);
                                const remainingUserId = Object.keys(users).find(userId => users[userId].ws === remainingWs);
                                console.log(`Index: ${index}, UserID: ${remainingUserId}`);
                                if (remainingWs.readyState === WebSocket.OPEN) {
                                    console.log("open websocket")
                                    remainingWs.send(JSON.stringify({
                                        type: "playerLeftToClient",
                                        userId: data.userId,
                                        roomId: roomId,
                                        playerName: playerName
                                    }));
                                    
                                }else{
                                    console.log("WebSocket is not open. Message not sent.");
                                }
                            });
                       
                        }
                    }
                    delete users[data.userId];
                    console.log(`User ${data.userId} deleted from users object.`);
                
                }
               
            } break;
            
            case "sendPlayerHitMonster":
                // playerHitMonster()
                {
                    const { userId } = data
                    const user = users[userId]
                    if (!user) {
                        console.log(`User ${userId} not found.`)
                        return
                    }
                    const { realm, roomId } = user

                    const playerHitMonsterMessage = {
                        type: "receivePlayerHitMonster",
                    }
                    broadcastToRoom(realm, roomId, playerHitMonsterMessage)
                }
                break
            case "sendGlobalSkillPlayerAttack":
                // monsterAttackGlobalSkill(random)
                // playerAttackUpdate()
                {
                    const { userId } = data
                    const random = Math.random() * 1000
                    const user = users[userId]
                    if (!user) {
                        console.log(`User ${userId} not found.`)
                        return
                    }
                    const { realm, roomId } = user

                    const playerAttackSkillMessage = {
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
                    const { userId } = data
                    const random = Math.random() * 1000
                    const user = users[userId]
                    if (!user) {
                        console.log(`User ${userId} not found.`)
                        return
                    }
                    const { realm, roomId } = user

                    const monsterAttackMessage = {
                        type: "receiveMonsterAttackGlobalSkill",
                        random: random,
                    }
                    broadcastToRoom(realm, roomId, monsterAttackMessage)
                }
                break

            case "engageEnemySend":
                {
                    const { userId } = data
                    const user = users[userId]
                    if (!user) {
                        console.log(`User ${userId} not found.`)
                        return
                    }
                    const { realm, roomId } = user

                    const playerEngageEnemyMessage = {
                        type: "engageEnemyRecieve",
                        userId: data.userId,
                    }
                    broadcastToRoom(realm, roomId, playerEngageEnemyMessage)
                }
                break
            case "leaveEnemySend":
                // playerLeave()
                {
                    const { userId } = data
                    const user = users[userId]
                    if (!user) {
                        console.log(`User ${userId} not found.`)
                        return
                    }
                    const { realm, roomId } = user

                    const playerLeaveEnemyMessage = {
                        type: "leaveEnemyRecieve",
                    }
                    broadcastToRoom(realm, roomId, playerLeaveEnemyMessage)
                }
                break
            case "sendPlayerAttack":
                {
                    // playerAttackUpdate()
                    const { userId, playerAttack } = data
                    const user = users[userId]
                    if (!user) {
                        console.log(`User ${userId} not found.`)
                        return
                    }
                    const { realm, roomId } = user

                    const playerAttackMessage = {
                        type: "recievePlayerAttack",
                        playerAttack: playerAttack,
                        userId: userId,
                    }
                    broadcastToRoom(realm, roomId, playerAttackMessage)
                }
                break
            case "sendAfterPlayerAttack":
                {
                    const { userId, serverPlayerAttack } = data
                    const user = users[userId]
                    if (!user) {
                        console.log(`User ${userId} not found.`)
                        return
                    }
                    const { realm, roomId } = user

                    const playerAfterAttackMessage = {
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
                const { userId, amount, isCritical } = data
                const user = users[userId]
                if (!user) {
                    console.log(`User ${userId} not found.`)
                    return
                }
                const { realm, roomId } = user

                const refillHealthMessage = {
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

            case "decreaseHealth": {
                const { userId, amount, isCritical } = data
                const user = users[userId]
                if (!user) {
                    console.log(`User ${userId} not found.`)
                    return
                }
                const { realm, roomId } = user

                const decreaseHealthMessage = {
                    type: "decreaseHealth",
                    amount: amount,
                    isCritical: isCritical,
                }
                broadcastToRoom(realm, roomId, decreaseHealthMessage)
                break
            }

            case "increaseAttack": {
                const { userId, amount, isCritical } = data
                const user = users[userId]
                if (!user) {
                    console.log(`User ${userId} not found.`)
                    return
                }
                const { realm, roomId } = user

                const attackMessage = {
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

            case "decreaseAttack": {
                const { userId, amount, isCritical } = data
                const user = users[userId]
                if (!user) {
                    console.log(`User ${userId} not found.`)
                    return
                }
                const { realm, roomId } = user

                const attackMessage = {
                    type: "decreaseAttack",
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
                const { userId, amount, isCritical } = data
                const user = users[userId]
                if (!user) {
                    console.log(`User ${userId} not found.`)
                    return
                }
                const { realm, roomId } = user

                const magicMessage = {
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
                const { userId, amount, isCritical } = data
                const user = users[userId]
                if (!user) {
                    console.log(`User ${userId} not found.`)
                    return
                }
                const { realm, roomId } = user
                const critDamageMessage = {
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
                const { userId, amount, isCritical } = data
                const user = users[userId]
                if (!user) {
                    console.log(`User ${userId} not found.`)
                    return
                }
                const { realm, roomId } = user
                const increaseCritMessage = {
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
                const { userId, amount, isCritical } = data
                const user = users[userId]
                if (!user) {
                    console.log(`User ${userId} not found.`)
                    return
                }
                const { realm, roomId } = user
                const luckMessage = {
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
                const { userId, amount, isCritical } = data
                const user = users[userId]
                if (!user) {
                    console.log(`User ${userId} not found.`)
                    return
                }
                const { realm, roomId } = user
                const defMessage = {
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
                const { userId, amount, isCritical } = data
                const user = users[userId]
                if (!user) {
                    console.log(`User ${userId} not found.`)
                    return
                }
                const { realm, roomId } = user
                const shadowSkillMessage = {
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
        clearInterval(pingInterval)
        console.log(
            `Connection closed by ${ws.playerId}. Code: ${code}, Reason: ${reason}`
        )
      
    })

    ws.onerror = (error) => {
        console.error("WebSocket error:", error)
    }
})



function broadcastToRoom(realmName, roomId, roomMsg){
    const realmToBroadcast = realms[realmName]
    if (!realmToBroadcast) {
        console.log(`Realm ${realmName} does not exist.`)
        return
    }
    const room = realmToBroadcast[roomId]
    if (!room) {
        console.log(`Room ${roomId} in realm ${realmName} does not exist.`)
        return
    }
    room.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(roomMsg))
        }
        console.log("sent broadcastToRoom message")
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
