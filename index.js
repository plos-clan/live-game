const Mirai = require('node-mirai-sdk')
const { Plain, At } = Mirai.MessageComponent
const fs = require("fs")
const crypto = require('crypto')

const bot = new Mirai({
	host: "http://127.0.0.1:9900",
	verifyKey: "iamahappydog",
	qq: 123456789
})

bot.onSignal("authed", () => {
	console.log(`Authed with session key ${bot.sessionKey}`)
	bot.verify()
})

bot.onMessage(message => {
	const { sender, messageChain, reply } = message
	let messageSource, messageText = '', messageAt
	messageChain.forEach(chain => {
		if (chain.type === "Plain") messageText += Plain.value(chain).trim()
		if (chain.type === "At") messageAt = chain.target
	})
	if (messageText == "#菜单") showMenu(reply)
	else if (messageText == "#创建角色") doCreateUser(sender.id, reply)
	else if (messageText.startsWith("#查询")) doStatus(sender.id, messageAt, reply)
	else if (messageText.startsWith("#吃饭")) doEat(sender.id, messageText, reply)
	else if (messageText == "#打工") doJob(sender.id, reply)
	else if (messageText.startsWith("#保健")) doCare(sender.id, messageText, reply)
	else if (messageText == "#搬砖") doStartBrick(sender.id, reply)
	else if (messageText == "#结束搬砖") doStopBrick(sender.id, reply)
	else if (messageText.startsWith("#大转盘")) doTurntable(sender.id, messageText, reply)
	else if (messageText.startsWith("#偷取")) doSteal(sender.id, messageAt, reply)
	else if (messageText == "#抢银行") doCrackBank(sender.id, reply)
	else if (messageText == "#钓鱼") doStartFish(sender.id, reply)
	else if (messageText == "#拉竿") doStopFish(sender.id, reply)
	else if (messageText.startsWith("#卖")) doSell(sender.id, messageText, reply)
	else if (messageText == "#服不服榜") doRank(sender.group.id, reply)
	else if (messageText == "#狗带") doGodie(sender.id, reply)
})

bot.listen("group")

process.on("exit", () => { bot.release() })

const getData = (id, reply) => {
    if (isUserExist(id)) return JSON.parse(fs.readFileSync(getFilePath(id)))
    reply(atText(id, "还没有创建角色！"))
    return false
}

const saveData = (id, data) => {
    try {
        fs.writeFileSync(getFilePath(id), JSON.stringify(data))
        return true
    } catch (error) {
        return false
    }
}

const deleteData = (id) => {
    try {
        fs.unlinkSync(getFilePath(id))
        return true
    } catch (error) {
        return false
    }
}

const showDialog = (reply, title = [], content = [], footer = []) => {
    let message = ""
    if (title.length > 0) message += title.join("\n") + "###############\n"
    if (content.length > 0) message += content.join("\n")
    if (footer.length > 0) message += "###############\n" + footer.join("\n")
    reply(message)
}

const showMenu = (reply) => {
    const commandsList = [
        "1.#创建角色", "2.#查询[@对象]", "3.#吃饭[数值]", "4.#打工", 
        "5.#保健[数值]", "6.#搬砖", "7.#结束搬砖", "8.#钓鱼", 
        "9.#拉竿", "10.#卖[物品][数值]", "11.#大转盘[数值]", 
        "12.#偷取[@对象]", "13.#抢银行", "14.#狗带", "15.#服不服榜"
    ]
    showDialog(reply, ["可用命令："], commandsList, ["注：括号内为参数"])
}

const doCreateUser = (id, reply) => {
    const defaultAll = randomNum(60, 80)
    const random = randomNum(10, defaultAll - 10)
    const data = {
        power: random,
        health: defaultAll - random,
        money: 0,
        brick: 0,
        fish: 0,
        pack: {
            goldfish: 0,
            mandarin: 0,
            grasscrap: 0,
            tortoise: 0,
            globefish: 0
        }
    }

    if (isUserExist(id)) {
        reply(atText(id, "你已经创建了角色！"))
    } else if (saveData(id, data)) {
        reply(atText(id, `创建成功！
角色状态：
###############
精力：${data.power}
健康：${data.health}
财富：${data.money}
###############`))
    } else {
        reply(atText(id, "创建失败！"))
    }
}

const doGodie = (id, reply) => {
    if (deleteData(id)) {
        reply(atText(id, "狗带成功！"))
    } else {
        reply(atText(id, "狗带失败！"))
    }
}

