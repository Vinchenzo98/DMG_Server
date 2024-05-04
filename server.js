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

                if (!realms[realm]) {
                    realms[realm] = {};
                }

                //Check for duplicate user
                if(users[userId]){
                    console.log(`Refreshing connection for existing user ${userId}`);
                    users[userId].ws = ws;
                } else{
                    let roomId = 'bossRoom'; 
                    let lastRoomIndex = Object.keys(realms[realm]).length; // Get the last room index
                    let lastRoomName = lastRoomIndex > 0 ? 'bossRoom' + lastRoomIndex : 'bossRoom'; // Determine the last room's name
                    let lastRoom = realms[realm][lastRoomName]; // Get the last room
                
                    if (!lastRoom || lastRoom.length >= 1) { 
                        const newRoomIndex = lastRoomIndex + 1;
                        roomId = 'bossRoom' + newRoomIndex;
                        realms[realm][roomId] = [];
                    } else {
                        roomId = lastRoomName;
                    }
                
                    realms[realm][roomId].push(ws);
                    ws.userId = userId;
                    console.log(`ws userId connection value ${ws.userId}`)
                    users[userId] = { ws, realm, roomId, playerName}; 
                    console.log(`User ${userId} added to room '${roomId}' in realm ${realm}`);
                    broadcastToRoom(realm, roomId, { type: "playerJoinedToClient", userId: userId, roomId: roomId, playerName: playerName });
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
 
            // case 'getPlayersForRoom':{
            //     const user = users[data.userId];
            //     const playerName = data.playerName;
            //     if (user) {
            //         const { realm, roomId } = user;
            //         const room = realms[realm][roomId];
            //         if (room) {
            //             const players = room.map(user => ({
            //                 user,
            //                 playerName
            //             }));

            //             room.forEach(userId => {
            //                 const clientWs = users[data.userId].ws;
            //                 if (clientWs.readyState === WebSocket.OPEN) {
            //                     clientWs.send(JSON.stringify({
            //                         type: "returnPlayersInRoom",
            //                         players
            //                     }));
            //                 }
            //             });
            //         }
            //     }
            //  } break;
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

            case "blockSkills": {
                const { userId, amount, isCritical } = data
                const user = users[userId]
                if (!user) {
                    console.log(`User ${userId} not found.`)
                    return
                }
                const { realm, roomId } = user

                const attackMessage = {
                    type: "blockSkills",
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
        if(ws.userId){
            console.log(`inside leave with value:  ${ws.userId}`)
            handlePlayerLeave({ userId: ws.userId });
        }
        else {
            console.log("ws.userId not found on WebSocket object at close.");
        }
        console.log(
            `Connection closed by ${ws.playerId}. Code: ${code}, Reason: ${reason}`
        )
        
    })

    ws.onerror = (error) => {
        console.error("WebSocket error:", error)
    }
})

function handlePlayerLeave(data) {
    const { userId } = data;
    console.log("Attempting to handle player leave for userId:", userId);

    const user = users[userId];
    if (!user) {
        console.log(`No user found for userId: ${userId}`);
        return;
    }

    console.log(`Found user, preparing to remove from room. Details:`, user);

    const { ws, realm, roomId, playerName } = user;
    if (!realms[realm]) {
        console.log(`Realm not found: ${realm}`);
        return;
    }

    const room = realms[realm][roomId];
    if (!room) {
        console.log(`Room not found: ${roomId} in realm: ${realm}`);
        return;
    }

    const index = room.indexOf(ws);
    if (index !== -1) {
        room.splice(index, 1);
        console.log(`Removed user from room. Room now has ${room.length} connections.`);
    } else {
        console.log("WebSocket not found in room on disconnect.");
    }

    // if (room.length === 0) {
    //     delete realms[realm][roomId];
    //     console.log(`Deleted room: ${roomId} as it's now empty.`);
    // }

    delete users[userId];
    console.log(`Deleted user: ${userId} from global users list.`);

    broadcastToRoom(
        realm, 
        roomId, 
        {
            type: "playerLeftToClient", 
            userId: userId, 
            roomId: roomId, 
            playerName: playerName
        })
}




function broadcastToRoom(realm, roomId, roomMsg){
    const realmToBroadcast = realms[realm]
    if (!realmToBroadcast) {
        console.log(`Realm ${realm} does not exist.`)
        return
    }
    const room = realmToBroadcast[roomId]
    if (!room) {
        console.log(`Room ${roomId} in realm ${realm} does not exist.`)
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
