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
            case "initRoom":
                {
                    const {
                        userId,
                        realm,
                        playerName,
                        playerClass,
                        playerLevel,
                        playerHp,
                        playerEther,
                    } = data;
            
                    // Ensure the realm object exists
                    if (!realms[realm]) {
                        realms[realm] = {};
                    }
            
                    // Check for duplicate user
                    if (users[userId]) {
                        console.log(`Refreshing connection for existing user ${userId}`);
                        users[userId].ws = ws;
                    } else {
                        // Generate a new room ID by counting existing rooms and adding 1
                        let lastRoomIndex = Object.keys(realms[realm]).length;
                        let roomId = "bossRoom" + (lastRoomIndex + 1);  // Always create a new room
            
                        // Initialize the new room
                        realms[realm][roomId] = [ws]; // Add the user's WebSocket to the new room
            
                        // Store user details
                        ws.userId = userId;  // Optionally store userId on ws for easier reference
                        users[userId] = {
                            ws,
                            realm,
                            roomId,
                            playerName,
                            playerClass,
                            playerLevel,
                            playerHp,
                            playerEther,
                        };
            
                        console.log(`User ${userId} added to new room '${roomId}' in realm ${realm}`);
            
                        let playerCount = realms[realm][roomId]
                        // Broadcast the creation of a new room to the room itself (which currently has only one member)
                        broadcastToRoom(realm, roomId, {
                            type: "playerCreateRoom",
                            userId: userId,
                            roomId: roomId,
                            realm: realm,
                            playerName: playerName,
                            playerHp: playerHp,
                            playerEther: playerEther,
                            playerCount: playerCount.length
                        });


                    }
                }
                break;
                case "sendRoomName":{
                    const {
                        roomId
                    } = data;

                    console.log(`Sent RoomId: ${roomId}`)
                    const roomMessage = {
                        type: "returnRoomName",
                        roomId: roomId
                    }
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify(roomMessage))
                    }
                }break;
                case "joinRoom": {
                    const {
                        userId,
                        realm,
                        playerName,
                        playerClass,
                        playerLevel,
                        playerHp,
                        playerEther,
                        roomName
                    } = data;
                
                    if (!realms[realm]) {
                        realms[realm] = {};
                    }
                
                    if (!realms[realm][roomName]) {
                        realms[realm][roomName] = []; // Initialize the room if it does not exist
                    }
                
                    let roomToJoin = realms[realm][roomName];
                
                    if (users[userId]) {
                        console.log(`Refreshing connection for existing user ${userId}`);
                        if (users[userId].roomId && realms[realm][users[userId].roomId]) {
                            console.log(`Checking if ${userId} is in ${roomName}`)
                            const prevRoom = realms[realm][users[userId].roomId];
                            const index = prevRoom.indexOf(users[userId].ws);
                            if (index > -1) {
                                prevRoom.splice(index, 1); 
                            }
                        }
                        users[userId].ws = ws; 
                    } else {
                        if (roomToJoin.length >= 2) {
                            ws.send(JSON.stringify({ type: "roomFullOnJoin", message: "Room is full" }));
                            return; 
                        }
                        users[userId] = { ws, realm, roomName, playerName, playerClass, playerLevel, playerHp, playerEther };
                        console.log(`User ${userId} added to room '${roomName}' in realm ${realm}`);
                    }
                

                    roomToJoin.push(ws);
                    let playerCount = roomToJoin.length;
                    console.log(`playerCount in ${roomName} is ${playerCount}`)
                    broadcastToRoom(realm, roomName, {
                        type: "playerJoinedRoom",
                        userId,
                        roomName,
                        playerName,
                        playerHp,
                        playerEther,
                        playerCount
                    });
                } break;
            
            case "playerLeave":
                {
                    const user = users[data.userId]
                    const playerName = data.playerName
                    const userId = data.userId
                    console.log("playerLeave server recieve msg")
                    if (user) {
                        const { ws, realm, roomId } = user
                        console.log("Entered user if statement")
                        const room = realms[realm][roomId]
                        if (room) {
                            console.log("Entered room if statement")
                            const wsIndex = room.indexOf(ws)
                            if (wsIndex > -1) {
                                room.splice(wsIndex, 1)
                                console.log(
                                    `User ${data.userId} left room '${roomId}' in realm ${realm}.`
                                )
                                if (room.length === 0) {
                                    delete realms[realm][roomId]
                                    console.log(
                                        `Room ${roomId} was deleted from ${realm}`
                                    )
                                }
                                room.forEach((remainingWs, index) => {
                                    console.log(
                                        `Remaining connections in room '${roomId}':`
                                    )
                                    const remainingUserId = Object.keys(
                                        users
                                    ).find(
                                        (userId) =>
                                            users[userId].ws === remainingWs
                                    )
                                    console.log(
                                        `Index: ${index}, UserID: ${remainingUserId}`
                                    )
                                    if (
                                        remainingWs.readyState ===
                                        WebSocket.OPEN
                                    ) {
                                        console.log("open websocket")
                                        remainingWs.send(
                                            JSON.stringify({
                                                type: "playerLeftToClient",
                                                userId: userId,
                                                roomId: roomId,
                                                playerName: playerName,
                                            })
                                        )
                                    } else {
                                        console.log(
                                            "WebSocket is not open. Message not sent."
                                        )
                                    }
                                })
                            }
                        }
                        delete users[data.userId]
                        console.log(
                            `User ${data.userId} deleted from users object.`
                        )
                    }
                }
                break

                case "getRoomsInRealm": {
                    const { 
                        playerName,
                        realm
                     } = data;  
                
                    const currentRealm = realms[realm];
                    console.log(`Checking rooms in realm: ${realm}`);
                
                    if (currentRealm && Object.keys(currentRealm).length > 0) {
                        console.log(`Checking player name: ${playerName}`)
                        const rooms = Object.keys(currentRealm).map(roomId => {
                            let playersInRoom = realms[realm][roomId]
                            let playerCount = playersInRoom.length
                            console.log(`Checking player count: ${playerCount}`)
                            return { 
                                roomId,
                                playerName,
                                playerCount
                            };  
                        });
                
                        console.log(`Rooms in ${realm}:`, rooms);
                
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                type: "returnRoomsInRealm",
                                rooms: rooms,
                            }));
                            console.log("Sent room list to client.");
                        } else {
                            console.log("WebSocket not open. State: ", ws.readyState);
                        }
                    } else {
                        console.log("No rooms found in the specified realm or realm does not exist.");
                    }
                    break;
                }
                
            case "getPlayersForRoom": {
                const user = users[data.userId]
                console.log("Inside getPlayersForRoom")
        
                if (user) {
                    const { realm, roomId } = user
                    const room = realms[realm][roomId]
                    users[data.userId]
                    console.log(`user statment true: ${data.userId} + roomId: ${roomId}`)
                    if (room && room.length > 0) {
                        console.log(`room found: ${roomId}`)
                        const players = room.map((ws) => {
                            console.log(`Entered players`)
                            const foundUserId = Object.keys(users).find(
                                (id) => users[id].ws === ws
                            )
                            console.log(`foundUserId: ${foundUserId} and HP: ${users[foundUserId].playerHp}`)
                            if ((foundUserId && users[foundUserId].playerHp) || (users[foundUserId].playerHp == 0)) {
                                console.log(`player found HP: ${users[foundUserId].playerHp} updating to... ${data.playerHp}`)
                                users[foundUserId].playerHp = foundUserId === data.userId ? Math.floor(data.playerHp) : users[foundUserId].playerHp;
                                console.log(`player HP updated: ${users[foundUserId].playerHp}`)

                                console.log(`player Kills: ${users[foundUserId].playerEther} updating to... ${data.playerEther}`)
                                users[foundUserId].playerEther = foundUserId === data.userId ? data.playerEther : users[foundUserId].playerEther;
                                console.log(`player Kills updates: ${users[foundUserId].playerEther}`)
                                return {
                                    userId: foundUserId,
                                    playerName: users[foundUserId].playerName,
                                    playerClass: users[foundUserId].playerClass,
                                    playerLevel: users[foundUserId].playerLevel,
                                    playerHp: users[foundUserId].playerHp,
                                    playerEther: users[foundUserId].playerEther
                                };
                            }
                        })

                        console.log("Players in room:", players)
                        room.forEach((client) => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(
                                    JSON.stringify({
                                        type: "returnPlayersInRoom",
                                        players: players,
                                    })
                                )
                                console.log("Sent players list to client.")
                                

                            } else {
                                console.log(
                                    `WebSocket not open. State: ${client.readyState}`
                                )
                            }
                        })
                    } else {
                        console.log("No such room or room is empty.")
                    }
                } else {
                    console.log("User not found or disconnected.")
                }
                break
            }
            case "changePlayerStats":
                {
                    const { 
                        userId,
                        playerName,
                        playerHp,
                        playerEther
                    } = data
                    const user = users[userId]
                
                  console.log(`player data: ${playerName}, HP: ${playerHp}, ID: ${userId}, KILLS: ${playerEther}`)

                    if (!user) {
                        console.log(`User ${userId} not found.`)
                        return
                    }
                    const { realm, roomId } = user

                    broadcastToRoom(realm, roomId, {
                        type: "changePlayerStatReceive",
                        userId: userId,
                        roomId: roomId,
                        realm: realm,
                        playerName: playerName,
                        playerHp: playerHp,
                        playerEther: playerEther
                    })
                }
                break

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
        if (ws.userId) {
            console.log(`inside leave with value:  ${ws.userId}`)
            handlePlayerLeave({ userId: ws.userId })
        } else {
            console.log("ws.userId not found on WebSocket object at close.")
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
    const { userId } = data
    console.log("Attempting to handle player leave for userId:", userId)

    const user = users[userId]
    if (!user) {
        console.log(`No user found for userId: ${userId}`)
        return
    }

    console.log(`Found user, preparing to remove from room. Details:`, user)

    const { ws, realm, roomId, playerName } = user
    if (!realms[realm]) {
        console.log(`Realm not found: ${realm}`)
        return
    }

    const room = realms[realm][roomId]
    if (!room) {
        console.log(`Room not found: ${roomId} in realm: ${realm}`)
        return
    }

    const index = room.indexOf(ws)
    if (index !== -1) {
        room.splice(index, 1)
        console.log(
            `Removed user from room. Room now has ${room.length} connections.`
        )
    } else {
        console.log("WebSocket not found in room on disconnect.")
    }

    if (room.length === 0) {
        delete realms[realm][roomId];
        console.log(`Deleted room: ${roomId} as it's now empty.`);
    }

    delete users[userId]
    console.log(`Deleted user: ${userId} from global users list.`)

    broadcastToRoom(realm, roomId, {
        type: "playerLeftToClient",
        userId: userId,
        roomId: roomId,
        playerName: playerName,
    })
}

function broadcastToRoom(realm, roomId, roomMsg) {
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
        console.log(`sent broadcastToRoom message:`)
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