const doStatus = (id, target, reply) => {
    const user = target && isUserExist(target) ? target : (isUserExist(id) ? id : null)

    if (!user) {
        reply(atText(id, target ? "这个家伙还没有创建角色！" : "还没有创建角色！"))
        return
    }

    const data = getData(user, reply)
    if (!data) return

    let text = `###############
精力：${data.power}/200
健康：${data.health}/150
财富：${data.money}
###############`

    const packItems = [
        { name: "金龙鱼", count: data.pack.goldfish },
        { name: "桂鱼", count: data.pack.mandarin },
        { name: "草鱼", count: data.pack.grasscrap },
        { name: "王八", count: data.pack.tortoise },
        { name: "河豚", count: data.pack.globefish }
    ]

    const packText = packItems
        .filter(item => item.count > 0)
        .map(item => `\n${item.name}：${item.count}`)
        .join('')

    text += packText || "\n背包里空空如也"

    if (data.brick) {
        text += `\n###############\n搬砖中，开始时间：${getTime("string")}`
    }

    reply(atText(id, text))
}

const doEat = (id, text, reply) => {
    let num = parseInt(text.match(/\d+/g)) || 10
    let data = getData(id, reply)

    if (!data) return

    if (data.brick) {
        reply(atText(id, "正在搬砖，无法操作！"))
        return
    }

    if (num < 10) {
        reply(atText(id, "单次消费不得低于10元！"))
        return
    }

    if (data.power + num > 200) {
        reply(atText(id, "精力值最高为200，请减少摄入量！"))
        return
    }

    if (data.money < num) {
        reply(atText(id, "财富不足，请先打工！"))
        return
    }

    data.money -= num
    data.power += num

    if (saveData(id, data)) {
        reply(atText(id, `舒服地吃了餐${num}元的便当！\n当前精力：${data.power}`))
    }

    if (randomNum(1, 100) >= 70) {
        data.health -= 10
        if (saveData(id, data)) {
            reply(atText(id, "食物中毒，健康减10！"))
            if (data.health <= 0) {
                reply(atText(id, "健康值小于零，就地去世！"))
                deleteData(id)
            }
        }
    }
}

const doJob = (id, reply) => {
    let data = getData(id, reply)

    if (!data) return

    if (data.brick) {
        reply(atText(id, "正在搬砖，无法操作！"))
        return
    }

    if (data.power < 5) {
        reply(atText(id, "是不是透支了？吃顿饭吧！"))
        return
    }

    if (data.health < 2) {
        reply(atText(id, "感觉身体被掏空，做个保健吧！"))
        return
    }

    if (randomNum(1, 100) >= 81) {
        data.power -= 5
        data.health -= 2
        data.money -= 5
        if (saveData(id, data)) {
            reply(atText(id, "工作失误，扣除5元！"))
        }
    } else {
        let getmoney = randomNum(5, 15)
        data.power -= 5
        data.health -= 2
        data.money += getmoney
        if (saveData(id, data)) {
            reply(atText(id, `打工成功，赚得${getmoney}元！\n当前财富：${data.money}`))
        }
    }
}

const doCare = (id, text, reply) => {
    let num = parseInt(text.match(/\d+/g)) || 10
    let data = getData(id, reply)

    if (!data) return

    if (data.brick) {
        reply(atText(id, "正在搬砖，无法操作！"))
        return
    }

    if (num < 10) {
        reply(atText(id, "单次消费不得低于10元！"))
        return
    }

    if (data.health + num > 150) {
        reply(atText(id, "健康值最高为150，自律一点吧！"))
        return
    }

    if (data.money < num) {
        reply(atText(id, "财富不足，请先打工！"))
        return
    }

    if (data.power < 5) {
        reply(atText(id, "是不是透支了？吃顿饭吧！"))
        return
    }

    data.money -= num
    data.power -= 5
    data.health += num

    if (saveData(id, data)) {
        reply(atText(id, `做了个${num}元的保健！\n当前健康：${data.health}`))
    }
}

const doStartBrick = (id, reply) => {
    let data = getData(id, reply)
    if (!data || data.brick) {
        reply(atText(id, data ? "你已经在搬砖！" : "数据获取失败！"))
        return
    }

    if (data.power < 50) {
        reply(atText(id, "是不是透支了？吃顿饭吧！"))
        return
    }

    data.power -= 50
    data.brick = getTime("stack")

    if (saveData(id, data)) {
        reply(atText(id, `开始搬砖！\n开始时间：${getTime("string")}`))
    }
}

