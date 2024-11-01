const fs = require('fs')
const path = require('path')
const allowList = require('./allow.json')
const args = process.argv.slice(2)
const rulesetDir = path.join(__dirname, './rulesets/')
const allowedServers = allowList[args.shift()]
if (!allowedServers) throw ('Unauthorized User')
const changedFilenamesParsed = args.map(m => m.replace('rulesets/', ''))
const dir = fs.readdirSync(rulesetDir).filter(f => changedFilenamesParsed.includes(f))
if (!dir.length) throw ('Incorrect Path')
if (dir.length > 2) throw ('Too Many Edits')
const arrUpper = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
const arrLower = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']
const validateObj = {
    types: ['Normal', 'Fire', 'Fighting', 'Water', 'Flying', 'Grass', 'Poison', 'Electric', 'Ground', 'Psychic', 'Rock', 'Ice', 'Bug', 'Dragon', 'Ghost', 'Dark', 'Steel', 'Fairy'],
    rarity: ['common', 'regional', 'legendary', 'mythical', 'ultrabeast', 'paradox', 'special']
}
const validateFilters = (filter, type) => {
    switch (type) {
        case 'types': case 'rarity':
            if (filter.length > validateObj[type]) throw (`Filter Length Out Of Bounds: ${type}`)
            for (const f of filter) { if (!validateObj[type].includes(f)) throw (`Invalid Value: ${type}->${f}`) }
            break
        case 'species': case 'abilities':
            if (filter.length > 500) throw (`Filter Length Out Of Bounds: ${type}`)
            for (const f of filter) {
                if (typeof f !== 'string') throw (`Non String Value: ${type}->${f}`)
                for (const s of f.split(' ')) {
                    const splitParsed = s.split('')
                    const first = splitParsed.shift()
                    if (!arrUpper.includes(first) ||
                        splitParsed.some(s => !arrLower.includes(s))) throw (`Invalid Value: ${type}->${f}`)
                }
            }
            break
        case 'names': case 'items':
            if (filter.length > 500) throw (`Filter Length Out Of Bounds: ${type}`)
            for (const f of filter) {
                if (typeof f !== 'string') throw (`Non String Value: ${type}->${f}`)
                for (const s of f.split('-')) {
                    const splitParsed = s.split('')
                    if (splitParsed.some(s => !arrLower.includes(s))) throw (`Invalid Value: ${type}->${f}`)
                }
            }
            break
    }
}
for (const f of dir) {
    const data = require(`${rulesetDir}/${f}`)
    const allowedKeys = ['pokemon', 'moves', 'abilities', 'items']
    const allowedFilters = {
        pokemon: ['types', 'species'],
        moves: ['types', 'names']
    }
    const channelIds = Object.keys(data)
    if (channelIds.length > 25) throw (`Too Many Channels`)
    for (const c of channelIds) {
        const checkChannelName = c.split('').filter(f => arrLower.includes(f) || arrUpper.includes(f))
        if (checkChannelName.length) throw ('Invalid Channel ID')
        const ruleset = data[c]
        const checkAllowedKeys = allowedKeys.filter(f => !ruleset.hasOwnProperty(f))
        if (checkAllowedKeys.length) throw (`Missing Required JSON Keys: ${checkAllowedKeys.join()}`)
        if (ruleset.description.length > 200) throw ('Description Exceeded 200 Chars')
        if (typeof ruleset.description !== 'string') throw ('Description Must Be A String')
        const validateMinMax = ['minLevel', 'maxLevel', 'minPokemon', 'maxPokemon'].filter(f => typeof ruleset.pokemon[f] !== 'number')
        if (validateMinMax.length) throw (`Non Number Min-Max Values: ${validateMinMax.join()}`)
        if (ruleset.pokemon.minLevel < 1 ||
            ruleset.pokemon.minPokemon < 1 ||
            ruleset.pokemon.maxLevel > 100 ||
            ruleset.pokemon.minPokemon > 6) throw ('Min-Max Out Of Bounds')
        if (ruleset.pokemon.maxLevel < ruleset.pokemon.minLevel ||
            ruleset.pokemon.maxPokemon < ruleset.pokemon.minPokemon) throw ('Min Values Cannot Be Higher Than Max Values')
        const checkGens = ruleset.pokemon.allowedGens.filter(f => typeof f !== 'number' && f || !f)
        if (checkGens.length || ruleset.pokemon.allowedGens.length > 20) throw (`Invalid Allowed Gens`)
        validateFilters(ruleset.pokemon.allowedRarities, 'rarity')
        for (const ruleType of allowedKeys) {
            const missingFilterTypes = ['legal', 'illegal'].filter(f => !ruleset[ruleType].hasOwnProperty(f))
            if (missingFilterTypes.length) throw (`Missing Required JSON Keys: ${ruleType} [${missingFilterTypes.join()}]`)
            for (const mode of Object.keys(ruleset[ruleType])) {
                if (!['legal', 'illegal'].includes(mode)) continue
                if (Array.isArray(ruleset[ruleType][mode])) {
                    if (!['abilities', 'items'].includes(ruleType)) throw (`Invalid Rule Filter Type: ${ruleType}->${mode}`)
                    if (!ruleset[ruleType][mode].length) continue
                    validateFilters(ruleset[ruleType][mode], ruleType)
                } else {
                    const filters = Object.keys(ruleset[ruleType][mode])
                    const checkAllowedFilters = allowedFilters[ruleType].filter(f => !filters.includes(f))
                    if (checkAllowedFilters.length) throw (`Invalid Filter For ${ruleType}->${checkAllowedFilters.join()}`)
                    for (const filter of filters) {
                        if (!Array.isArray(ruleset[ruleType][mode][filter])) throw (`Invalid Rule Filter Type: ${ruleType}->${mode}->${filter}`)
                        if (!ruleset[ruleType][mode][filter].length) continue
                        validateFilters(ruleset[ruleType][mode][filter], filter)
                    }
                }
            }
        }
    }
}