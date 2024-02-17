const WebSocket = require('ws');
const PORT = process.env.PORT || 8080
const wss = new WebSocket.Server({ port: PORT });


function generatePlayerId() {
    const randomNum = Math.floor(1000 + Math.random() * 9000)
    return `player${randomNum}`
}

let monsterAttackTimers = {}

wss.on("connection", (ws) => {
    const playerId = generatePlayerId()
    ws.playerId = playerId

    ws.on("message", (message) => {
        console.log("Received:", message)
        const data = JSON.parse(message)

        switch (data.type) {
            case "sendPlayerHitMonster":
                playerHitMonster()
                break
            case "sendGlobalSkillPlayerAttack":
                {
                    const random = Math.random() * 1000
                    playerAttackGlobalSkill(random)
                }
                break
            case "sendGlobalSkillMonsterAttack":
                {
                    const random = Math.random() * 1000
                    monsterAttackGlobalSkill(random)
                }
                break
            case "engageEnemySend":
                playerEngage()
                break
            case "leaveEnemySend":
                playerLeave()
                break
            case "sendPlayerAttack":
                playerAttackUpdate()
                break
            case "sendAfterPlayerAttack":
                {
                    const playerAttack = data.serverPlayerAttack
                    playerAfterAttackUpdate(playerAttack)
                }
                break
            case "updatePositions":
                monsterRotationPosition(
                    data.playerPosition,
                    data.monsterPosition,
                    data.monsterRotation
                )
                break
            case "sendAttackTimer":
                monsterAttackTimer()
                break
            case "refillHealth": {
                const amount = data.amount
                const isCritical = data.isCritical
                refillHealthForAllPlayers(amount, isCritical)
                break
            }
            case "increaseAttack": {
                const amount = data.amount
                const isCritical = data.isCritical
                increaseAttackForAllPlayers(amount, isCritical)
                break
            }
            // Handle increaseMagic case
            case "increaseMagic": {
                const amount = data.amount
                const isCritical = data.isCritical
                increaseMagicForAllPlayers(amount, isCritical)
                break
            }

            // Handle increaseCritDamage case
            case "increaseCritDamage": {
                const amount = data.amount
                const isCritical = data.isCritical
                increaseCritDamageForAllPlayers(amount, isCritical)
                break
            }

            // Handle increaseCritRate case
            case "increaseCritRate": {
                const amount = data.amount
                const isCritical = data.isCritical
                increaseCritRateForAllPlayers(amount, isCritical)
                break
            }

            // Handle increaseLuck case
            case "increaseLuck": {
                const amount = data.amount
                const isCritical = data.isCritical
                increaseLuckForAllPlayers(amount, isCritical)
                break
            }

            // Handle increaseDef case
            case "increaseDef": {
                const amount = data.amount
                const isCritical = data.isCritical
                increaseDefForAllPlayers(amount, isCritical)
                break
            }
        }
    })

    ws.on("close", (code, reason) => {
        console.log(
            `Connection closed by ${ws.playerId}. Code: ${code}, Reason: ${reason}`
        )
    })

    ws.onerror = (error) => {
        console.error("WebSocket error:", error)
    }
})

function playerHitMonster() {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "receivePlayerHitMonster" }))
        }
    })
}

function playerEngage() {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "engageEnemyRecieve" }))
        }
    })
}

function playerLeave() {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "leaveEnemyRecieve" }))
        }
    })
}

function playerAttackUpdate() {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "recievePlayerAttack" }))
        }
    })
}

function playerAfterAttackUpdate(playerAttack) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(
                JSON.stringify({
                    type: "recieveAfterPlayerAttack",
                    serverPlayerAttack: playerAttack,
                })
            )
        }
    })
}

function monsterAttackGlobalSkill(random) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(
                JSON.stringify({
                    type: "receiveMonsterAttackGlobalSkill",
                    random: random,
                })
            )
        }
    })
}

function playerAttackGlobalSkill(random) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(
                JSON.stringify({
                    type: "receivePlayerAttackGlobalSkill",
                    random: random,
                })
            )
        }
    })
}

function monsterRotationPosition(
    playerPosition,
    monsterPosition,
    monsterRotation
) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(
                JSON.stringify({
                    type: "broadcastPositions",
                    playerPosition: playerPosition,
                    monsterPosition: monsterPosition,
                    monsterRotation: monsterRotation,
                })
            )
        }
    })
}

function monsterAttackTimer() {
    wss.clients.forEach(function each(client) {
        const playerId = client.playerId
        if (
            !monsterAttackTimers[playerId] ||
            Date.now() - monsterAttackTimers[playerId] >= 2000
        ) {
            monsterAttackTimers[playerId] = Date.now()
            client.send(
                JSON.stringify({
                    type: "recieveAttackTimer",
                })
            )
        }
    })
}

function refillHealthForAllPlayers(amount, isCritical) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(
                JSON.stringify({
                    type: "refillHealth",
                    amount: amount,
                    isCritical: isCritical,
                })
            )
        }
    })
}

function increaseAttackForAllPlayers(amount, isCritical) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(
                JSON.stringify({
                    type: "increaseAttack",
                    amount: amount,
                    isCritical: isCritical,
                })
            )
        }
    })
}

// Function to increase magic for all players
function increaseMagicForAllPlayers(amount, isCritical) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(
                JSON.stringify({
                    type: "increaseMagic",
                    amount: amount,
                    isCritical: isCritical,
                })
            )
        }
    })
}

// Function to increase critDamage for all players
function increaseCritDamageForAllPlayers(amount, isCritical) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(
                JSON.stringify({
                    type: "increaseCritDamage",
                    amount: amount,
                    isCritical: isCritical,
                })
            )
        }
    })
}

// Function to increase critRate for all players
function increaseCritRateForAllPlayers(amount, isCritical) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(
                JSON.stringify({
                    type: "increaseCritRate",
                    amount: amount,
                    isCritical: isCritical,
                })
            )
        }
    })
}

// Function to increase luck for all players
function increaseLuckForAllPlayers(amount, isCritical) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(
                JSON.stringify({
                    type: "increaseLuck",
                    amount: amount,
                    isCritical: isCritical,
                })
            )
        }
    })
}

// Function to increase def for all players
function increaseDefForAllPlayers(amount, isCritical) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(
                JSON.stringify({
                    type: "increaseDef",
                    amount: amount,
                    isCritical: isCritical,
                })
            )
        }
    })
}

console.log("Connected to Dice Master WebSocket Server localhost:8080")
