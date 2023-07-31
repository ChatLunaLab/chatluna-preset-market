import { Context } from 'koishi';
import { request } from "@dingyi222666/koishi-plugin-chathub/lib/llm-core/utils/request"
import fs from 'fs/promises'
import PresetMarketPlugin from '.';
import { MarketPresets } from './types';
import { getPresetInstance } from "@dingyi222666/koishi-plugin-chathub/lib/index"
import { createLogger } from "@dingyi222666/koishi-plugin-chathub/lib/llm-core/utils/logger"
import { PresetTemplate } from '@dingyi222666/koishi-plugin-chathub/lib/llm-core/prompt';

const logger = createLogger('@dingyi222666/chathub-preset-market/commands')

export function apply(ctx: Context, config: PresetMarketPlugin.Config) {

    let marketPresets: MarketPresets

    ctx.command('chathub.preset-market', 'chathub 预设仓库相关命令')

    ctx.command('chathub.preset-market.list', '列出预设仓库的预设')
        .alias("预设仓库列表")
        .option("page", "-p <page:number> 选择页数", {
            authority: 1,
        })
        .action(async ({ options, session }) => {
            const presets = (await getPresetList(config))

            marketPresets = presets

            const page = options.page ?? 1

            const pageSize = 10

            const start = (page - 1) * pageSize

            const end = start + pageSize

            const presetList = presets.slice(start, end)

            const buffer = ['预设列表：\n']

            for (const preset of presetList) {
                buffer.push(`名称：${preset.name}`)
                buffer.push(`关键词: ${preset.keywords.join(" ,")}`)
                buffer.push('')
            }

            buffer.push(`当前页数：(${page}/${Math.ceil(presets.length / pageSize)}）`)

            await session.send(buffer.join('\n'))
        })

    ctx.command('chathub.preset-market.download <presetName:string>', '下载预设')
        .alias("下载预设")
        .action(async ({ options, session }, presetName) => {
            const presets = marketPresets ?? (await getPresetList(config))

            const localPresetRepository = getPresetInstance()

            marketPresets = presets

            const preset = presets.find((preset) => preset.name === presetName || preset.keywords.includes(presetName))

            if (!preset) {
                await session.send(`没有找到预设 ${presetName}`)
                return
            }

            let localPreset: PresetTemplate

            for (const presetKeyWord of preset.keywords) {
                localPreset = await localPresetRepository.getPreset(presetKeyWord, false, false)
            }

            if (localPreset) {
                await session.send(`已经存在使用了同一关键词的预设 ${presetName}，回复大写 Y 则覆盖，否则取消。是否覆盖？`)

                const input = await session.prompt(1000 * 30)

                if (!input) {
                    await session.send(`超时，已取消下载预设 ${presetName}`)
                    return
                } else if (input !== "Y") {
                    await session.send(`已取消下载预设 ${presetName}`)
                    return
                }
            }

            const downloadPath = localPreset ? localPreset.path : localPresetRepository.resolvePresetDir() + `/${presetName}.yml`

            await downloadPreset(config.repositoryUrlEndPoint, preset.rawPath, downloadPath)

            return `下载预设 ${presetName} 成功，快使用 chathub.listpreset 查看吧`
        })

    ctx.command('chathub.preset-market.upload', '上传预设')
        .alias("上传预设")
        .action(async ({ options, session }) => {
            return "非常抱歉，由于我们使用 GitHub 作为预设仓库，请有需要上传预设的用户前往此仓库提交 Pull Request: https://github.com/ChatHubLab/awesome-chathub-presets"
        })
}


async function getPresetList(config: PresetMarketPlugin.Config) {

    try {
        const response = await request.fetch(`${config.repositoryUrlEndPoint}/preset/presets.json`)

        const rawText = await response.text()

        const presetList = JSON.parse(rawText) as MarketPresets

        fs.writeFile("./data/chathub/temp/preset_market.json", rawText)

        return presetList
    } catch (error) {
        logger.error(error)
        if (error.stack) {
            logger.error(error.stack)
        }

        const rawText = (await fs.readFile("./data/chathub/temp/preset_market.json")).toString('utf-8')

        const presetList = JSON.parse(rawText) as MarketPresets

        return presetList
    }
}

async function downloadPreset(repositoryUrlEndPoint: string, rawPath: string, downloadPath: string) {
    const url = rawPath.replace("https://raw.githubusercontent.com/ChatHubLab/awesome-chathub-presets", repositoryUrlEndPoint)

    const response = await request.fetch(url)

    const rawText = await response.text()

    await fs.writeFile(downloadPath, rawText)
}