const doStopBrick = (id, reply) => {
    let data = getData(id, reply)
    if (!data || !data.brick) {
        reply(atText(id, data ? "你并没有在搬砖！" : "数据获取失败！"))
        return
    }

    let timebehind = parseInt((getTime("stack") - data.brick) / 60000)
    data.brick = 0
    let getmoney = timebehind <= 120 ? timebehind : timebehind <= 180 ? 120 + parseInt((timebehind - 120) / 2) : 150
    data.money += getmoney

    if (saveData(id, data)) {
        reply(atText(id, `搬砖${timebehind}分钟，获得${getmoney}财富！`))
    }
}

const doStartFish = (id, reply) => {
    let data = getData(id, reply)

    if (!data) return

    if (data.brick) {
        reply(atText(id, "正在搬砖，无法操作！"))
        return
    }

    if (data.fish) {
        reply(atText(id, "你已经在钓鱼！"))
        return
    }

    if (data.power < 5) {
        reply(atText(id, "是不是透支了？吃顿饭吧！"))
        return
    }

    data.power -= 5
    data.fish = getTime("stack")

    if (saveData(id, data)) {
        reply(atText(id, "开始钓鱼，请在10至15秒内拉竿！"))
    }
}

const doStopFish = (id, reply) => {
    let data = getData(id, reply)

    if (!data) return

    if (data.brick) {
        reply(atText(id, "正在搬砖，无法操作！"))
        return
    }

    if (!data.fish) {
        reply(atText(id, "你并没有在钓鱼！"))
        return
    }

    let timebehind = parseInt((getTime("stack") - data.fish) / 1000)
    data.fish = 0
    let status = timebehind < 10 ? -1 : timebehind > 15 ? 1 : 0

    if (status === -1) {
        reply(atText(id, `嘻，太快了！(${timebehind})`))
    } else if (status === 1) {
        reply(atText(id, `噫，太慢了！(${timebehind})`))
    } else {
        const result = getFish(id, reply)
        if (result) data.pack[result] += 1
    }

    saveData(id, data)
}

const getFish = (id, reply) => {
    const random = randomNum(1, 100)
    const fishTypes = [
        { threshold: 10, message: "钓到一条灿烂华烨的金龙鱼！", type: "goldfish" },
        { threshold: 20, message: "钓到一条奇货可居的大桂鱼！", type: "mandarin" },
        { threshold: 30, message: "钓到一条一文不值的小草鱼！", type: "grasscrap" },
        { threshold: 40, message: "钓到一只硕大无比的王八！", type: "tortoise" },
        { threshold: 50, message: "钓到一只长着犄角的河豚！", type: "globefish" },
    ]

    for (const fish of fishTypes) {
        if (random <= fish.threshold) {
            reply(atText(id, fish.message))
            return fish.type
        }
    }

    const trashMessages = [
        "钓到一只臭袜子，扔了......",
        "钓到一个热水瓶，里面有些不明液体......",
        "钓到一个钱包，里面没有钱......",
        "钓到一个书包，里头全是湿了的作业......",
        "钓到一块铁锈，还散发着腐臭的气息......"
    ]
    reply(atText(id, trashMessages[Math.floor((random - 51) / 10)]))
    return false
}

const doSell = (id, text, reply) => {
    const itemMap = {
        "金龙鱼": { type: "goldfish", price: 100 },
        "大桂鱼": { type: "mandarin", price: 30 },
        "小草鱼": { type: "grasscrap", price: 10 },
        "王八": { type: "tortoise", price: 15 },
        "河豚": { type: "globefish", price: 20 }
    }

    const thing = text.slice(2).replace(/[0-9]/ig, "")
    const num = parseInt(text.match(/\d+/g)) || 1
    const data = getData(id, reply)

    if (data && itemMap[thing]) {
        doRealSell(id, itemMap[thing].type, itemMap[thing].price, num, reply)
    } else {
        reply(atText(id, "您胡言乱语什么（滑稽）"))
    }
}

const doRealSell = (id, thing, money, num, reply) => {
    const data = getData(id, reply)
    if (data) {
        data.pack[thing] -= num
        data.money += money * num
        if (saveData(id, data)) {
            reply(atText(id, `售卖成功，获得${money * num}元！`))
        }
    }
}

const doTurntable = (id, text, reply) => {
    const num = parseInt(text.match(/\d+/g)) || 10
    const data = getData(id, reply)

    if (!data) return

    if (data.brick) {
        reply(atText(id, "正在搬砖，无法操作！"))
        return
    }

    if (num < 10) {
        reply(atText(id, "单次消费不得低于10元！"))
        return
    }

    if (data.power < 5) {
        reply(atText(id, "是不是透支了？吃顿饭吧！"))
        return
    }

    if (data.money < num) {
        reply(atText(id, "财富不足，请先打工！"))
        return
    }

    data.power -= 5
    data.money -= num
    const random = randomNum(1, 100)
    const prizeMap = [
        { range: [11, 15], multiplier: 10, message: "【一等奖】获得" },
        { range: [21, 30], multiplier: 4, message: "【二等奖】获得" },
        { range: [31, 50], multiplier: 2, message: "【三等奖】获得" },
        { range: [61, 90], multiplier: 1, message: "【四等奖】收支相消！" }
    ]

    let prizeWon = false
    for (const prize of prizeMap) {
        if (random >= prize.range[0] && random <= prize.range[1]) {
            data.money += prize.multiplier * num
            reply(atText(id, `${prize.message}${prize.multiplier * num}财富！\n现有财富：${data.money}`))
            prizeWon = true
            break
        }
    }

    if (!prizeWon) {
        reply(atText(id, `没中奖！\n现有财富：${data.money}`))
    }

    saveData(id, data)
}

const doSteal = (id, target, reply) => {
    const data = getData(id, reply)

    if (!data) return

    if (data.brick) {
        reply(atText(id, "正在搬砖，无法操作！"))
        return
    }

    if (!target || id === target) {
        reply(atText(id, target ? "宁掉沟里，不偷自己！" : "请指定偷取对象！"))
        return
    }

    if (!isUserExist(target)) {
        reply(atText(id, "对方还没创建角色，邀请他创建角色吧！"))
        return
    }

    const targetdata = getData(target, reply)
    if (targetdata.money < 40) {
        reply(atText(id, "对方是个穷鬼，别偷取他了！"))
        return
    }

    if (data.power < 10) {
        reply(atText(id, "是不是透支了？吃顿饭吧！"))
        return
    }

    const random = randomNum(1, 100)
    if (random >= 71) {
        const steal = randomNum(20, 40)
        data.money += steal
        data.power -= 10
        targetdata.money -= steal
        if (saveData(target, targetdata) && saveData(id, data)) {
            reply(atText(id, `偷取成功，从对方偷得${steal}元！`))
        } else {
            reply(atText(id, "保存数据失败！"))
        }
    } else {
        data.health -= 10
        data.power -= 10
        if (saveData(id, data)) {
            reply(atText(id, "对方抓住你就暴怼了你一顿，健康减10！"))
            if (data.health < 0) {
                reply(atText(id, "健康值小于零，就地去世！"))
                deleteData(id)
            }
        }
    }
}

const doCrackBank = (id, reply) => {
    const data = getData(id, reply)

    if (!data) return

    if (data.brick) {
        reply(atText(id, "正在搬砖，无法操作！"))
        return
    }

    if (data.power < 40) {
        return reply(atText(id, "是不是透支了？吃顿饭吧！\n注：需要40精力！"))
    }

    let downcode = Math.min(parseInt((data.power - 40) / 5), 30)
    if (randomNum(1, 100) > 90 - downcode) {
        let getmoney = randomNum(400, 1000)
        data.money += getmoney
        data.power -= 40
        if (saveData(id, data)) {
            reply(atText(id, `富贵险中求！获得${getmoney}元！\n当前财富：${data.money}`))
        }
    } else {
        reply(atText(id, "怀璧其罪，恶胆包天！\n光天化日，持鞋抢劫！\n罪不容诛，就地枪决！"))
        deleteData(id)
    }
}

const doRank = async (id, reply) => {
    const files = fs.readdirSync("./data/")
    const users = await Promise.all(files.map(file => bot.getGroupMemberInfo(id, file.replace(".json", ""))))
    const data = users
        .filter(user => user.id)
        .map(user => ({
            memberName: user.memberName,
            money: JSON.parse(fs.readFileSync(getFilePath(user.id))).money
        }))
        .sort((a, b) => b.money - a.money)

    const rank = data.map((user, index) => `${index + 1}. ${user.memberName}：${user.money}`).join("\n")
    reply(`服不服榜：\n###############\n${rank}\n###############`)
}

const isUserExist = (id) => {
    try {
        fs.accessSync(getFilePath(id))
        return true
    } catch (err) {
        return false
    }
}

const getTime = (arg) => {
    const date = new Date()
    if (arg === "string") {
        return date.toLocaleString()
    } else if (arg === "stack") {
        return date.getTime()
    }
    return null
}

const getFilePath = (id) => `./data/${id}.json`

const randomNum = (min, max) => {
    const number = parseInt(crypto.randomBytes(2).toString('hex'), 16)
    return number % (max - min + 1) + min
}

const atText = (id, text) => [At(id), Plain("\n"), Plain(text)]
